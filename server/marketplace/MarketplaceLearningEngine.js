'use strict';

/**
 * AWE-OS — MarketplaceLearningEngine                           Phase 6B
 *
 * Learns from marketplace outcomes to improve future expansion decisions.
 * Pure DB + algorithmic — no AI calls.
 *
 * Learning signals:
 *   - Completed launches vs total attempts (success rate per category)
 *   - Average opportunity scores of successful launches
 *   - Category fatigue: too many consecutive launches → diminishing returns
 *   - Complexity correlation: which complexity levels succeed most
 *   - Revenue outcomes from tool_intelligence_history
 *
 * Outputs:
 *   - Category boost/penalty adjustments for OpportunityRanking
 *   - Fatigue warnings
 *   - Improved strategy recommendations
 *   - Adaptive thresholds
 */

const { createLogger } = require('../monitoring/logger');

const log       = createLogger('marketplace-learning');
const CACHE_TTL = 30 * 60 * 1_000; // 30 minutes

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

/**
 * Run the learning engine and return adaptive signals.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<LearningReport>}
 */
async function getLearningSignals(forceRefresh = false) {
  try {
    const now = Date.now();
    if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

    const report = await _buildLearningReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getLearningSignals failed', { error: err.message });
    return _emptyReport();
  }
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildLearningReport() {
  const startMs = Date.now();

  // ── 1. Expansion history outcomes ─────────────────────────────────────────
  const histData = await _queryHistory();

  // ── 2. Intelligence history for quality correlation ────────────────────────
  const intelData = await _queryIntelligenceHistory();

  // ── 3. Per-category success rates ─────────────────────────────────────────
  const catStats = {};
  for (const event of histData) {
    const cat = event.category || 'other';
    if (!catStats[cat]) {
      catStats[cat] = { launched: 0, failed: 0, rejected: 0, queued: 0, avgScore: 0, scores: [] };
    }
    if (event.event_type === 'launch_completed') catStats[cat].launched++;
    if (event.event_type === 'launch_failed')    catStats[cat].failed++;
    if (event.event_type === 'opportunity_rejected') catStats[cat].rejected++;
    if (event.event_type === 'launch_queued')    catStats[cat].queued++;
    if (event.metadata?.score) catStats[cat].scores.push(Number(event.metadata.score));
  }

  // ── 4. Intelligence quality correlation ───────────────────────────────────
  const catQualityCorr = {};
  for (const row of intelData) {
    const cat = row.category || 'other';
    if (!catQualityCorr[cat]) catQualityCorr[cat] = { highScoreCount: 0, totalCount: 0, avgSeo: 0, avgMonet: 0, seoTotal: 0, monetTotal: 0 };
    catQualityCorr[cat].totalCount++;
    catQualityCorr[cat].seoTotal   += row.seo_score          || 0;
    catQualityCorr[cat].monetTotal += row.monetization_score || 0;
    if ((row.monetization_score || 0) >= 65 && (row.seo_score || 0) >= 50) {
      catQualityCorr[cat].highScoreCount++;
    }
  }
  for (const [cat, q] of Object.entries(catQualityCorr)) {
    q.avgSeo   = Math.round(q.seoTotal   / q.totalCount);
    q.avgMonet = Math.round(q.monetTotal / q.totalCount);
    q.qualityRatio = q.totalCount > 0 ? Math.round((q.highScoreCount / q.totalCount) * 100) : 0;
  }

  // ── 5. Generate adjustment signals ────────────────────────────────────────
  const adjustments = [];
  for (const [cat, stats] of Object.entries(catStats)) {
    const total = stats.launched + stats.failed + stats.rejected;
    if (total === 0) continue;

    const successRate = total > 0 ? stats.launched / total : 0;
    const avgScore    = stats.scores.length > 0
      ? Math.round(stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length)
      : 60;

    const qCorr = catQualityCorr[cat];

    if (successRate >= 0.70 || (qCorr?.qualityRatio >= 60)) {
      adjustments.push({
        category: cat,
        type:     'boost',
        delta:    Math.round(Math.min(15, successRate * 15)),
        reason:   `${Math.round(successRate * 100)}% success rate in this category`,
      });
    } else if (successRate < 0.30 || (stats.failed > stats.launched && stats.failed >= 2)) {
      adjustments.push({
        category: cat,
        type:     'penalty',
        delta:    Math.round(Math.min(15, (1 - successRate) * 10)),
        reason:   `Low success rate (${Math.round(successRate * 100)}%) — reduce priority`,
      });
    }

    // Category fatigue detection: >5 queued in last 30 days with < 50% success
    if (stats.queued >= 5 && successRate < 0.50) {
      adjustments.push({
        category: cat,
        type:     'fatigue_warning',
        delta:    0,
        reason:   `Category fatigue: ${stats.queued} queued, ${Math.round(successRate * 100)}% success — slow down expansion`,
      });
    }
  }

  // ── 6. Adaptive threshold recommendations ─────────────────────────────────
  const overallSuccessRate = histData.length > 0
    ? histData.filter(e => e.event_type === 'launch_completed').length / histData.length
    : 0.5;

  const adaptiveThresholds = {
    recommendedMinScore:     overallSuccessRate >= 0.6 ? 50 : overallSuccessRate >= 0.4 ? 55 : 65,
    recommendedMaxConcurrent: overallSuccessRate >= 0.7 ? 4 : 3,
    expansionVelocity:        overallSuccessRate >= 0.65 ? 'increase' : overallSuccessRate < 0.40 ? 'decrease' : 'maintain',
  };

  // ── 7. Strategy recommendations ───────────────────────────────────────────
  const strategyRecommendations = [];
  if (adjustments.some(a => a.type === 'boost')) {
    const boostCats = adjustments.filter(a => a.type === 'boost').map(a => a.category).join(', ');
    strategyRecommendations.push(`Increase investment in historically successful categories: ${boostCats}`);
  }
  const fatigueCats = adjustments.filter(a => a.type === 'fatigue_warning');
  if (fatigueCats.length > 0) {
    strategyRecommendations.push(`Cool down expansion in fatigued categories: ${fatigueCats.map(a => a.category).join(', ')}`);
  }
  if (adaptiveThresholds.expansionVelocity === 'decrease') {
    strategyRecommendations.push('Overall success rate below 40% — tighten quality gates before next expansion wave');
  }
  if (adaptiveThresholds.expansionVelocity === 'increase') {
    strategyRecommendations.push('Strong performance — consider increasing launch velocity for top-ranked opportunities');
  }

  const report = {
    adjustments,
    adaptiveThresholds,
    strategyRecommendations,
    catStats: Object.fromEntries(
      Object.entries(catStats).map(([cat, s]) => [cat, {
        launched:    s.launched,
        failed:      s.failed,
        rejected:    s.rejected,
        successRate: Math.round((s.launched / Math.max(s.launched + s.failed + s.rejected, 1)) * 100),
      }])
    ),
    overallSuccessRate: Math.round(overallSuccessRate * 100),
    totalEvents:        histData.length,
    learningMs:         Date.now() - startMs,
    learnedAt:          new Date().toISOString(),
  };

  log.info('Learning signals computed', {
    adjustments: adjustments.length,
    successRate: report.overallSuccessRate,
    ms:          report.learningMs,
  });

  return report;
}

async function _queryHistory() {
  try {
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { data } = await db()
      .from('marketplace_expansion_history')
      .select('event_type, category, outcome, metadata, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);

    return data || [];
  } catch (_) { return []; }
}

async function _queryIntelligenceHistory() {
  try {
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { data } = await db()
      .from('tool_intelligence_history')
      .select('category, seo_score, monetization_score, outcome, created_at')
      .gte('created_at', since)
      .limit(500);

    return data || [];
  } catch (_) { return []; }
}

function _emptyReport() {
  return {
    adjustments: [], adaptiveThresholds: { recommendedMinScore: 55, recommendedMaxConcurrent: 3, expansionVelocity: 'maintain' },
    strategyRecommendations: [], catStats: {}, overallSuccessRate: 0, totalEvents: 0,
    learningMs: 0, learnedAt: new Date().toISOString(),
  };
}

module.exports = { getLearningSignals, invalidateCache };
