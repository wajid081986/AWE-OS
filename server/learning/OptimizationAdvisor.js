'use strict';

/**
 * AWE-OS — OptimizationAdvisor                                Phase 5B
 *
 * Analyzes runtime metrics and generates concrete optimization suggestions.
 * Called by LearningPipeline C (Optimization Learning) and on-demand via API.
 *
 * Analyzes:
 *   - Pipeline execution durations (bottleneck step detection)
 *   - Step failure rates (highest-failure agents)
 *   - Queue utilization trends
 *   - Memory growth patterns
 *   - Retry rates (over-retrying agents)
 *
 * Produces:
 *   - optimization_history rows
 *   - ai_memories rows (type: 'performance')
 *   - Structured recommendations for admin dashboard
 */

const { longTermMemory } = require('../memory/LongTermMemory');
const { semanticMemory } = require('../memory/SemanticMemory');
const { createLogger }   = require('../monitoring/logger');

const log = createLogger('optimization-advisor');

const SLOW_STEP_MS       = 60_000;   // steps slower than 1 min are candidates
const HIGH_RETRY_RATE    = 0.30;     // >30% retry rate is notable
const HIGH_FAILURE_RATE  = 0.25;     // >25% failure rate triggers suggestion

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

class OptimizationAdvisor {

  /**
   * Run a full optimization analysis cycle.
   * Generates and persists recommendations.
   *
   * @param {object} [options]
   * @param {number} [options.windowHours]  — analysis window (default: 24h)
   * @returns {Promise<Array>} suggestions array
   */
  async analyze(options = {}) {
    const windowHours = options.windowHours ?? 24;
    const suggestions = [];

    try {
      const [stepAnalysis, queueAnalysis, toolAnalysis, memoryAnalysis] =
        await Promise.allSettled([
          this._analyzeStepPerformance(windowHours),
          this._analyzeQueueHealth(),
          this._analyzeToolPerformance(windowHours),
          this._analyzeMemoryTrend(),
        ]);

      if (stepAnalysis.status  === 'fulfilled') suggestions.push(...stepAnalysis.value);
      if (queueAnalysis.status === 'fulfilled') suggestions.push(...queueAnalysis.value);
      if (toolAnalysis.status  === 'fulfilled') suggestions.push(...toolAnalysis.value);
      if (memoryAnalysis.status === 'fulfilled') suggestions.push(...memoryAnalysis.value);

      // Persist all suggestions
      for (const s of suggestions) {
        await this._persistSuggestion(s);
      }

      log.info('Optimization analysis complete', { suggestions: suggestions.length, windowHours });
      return suggestions;

    } catch (err) {
      log.warn('OptimizationAdvisor.analyze failed', { error: err.message });
      return [];
    }
  }

  /**
   * Return recent pending suggestions for the admin dashboard.
   */
  async getPendingSuggestions(limit = 20) {
    try {
      const { data } = await db()
        .from('optimization_history')
        .select('*')
        .eq('status', 'suggested')
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      return data ?? [];
    } catch (_) { return []; }
  }

