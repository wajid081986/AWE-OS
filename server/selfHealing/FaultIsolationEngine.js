'use strict';

/**
 * AWE-OS — FaultIsolationEngine                                  Phase 6E
 *
 * Contains failures before they cascade. Operates at the module boundary
 * level to quarantine faulty components while keeping healthy ones running.
 *
 * Isolation primitives:
 *   quarantine    — mark a module/agent as unsafe, redirect its traffic
 *   circuit       — open/close circuit breakers per module
 *   fence         — deny execution requests from degraded components
 *   degrade       — drop to reduced-functionality mode for affected scope
 *   release       — remove quarantine after cooldown / health confirmation
 *
 * Circuit breaker states:
 *   CLOSED   — normal operation
 *   OPEN     — failing, reject all requests immediately
 *   HALF_OPEN — probing with limited traffic to test recovery
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('fault-isolation');

// Circuit breaker thresholds
const CB_FAILURE_THRESHOLD = 5;    // failures before OPEN
const CB_SUCCESS_THRESHOLD = 2;    // successes in HALF_OPEN before CLOSED
const CB_TIMEOUT_MS        = 30_000; // 30 s before trying HALF_OPEN
const CB_WINDOW_MS         = 60_000; // 1 min sliding window for failure counting

// Quarantine settings
const QUARANTINE_COOLDOWN_MS = 10 * 60_000; // 10 min before release attempt
const MAX_QUARANTINE_QUEUE   = 200;

// Degradation levels
const DEGRADATION = {
  NONE:     0,
  PARTIAL:  1,  // non-critical features disabled
  SEVERE:   2,  // only critical paths active
  CRITICAL: 3,  // emergency routing only
};

// In-memory state
const _circuits     = new Map(); // moduleId → CircuitState
const _quarantined  = new Map(); // moduleId → QuarantineEntry
const _fenceLog     = [];        // last N fence events

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a failure for a module. Handles circuit breaker state transitions.
 *
 * @param {string} moduleId
 * @param {object} [opts]
 * @param {string} [opts.error]
 * @param {string} [opts.context]
 */
function recordFailure(moduleId, opts = {}) {
  const { error = '', context = '' } = opts;
  const now = Date.now();

  const cb = _ensureCircuit(moduleId);

  // Slide window: remove failures older than CB_WINDOW_MS
  cb.failures = cb.failures.filter(ts => (now - ts) < CB_WINDOW_MS);
  cb.failures.push(now);
  cb.lastFailureAt = now;
  cb.totalFailures++;

  if (cb.state === 'HALF_OPEN') {
    // Any failure in HALF_OPEN → back to OPEN
    _openCircuit(moduleId, cb, 'failure_in_half_open');
  } else if (cb.state === 'CLOSED' && cb.failures.length >= CB_FAILURE_THRESHOLD) {
    _openCircuit(moduleId, cb, 'threshold_exceeded');
  }

  _circuits.set(moduleId, cb);

  log.warn('Failure recorded', { moduleId, circuitState: cb.state, windowFailures: cb.failures.length, error: error.slice(0, 200) });

  _persistIsolationEvent({ type: 'failure', moduleId, error, context, state: cb.state }).catch(() => {});
}

/**
 * Record a success for a module. Handles HALF_OPEN → CLOSED transitions.
 *
 * @param {string} moduleId
 */
function recordSuccess(moduleId) {
  const cb = _ensureCircuit(moduleId);
  cb.totalSuccesses++;

  if (cb.state === 'HALF_OPEN') {
    cb.halfOpenSuccesses = (cb.halfOpenSuccesses || 0) + 1;
    if (cb.halfOpenSuccesses >= CB_SUCCESS_THRESHOLD) {
      _closeCircuit(moduleId, cb);
    }
  }

  _circuits.set(moduleId, cb);
}

