'use strict';

/**
 * AWE-OS — Revenue Intelligence Orchestrator                    Phase 6C
 *
 * Coordinates all revenue engines into a unified pipeline.
 * Exposes a clean API surface for route handlers.
 */

const { createLogger } = require('../monitoring/logger');

const RevenuePredictionEngine   = require('./RevenuePredictionEngine');
const PricingIntelligenceEngine = require('./PricingIntelligenceEngine');
const MonetizationRoutingEngine = require('./MonetizationRoutingEngine');
const RevenueAnalyticsEngine    = require('./RevenueAnalyticsEngine');
const ConversionOptimizationEngine = require('./ConversionOptimizationEngine');
const RevenueLearningEngine     = require('./RevenueLearningEngine');

const log = createLogger('revenue-intel');

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

/**
 * Run full revenue intelligence pipeline for a single tool.
 *
 * @param {object} tool
 * @returns {Promise<RevenueIntelReport>}
 */
async function runToolRevenuePipeline(tool) {
  const startMs = Date.now();

  try {
    const prediction = RevenuePredictionEngine.predict({
      category:        tool.category,
      qualityScore:    tool.quality_score    || 50,
      usageCount:      tool.usage_count      || 0,
      seoScore:        tool.seo_score        || 50,
      engagementScore: tool.engagement_score || 50,
      monetizationType: tool.monetization_type || 'adsense',
      isFree:          tool.is_free !== false,
      price:           tool.price || 0,
    });

    const routing    = MonetizationRoutingEngine.route(tool, prediction);
    const pricing    = PricingIntelligenceEngine.recommend(tool, prediction);
    const conversion = ConversionOptimizationEngine.analyze(tool, prediction, routing);

    // Non-blocking persistence
    _persistToolMetrics(tool, prediction, routing).catch(() => {});

    return {
      toolId:     tool.id,
      toolSlug:   tool.slug,
      prediction,
      routing,
      pricing,
      conversion,
      pipelineMs: Date.now() - startMs,
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    log.warn('runToolRevenuePipeline failed', { toolId: tool.id, error: err.message });
    throw err;
  }
}

/**
 * Get analytics report (cached, 20 min TTL).
 * Optionally persists a health snapshot after fresh run.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<RevenueAnalyticsReport>}
 */
async function getAnalytics(forceRefresh = false) {
  const report = await RevenueAnalyticsEngine.getAnalytics(forceRefresh);

  if (forceRefresh && report.toolCount > 0) {
    RevenueLearningEngine.snapshotHealth(report).catch(() => {});
  }

  return report;
}

/**
 * Get revenue predictions for all published tools.
 *
 * @returns {Promise<object>}
 */
async function getPredictions() {
  try {
    const { data: tools } = await db()
      .from('tools')
      .select('id, slug, name, category, quality_score, usage_count, seo_score, engagement_score, monetization_type, is_free, price')
      .eq('approved', true)
      .order('usage_count', { ascending: false })
      .limit(200);

    const allTools = tools || [];
    const predictions = RevenuePredictionEngine.predictBatch(allTools);

    return {
      count:       allTools.length,
      predictions,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    log.warn('getPredictions failed', { error: err.message });
    return { count: 0, predictions: [], generatedAt: new Date().toISOString() };
  }
}

/**
 * Get pricing recommendations for all published tools.
 *
 * @returns {Promise<object>}
 */
async function getPricing() {
  try {
    const { data: tools } = await db()
      .from('tools')
      .select('id, slug, name, category, quality_score, usage_count, is_free, price')
      .eq('approved', true)
      .order('quality_score', { ascending: false })
      .limit(200);

    const allTools = tools || [];
    const assessments = PricingIntelligenceEngine.assessBatch(allTools);

    const byDiagnosis = {};
    for (const a of assessments) {
      if (!byDiagnosis[a.diagnosis]) byDiagnosis[a.diagnosis] = [];
      byDiagnosis[a.diagnosis].push(a);
    }

    return {
      count:       allTools.length,
      assessments,
      byDiagnosis,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    log.warn('getPricing failed', { error: err.message });
    return { count: 0, assessments: [], byDiagnosis: {}, generatedAt: new Date().toISOString() };
  }
}

/**
 * Get conversion optimization analysis for all tools.
 *
 * @returns {Promise<object>}
 */
async function getOptimization() {
  try {
    const { data: tools } = await db()
      .from('tools')
      .select('id, slug, name, category, quality_score, usage_count, is_free, price, monetization_type')
      .eq('approved', true)
      .order('usage_count', { ascending: false })
      .limit(200);

    const allTools = tools || [];
    const predictions = RevenuePredictionEngine.predictBatch(allTools);
    const routings    = MonetizationRoutingEngine.routeBatch(allTools, predictions);
    const analyses    = ConversionOptimizationEngine.analyzeBatch(allTools, predictions, routings);

    // Highlight top opportunities
    const topOpportunities = analyses
      .filter(a => a.revenueImpactOfFix > 1)
      .sort((a, b) => b.revenueImpactOfFix - a.revenueImpactOfFix)
      .slice(0, 10);

    return {
      count:           allTools.length,
      analyses,
      topOpportunities,
      generatedAt:     new Date().toISOString(),
    };
  } catch (err) {
    log.warn('getOptimization failed', { error: err.message });
    return { count: 0, analyses: [], topOpportunities: [], generatedAt: new Date().toISOString() };
  }
}

/**
 * Get revenue forecast projections by category.
 *
 * @returns {Promise<object>}
 */
async function getForecast() {
  try {
    const { data: tools } = await db()
      .from('tools')
      .select('id, category, quality_score, usage_count')
      .eq('approved', true)
      .limit(500);

    const allTools = tools || [];

    // Aggregate stats per category
    const catStats = {};
    for (const t of allTools) {
      const cat = t.category || 'other';
      if (!catStats[cat]) catStats[cat] = { toolCount: 0, totalQuality: 0, totalUsage: 0 };
      catStats[cat].toolCount++;
      catStats[cat].totalQuality += t.quality_score || 0;
      catStats[cat].totalUsage   += t.usage_count   || 0;
    }
    const normalizedStats = {};
    for (const [cat, s] of Object.entries(catStats)) {
      normalizedStats[cat] = {
        toolCount:  s.toolCount,
        avgQuality: Math.round(s.totalQuality / s.toolCount),
        avgUsage:   Math.round(s.totalUsage   / s.toolCount),
      };
    }

    const categoryProjections = RevenuePredictionEngine.projectByCategory(normalizedStats);

    // Simple 3-month growth scenario (10% MoM growth assumption if trending positive)
    const scenarios = {
      conservative: _buildScenario(categoryProjections, 0.05),
      base:         _buildScenario(categoryProjections, 0.10),
      optimistic:   _buildScenario(categoryProjections, 0.18),
    };

    return {
      toolCount:           allTools.length,
      categoryProjections,
      scenarios,
      generatedAt:         new Date().toISOString(),
    };
  } catch (err) {
    log.warn('getForecast failed', { error: err.message });
    return { toolCount: 0, categoryProjections: {}, scenarios: {}, generatedAt: new Date().toISOString() };
  }
}

/**
 * Get revenue learning signals (cached, 30 min TTL).
 *
 * @param {boolean} [forceRefresh=false]
 */
async function getLearning(forceRefresh = false) {
  return RevenueLearningEngine.getLearningSignals(forceRefresh);
}

/**
 * Invalidate all revenue caches.
 */
function invalidateAllCaches() {
  RevenueAnalyticsEngine.invalidateCache();
  RevenueLearningEngine.invalidateCache();
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _persistToolMetrics(tool, prediction, routing) {
  await db()
    .from('tool_revenue_metrics')
    .upsert({
      tool_id:           tool.id,
      tool_slug:         tool.slug,
      category:          tool.category,
      estimated_revenue: prediction.estimatedMonthlyRevenue,
      rpm:               prediction.rpmPrediction,
      ctr:               prediction.ctrPrediction,
      conversion_rate:   prediction.conversionRate,
      engagement_score:  tool.engagement_score || 50,
      quality_score:     tool.quality_score    || 50,
      usage_count:       tool.usage_count      || 0,
      monetization_type: routing.primaryModel,
      ltv_estimate:      prediction.ltvPrediction,
      confidence_score:  prediction.confidenceScore,
      metadata:          { secondaryModel: routing.secondaryModel, uxScore: routing.uxScore },
      recorded_at:       new Date().toISOString(),
    }, { onConflict: 'tool_id' });
}

function _buildScenario(categoryProjections, monthlyGrowthRate) {
  let currentMRR = 0;
  for (const proj of Object.values(categoryProjections)) {
    currentMRR += proj.totalCategoryMRR || 0;
  }
  return {
    month1: Math.round(currentMRR * (1 + monthlyGrowthRate)     * 100) / 100,
    month2: Math.round(currentMRR * (1 + monthlyGrowthRate) ** 2 * 100) / 100,
    month3: Math.round(currentMRR * (1 + monthlyGrowthRate) ** 3 * 100) / 100,
    growthRatePct: Math.round(monthlyGrowthRate * 100),
  };
}

module.exports = {
  runToolRevenuePipeline,
  getAnalytics,
  getPredictions,
  getPricing,
  getOptimization,
  getForecast,
  getLearning,
  invalidateAllCaches,
  // Re-export engines for direct use
  RevenuePredictionEngine,
  PricingIntelligenceEngine,
  MonetizationRoutingEngine,
  RevenueAnalyticsEngine,
  ConversionOptimizationEngine,
  RevenueLearningEngine,
};
