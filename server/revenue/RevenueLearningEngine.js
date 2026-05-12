'use strict';

/**
 * AWE-OS — RevenueLearningEngine                               Phase 6C
 *
 * Learns from historical revenue performance to adapt monetization strategies.
 * Tracks prediction accuracy, detects drift, adjusts category weights.
 * Pure DB + algorithmic — no AI calls.
 *
 * Learning signals:
 *   Prediction accuracy over time (drift detection)
 *   Category-level revenue performance trends
 *   Model effectiveness by monetization type
 *   Underperformer recovery patterns
 *   Seasonal adaptation signals
 *   Pricing diagnosis validation (was 'underpriced' → did raising price help?)
 */

const { createLogger } = require('../monitoring/logger');

const log       = createLogger('revenue-learning');
const CACHE_TTL = 30 * 60 * 1_000; // 30-minute cache

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Minimum data thresholds ────────────────────────────────────────────────────
const MIN_PREDICTIONS_FOR_CALIBRATION = 5;
const DRIFT_ALERT_THRESHOLD           = 0.35;  // >35% avg error = recalibrate
const HIGH_PERFORMER_THRESHOLD        = 0.80;  // >80% of baseline = good model
const LOW_PERFORMER_THRESHOLD         = 0.40;  // <40% of baseline = poor model

/**
 * Get revenue learning signals from historical data.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<RevenueLearningSignals>}
 */
async function getLearningSignals(forceRefresh = false) {
  try {
    const now = Date.now();
    if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

    const signals = await _buildLearningSignals();
    _cache   = signals;
    _cacheTs = now;
    return signals;
  } catch (err) {
    log.warn('getLearningSignals failed', { error: err.message });
    return _emptySignals();
  }
}

/**
 * Record a revenue prediction evaluation (actual vs predicted).
 *
 * @param {object} evaluation
 * @param {string} evaluation.toolId
 * @param {string} evaluation.toolSlug
 * @param {string} evaluation.category
 * @param {number} evaluation.predictedRevenue
 * @param {number} evaluation.actualRevenue
 * @param {number} evaluation.horizonDays
 * @param {string} [evaluation.modelVersion]
 * @returns {Promise<void>}
 */
async function recordEvaluation(evaluation) {
  try {
    const error    = evaluation.actualRevenue - evaluation.predictedRevenue;
    const driftPct = evaluation.predictedRevenue > 0
      ? Math.abs(error / evaluation.predictedRevenue)
      : null;

    await db()
      .from('revenue_predictions')
      .upsert({
        tool_id:         evaluation.toolId,
        tool_slug:       evaluation.toolSlug,
        category:        evaluation.category,
        horizon_days:    evaluation.horizonDays || 30,
        predicted_revenue: evaluation.predictedRevenue,
        predicted_rpm:   evaluation.predictedRpm || 0,
        predicted_ctr:   evaluation.predictedCtr || 0,
        predicted_ltv:   evaluation.predictedLtv || 0,
        confidence_score: evaluation.confidenceScore || null,
        actual_revenue:  evaluation.actualRevenue,
        prediction_error: error,
        drift_pct:       driftPct ? Math.round(driftPct * 10000) / 10000 : null,
        model_version:   evaluation.modelVersion || 'v1',
        inputs_snapshot: evaluation.inputsSnapshot || null,
        evaluated_at:    new Date().toISOString(),
      }, { onConflict: 'tool_id,horizon_days' });

    invalidateCache();
  } catch (err) {
    log.warn('recordEvaluation failed', { error: err.message });
  }
}

/**
 * Snapshot current revenue health for trend tracking.
 *
 * @param {object} analyticsReport - Output from RevenueAnalyticsEngine.getAnalytics()
 * @returns {Promise<void>}
 */
