'use strict';

/**
 * AWE-OS — HeartbeatManager                                    Phase 4E
 *
 * Emits two kinds of heartbeats:
 *   1. Worker heartbeat  — updates runtime_workers.last_heartbeat_at (via WorkerRegistry._beat)
 *   2. Execution heartbeat — updates pipeline_executions.heartbeat_at for running executions
 *
 * StallDetector already reads pipeline_executions.heartbeat_at to detect stalls.
 * HeartbeatManager ensures those timestamps stay fresh for every active execution.
 */

const { workerRegistry }  = require('./WorkerRegistry');
const { createLogger }    = require('../../monitoring/logger');

const log = createLogger('heartbeat-manager');

const EXEC_HEARTBEAT_INTERVAL_MS = 20_000; // Every 20 s — well under StallDetector's 5-min threshold

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

class HeartbeatManager {
  constructor() {
    this._active      = new Set();  // Set<executionId> currently being tracked
    this._timer       = null;
    this._running     = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Start tracking heartbeats for an execution.
   * Must be called when an execution transitions to RUNNING.
   *
   * @param {string} executionId
   */
  track(executionId) {
    this._active.add(executionId);
    if (!this._timer) this._startTimer();
  }

  /**
   * Stop tracking heartbeats for an execution (completed, failed, cancelled).
   *
   * @param {string} executionId
   */
  untrack(executionId) {
    this._active.delete(executionId);
    if (this._active.size === 0) this._stopTimer();
  }

  /**
   * True if this execution is currently being tracked.
   */
  isTracking(executionId) {
    return this._active.has(executionId);
  }

  /**
   * Count of actively tracked executions.
   */
  get trackedCount() {
    return this._active.size;
  }

  /**
   * Destroy — called during shutdown.
   */
  destroy() {
    this._stopTimer();
    this._active.clear();
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _startTimer() {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), EXEC_HEARTBEAT_INTERVAL_MS);
    this._timer.unref();
  }

  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async _tick() {
    if (this._running || this._active.size === 0) return;
    this._running = true;

    const ids = [...this._active];

    try {
      await db()
        .from('pipeline_executions')
        .update({ heartbeat_at: new Date().toISOString() })
        .in('id', ids)
        .in('status', ['running', 'retrying']);

      log.debug('Execution heartbeats updated', {
        count:     ids.length,
        workerId:  workerRegistry.workerId,
      });
    } catch (err) {
      log.warn('Execution heartbeat batch failed', { error: err.message });
    } finally {
      this._running = false;
    }
  }
}

// Process-singleton
const heartbeatManager = new HeartbeatManager();

module.exports = { HeartbeatManager, heartbeatManager, EXEC_HEARTBEAT_INTERVAL_MS };
