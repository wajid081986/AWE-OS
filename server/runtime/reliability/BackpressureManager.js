'use strict';

/**
 * AWE-OS — BackpressureManager                                 Phase 4F
 *
 * Multi-level flood protection for the execution queue.
 * Tracks memory + queue load and returns a pressure level (0–3).
 *
 * Levels:
 *   0 — NORMAL    (accept all)
 *   1 — ELEVATED  (log, track)
 *   2 — HIGH      (reject low-priority enqueues)
 *   3 — CRITICAL  (reject all new work, emit alert)
 *
 * Pressure is re-sampled on every check() call (cheap, no setInterval needed).
 */

const { createLogger } = require('../../monitoring/logger');
const { bus, EVENTS }  = require('../EventBus');

const log = createLogger('backpressure');

const LEVELS = Object.freeze({
  NORMAL:   0,
  ELEVATED: 1,
  HIGH:     2,
  CRITICAL: 3,
});

const LEVEL_NAMES = ['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL'];

// Thresholds — env-configurable
const HEAP_ELEVATED_MB  = Number(process.env.BP_HEAP_ELEVATED_MB  || 400);
const HEAP_HIGH_MB      = Number(process.env.BP_HEAP_HIGH_MB      || 600);
const HEAP_CRITICAL_MB  = Number(process.env.BP_HEAP_CRITICAL_MB  || 800);

const QUEUE_ELEVATED_PCT = Number(process.env.BP_QUEUE_ELEVATED_PCT || 50);
const QUEUE_HIGH_PCT     = Number(process.env.BP_QUEUE_HIGH_PCT     || 75);
const QUEUE_CRITICAL_PCT = Number(process.env.BP_QUEUE_CRITICAL_PCT || 90);

class BackpressureManager {
  constructor() {
    this._level        = LEVELS.NORMAL;
    this._lastCheck    = 0;
    this._checkIntervalMs = 5_000;  // re-sample at most every 5 s
    this._callbacks    = new Map();  // level → Set<fn>
    this._totalRejections = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns current pressure level (0–3).
   * Re-samples if enough time has passed since last check.
   */
  check(queueMetrics = null) {
    const now = Date.now();
    if (now - this._lastCheck >= this._checkIntervalMs) {
      this._sample(queueMetrics);
      this._lastCheck = now;
    }
    return this._level;
  }

  /**
   * True if at level 2 (HIGH) or above — reject low-priority work.
   */
  isHigh(queueMetrics = null) {
    return this.check(queueMetrics) >= LEVELS.HIGH;
  }

  /**
   * True if at level 3 (CRITICAL) — reject all new work.
   */
  isCritical(queueMetrics = null) {
    return this.check(queueMetrics) >= LEVELS.CRITICAL;
  }

  /**
   * Decide whether to accept a new execution request.
   *
   * @param {{ priority?: number }} options  - priority 0 = low, 10 = critical
   * @param {object} [queueMetrics]          - from executionQueue.getMetrics()
   * @returns {{ accept: boolean, reason: string | null, level: number }}
   */
  evaluate(options = {}, queueMetrics = null) {
    const level    = this.check(queueMetrics);
    const priority = options.priority ?? 5;

    if (level === LEVELS.CRITICAL) {
      this._totalRejections++;
      return { accept: false, reason: 'System under CRITICAL pressure — all new work rejected', level };
    }

    if (level === LEVELS.HIGH && priority < 8) {
      this._totalRejections++;
      return { accept: false, reason: 'System under HIGH pressure — only high-priority work accepted', level };
    }

    return { accept: true, reason: null, level };
  }

  /** Human-readable current level name. */
  get levelName() { return LEVEL_NAMES[this._level] ?? 'UNKNOWN'; }

  /** Stats snapshot. */
  getStats() {
    return {
      level:          this._level,
      levelName:      this.levelName,
      heapMb:         this._heapMb(),
      totalRejections: this._totalRejections,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _sample(queueMetrics) {
    const heap = this._heapMb();
    const queuePct = queueMetrics?.utilizationPct ?? 0;

    let heapLevel  = LEVELS.NORMAL;
    let queueLevel = LEVELS.NORMAL;

    if (heap >= HEAP_CRITICAL_MB)       heapLevel = LEVELS.CRITICAL;
    else if (heap >= HEAP_HIGH_MB)      heapLevel = LEVELS.HIGH;
    else if (heap >= HEAP_ELEVATED_MB)  heapLevel = LEVELS.ELEVATED;

    if (queuePct >= QUEUE_CRITICAL_PCT)      queueLevel = LEVELS.CRITICAL;
    else if (queuePct >= QUEUE_HIGH_PCT)     queueLevel = LEVELS.HIGH;
    else if (queuePct >= QUEUE_ELEVATED_PCT) queueLevel = LEVELS.ELEVATED;

    const newLevel = Math.max(heapLevel, queueLevel);

    if (newLevel !== this._level) {
      const prev = this._level;
      this._level = newLevel;
      this._onLevelChange(prev, newLevel, { heap, queuePct });
    }
  }

  _onLevelChange(from, to, context) {
    const logFn = to >= LEVELS.HIGH ? 'warn' : 'info';
    log[logFn]('Backpressure level changed', {
      from: LEVEL_NAMES[from],
      to:   LEVEL_NAMES[to],
      ...context,
    });

    if (to >= LEVELS.CRITICAL) {
      try { bus.emit(EVENTS.QUEUE_STALLED, { reason: 'CRITICAL backpressure', ...context }); } catch (_) {}
    }
  }

  _heapMb() {
    return Math.round(process.memoryUsage().heapUsed / 1_048_576);
  }
}

// Process-singleton
const backpressureManager = new BackpressureManager();

module.exports = { BackpressureManager, backpressureManager, LEVELS };