  /**
   * Mark a suggestion as applied or rejected.
   */
  async updateStatus(id, status, appliedBy = 'admin') {
    try {
      await db()
        .from('optimization_history')
        .update({
          status,
          applied_at: status === 'applied' ? new Date().toISOString() : null,
          applied_by: status === 'applied' ? appliedBy : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (_) {}
  }

  async getStats() {
    try {
      const { data } = await db()
        .from('optimization_history')
        .select('status, improvement_pct');

      const rows = data ?? [];
      const applied = rows.filter(r => r.status === 'applied');
      const avgImprovement = applied.length > 0
        ? Math.round(applied.reduce((s, r) => s + (r.improvement_pct ?? 0), 0) / applied.length * 10) / 10
        : 0;

      return {
        total: rows.length,
        pending:  rows.filter(r => r.status === 'suggested').length,
        applied:  applied.length,
        rejected: rows.filter(r => r.status === 'rejected').length,
        avgImprovementPct: avgImprovement,
      };
    } catch (_) { return { total: 0, pending: 0, applied: 0, rejected: 0 }; }
  }

  // ── Analysis sub-routines ───────────────────────────────────────────────────

  async _analyzeStepPerformance(windowHours) {
    const suggestions = [];
    try {
      const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
      const { data } = await db()
        .from('pipeline_step_executions')
        .select('agent_name, duration_ms, status, attempts')
        .gte('created_at', since)
        .not('agent_name', 'is', null);

      if (!data?.length) return suggestions;

      // Group by agent_name
      const grouped = {};
      for (const row of data) {
        const a = row.agent_name;
        if (!grouped[a]) grouped[a] = { durations: [], failures: 0, retries: 0, total: 0 };
        grouped[a].total++;
        if (row.duration_ms) grouped[a].durations.push(row.duration_ms);
        if (row.status === 'failed') grouped[a].failures++;
        if ((row.attempts ?? 1) > 1) grouped[a].retries++;
      }

      for (const [agent, stats] of Object.entries(grouped)) {
        if (stats.total < 3) continue;  // Need at least 3 samples

        const avgDuration = stats.durations.length
          ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
          : 0;
        const failureRate = stats.failures / stats.total;
        const retryRate   = stats.retries  / stats.total;

        if (avgDuration > SLOW_STEP_MS) {
          suggestions.push({
            targetType:       'step',
            targetId:         agent,
            optimizationType: 'timeout',
            suggestion:       `Agent "${agent}" averages ${Math.round(avgDuration / 1000)}s. Consider increasing timeout or optimizing prompt.`,
            confidence:       0.70,
            beforeState:      { avgDurationMs: avgDuration, agent },
            afterState:       { recommendation: 'increase_timeout_or_optimize' },
          });
        }

        if (failureRate > HIGH_FAILURE_RATE) {
          suggestions.push({
            targetType:       'step',
            targetId:         agent,
            optimizationType: 'retry_policy',
            suggestion:       `Agent "${agent}" has ${(failureRate * 100).toFixed(0)}% failure rate. Review error patterns and adjust retry policy.`,
            confidence:       0.75,
            beforeState:      { failureRate: Math.round(failureRate * 100), agent },
            afterState:       { recommendation: 'review_retry_policy' },
          });
        }

        if (retryRate > HIGH_RETRY_RATE) {
          suggestions.push({
            targetType:       'step',
            targetId:         agent,
            optimizationType: 'concurrency',
            suggestion:       `Agent "${agent}" retries ${(retryRate * 100).toFixed(0)}% of executions. Possible flakiness — reduce concurrency or add circuit breaker.`,
            confidence:       0.65,
            beforeState:      { retryRate: Math.round(retryRate * 100) },
            afterState:       { recommendation: 'add_circuit_breaker' },
          });
        }
      }
    } catch (_) {}
    return suggestions;
  }

  async _analyzeQueueHealth() {
    const suggestions = [];
    try {
      const { executionQueue } = require('../runtime/ExecutionQueue');
      const m = executionQueue.getMetrics();

      if (m.utilizationPct >= 80) {
        suggestions.push({
          targetType:       'system',
          targetId:         'execution_queue',
          optimizationType: 'queue',
          suggestion:       `Execution queue at ${m.utilizationPct}% capacity (${m.activeCount}/${m.maxConcurrent}). Consider increasing PIPELINE_MAX_CONCURRENT.`,
          confidence:       0.80,
          beforeState:      { utilizationPct: m.utilizationPct, maxConcurrent: m.maxConcurrent },
          afterState:       { recommendation: 'increase_PIPELINE_MAX_CONCURRENT' },
        });
      }
    } catch (_) {}
    return suggestions;
  }

  async _analyzeToolPerformance(windowHours) {
    const suggestions = [];
    try {
      const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
      const { data } = await db()
        .from('tool_performance_history')
        .select('tool_id, tool_slug, outcome, score, retry_count')
        .gte('recorded_at', since);

      if (!data?.length) return suggestions;

      const grouped = {};
      for (const row of data) {
        const key = row.tool_slug ?? row.tool_id;
        if (!grouped[key]) grouped[key] = { failures: 0, total: 0, scores: [] };
        grouped[key].total++;
        if (row.outcome === 'failure') grouped[key].failures++;
        if (row.score != null) grouped[key].scores.push(row.score);
      }

      for (const [toolKey, stats] of Object.entries(grouped)) {
        if (stats.total < 5) continue;
        const failRate = stats.failures / stats.total;
        const avgScore = stats.scores.length
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
          : null;

        if (failRate > 0.40 || (avgScore !== null && avgScore < 40)) {
          suggestions.push({
            targetType:       'tool',
            targetId:         toolKey,
            optimizationType: 'prompt',
            suggestion:       `Tool "${toolKey}" has ${(failRate * 100).toFixed(0)}% failure rate and avg score ${avgScore ?? '?'}. Consider prompt evolution.`,
            confidence:       0.72,
            beforeState:      { failureRate: Math.round(failRate * 100), avgScore, tool: toolKey },
            afterState:       { recommendation: 'evolve_prompt' },
          });
        }
      }
    } catch (_) {}
    return suggestions;
  }

  async _analyzeMemoryTrend() {
    const suggestions = [];
    try {
      const { memoryProfiler } = require('../monitoring/memoryProfiler');
      const stats = memoryProfiler.getStats();
      if (stats.growthMbPerMin > 3) {
        suggestions.push({
          targetType:       'system',
          targetId:         'heap',
          optimizationType: 'concurrency',
          suggestion:       `Heap growing at ${stats.growthMbPerMin}MB/min. Review for memory leaks or reduce PIPELINE_MAX_CONCURRENT.`,
          confidence:       0.65,
          beforeState:      { growthMbPerMin: stats.growthMbPerMin, heapMb: stats.current.heapUsedMb },
          afterState:       { recommendation: 'investigate_memory_leak' },
        });
      }
    } catch (_) {}
    return suggestions;
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  async _persistSuggestion(s) {
    try {
      await db().from('optimization_history').insert({
        target_type:      s.targetType,
        target_id:        s.targetId      ?? null,
        optimization_type: s.optimizationType,
        suggestion:       s.suggestion,
        before_state:     s.beforeState   ?? {},
        after_state:      s.afterState    ?? {},
        confidence:       s.confidence    ?? 0.5,
        status:           'suggested',
      });

      // Also store in long-term memory for future recall
      setImmediate(async () => {
        try {
          const id = await longTermMemory.store({
            memoryType:  'performance',
            subject:     `optimization:${s.targetType}:${s.targetId}`,
            content:     s,
            confidence:  s.confidence ?? 0.5,
            tags:        ['optimization', s.optimizationType, s.targetType].filter(Boolean),
            sourceType:  'advisor',
          });
          if (id) await semanticMemory.index(id, ['optimization', s.optimizationType]);
        } catch (_) {}
      });
    } catch (_) {}
  }
}

// Process-singleton
const optimizationAdvisor = new OptimizationAdvisor();

module.exports = { OptimizationAdvisor, optimizationAdvisor };
