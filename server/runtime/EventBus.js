'use strict';

/**
 * AWE-OS — In-Process Event Bus                              Phase 4A
 *
 * Provider-agnostic pub/sub for internal runtime communication.
 * Designed for extensibility: today in-process, tomorrow Redis pub/sub
 * without changing any calling code.
 *
 * Features:
 *   - Exact-match + wildcard subscriptions ('pipeline.*')
 *   - Sync emit (fire-and-forget) + async emitAsync (awaitable)
 *   - Strict error isolation — one handler failure never affects others
 *   - Best-effort DB persistence to runtime_events (audit trail)
 *   - subscribeOnce helper
 *   - Unsubscribe via returned cleanup function
 *
 * NOT for distributed workers — no Redis pub/sub here (that is Phase 5).
 */

const supabase = require('../db/supabase');

// ── Event taxonomy — all valid event types ────────────────────────────────────
const EVENTS = Object.freeze({
  // Pipeline lifecycle
  PIPELINE_STARTED:   'pipeline.started',
  PIPELINE_COMPLETED: 'pipeline.completed',
  PIPELINE_FAILED:    'pipeline.failed',
  PIPELINE_CANCELLED: 'pipeline.cancelled',
  PIPELINE_PAUSED:    'pipeline.paused',
  PIPELINE_RESUMED:   'pipeline.resumed',

  // Step lifecycle
  STEP_STARTED:       'step.started',
  STEP_COMPLETED:     'step.completed',
  STEP_FAILED:        'step.failed',
  STEP_RETRYING:      'step.retrying',
  STEP_TIMEOUT:       'step.timeout',

  // Tool lifecycle
  TOOL_CREATED:       'tool.created',
  TOOL_PUBLISHED:     'tool.published',
  TOOL_FAILED:        'tool.failed',

  // Agent lifecycle
  AGENT_STARTED:      'agent.started',
  AGENT_COMPLETED:    'agent.completed',
  AGENT_TIMEOUT:      'agent.timeout',
  AGENT_ERROR:        'agent.error',

  // System
  RUNTIME_ERROR:      'runtime.error',
  QUEUE_STALLED:      'queue.stalled',
  HEARTBEAT_MISSED:   'heartbeat.missed',
});

// High-frequency/transient events that should not be DB-persisted
const NO_PERSIST_EVENTS = new Set(['step.heartbeat', 'agent.heartbeat']);

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    this._persistEnabled = true;
  }

  /**
   * Subscribe to an event type.
   * Supports exact match ('pipeline.started') and wildcard ('pipeline.*').
   *
   * @param {string}   eventType
   * @param {Function} handler   - (payload) => void
   * @returns {Function}           Cleanup function → call to unsubscribe
   */
  subscribe(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`EventBus.subscribe: handler must be a function (got ${typeof handler})`);
    }
    if (!this._listeners.has(eventType)) this._listeners.set(eventType, new Set());
    this._listeners.get(eventType).add(handler);
    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Subscribe to an event type exactly once — auto-unsubscribes after first fire.
   */
  subscribeOnce(eventType, handler) {
    const wrapper = (payload) => {
      this.unsubscribe(eventType, wrapper);
      handler(payload);
    };
    return this.subscribe(eventType, wrapper);
  }

  /** Remove a specific handler. Safe to call with an unregistered handler. */
  unsubscribe(eventType, handler) {
    this._listeners.get(eventType)?.delete(handler);
  }

  /**
   * Emit an event synchronously.
   * All matching handlers are invoked; errors are caught and logged.
   *
   * @param {string} eventType
   * @param {object} payload
   * @param {{ source?: string, persist?: boolean }} [options]
   * @returns {number} Number of handlers notified
   */
  emit(eventType, payload = {}, options = {}) {
    const enriched = this._enrich(eventType, payload, options.source);
    const handlers = this._getMatchingHandlers(eventType);

    for (const handler of handlers) {
      try { handler(enriched); }
      catch (err) {
        console.error(`[EventBus] Handler error for "${eventType}":`, err?.message);
      }
    }

    if (options.persist !== false && this._persistEnabled && !NO_PERSIST_EVENTS.has(eventType)) {
      this._persistEvent(eventType, enriched, options.source).catch(() => {});
    }

    return handlers.size;
  }

  /**
   * Emit an event and await all handler Promises.
   * Use when downstream handlers MUST complete before proceeding.
   *
   * @returns {Promise<{ notified: number, errors: number }>}
   */
  async emitAsync(eventType, payload = {}, options = {}) {
    const enriched = this._enrich(eventType, payload, options.source);
    const handlers = this._getMatchingHandlers(eventType);

    const results = await Promise.allSettled(
      [...handlers].map(h => Promise.resolve().then(() => h(enriched)))
    );

    const errorCount = results.filter(r => r.status === 'rejected').length;
    if (errorCount > 0) {
      console.error(`[EventBus] ${errorCount} async handler(s) failed for "${eventType}"`);
    }

    if (options.persist !== false && this._persistEnabled && !NO_PERSIST_EVENTS.has(eventType)) {
      await this._persistEvent(eventType, enriched, options.source).catch(() => {});
    }

    return { notified: handlers.size, errors: errorCount };
  }

  getListenerCount(eventType) {
    return this._listeners.get(eventType)?.size ?? 0;
  }

  setPersistEnabled(enabled) { this._persistEnabled = !!enabled; }

  // ── Internals ──────────────────────────────────────────────────────────────

  _enrich(eventType, payload, source) {
    return { ...payload, _event: eventType, _ts: new Date().toISOString(), _source: source || 'runtime' };
  }

  /**
   * Collect handlers whose subscription key matches eventType.
   * Supports: exact match AND wildcard ('pipeline.*' matches 'pipeline.started').
   */
  _getMatchingHandlers(eventType) {
    const matched = new Set();
    for (const [key, handlers] of this._listeners) {
      const matches = key === eventType
        || (key.endsWith('.*') && eventType.startsWith(key.slice(0, -1)));
      if (matches) for (const h of handlers) matched.add(h);
    }
    return matched;
  }

  async _persistEvent(eventType, payload, source) {
    try {
      await supabase.from('runtime_events').insert({
        event_type: eventType,
        payload,
        source: source || 'runtime',
      });
    } catch (_) {
      // Persistence is best-effort — a DB failure must never break event delivery
    }
  }
}

// Process-singleton — one bus per Node.js process
const bus = new EventBus();

module.exports = { EventBus, bus, EVENTS };
