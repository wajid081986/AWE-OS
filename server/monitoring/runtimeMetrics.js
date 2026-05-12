'use strict';

/**
 * AWE-OS — Runtime Metrics Engine                            Phase 4D
 *
 * In-memory metrics store, updated via EventBus subscriptions.
 * Survives process-local use; snapshots are queryable via /api/runtime/metrics.
 *
 * Tracks:
 *   Counters  — monotonically increasing (executions_total, retries_total, …)
 *   Gauges    — current value (active_executions, queue_depth)
 *   Histograms — duration arrays for p50/p95/p99 calculations
 *   Rates     — rolling 5-minute window for success/failure rate
 *
 * Call initMetrics(bus) once at startup to wire EventBus subscriptions.
 */

const { createLogger } = require('./logger');
const log = createLogger('runtime-metrics');

// Rolling window duration (ms) — 5 minutes
const ROLLING_WINDOW_MS = 5 * 60_000;

// Cap histogram arrays to avoid unbounded memory growth
const MAX_HISTOGRAM_SIZE = 1000;

class RuntimeMetrics {
  constructor() {
    this._counters    = {};
    this._gauges      = {};
    this._histograms  = {};
    this._rollingEvents = []; // { ts: number, type: 'success'|'failure'|'cancelled' }
    this._initialized  = false;
    this._startedAt    = Date.now();
  }

  // ── Mutation API ───────────────────────────────────────────────────────────

  inc(name, delta = 1) {
    this._counters[name] = (this._counters[name] || 0) + delta;
  }

  setGauge(name, value) {
    this._gauges[name] = value;
  }

  adjustGauge(name, delta) {
    this._gauges[name] = Math.max(0, (this._gauges[name] || 0) + delta);
  }

  recordDuration(name, ms) {
    if (!this._histograms[name]) this._histograms[name] = [];
    const h = this._histograms[name];
    h.push(ms);
    if (h.length > MAX_HISTOGRAM_SIZE) h.shift(); // drop oldest
  }

  recordRolling(type) {
    this._rollingEvents.push({ ts: Date.now(), type });
    // Prune old entries
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    this._rollingEvents = this._rollingEvents.filter(e => e.ts >= cutoff);
  }

  // ── Query API ──────────────────────────────────────────────────────────────

  /**
   * Full metrics snapshot for /api/runtime/metrics.
   */
  getSnapshot() {
    const now    = Date.now();
    const cutoff = now - ROLLING_WINDOW_MS;
    const window = this._rollingEvents.filter(e => e.ts >= cutoff);

    const windowTotal    = window.length;
    const windowSuccess  = window.filter(e => e.type === 'success').length;
    const windowFailed   = window.filter(e => e.type === 'failure').length;
    const windowCancelled = window.filter(e => e.type === 'cancelled').length;

    const durations = this._histograms['execution_duration_ms'] || [];

    return {
      counters: { ...this._counters },
      gauges:   { ...this._gauges   },
      rolling: {
        windowMs:       ROLLING_WINDOW_MS,
        total:          windowTotal,
        success:        windowSuccess,
        failed:         windowFailed,
        cancelled:      windowCancelled,
        successRate:    windowTotal > 0 ? +(windowSuccess  / windowTotal).toFixed(4) : null,
        failureRate:    windowTotal > 0 ? +(windowFailed   / windowTotal).toFixed(4) : null,
        cancellationRate: windowTotal > 0 ? +(windowCancelled / windowTotal).toFixed(4) : null,
      },
      durations: _percentiles(durations),
      uptimeSeconds: Math.round((now - this._startedAt) / 1000),
      snapshotAt: new Date(now).toISOString(),
    };
  }

  /** Reset all metrics (for testing). */
  reset() {
    this._counters   = {};
    this._gauges     = {};
    this._histograms = {};
    this._rollingEvents = [];
  }

  /**
   * Wire EventBus listeners — must be called exactly once at startup.
   * @param {import('../runtime/EventBus').EventBus} bus
   */
  initMetrics(bus) {
    if (this._initialized) return;
    this._initialized = true;

    const { EVENTS } = require('../runtime/EventBus');

    bus.subscribe(EVENTS.PIPELINE_STARTED, () => {
      this.inc('executions_started');
      this.adjustGauge('active_executions', +1);
    });

    bus.subscribe(EVENTS.PIPELINE_COMPLETED, (p) => {
      this.inc('executions_completed');
      this.adjustGauge('active_executions', -1);
      this.recordRolling('success');
      if (p.durationMs) this.recordDuration('execution_duration_ms', p.durationMs);
    });

    bus.subscribe(EVENTS.PIPELINE_FAILED, (p) => {
      this.inc('executions_failed');
      this.adjustGauge('active_executions', -1);
      this.recordRolling('failure');
      if (p.durationMs) this.recordDuration('execution_duration_ms', p.durationMs);
    });

    bus.subscribe(EVENTS.PIPELINE_CANCELLED, () => {
      this.inc('executions_cancelled');
      this.adjustGauge('active_executions', -1);
      this.recordRolling('cancelled');
    });

    bus.subscribe(EVENTS.PIPELINE_PAUSED, () => {
      this.inc('approvals_pending');
    });

    bus.subscribe(EVENTS.PIPELINE_RESUMED, () => {
      this.inc('approvals_resolved');
      if (this._counters['approvals_pending'] > 0) {
        this.inc('approvals_pending', -1);
      }
    });

    bus.subscribe(EVENTS.STEP_RETRYING, () => {
      this.inc('step_retries_total');
    });

    bus.subscribe(EVENTS.AGENT_TIMEOUT, () => {
      this.inc('agent_timeouts_total');
    });

    bus.subscribe(EVENTS.AGENT_ERROR, () => {
      this.inc('agent_errors_total');
    });

    // Stall detector events
    bus.subscribe(EVENTS.HEARTBEAT_MISSED, () => {
      this.inc('stall_detections_total');
      this.adjustGauge('stalled_executions', +1);
    });

    bus.subscribe(EVENTS.QUEUE_STALLED, () => {
      this.inc('queue_stalls_total');
    });

    log.info('Runtime metrics engine initialized');
  }
}

// ── Percentile calculator ──────────────────────────────────────────────────────

function _percentiles(arr) {
  if (!arr.length) return { count: 0, p50: null, p95: null, p99: null, min: null, max: null, mean: null };
  const sorted = [...arr].sort((a, b) => a - b);
  const n      = sorted.length;
  const pct    = (p) => sorted[Math.ceil(n * p / 100) - 1];
  const mean   = Math.round(arr.reduce((s, v) => s + v, 0) / n);
  return { count: n, p50: pct(50), p95: pct(95), p99: pct(99), min: sorted[0], max: sorted[n - 1], mean };
}

// Process-singleton
const metrics = new RuntimeMetrics();

module.exports = { RuntimeMetrics, metrics };
