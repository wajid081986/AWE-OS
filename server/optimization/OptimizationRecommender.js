'use strict';

/**
 * AWE-OS — OptimizationRecommender                             Phase 5D
 *
 * Unified recommendation aggregator. Collects from all optimization sources:
 *   - RuntimeOptimizer    (bottleneck detections → real-time events)
 *   - PipelineOptimizer   (execution history analysis)
 *   - OptimizationAdvisor (Phase 5B — step/tool/queue/memory analysis)
 *
 * Deduplicates, scores, and ranks recommendations.
 * Exposes a clean API for admin dashboard and AutonomousTuner.
 *
 * Scoring formula:
 *   finalScore = confidence × priorityWeight × recencyFactor
 *
 * Priority weights: critical=2.0, high=1.5, medium=1.0, low=0.5
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('optimization-recommender');

const PRIORITY_WEIGHTS = Object.freeze({
  critical: 2.0,
  high:     1.5,
  medium:   1.0,
  low:      0.5,
});

class OptimizationRecommender {
  constructor() {
    this._runtimeOptimizer    = null;
    this._pipelineOptimizer   = null;
    this._optimizationAdvisor = null;
    this._bus = null;
    this._initialized = false;
  }

  /**
   * Wire dependencies. Called once at startup.
   */
  init(runtimeOptimizer, pipelineOptimizer, optimizationAdvisor, bus) {
    if (this._initialized) return;
    this._initialized = true;
    this._runtimeOptimizer    = runtimeOptimizer;
    this._pipelineOptimizer   = pipelineOptimizer;
    this._optimizationAdvisor = optimizationAdvisor;
    this._bus = bus;
    log.info('OptimizationRecommender initialized');
  }

  /**
   * Get all pending recommendations from all sources, scored and ranked.
   *
   * @param {object} [filter] — { source, targetType, minConfidence, priority, limit }
   */
  async getRecommendations(filter = {}) {
    const limit = filter.limit ?? 50;
    const minConf = filter.minConfidence ?? 0.0;

    try {
      const supabase = require('../db/supabase');
      let q = supabase
        .from('optimization_recommendations')
        .select('*')
        .eq('status', 'pending')
        .gte('confidence', minConf)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (filter.source)     q = q.eq('source', filter.source);
      if (filter.targetType) q = q.eq('target_type', filter.targetType);
      if (filter.priority)   q = q.eq('priority', filter.priority);

      const { data } = await q.order('confidence', { ascending: false }).limit(limit * 2);

      const rows = data ?? [];
      const scored = rows.map(r => this._score(r)).sort((a, b) => b._finalScore - a._finalScore);
      return scored.slice(0, limit);
    } catch (err) {
      log.warn('getRecommendations failed', { error: err.message });
      return [];
    }
  }

  /**
   * Get top N high-confidence recommendations.
   */
  async getTopRecommendations(limit = 10, minConfidence = 0.70) {
    return this.getRecommendations({ limit, minConfidence });
  }

  /**
   * Get recommendations that are safe for auto-application.
   */
  async getAutoApplicable(limit = 5, minConfidence = 0.80) {
    try {
      const supabase = require('../db/supabase');
      const { data } = await supabase
        .from('optimization_recommendations')
        .select('*')
        .eq('status', 'pending')
        .eq('auto_applicable', true)
        .gte('confidence', minConfidence)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('confidence', { ascending: false })
        .limit(limit);

      return (data ?? []).map(r => this._score(r)).sort((a, b) => b._finalScore - a._finalScore);
    } catch (_) { return []; }
  }

  /**
   * Apply a recommendation: update status and notify AutonomousTuner if auto-applicable.
   *
   * @param {string} recommendationId
   * @param {string} appliedBy — admin user ID or 'auto'
   */
  async applyRecommendation(recommendationId, appliedBy = 'admin') {
    try {
      const supabase = require('../db/supabase');
      const { data: rec } = await supabase
        .from('optimization_recommendations')
        .select('*')
        .eq('id', recommendationId)
        .single();

      if (!rec) throw Object.assign(new Error('Recommendation not found'), { code: 'NOT_FOUND' });
      if (rec.status !== 'pending') throw Object.assign(new Error(`Recommendation already ${rec.status}`), { code: 'ALREADY_PROCESSED' });

      await supabase.from('optimization_recommendations')
        .update({ status: 'applied', applied_at: new Date().toISOString(), applied_by: appliedBy, updated_at: new Date().toISOString() })
        .eq('id', recommendationId);

      // Notify for autonomous tuning if auto-applicable
      if (rec.auto_applicable) {
        this._bus?.emit('optimization.recommendation.ready', {
          ...rec,
          autoApplicable: rec.auto_applicable,
          recommendationType: rec.recommendation_type,
          targetId: rec.target_id,
        }, { source: 'optimization-recommender', persist: false });
      }

      log.info('Recommendation applied', { id: recommendationId, appliedBy });
      return rec;
    } catch (err) {
      log.warn('applyRecommendation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Dismiss a recommendation.
   */
  async dismissRecommendation(recommendationId, reason = '') {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('optimization_recommendations')
        .update({
          status:          'rejected',
          rejected_at:     new Date().toISOString(),
          rejected_reason: reason,
          updated_at:      new Date().toISOString(),
        })
        .eq('id', recommendationId);
      log.info('Recommendation dismissed', { id: recommendationId, reason });
    } catch (err) {
      log.warn('dismissRecommendation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Run a fresh analysis cycle across all optimizers and collect new recommendations.
   */
  async runAnalysisCycle() {
    const results = await Promise.allSettled([
      this._pipelineOptimizer?.analyze(48).catch(() => []),
      this._optimizationAdvisor?.analyze({ windowHours: 24 }).catch(() => []),
    ]);

    const totalNew = results
      .filter(r => r.status === 'fulfilled')
      .reduce((s, r) => s + (r.value?.length ?? 0), 0);

    log.info('Optimization analysis cycle complete', { newRecommendations: totalNew });
    return { newRecommendations: totalNew };
  }

  async getStats() {
    try {
      const supabase = require('../db/supabase');
      const { data } = await supabase
        .from('optimization_recommendations')
        .select('status, confidence, priority, source');

      const rows = data ?? [];
      const pending  = rows.filter(r => r.status === 'pending');
      const applied  = rows.filter(r => r.status === 'applied');
      const rejected = rows.filter(r => r.status === 'rejected');

      const avgConf = pending.length
        ? Math.round(pending.reduce((s, r) => s + parseFloat(r.confidence ?? 0), 0) / pending.length * 100) / 100
        : null;

      const bySource = {};
      for (const r of rows) bySource[r.source] = (bySource[r.source] ?? 0) + 1;

      return {
        total:   rows.length,
        pending: pending.length,
        applied: applied.length,
        rejected: rejected.length,
        avgPendingConfidence: avgConf,
        bySource,
        runtimeBottlenecks: this._runtimeOptimizer?.getBottlenecks().length ?? 0,
      };
    } catch (_) {
      return { total: 0, pending: 0, applied: 0, rejected: 0 };
    }
  }

  // ── Scoring ───────────────────────────────────────────────────────────────────

  _score(recommendation) {
    const confidence     = parseFloat(recommendation.confidence ?? 0.5);
    const priorityWeight = PRIORITY_WEIGHTS[recommendation.priority] ?? 1.0;
    const ageMs          = Date.now() - new Date(recommendation.created_at ?? Date.now()).getTime();
    const ageHours       = ageMs / (1000 * 60 * 60);
    const recencyFactor  = Math.max(0.5, 1 - (ageHours / 168));  // decay over 7 days

    const finalScore = confidence * priorityWeight * recencyFactor;
    return { ...recommendation, _finalScore: Math.round(finalScore * 1000) / 1000 };
  }
}

const optimizationRecommender = new OptimizationRecommender();

module.exports = { OptimizationRecommender, optimizationRecommender };
