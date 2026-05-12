'use strict';

/**
 * AWE-OS — LearningEventCapture                               Phase 5B
 *
 * EventBus subscriber that translates runtime events into learning_events rows.
 * This is the entry point for all autonomous learning — every pipeline
 * lifecycle event flows through here.
 *
 * Design:
 *   - Subscribes to EventBus wildcards on init
 *   - Each captured event is immediately persisted to learning_events table
 *   - Routes to the appropriate learner (SuccessLearner, FailureLearner)
 *   - Never throws — all errors are caught and logged
 *   - Async processing: never blocks the EventBus callback
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('learning-capture');

const EVENT_TO_OUTCOME = {
  'pipeline.completed': 'success',
  'pipeline.failed':    'failure',
  'pipeline.cancelled': 'failure',
  'pipeline.timed_out': 'failure',
  'pipeline.stalled':   'failure',
  'step.completed':     'success',
  'step.failed':        'failure',
  'step.retried':       'partial',
};

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// Deferred to prevent circular requires at module load time
let _successLearner = null;
let _failureLearner = null;
function getSuccessLearner() {
  if (!_successLearner) _successLearner = require('./SuccessLearner');
  return _successLearner;
}
function getFailureLearner() {
  if (!_failureLearner) _failureLearner = require('./FailureLearner');
  return _failureLearner;
}

class LearningEventCapture {
  constructor() {
    this._captureCount = 0;
    this._errorCount   = 0;
    this._initialized  = false;
  }

  /**
   * Wire into EventBus. Call once at runtime startup.
   */
  init(bus) {
    if (this._initialized) return;
    this._initialized = true;

    const { EVENTS } = require('../runtime/EventBus');

    // Pipeline lifecycle
    bus.subscribe(EVENTS.PIPELINE_COMPLETED, p => this._capture('pipeline.completed', p));
    bus.subscribe(EVENTS.PIPELINE_FAILED,    p => this._capture('pipeline.failed',    p));
    bus.subscribe(EVENTS.PIPELINE_STARTED,   p => this._capture('pipeline.started',   p));

    // Step lifecycle
    bus.subscribe('step.completed', p => this._capture('step.completed', p));
    bus.subscribe('step.failed',    p => this._capture('step.failed',    p));
    bus.subscribe('step.retried',   p => this._capture('step.retried',   p));

    log.info('LearningEventCapture initialized');
  }

  getStats() {
    return {
      captureCount: this._captureCount,
      errorCount:   this._errorCount,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _capture(eventType, payload) {
    // Never await in EventBus handler — fire and forget
    setImmediate(() => this._processCapture(eventType, payload));
  }

  async _processCapture(eventType, payload) {
    try {
      this._captureCount++;

      const outcome    = EVENT_TO_OUTCOME[eventType] ?? 'unknown';
      const executionId = payload?.executionId ?? null;
      const pipelineId  = payload?.pipelineId  ?? null;
      const stepName    = payload?.stepName    ?? null;
      const agentName   = payload?.agentName   ?? null;
      const durationMs  = payload?.durationMs  ?? null;
      const errorMsg    = payload?.error?.message ?? payload?.error ?? null;

      const score = this._inferScore(outcome, payload);

      const event = {
        event_type:        eventType,
        source_type:       pipelineId ? 'pipeline' : 'step',
        source_id:         pipelineId ?? stepName,
        outcome,
        confidence:        score / 100,
        score,
        pipeline_id:       pipelineId,
        execution_id:      executionId,
        agent_name:        agentName,
        duration_ms:       durationMs,
        error_category:    payload?.errorCategory ?? null,
        pattern_signature: payload?.patternSignature ?? null,
        metadata:          {
          stepName,
          errorMsg,
          context: payload?.context ?? null,
        },
        learned_at:  new Date().toISOString(),
        processed:   false,
      };

      // Persist event
      await this._persistEvent(event);

      // Route to specialized learner
      if (outcome === 'success') {
        await getSuccessLearner().processEvent(event, payload);
      } else if (outcome === 'failure') {
        await getFailureLearner().processEvent(event, payload);
      }

    } catch (err) {
      this._errorCount++;
      log.warn('LearningEventCapture._processCapture failed', { eventType, error: err.message });
    }
  }

  async _persistEvent(event) {
    try {
      await db().from('learning_events').insert(event);
    } catch (err) {
      // Fallback: just log (DB unavailable)
      log.debug('Learning event DB write failed', { error: err.message });
    }
  }

  _inferScore(outcome, payload) {
    if (payload?.score != null) return Math.max(0, Math.min(100, Number(payload.score)));
    if (outcome === 'success')  return 80;
    if (outcome === 'partial')  return 50;
    if (outcome === 'failure')  return 10;
    return 0;
  }
}

// Process-singleton
const learningEventCapture = new LearningEventCapture();

module.exports = { LearningEventCapture, learningEventCapture };
