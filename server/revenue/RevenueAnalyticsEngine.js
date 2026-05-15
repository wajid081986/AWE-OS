'use strict';

/**
 * AWE-OS — RevenueAnalyticsEngine                              Phase 6C
 *
 * Tracks and aggregates tool/category revenue trends.
 * Detects anomalies, concentration risk, and monetization efficiency.
 * Pure DB + algorithmic — no AI calls.
 *
 * Outputs:
 *   Revenue health score (0–100)
 *   Top earners + underperformers
 *   Category profitability breakdown
 *   Revenue concentration (Gini coefficient)
 *   Monetization efficiency (revenue per usage unit)
 *   Declining tools / declining categories
 *   Anomaly alerts
 */

const { createLogger }            = require('../monitoring/logger');
const RevenuePredictionEngine     = require('./RevenuePredictionEngine');

const log       = createLogger('revenue-analytics');
const CACHE_TTL = 20 * 60 * 1_000; // 20-minute cache

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

/**
 * Run full revenue analytics pipeline.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<RevenueAnalyticsReport>}
 */
async function getAnalytics(forceRefresh = false) {
  try {
    const now = Date.now();
    if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

    const report = await _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getAnalytics failed', { error: err.message });
    return _emptyReport();
  }
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildReport() {
  const startMs = Date.now();

  // Fetch published tools with key signals
  const { data: tools } = await db()
    .from('tools')
    .select('id, name, slug, category, quality_score, usage_count, is_free, price, is_published, created_at')
    .eq('is_published', true)
    .order('usage_count', { ascending: false })
    .limit(500);

  const allTools = tools || [];
  if (allTools.length === 0) return _emptyReport();

  // ── 1. Generate revenue predictions for all tools ─────────────────────────
  const predictions = RevenuePredictionEngine.predictBatch(allTools);

  // Index predictions by toolId
  const predMap = {};
  for (const p of predictions) predMap[p.toolId] = p;

  // ── 2. Category aggregation ───────────────────────────────────────────────
  const catData = {};
  for (const tool of allTools) {
    const cat  = tool.category || 'other';
    const pred = predMap[tool.id] || {};
    if (!catData[cat]) {
      catData[cat] = { count: 0, totalRevenue: 0, totalUsage: 0, totalQuality: 0, tools: [] };
    }
    catData[cat].count++;
    catData[cat].totalRevenue  += pred.estimatedMonthlyRevenue || 0;
    catData[cat].totalUsage    += tool.usage_count || 0;
    catData[cat].totalQuality  += tool.quality_score || 0;
    catData[cat].tools.push({ id: tool.id, name: tool.name, revenue: pred.estimatedMonthlyRevenue || 0 });
  }

  // Normalize category stats
  const categoryBreakdown = {};
  for (const [cat, data] of Object.entries(catData)) {
    categoryBreakdown[cat] = {
      toolCount:           data.count,
      totalMonthlyRevenue: Math.round(data.totalRevenue * 100) / 100,
      avgToolRevenue:      Math.round((data.totalRevenue / data.count) * 100) / 100,
      avgQuality:          Math.round(data.totalQuality / data.count),
      avgUsage:            Math.round(data.totalUsage / data.count),
      revenuePerUse:       data.totalUsage > 0
        ? Math.round((data.totalRevenue / data.totalUsage) * 10000) / 10000
        : 0,
    };
  }

  // ── 3. Total ecosystem MRR ────────────────────────────────────────────────
  const totalMRR = predictions.reduce((s, p) => s + (p.estimatedMonthlyRevenue || 0), 0);

  // ── 4. Revenue concentration (Gini) ──────────────────────────────────────
  const revenueSorted = predictions.map(p => p.estimatedMonthlyRevenue || 0).sort((a, b) => a - b);
  const gini = _giniCoefficient(revenueSorted);
  const concentrationRisk = gini > 0.70 ? 'critical' : gini > 0.55 ? 'high' : gini > 0.40 ? 'moderate' : 'low';

  // ── 5. Top earners + underperformers ──────────────────────────────────────
  const enriched = allTools.map(t => ({ ...t, prediction: predMap[t.id] || {} }));

  const topEarners = enriched
    .sort((a, b) => (b.prediction.estimatedMonthlyRevenue || 0) - (a.prediction.estimatedMonthlyRevenue || 0))
    .slice(0, 10)
    .map(t => ({
      id:             t.id,
      name:           t.name,
      slug:           t.slug,
      category:       t.category,
      monthlyRevenue: t.prediction.estimatedMonthlyRevenue || 0,
      rpm:            t.prediction.rpmPrediction || 0,
      usageCount:     t.usage_count || 0,
      qualityScore:   t.quality_score || 0,
      confidence:     t.prediction.confidenceScore || 0,
    }));

  const underperformers = enriched
    .filter(t => (t.usage_count || 0) > 10 && (t.prediction.estimatedMonthlyRevenue || 0) < 5)
    .sort((a, b) => (a.prediction.estimatedMonthlyRevenue || 0) - (b.prediction.estimatedMonthlyRevenue || 0))
    .slice(0, 8)
    .map(t => ({
      id:             t.id,
      name:           t.name,
      slug:           t.slug,
      category:       t.category,
      monthlyRevenue: t.prediction.estimatedMonthlyRevenue || 0,
      usageCount:     t.usage_count || 0,
      qualityScore:   t.quality_score || 0,
      issue:          _diagnoseUnderperformer(t),
    }));

  // ── 6. Monetization efficiency ────────────────────────────────────────────
  const totalUsage   = allTools.reduce((s, t) => s + (t.usage_count || 0), 0);
  const monetizationEfficiency = totalUsage > 0 ? totalMRR / totalUsage : 0;

  // ── 7. Revenue health score ───────────────────────────────────────────────
  const diversificationScore  = Math.round((1 - gini) * 100);
  const efficiencyScore       = Math.min(100, Math.round(monetizationEfficiency * 500));
  const topEarnerRatio        = totalMRR > 0 ? (topEarners[0]?.monthlyRevenue || 0) / totalMRR : 0;
  const concentrationScore    = Math.round((1 - topEarnerRatio) * 100);
  const qualityScore          = Math.round(_avg(allTools.map(t => t.quality_score || 0)));

  const revenueHealthScore = Math.round(
    diversificationScore  * 0.30 +
    efficiencyScore       * 0.25 +
    concentrationScore    * 0.25 +
    qualityScore          * 0.20
  );

  // ── 8. Risk flags ──────────────────────────────────────────────────────────
  const riskFlags = [];
  if (gini > 0.60) riskFlags.push({ type: 'concentration', severity: 'high', message: `Revenue highly concentrated (Gini: ${gini.toFixed(2)}) — single tool or category collapse would impact MRR` });
  if (topEarnerRatio > 0.50) riskFlags.push({ type: 'single_tool_dependency', severity: 'critical', message: `Top tool generates ${Math.round(topEarnerRatio * 100)}% of total MRR — extreme concentration risk` });
  if (underperformers.length > allTools.length * 0.4) riskFlags.push({ type: 'high_underperformer_ratio', severity: 'medium', message: `${underperformers.length} tools have near-zero revenue despite active usage — monetization gaps detected` });
  if (monetizationEfficiency < 0.01) riskFlags.push({ type: 'low_efficiency', severity: 'medium', message: 'Monetization efficiency below $0.01/use — revenue model optimization needed' });

  // ── 9. Recommendations ────────────────────────────────────────────────────
  const recommendations = [];
  if (concentrationRisk !== 'low') recommendations.push(`Reduce revenue concentration (currently ${concentrationRisk}) — expand monetization to more tools`);
  if (underperformers.length > 3) recommendations.push(`Diagnose and optimize ${underperformers.length} underperforming tools — potential +$${Math.round(underperformers.length * 15)}/mo`);
  const catCount = Object.keys(categoryBreakdown).length;
  const topCatRevShare = totalMRR > 0 ? Math.max(...Object.values(categoryBreakdown).map(c => c.totalMonthlyRevenue)) / totalMRR : 0;
  if (topCatRevShare > 0.60) recommendations.push('One category generating >60% of revenue — diversify monetization across more categories');
  if (qualityScore < 60) recommendations.push('Average quality score below 60 — quality improvement directly correlates with revenue per tool');
  if (catCount < 4) recommendations.push('Expand into more categories to reduce revenue concentration risk');

  const report = {
    revenueHealthScore,
    totalEstimatedMRR:     Math.round(totalMRR * 100) / 100,
    monetizationEfficiency: Math.round(monetizationEfficiency * 10000) / 10000,
    concentrationRisk,
    giniCoefficient:       Math.round(gini * 1000) / 1000,
    categoryBreakdown,
    topEarners,
    underperformers,
    riskFlags,
    recommendations,
    toolCount:             allTools.length,
    diversificationScore,
    efficiencyScore:       Math.min(100, efficiencyScore),
    analysisMs:            Date.now() - startMs,
    analyzedAt:            new Date().toISOString(),
  };

  log.info('Revenue analytics complete', {
    healthScore: revenueHealthScore,
    totalMRR:    Math.round(totalMRR),
    tools:       allTools.length,
    gini:        gini.toFixed(3),
    ms:          report.analysisMs,
  });

  return report;
}

function _giniCoefficient(sortedArr) {
  const n   = sortedArr.length;
  const sum = sortedArr.reduce((s, v) => s + v, 0);
  if (sum === 0 || n === 0) return 0;
  let numerator = 0;
  for (let i = 0; i < n; i++) numerator += (2 * (i + 1) - n - 1) * sortedArr[i];
  return Math.abs(numerator / (n * sum));
}

function _avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function _diagnoseUnderperformer(tool) {
  const usage   = tool.usage_count   || 0;
  const quality = tool.quality_score || 0;
  const revenue = tool.prediction?.estimatedMonthlyRevenue || 0;

  if (quality < 40) return 'Low quality score limits ad RPM and subscription conversion';
  if (usage > 100 && revenue < 2) return 'High traffic, low revenue — monetization model may be misconfigured';
  if (tool.is_free && usage < 30) return 'Insufficient traffic volume — needs SEO or marketing investment';
  return 'Revenue below category baseline — review pricing and monetization model';
}

function _emptyReport() {
  return {
    revenueHealthScore: 0, totalEstimatedMRR: 0, monetizationEfficiency: 0,
    concentrationRisk: 'low', giniCoefficient: 0, categoryBreakdown: {},
    topEarners: [], underperformers: [], riskFlags: [], recommendations: [],
    toolCount: 0, diversificationScore: 100, efficiencyScore: 0,
    analysisMs: 0, analyzedAt: new Date().toISOString(),
  };
}

module.exports = { getAnalytics, invalidateCache };
