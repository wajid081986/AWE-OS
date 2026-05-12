'use strict';

/**
 * AWE-OS — LearningPipelines                                  Phase 5B
 *
 * Three named autonomous learning pipelines:
 *
 *   Pipeline A — Generation Learning
 *     trigger: every N completions OR scheduled (every 4h)
 *     flow: unprocessed_events → distill → ai_memories → prompt reinforcement
 *
 *   Pipeline B — Failure Learning
 *     trigger: on PIPELINE_FAILED event OR scheduled (every 2h)
 *     flow: recent_failures → root_cause → pattern_update → prevention_strategy
 *
 *   Pipeline C — Optimization Learning
 *     trigger: scheduled (every 6h)
 *     flow: runtime_metrics → bottleneck_analysis → suggestions → optimization_history
 *
 * Each pipeline is idempotent: safe to re-run at any time.
 * All pipelines are non-blocking: never hold up the runtime.
 */

const { optimizationAdvisor }   = require('./OptimizationAdvisor');
const { promptEvolutionEngine }  = require('./PromptEvolutionEngine');
const { longTermMemory }         = require('../memory/LongTermMemory');
const { createLogger }           = require('../monitoring/logger');

const log = createLogger('learning-pipelines');

// Pipeline run intervals
const PIPELINE_A_INTERVAL_MS = 4 * 60 * 60_000;   // 4 hours
const PIPELINE_B_INTERVAL_MS = 2 * 60 * 60_000;   // 2 hours
const PIPELINE_C_INTERVAL_MS = 6 * 60 * 60_000;   // 6 hours

// Batch size for distilling unprocessed events
const DISTILL_BATCH_SIZE = 50;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