/**
 * Check if a module is allowed to execute.
 * Returns true if allowed (circuit CLOSED or HALF_OPEN probe allowed).
 *
 * @param {string} moduleId
 * @returns {{ allowed: boolean, reason: string }}
 */
function canExecute(moduleId) {
  const cb = _ensureCircuit(moduleId);

  if (_quarantined.has(moduleId)) {
    const q = _quarantined.get(moduleId);
    return { allowed: false, reason: `quarantined:${q.reason}` };
  }

  if (cb.state === 'CLOSED') {
    return { allowed: true, reason: 'circuit_closed' };
  }

  if (cb.state === 'OPEN') {
    // Check if cooldown elapsed → try HALF_OPEN
    if ((Date.now() - cb.openedAt) >= CB_TIMEOUT_MS) {
      _halfOpenCircuit(moduleId, cb);
      return { allowed: true, reason: 'circuit_half_open_probe' };
    }
    _logFence(moduleId, 'circuit_open');
    return { allowed: false, reason: 'circuit_open' };
  }

  if (cb.state === 'HALF_OPEN') {
    // Allow one probe at a time; if already probing, reject
    if (cb.probeInFlight) {
      _logFence(moduleId, 'half_open_probe_in_flight');
      return { allowed: false, reason: 'half_open_probe_in_flight' };
    }
    cb.probeInFlight = true;
    _circuits.set(moduleId, cb);
    return { allowed: true, reason: 'circuit_half_open_probe' };
  }

  return { allowed: true, reason: 'circuit_closed' };
}

/**
 * Quarantine a module — all traffic redirected away.
 *
 * @param {string} moduleId
 * @param {string} reason
 * @param {object} [opts]
 * @param {number} [opts.degradationLevel]
 */
function quarantine(moduleId, reason, opts = {}) {
  const { degradationLevel = DEGRADATION.PARTIAL } = opts;

  _quarantined.set(moduleId, {
    moduleId,
    reason,
    degradationLevel,
    quarantinedAt: Date.now(),
    releaseAfter:  Date.now() + QUARANTINE_COOLDOWN_MS,
  });

  // Force OPEN circuit breaker
  const cb = _ensureCircuit(moduleId);
  _openCircuit(moduleId, cb, `quarantine:${reason}`);

  log.warn('Module quarantined', { moduleId, reason, degradationLevel });
  _persistIsolationEvent({ type: 'quarantine', moduleId, reason, degradationLevel }).catch(() => {});
}

/**
 * Attempt to release quarantine. Only succeeds if cooldown elapsed.
 *
 * @param {string} moduleId
 * @param {boolean} [force=false] — bypass cooldown check
 * @returns {{ released: boolean, reason: string }}
 */
function releaseQuarantine(moduleId, force = false) {
  const q = _quarantined.get(moduleId);
  if (!q) return { released: false, reason: 'not_quarantined' };

  if (!force && Date.now() < q.releaseAfter) {
    const waitSec = Math.round((q.releaseAfter - Date.now()) / 1000);
    return { released: false, reason: 'cooldown', waitSec };
  }

  _quarantined.delete(moduleId);

  // Reset circuit to HALF_OPEN so it can probe
  const cb = _ensureCircuit(moduleId);
  _halfOpenCircuit(moduleId, cb);

  log.info('Module released from quarantine', { moduleId });
  _persistIsolationEvent({ type: 'release', moduleId, reason: 'quarantine_released' }).catch(() => {});

  return { released: true, reason: 'ok' };
}

/**
 * Get the degradation level for a module (based on quarantine state).
 *
 * @param {string} moduleId
 * @returns {number} DEGRADATION level
 */
function getDegradationLevel(moduleId) {
  const q = _quarantined.get(moduleId);
  return q ? q.degradationLevel : DEGRADATION.NONE;
}

/**
 * Get isolation status for all modules (or a specific one).
 *
 * @param {string} [moduleId]
 */
