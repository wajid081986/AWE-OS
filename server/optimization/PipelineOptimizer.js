'use strict';

/**
 * AWE-OS — PipelineOptimizer                                   Phase 5D
 *
 * Analyzes historical pipeline execution data to generate concrete optimization
 * recommendations for: retry policies, concurrency, timeout strategies,
 * execution ordering, and queue throughput.
 *
 * Works from DB data (pipeline_step_executions, tool_performance_history) —
 * does NOT touch live execution state.
 *
 * Outputs recommendations to optimization_recommendations table.
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('pipeline-optimizer');

const ANALYSIS_WINDOW_HOURS = 48;
const MIN_SAMPLE_COUNT = 5;

class PipelineOptimizer {
  constructor() {
    this._lastRunAt = null;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;
    log.info('PipelineOptimizer initialized');
  }

  /**
   * Run full pipeline optimization analysis.
   * Analyzes execution history and generates recommendations.
   *
   * @returns {Promise<Recommendation[]>}
   */
  async analyze(windowHours = ANALYSIS_WINDOW_HOURS) {
    this._lastRunAt = new Date().toISOString();
    const recommendations = [];

    const [retryRecs, timeoutRecs, throughputRecs, orderRecs] = await Promise.allSettled([
      this._analyzeRetryPolicies(windowHours),
      this._analyzeTimeouts(windowHours),
      this._analyzeThroughput(windowHours),
      this._analyzeExecutionOrder(windowHours),
    ]);

    if (retryRecs.status    === 'fulfilled') recommendations.push(...retryRecs.value);
    if (timeoutRecs.status  === 'fulfilled') recommendations.push(...timeoutRecs.value);
    if (throughputRecs.status === 'fulfilled') recommendations.push(...throughputRecs.value);
    if (orderRecs.status    === 'fulfilled') recommendations.push(...orderRecs.value);

    // Persist recommendations
    for (const rec of recommendations) {
      await this._persistRecommendation(rec).catch(() => {});
    }

    log.info('PipelineOptimizer analysis complete', { recommendations: recommendations.length, windowHours });
    return recommendations;
  }

  /**
   * Get pending pipeline optimization recommendations.
   */
  async getPendingRecommendations(limit = 20) {
    try {
      const supabase = require('../db/supabase');
      const { data } = await supabase
        .from('optimization_recommendations')
        .select('*')
        .eq('source', 'pipeline_optimizer')
        .eq('status', 'pending')
        .order('confidence', { ascending: false })
        .limit(limit);
      return data ?? [];
    } catch (_) { return []; }
  }

  getStats() {
    return { lastRunAt: this._lastRunAt, source: 'pipeline_optimizer' };
  }

  // ── Analysis sub-routines ────────────────────────────────────────────────────

  async _analyzeRetryPolicies(windowHours) {
    const recs = [];
    try {
      const supabase = require('../db/supabase');
      const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

      const { data } = await supabase
        .from('pipeline_step_executions')
        .select('agent_name, status, attempts, error_category, duration_ms')
        .gte('created_at', since)
        .not('agent_name', 'is', null);

      if (!data?.length) return recs;

      // Group by agent
      const grouped = {};
      for (const row of data) {
        const a = row.agent_name;
        if (!grouped[a]) grouped[a] = { total: 0, retries: 0, failures: 0, categories: {} };
        grouped[a].total++;
        if ((row.attempts ?? 1) > 1) grouped[a].retries++;
        if (row.status === 'failed') grouped[a].failures++;
        const cat = row.error_category ?? 'unknown';
        grouped[a].categories[cat] = (grouped[a].categories[cat] ?? 0) + 1;
      }

      for (const [agent, stats] of Object.entries(grouped)) {
        if (stats.total < MIN_SAMPLE_COUNT) continue;

        const retryRate  = stats.retries   / stats.total;
        const failRate   = stats.failures  / stats.total;
        const topCat = Object.entries(stats.categories).sort((a, b) => b[1] - a[1])[0];

        if (retryRate > 0.40) {
          recs.push({
            source:             'pipeline_optimizer',
            targetType:         'step',
            targetId:           agent,
            recommendationType: 'retry_policy',
            title:              `High retry rate on ${agent}`,
            description:        `"${agent}" retries ${(retryRate*100).toFixed(0)}% of executions. Consider exponential backoff or circuit breaker.`,
            impactDescription:  'Reducing retries lowers latency and resource consumption.',
            confidence:         0.78,
            priority:           retryRate > 0.60 ? 'high' : 'medium',
            estimatedImpactPct: Math.round(retryRate * 30),
            beforeState:        { retryRate: Math.round(retryRate*100), total: stats.total },
            afterState:         { recommendation: 'exponential_backoff', topErrorCategory: topCat?.[0] },
            autoApplicable:     false,
          });
        }

        if (failRate > 0.30 && topCat?.[0] === 'rate-limit') {
          recs.push({
            source:             'pipeline_optimizer',
            targetType:         'step',
            targetId:           agent,
            recommendationType: 'retry_policy',
            title:              `Rate-limit failures on ${agent}`,
            description:        `"${agent}" has ${(failRate*100).toFixed(0)}% failure rate from rate limits. Add rate-limit aware backoff.`,
            impactDescription:  'Rate-limit-aware retry prevents cascading failures.',
            confidence:         0.85,
            priority:           'high',
            estimatedImpactPct: 25,
            beforeState:        { failRate: Math.round(failRate*100), category: 'rate-limit' },
            afterState:         { recommendation: 'rate_limit_backoff' },
            autoApplicable:     false,
          });
        }
      }
    } catch (_) {}
    return recs;
  }

  async _analyzeTimeouts(windowHours) {
    const recs = [];
    try {
      const supabase = require('../db/supabase');
      const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

      const { data } = await supabase
        .from('pipeline_step_executions')
        .select('agent_name, duration_ms, status')
        .gte('created_at', since)
        .eq('status', 'timeout')
        .not('agent_name', 'is', null);

      if (!data?.length) return recs;

      const agentTimeouts = {};
      for (const row of data) {
        const a = row.agent_name;
        agentTimeouts[a] = (agentTimeouts[a] ?? 0) + 1;
      }

      for (const [agent, count] of Object.entries(agentTimeouts)) {
        if (count < 2) continue;
        recs.push({
          source:             'pipeline_optimizer',
          targetType:         'step',
          targetId:           agent,
          recommendationType: 'timeout',
          title:              `Frequent timeouts on ${agent}`,
          description:        `"${agent}" timed out ${count} times in ${windowHours}h window. Consider increasing timeout or adding streaming.`,
          impactDescription:  'Proper timeouts prevent long stalls and improve throughput.',
          confidence:         0.75,
          priority:           count >= 5 ? 'high' : 'medium',
          estimatedImpactPct: 15,
          beforeState:        { timeoutCount: count, windowHours },
          afterState:         { recommendation: 'increase_timeout' },
          autoApplicable:     false,
        });
      }
    } catch (_) {}
    return recs;
  }

  async _analyzeThroughput(windowHours) {
    const recs = [];
    try {
      const supabase = require('../db/supabase');
      const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

      const { data } = await supabase
        .from('tool_performance_history')
        .select('outcome, duration_ms, retry_count')
        .gte('recorded_at', since);

      if (!data?.length || data.length < 10) return recs;

      const total     = data.length;
      const failures  = data.filter(r => r.outcome === 'failure').length;
      const highRetry = data.filter(r => (r.retry_count ?? 0) > 2).length;
      const avgDuration = data
        .filter(r => r.duration_ms)
        .reduce((s, r) => s + r.duration_ms, 0) / data.filter(r => r.duration_ms).length;

      if (failures / total > 0.20) {
        recs.push({
          source:             'pipeline_optimizer',
          targetType:         'system',
          targetId:           'pipeline_throughput',
          recommendationType: 'concurrency',
          title:              'High pipeline failure rate affecting throughput',
          description:        `${(failures/total*100).toFixed(0)}% pipeline failure rate. Reducing concurrency may improve stability.`,
          impactDescription:  'Lower concurrency reduces contention and improves success rate.',
          confidence:         0.70,
          priority:           failures/total > 0.35 ? 'high' : 'medium',
          estimatedImpactPct: 20,
          beforeState:        { failureRate: Math.round(failures/total*100), total },
          afterState:         { recommendation: 'reduce_max_concurrency' },
          autoApplicable:     false,
        });
      }

      if (avgDuration > 90_000 && total >= 20) {
        recs.push({
          source:             'pipeline_optimizer',
          targetType:         'system',
          targetId:           'pipeline_throughput',
          recommendationType: 'timeout',
          title:              'High average pipeline duration',
          description:        `Average pipeline duration is ${Math.round(avgDuration/1000)}s. Review slow steps for optimization.`,
          impactDescription:  'Faster pipelines increase throughput and user satisfaction.',
          confidence:         0.65,
          priority:           'medium',
          estimatedImpactPct: 15,
          beforeState:        { avgDurationMs: Math.round(avgDuration), sampleCount: total },
          afterState:         { recommendation: 'profile_slow_steps' },
          autoApplicable:     false,
        });
      }
    } catch (_) {}
    return recs;
  }

  async _analyzeExecutionOrder(_windowHours) {
    // Reserved for future: analyze step dependency graph for parallelization opportunities
    return [];
  }

  async _persistRecommendation(rec) {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('optimization_recommendations').insert({
        source:               rec.source,
        target_type:          rec.targetType,
        target_id:            rec.targetId ?? null,
        recommendation_type:  rec.recommendationType,
        title:                rec.title,
        description:          rec.description,
        impact_description:   rec.impactDescription ?? null,
        confidence:           rec.confidence,
        priority:             rec.priority ?? 'medium',
        estimated_impact_pct: rec.estimatedImpactPct ?? null,
        before_state:         rec.beforeState ?? {},
        after_state:          rec.afterState  ?? {},
        auto_applicable:      rec.autoApplicable ?? false,
        status:               'pending',
        expires_at:           new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (_) {}
  }
}

const pipelineOptimizer = new PipelineOptimizer();

module.exports = { PipelineOptimizer, pipelineOptimizer };
