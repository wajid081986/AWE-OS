'use strict';

/**
 * AWE-OS — EcosystemHealthEngine                               Phase 6B
 *
 * Measures the overall health and diversity of the tool marketplace.
 * Pure DB + algorithmic — no AI calls.
 *
 * Health dimensions:
 *   Category balance         — no single category dominates (>40% = risk)
 *   Traffic diversity        — usage spread across many tools, not just one
 *   Revenue diversity        — Gini-like inequality score for monetization
 *   Quality trend            — avg quality improving or declining
 *   Inactive tool ratio      — tools with 0 usage are ecosystem weight
 *   Ecosystem resilience     — coverage across distinct verticals
 */

const { createLogger } = require('../monitoring/logger');

const log       = createLogger('ecosystem-health');
const CACHE_TTL = 20 * 60 * 1_000; // 20-minute cache

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// Verticals: distinct business domains for resilience scoring
const VERTICALS = {
  document:    ['pdf', 'converters'],
  financial:   ['finance', 'ecommerce'],
  content:     ['writing', 'marketing', 'education'],
  utility:     ['calculators', 'productivity', 'health'],
  professional: ['legal', 'other'],
};

/**
 * Compute full ecosystem health report.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<HealthReport>}
 */
async function getHealthReport(forceRefresh = false) {
  try {
    const now = Date.now();
    if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

    const report = await _buildHealthReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getHealthReport failed', { error: err.message });
    return _emptyReport();
  }
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildHealthReport() {
  const startMs = Date.now();

  const { data: rawTools } = await db()
    .from('saas_tools')
    .select('id, category, usage_count, quality_score, is_free, price, is_published, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  const allTools       = rawTools      || [];
  const publishedTools = allTools.filter(t => t.is_published);
  const totalTools     = publishedTools.length;

  if (totalTools === 0) return _emptyReport();

  // ── 1. Category distribution ──────────────────────────────────────────────
  const catCounts = {};
  for (const t of publishedTools) {
    const cat = t.category || 'other';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  const categoryDistribution = {};
  for (const [cat, count] of Object.entries(catCounts)) {
    categoryDistribution[cat] = {
      count,
      percentage: Math.round((count / totalTools) * 100),
    };
  }

  // Category balance score: lower concentration = higher score
  // Ideal: even spread; 100 = perfectly even, 0 = all in one category
  const maxConcentration = Math.max(...Object.values(catCounts)) / totalTools;
  const idealConcentration = 1 / Math.max(Object.keys(catCounts).length, 1);
  const categoryBalanceScore = Math.round(
    Math.max(0, Math.min(100, (1 - (maxConcentration - idealConcentration)) * 100))
  );

  // ── 2. Traffic diversity (Gini-like coefficient) ──────────────────────────
  const usages = publishedTools.map(t => t.usage_count || 0).sort((a, b) => a - b);
  const totalUsage = usages.reduce((s, u) => s + u, 0);
  const trafficDiversityScore = totalUsage === 0
    ? 50
    : Math.round(100 - _giniCoefficient(usages) * 100);

  // ── 3. Quality trend score ─────────────────────────────────────────────────
  // Compare last 30 tools vs the prior 30
  const recent = publishedTools.slice(0, 30).map(t => t.quality_score || 0);
  const prior  = publishedTools.slice(30, 60).map(t => t.quality_score || 0);
  const recentAvg = _avg(recent);
  const priorAvg  = _avg(prior);
  const qualityTrend = priorAvg === 0 ? 'stable'
    : recentAvg > priorAvg + 5 ? 'improving'
    : recentAvg < priorAvg - 5 ? 'declining'
    : 'stable';
  const qualityTrendScore = Math.round(Math.min(100, recentAvg));

  // ── 4. Inactive tool ratio ─────────────────────────────────────────────────
  const inactiveTools = publishedTools.filter(t => (t.usage_count || 0) === 0);
  const inactiveRatio = totalTools > 0 ? inactiveTools.length / totalTools : 0;
  // Inactive ratio penalty: 0% inactive = 100, 50% inactive = 50, 100% = 0
  const activityScore = Math.round((1 - inactiveRatio) * 100);

  // ── 5. Ecosystem resilience (vertical coverage) ───────────────────────────
  const coveredVerticals = Object.values(VERTICALS).filter(cats =>
    cats.some(cat => (catCounts[cat] || 0) > 0)
  ).length;
  const resilienceScore = Math.round((coveredVerticals / Object.keys(VERTICALS).length) * 100);

  // ── 6. Revenue diversity score ─────────────────────────────────────────────
  const paidTools = publishedTools.filter(t => !t.is_free && (t.price || 0) > 0).length;
  const paidRatio = totalTools > 0 ? paidTools / totalTools : 0;
  // Healthy mix: 20–40% paid = optimal
  const revenueDiversityScore = Math.round(
    paidRatio >= 0.2 && paidRatio <= 0.4 ? 90 :
    paidRatio >= 0.1 && paidRatio <= 0.5 ? 70 :
    paidRatio > 0 ? 50 : 30
  );

  // ── 7. Composite ecosystem score ──────────────────────────────────────────
  const ecosystemScore = Math.round(
    categoryBalanceScore  * 0.25 +
    trafficDiversityScore * 0.20 +
    qualityTrendScore     * 0.20 +
    activityScore         * 0.15 +
    resilienceScore       * 0.10 +
    revenueDiversityScore * 0.10
  );

  // ── 8. Risk flags ──────────────────────────────────────────────────────────
  const riskFlags = [];
  if (maxConcentration > 0.45) {
    const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    riskFlags.push({
      type:     'category_concentration',
      severity: maxConcentration > 0.60 ? 'critical' : 'high',
      message:  `"${dominantCat?.[0]}" dominates at ${Math.round(maxConcentration * 100)}% of tools`,
    });
  }
  if (inactiveRatio > 0.30) {
    riskFlags.push({
      type:     'high_inactive_ratio',
      severity: inactiveRatio > 0.50 ? 'high' : 'medium',
      message:  `${inactiveTools.length} tools (${Math.round(inactiveRatio * 100)}%) have zero usage`,
    });
  }
  if (qualityTrend === 'declining') {
    riskFlags.push({
      type:     'quality_decline',
      severity: 'medium',
      message:  `Average tool quality declining — recent avg ${Math.round(recentAvg)}, prior avg ${Math.round(priorAvg)}`,
    });
  }
  if (coveredVerticals < Object.keys(VERTICALS).length - 1) {
    riskFlags.push({
      type:     'low_resilience',
      severity: 'low',
      message:  `Only ${coveredVerticals}/${Object.keys(VERTICALS).length} market verticals covered`,
    });
  }

  // ── 9. Rebalance recommendations ──────────────────────────────────────────
  const recommendations = [];
  if (maxConcentration > 0.40) {
    recommendations.push('Pause expansion in dominant category — diversify into underserved niches');
  }
  if (inactiveRatio > 0.25) {
    recommendations.push(`Review ${inactiveTools.length} inactive tools — improve SEO or retire underperformers`);
  }
  const missingVerticals = Object.entries(VERTICALS)
    .filter(([, cats]) => !cats.some(cat => catCounts[cat] > 0))
    .map(([v]) => v);
  if (missingVerticals.length > 0) {
    recommendations.push(`Expand into uncovered verticals: ${missingVerticals.join(', ')}`);
  }
  if (paidRatio < 0.10) {
    recommendations.push('Increase paid tool ratio — consider premium tiers on high-traffic tools');
  }
  if (qualityTrend === 'improving') {
    recommendations.push('Quality trend is improving — maintain current generation standards');
  }

  const report = {
    ecosystemScore,
    categoryDistribution,
    categoryBalanceScore,
    trafficDiversityScore,
    qualityTrendScore,
    activityScore,
    resilienceScore,
    revenueDiversityScore,
    toolCount:         totalTools,
    activeToolCount:   totalTools - inactiveTools.length,
    inactiveToolCount: inactiveTools.length,
    paidToolCount:     paidTools,
    qualityTrend,
    averageQuality:    Math.round(_avg(publishedTools.map(t => t.quality_score || 0))),
    riskFlags,
    recommendations,
    coveredVerticals,
    totalVerticals:    Object.keys(VERTICALS).length,
    analysisMs:        Date.now() - startMs,
    snapshotAt:        new Date().toISOString(),
  };

  log.info('Ecosystem health computed', {
    score:   ecosystemScore,
    tools:   totalTools,
    flags:   riskFlags.length,
    ms:      report.analysisMs,
  });

  return report;
}

// Gini coefficient (0 = perfect equality, 1 = perfect inequality)
function _giniCoefficient(sortedArr) {
  const n   = sortedArr.length;
  const sum = sortedArr.reduce((s, v) => s + v, 0);
  if (sum === 0 || n === 0) return 0;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sortedArr[i];
  }
  return Math.abs(numerator / (n * sum));
}

function _avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function _emptyReport() {
  return {
    ecosystemScore: 0, categoryDistribution: {}, categoryBalanceScore: 0,
    trafficDiversityScore: 0, qualityTrendScore: 0, activityScore: 0,
    resilienceScore: 0, revenueDiversityScore: 0, toolCount: 0,
    activeToolCount: 0, inactiveToolCount: 0, paidToolCount: 0,
    qualityTrend: 'stable', averageQuality: 0,
    riskFlags: [], recommendations: [], coveredVerticals: 0, totalVerticals: 5,
    analysisMs: 0, snapshotAt: new Date().toISOString(),
  };
}

module.exports = { getHealthReport, invalidateCache };