class LearningPipelines {
  constructor() {
    this._timerA   = null;
    this._timerB   = null;
    this._timerC   = null;
    this._runningA = false;
    this._runningB = false;
    this._runningC = false;
    this._stats    = { a: 0, b: 0, c: 0, errors: 0 };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  start() {
    this._timerA = setInterval(() => this.runA(), PIPELINE_A_INTERVAL_MS);
    this._timerB = setInterval(() => this.runB(), PIPELINE_B_INTERVAL_MS);
    this._timerC = setInterval(() => this.runC(), PIPELINE_C_INTERVAL_MS);
    this._timerA.unref();
    this._timerB.unref();
    this._timerC.unref();

    log.info('Learning pipelines started', {
      intervalA: `${PIPELINE_A_INTERVAL_MS / 3_600_000}h`,
      intervalB: `${PIPELINE_B_INTERVAL_MS / 3_600_000}h`,
      intervalC: `${PIPELINE_C_INTERVAL_MS / 3_600_000}h`,
    });
  }

  stop() {
    clearInterval(this._timerA);
    clearInterval(this._timerB);
    clearInterval(this._timerC);
    this._timerA = this._timerB = this._timerC = null;
  }

  getStats() {
    return { ...this._stats };
  }

  // ── Pipeline A: Generation Learning ─────────────────────────────────────────

  /**
   * Distill unprocessed success events into persistent ai_memories.
   * Groups similar patterns; creates consolidated memories instead of duplicates.
   */
  async runA() {
    if (this._runningA) return;
    this._runningA = true;
    const start = Date.now();

    try {
      this._stats.a++;

      // Fetch unprocessed success events (batch)
      const { data: events } = await db()
        .from('learning_events')
        .select('*')
        .eq('outcome', 'success')
        .eq('processed', false)
        .order('learned_at', { ascending: true })
        .limit(DISTILL_BATCH_SIZE);

      if (!events?.length) return;

      // Group by pipeline_id for pattern consolidation
      const byPipeline = events.reduce((acc, e) => {
        const key = e.pipeline_id ?? 'unknown';
        (acc[key] ??= []).push(e);
        return acc;
      }, {});

      let distilled = 0;

      for (const [pipelineId, pEvents] of Object.entries(byPipeline)) {
        // Compute aggregate stats
        const scores     = pEvents.map(e => e.score).filter(s => s != null);
        const avgScore   = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const patterns   = [...new Set(pEvents.map(e => e.pattern_signature).filter(Boolean))];
        const durations  = pEvents.map(e => e.duration_ms).filter(d => d != null);
        const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

        // Upsert consolidated success memory
        await longTermMemory.upsert({
          memoryType:  'strategy',
          subject:     `pipeline_success:${pipelineId}`,
          content: {
            pipelineId,
            sampleCount:   pEvents.length,
            avgScore,
            avgDurationMs: avgDuration,
            patterns,
            timeWindow: {
              from: pEvents[0]?.learned_at,
              to:   pEvents[pEvents.length - 1]?.learned_at,
            },
          },
          confidence:  avgScore ? Math.max(0.1, Math.min(1, avgScore / 100)) : 0.6,
          tags:        ['success', 'pipeline', pipelineId, 'distilled'],
          sourceType:  'pipeline',
          sourceId:    pipelineId,
        });

        distilled++;
      }

      // Mark all as processed
      const ids = events.map(e => e.id);
      await db()
        .from('learning_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', ids);

      log.info('Pipeline A (Generation Learning) complete', {
        eventsProcessed: events.length,
        memoriesDistilled: distilled,
        durationMs: Date.now() - start,
      });

    } catch (err) {
      this._stats.errors++;
      log.warn('Pipeline A failed', { error: err.message });
    } finally {
      this._runningA = false;
    }
  }

  // ── Pipeline B: Failure Learning ─────────────────────────────────────────────

  /**
   * Analyze recent failure patterns.
   * Identifies high-frequency patterns and generates prevention strategies.
   */
  async runB() {
    if (this._runningB) return;
    this._runningB = true;
    const start = Date.now();

    try {
      this._stats.b++;

      // Get high-frequency unresolved patterns
      const { data: patterns } = await db()
        .from('runtime_patterns')
        .select('*')
        .eq('pattern_type', 'failure')
        .eq('is_resolved', false)
        .gte('occurrences', 3)
        .order('occurrences', { ascending: false })
        .limit(20);

      if (!patterns?.length) {
        log.debug('Pipeline B: no high-frequency failure patterns');
        return;
      }

      let preventionCount = 0;

      for (const pattern of patterns) {
        // Check if we have a known fix
        const { data: fixes } = await db()
          .from('repair_history')
          .select('fix_type, confidence_after, success')
          .eq('error_pattern', pattern.signature)
          .eq('success', true)
          .order('confidence_after', { ascending: false })
          .limit(1);

        const bestFix = fixes?.[0];
        const prevention = {
          pattern: pattern.signature,
          occurrences: pattern.occurrences,
          knownFix: bestFix?.fix_type ?? null,
          fixConfidence: bestFix?.confidence_after ?? null,
          recommendation: bestFix
            ? `Apply known fix: ${bestFix.fix_type} (confidence: ${((bestFix.confidence_after ?? 0) * 100).toFixed(0)}%)`
            : `Pattern seen ${pattern.occurrences} times — needs investigation`,
        };

        // Upsert prevention memory
        await longTermMemory.upsert({
          memoryType:  'pattern',
          subject:     `failure_pattern:${pattern.signature}`,
          content:     { ...prevention, affectedTools: pattern.affected_tools },
          confidence:  bestFix ? (bestFix.confidence_after ?? 0.6) : 0.4,
          tags:        ['failure', 'pattern', pattern.signature.split(':')[0]].filter(Boolean),
          sourceType:  'pipeline_b',
        });

        preventionCount++;
      }

      log.info('Pipeline B (Failure Learning) complete', {
        patternsAnalyzed: patterns.length,
        preventionStrategiesCreated: preventionCount,
        durationMs: Date.now() - start,
      });

    } catch (err) {
      this._stats.errors++;
      log.warn('Pipeline B failed', { error: err.message });
    } finally {
      this._runningB = false;
    }
  }

  // ── Pipeline C: Optimization Learning ────────────────────────────────────────

  /**
   * Run the optimization advisor analysis and store results.
   */
  async runC() {
    if (this._runningC) return;
    this._runningC = true;
    const start = Date.now();

    try {
      this._stats.c++;

      const suggestions = await optimizationAdvisor.analyze({ windowHours: 24 });

      log.info('Pipeline C (Optimization Learning) complete', {
        suggestionsGenerated: suggestions.length,
        durationMs: Date.now() - start,
      });

    } catch (err) {
      this._stats.errors++;
      log.warn('Pipeline C failed', { error: err.message });
    } finally {
      this._runningC = false;
    }
  }
}

// Process-singleton
const learningPipelines = new LearningPipelines();

module.exports = {
  LearningPipelines,
  learningPipelines,
  PIPELINE_A_INTERVAL_MS,
  PIPELINE_B_INTERVAL_MS,
  PIPELINE_C_INTERVAL_MS,
};