async function snapshotHealth(analyticsReport) {
  try {
    const topTools = (analyticsReport.topEarners || []).slice(0, 5).map(t => ({
      id: t.id, name: t.name, revenue: t.monthlyRevenue,
    }));
    const underperforming = (analyticsReport.underperformers || []).slice(0, 5).map(t => ({
      id: t.id, name: t.name, revenue: t.monthlyRevenue, issue: t.issue,
    }));

    await db()
      .from('revenue_health_snapshots')
      .insert({
        ecosystem_revenue_score:  analyticsReport.revenueHealthScore,
        revenue_diversification:  analyticsReport.diversificationScore,
        concentration_risk_score: Math.round((1 - analyticsReport.giniCoefficient) * 100),
        monetization_efficiency:  analyticsReport.monetizationEfficiency,
        total_estimated_mrr:      analyticsReport.totalEstimatedMRR,
        top_category_share:       _calcTopCategoryShare(analyticsReport.categoryBreakdown, analyticsReport.totalEstimatedMRR),
        category_breakdown:       analyticsReport.categoryBreakdown || {},
        top_tools:                topTools,
        underperforming_tools:    underperforming,
        risk_flags:               analyticsReport.riskFlags || [],
        recommendations:          analyticsReport.recommendations || [],
        snapshot_metadata:        { toolCount: analyticsReport.toolCount, analysisMs: analyticsReport.analysisMs },
      });
  } catch (err) {
    log.warn('snapshotHealth failed', { error: err.message });
  }
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildLearningSignals() {
  const cutoff90d  = new Date(Date.now() - 90  * 86400_000).toISOString();
  const cutoff30d  = new Date(Date.now() - 30  * 86400_000).toISOString();
  const cutoff7d   = new Date(Date.now() -  7  * 86400_000).toISOString();

  // ── 1. Load evaluated predictions ────────────────────────────────────────
  const { data: predictions } = await db()
    .from('revenue_predictions')
    .select('category, predicted_revenue, actual_revenue, prediction_error, drift_pct, confidence_score, model_version, evaluated_at')
    .not('actual_revenue', 'is', null)
    .gte('evaluated_at', cutoff90d)
    .order('evaluated_at', { ascending: false })
    .limit(300);

  const preds = predictions || [];

  // ── 2. Prediction accuracy by category ───────────────────────────────────
  const catAccuracy = {};
  for (const p of preds) {
    if (!catAccuracy[p.category]) catAccuracy[p.category] = { errors: [], count: 0, totalPredicted: 0, totalActual: 0 };
    const drift = p.drift_pct != null ? p.drift_pct : (p.predicted_revenue > 0 ? Math.abs(p.prediction_error / p.predicted_revenue) : 0);
    catAccuracy[p.category].errors.push(drift);
    catAccuracy[p.category].count++;
    catAccuracy[p.category].totalPredicted += p.predicted_revenue || 0;
    catAccuracy[p.category].totalActual    += p.actual_revenue    || 0;
  }

  const categoryAccuracy = {};
  for (const [cat, data] of Object.entries(catAccuracy)) {
    if (data.count < MIN_PREDICTIONS_FOR_CALIBRATION) continue;
    const avgError  = data.errors.reduce((s, e) => s + e, 0) / data.count;
    const accuracy  = Math.max(0, 1 - avgError);
    const bias      = data.totalPredicted > 0 ? (data.totalActual / data.totalPredicted - 1) : 0; // +ve = underpredicting
    categoryAccuracy[cat] = {
      count:           data.count,
      avgErrorPct:     Math.round(avgError  * 10000) / 100,
      accuracyPct:     Math.round(accuracy  * 10000) / 100,
      biasPct:         Math.round(bias      * 10000) / 100,
      calibrationNote: Math.abs(bias) > 0.20
        ? (bias > 0 ? 'Model consistently underpredicts — boost multiplier' : 'Model consistently overpredicts — reduce multiplier')
        : 'Well-calibrated',
    };
  }

  // ── 3. Overall drift detection ────────────────────────────────────────────
  const allErrors   = preds.filter(p => p.drift_pct != null).map(p => p.drift_pct);
  const avgDrift    = allErrors.length > 0 ? allErrors.reduce((s, e) => s + e, 0) / allErrors.length : 0;
  const driftAlert  = avgDrift > DRIFT_ALERT_THRESHOLD;

  // Recent 7d drift vs 30d drift (is it getting worse?)
  const recent7d    = preds.filter(p => p.evaluated_at >= cutoff7d  && p.drift_pct != null);
  const recent30d   = preds.filter(p => p.evaluated_at >= cutoff30d && p.drift_pct != null);
  const drift7d     = recent7d.length  > 0 ? recent7d.reduce((s, p) => s + p.drift_pct, 0)  / recent7d.length  : null;
  const drift30d    = recent30d.length > 0 ? recent30d.reduce((s, p) => s + p.drift_pct, 0) / recent30d.length : null;
  const driftTrend  = drift7d != null && drift30d != null ? (drift7d - drift30d) : 0;

  // ── 4. Revenue health trend from snapshots ────────────────────────────────
  const { data: snapshots } = await db()
    .from('revenue_health_snapshots')
    .select('ecosystem_revenue_score, monetization_efficiency, total_estimated_mrr, created_at')
    .gte('created_at', cutoff30d)
    .order('created_at', { ascending: true })
    .limit(50);

  const snaps = snapshots || [];
  const healthTrend = _calcTrend(snaps.map(s => s.ecosystem_revenue_score));
  const mrrTrend    = _calcTrend(snaps.map(s => s.total_estimated_mrr));
  const effTrend    = _calcTrend(snaps.map(s => s.monetization_efficiency));

  // ── 5. Model version performance ─────────────────────────────────────────
  const modelPerf = {};
  for (const p of preds) {
    const mv = p.model_version || 'v1';
    if (!modelPerf[mv]) modelPerf[mv] = { count: 0, totalDrift: 0 };
    if (p.drift_pct != null) { modelPerf[mv].count++; modelPerf[mv].totalDrift += p.drift_pct; }
  }
  const modelVersionPerformance = {};
  for (const [mv, data] of Object.entries(modelPerf)) {
    if (data.count > 0) {
      const avg = data.totalDrift / data.count;
      modelVersionPerformance[mv] = {
        sampleSize:   data.count,
        avgDriftPct:  Math.round(avg * 10000) / 100,
        status:       avg < 0.15 ? 'excellent' : avg < 0.30 ? 'good' : avg < 0.50 ? 'fair' : 'poor',
      };
    }
  }

  // ── 6. Adaptive strategy recommendations ─────────────────────────────────
  const strategyRecommendations = [];

  if (driftAlert) {
    strategyRecommendations.push({
      type:     'recalibrate',
      priority: 'high',
      detail:   `Average prediction drift ${Math.round(avgDrift * 100)}% exceeds ${Math.round(DRIFT_ALERT_THRESHOLD * 100)}% threshold — consider updating category RPM baselines`,
    });
  }

  if (driftTrend > 0.05) {
    strategyRecommendations.push({
      type:     'trend_warning',
      priority: 'medium',
      detail:   'Prediction accuracy is degrading over the last 7 days — recent market shifts may need baseline updates',
    });
  }

  const underpredictedCats = Object.entries(categoryAccuracy)
    .filter(([, a]) => a.biasPct > 20)
    .map(([cat]) => cat);
  if (underpredictedCats.length > 0) {
    strategyRecommendations.push({
      type:     'boost_categories',
      priority: 'medium',
      detail:   `Categories consistently underpredicted: ${underpredictedCats.join(', ')} — actual revenue exceeds forecast`,
      categories: underpredictedCats,
    });
  }

  const overpredictedCats = Object.entries(categoryAccuracy)
    .filter(([, a]) => a.biasPct < -20)
    .map(([cat]) => cat);
  if (overpredictedCats.length > 0) {
    strategyRecommendations.push({
      type:     'reduce_categories',
      priority: 'low',
      detail:   `Categories consistently overpredicted: ${overpredictedCats.join(', ')} — temper expectations and monetization investment`,
      categories: overpredictedCats,
    });
  }

  if (healthTrend < -2) {
    strategyRecommendations.push({
      type:     'health_declining',
      priority: 'high',
      detail:   'Revenue health score declining over 30 days — review monetization model distribution and underperformers',
    });
  }

  if (mrrTrend > 5) {
    strategyRecommendations.push({
      type:     'mrr_growing',
      priority: 'info',
      detail:   `MRR trending up ${Math.round(mrrTrend)}% — current monetization strategy is working, maintain and scale`,
    });
  }

  // ── 7. Adaptive multiplier hints ─────────────────────────────────────────
  const adaptiveAdjustments = {};
  for (const [cat, acc] of Object.entries(categoryAccuracy)) {
    if (Math.abs(acc.biasPct) > 15) {
      const adjustment = 1 + (acc.biasPct / 100) * 0.5; // dampen: don't swing 1:1
      adaptiveAdjustments[cat] = {
        suggestedMultiplier: Math.round(Math.max(0.5, Math.min(2.0, adjustment)) * 100) / 100,
        confidence:          Math.min(90, acc.count * 10),
        reason:              acc.biasPct > 0 ? 'underpredicting' : 'overpredicting',
      };
    }
  }

  const signals = {
    totalEvaluations:         preds.length,
    avgPredictionDrift:       Math.round(avgDrift * 10000) / 100,
    driftAlert,
    driftTrend:               Math.round(driftTrend * 10000) / 100,
    categoryAccuracy,
    adaptiveAdjustments,
    modelVersionPerformance,
    healthTrend: {
      scoreSlope:   Math.round(healthTrend * 100) / 100,
      mrrSlope:     Math.round(mrrTrend    * 100) / 100,
      effSlope:     Math.round(effTrend    * 100) / 100,
      snapshotCount: snaps.length,
    },
    strategyRecommendations,
    dataWindow:               '90 days',
    learnedAt:                new Date().toISOString(),
  };

  log.info('Revenue learning signals computed', {
    evaluations:  preds.length,
    avgDrift:     Math.round(avgDrift * 100) + '%',
    driftAlert,
    strategies:   strategyRecommendations.length,
  });

  return signals;
}

function _calcTrend(values) {
  if (values.length < 2) return 0;
  // Simple linear regression slope (normalized by mean to get % trend)
  const n    = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  if (mean === 0) return 0;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - (n - 1) / 2) * (values[i] - mean);
    den += (i - (n - 1) / 2) ** 2;
  }
  return den === 0 ? 0 : (num / den) / mean * 100;
}

function _calcTopCategoryShare(categoryBreakdown, totalMRR) {
  if (!totalMRR || !categoryBreakdown) return 0;
  const topRev = Math.max(...Object.values(categoryBreakdown).map(c => c.totalMonthlyRevenue || 0));
  return Math.round((topRev / totalMRR) * 10000) / 10000;
}

function _emptySignals() {
  return {
    totalEvaluations: 0,
    avgPredictionDrift: 0,
    driftAlert: false,
    driftTrend: 0,
    categoryAccuracy: {},
    adaptiveAdjustments: {},
    modelVersionPerformance: {},
    healthTrend: { scoreSlope: 0, mrrSlope: 0, effSlope: 0, snapshotCount: 0 },
    strategyRecommendations: [],
    dataWindow: '90 days',
    learnedAt: new Date().toISOString(),
  };
}

module.exports = { getLearningSignals, recordEvaluation, snapshotHealth, invalidateCache };