function getIsolationStatus(moduleId = null) {
  if (moduleId) {
    return {
      circuit:      _circuits.get(moduleId) || { state: 'CLOSED', failures: [], totalFailures: 0 },
      quarantine:   _quarantined.get(moduleId) || null,
      degradation:  getDegradationLevel(moduleId),
    };
  }

  const circuits = {};
  for (const [id, cb] of _circuits) {
    circuits[id] = { state: cb.state, windowFailures: cb.failures.length, totalFailures: cb.totalFailures };
  }

  const quarantines = {};
  for (const [id, q] of _quarantined) {
    quarantines[id] = { reason: q.reason, quarantinedAt: new Date(q.quarantinedAt).toISOString(), releaseAfter: new Date(q.releaseAfter).toISOString() };
  }

  return {
    circuits,
    quarantines,
    openCircuits:      [..._circuits.values()].filter(c => c.state === 'OPEN').length,
    halfOpenCircuits:  [..._circuits.values()].filter(c => c.state === 'HALF_OPEN').length,
    quarantinedCount:  _quarantined.size,
    recentFenceEvents: _fenceLog.slice(-20),
  };
}

/**
 * Auto-release quarantines that have served their cooldown.
 * Call periodically from SelfHealingEngine.
 *
 * @returns {string[]} released module IDs
 */
function autoReleaseExpired() {
  const released = [];
  const now = Date.now();
  for (const [id, q] of _quarantined) {
    if (now >= q.releaseAfter) {
      _quarantined.delete(id);
      const cb = _ensureCircuit(id);
      _halfOpenCircuit(id, cb);
      released.push(id);
      log.info('Auto-released quarantine', { moduleId: id });
    }
  }
  return released;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _ensureCircuit(moduleId) {
  if (!_circuits.has(moduleId)) {
    _circuits.set(moduleId, {
      state:            'CLOSED',
      failures:         [],
      totalFailures:    0,
      totalSuccesses:   0,
      halfOpenSuccesses: 0,
      probeInFlight:    false,
      openedAt:         null,
      lastFailureAt:    null,
    });
  }
  return _circuits.get(moduleId);
}

function _openCircuit(moduleId, cb, reason) {
  cb.state          = 'OPEN';
  cb.openedAt       = Date.now();
  cb.probeInFlight  = false;
  cb.halfOpenSuccesses = 0;
  log.warn('Circuit opened', { moduleId, reason, failures: cb.failures.length });
}

function _halfOpenCircuit(moduleId, cb) {
  cb.state             = 'HALF_OPEN';
  cb.halfOpenSuccesses = 0;
  cb.probeInFlight     = false;
  log.info('Circuit half-open', { moduleId });
}

function _closeCircuit(moduleId, cb) {
  cb.state             = 'CLOSED';
  cb.failures          = [];
  cb.halfOpenSuccesses = 0;
  cb.probeInFlight     = false;
  log.info('Circuit closed (recovered)', { moduleId });
  _persistIsolationEvent({ type: 'circuit_closed', moduleId }).catch(() => {});
}

function _logFence(moduleId, reason) {
  _fenceLog.push({ moduleId, reason, ts: Date.now() });
  if (_fenceLog.length > MAX_QUARANTINE_QUEUE) _fenceLog.shift();
}

async function _persistIsolationEvent(event) {
  await db()
    .from('isolated_faults')
    .insert({
      module_id:         event.moduleId,
      event_type:        event.type,
      reason:            event.reason      || null,
      degradation_level: event.degradationLevel ?? 0,
      circuit_state:     _circuits.get(event.moduleId)?.state || 'CLOSED',
      error_message:     event.error       || null,
      metadata:          event.context ? { context: event.context } : {},
      recorded_at:       new Date().toISOString(),
    })
    .catch(() => {});
}

module.exports = {
  recordFailure,
  recordSuccess,
  canExecute,
  quarantine,
  releaseQuarantine,
  getDegradationLevel,
  getIsolationStatus,
  autoReleaseExpired,
  DEGRADATION,
};
