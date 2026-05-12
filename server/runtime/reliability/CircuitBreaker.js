'use strict';

/**
 * AWE-OS — CircuitBreaker                                      Phase 4F
 *
 * Named circuit breaker registry. Each agent or external service has its own
 * breaker instance. States: CLOSED → OPEN → HALF_OPEN → CLOSED/OPEN
 *
 * Thresholds (per-instance, configurable):
 *   failureThreshold  — consecutive failures to trip to OPEN (default: 5)
 *   successThreshold  — consecutive successes in HALF_OPEN to close (default: 2)
 *   cooldownMs        — time in OPEN state before transitioning to HALF_OPEN (default: 60s)
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('circuit-breaker');

const STATES = Object.freeze({
  CLOSED:    'CLOSED',
  OPEN:      'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

const DEFAULT_OPTS = {
  failureThreshold: 5,
  successThreshold: 2,
  cooldownMs:       60_000,
};

class CircuitBreaker {
  /**
   * @param {string} name        - Identifier (e.g. 'openai', 'pipeline:email')
   * @param {object} [opts]
   */
  constructor(name, opts = {}) {
    this.name   = name;
    this.opts   = { ...DEFAULT_OPTS, ...opts };
    this.state  = STATES.CLOSED;

    this._failures    = 0;
    this._successes   = 0;
    this._lastTripped = null;
    this._totalTrips  = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Wrap an async function call through this breaker.
   * Throws if OPEN. Tracks success/failure to manage state transitions.
   *
   * @param {Function} fn  - async function to call
   * @returns {Promise<*>}
   */
  async call(fn) {
    this._maybeTransitionFromOpen();

    if (this.state === STATES.OPEN) {
      const err = new Error(`Circuit breaker OPEN: ${this.name}`);
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  /**
   * Manually record a success (for external monitoring integration).
   */
  recordSuccess() { this._onSuccess(); }

  /**
   * Manually record a failure.
   */
  recordFailure(err = null) { this._onFailure(err); }

  /** Current state string. */
  get currentState() { return this.state; }

  /** True if the breaker is preventing calls. */
  get isOpen() { return this.state === STATES.OPEN; }

  /**
   * Stats snapshot for monitoring endpoints.
   */
  getStats() {
    return {
      name:        this.name,
      state:       this.state,
      failures:    this._failures,
      successes:   this._successes,
      totalTrips:  this._totalTrips,
      lastTripped: this._lastTripped,
      cooldownMs:  this.opts.cooldownMs,
      reopensAt:   this._lastTripped
        ? new Date(this._lastTripped.getTime() + this.opts.cooldownMs).toISOString()
        : null,
    };
  }

  /** Force-reset the breaker (admin action). */
  reset() {
    this.state      = STATES.CLOSED;
    this._failures  = 0;
    this._successes = 0;
    log.info('Circuit breaker manually reset', { name: this.name });
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _maybeTransitionFromOpen() {
    if (this.state !== STATES.OPEN) return;
    if (!this._lastTripped) return;

    const elapsed = Date.now() - this._lastTripped.getTime();
    if (elapsed >= this.opts.cooldownMs) {
      this.state      = STATES.HALF_OPEN;
      this._successes = 0;
      log.info('Circuit breaker → HALF_OPEN', { name: this.name });
    }
  }

  _onSuccess() {
    if (this.state === STATES.HALF_OPEN) {
      this._successes++;
      if (this._successes >= this.opts.successThreshold) {
        this.state     = STATES.CLOSED;
        this._failures = 0;
        log.info('Circuit breaker → CLOSED (recovered)', { name: this.name });
      }
    } else if (this.state === STATES.CLOSED) {
      // Reset consecutive failure count on success
      this._failures = 0;
    }
  }

  _onFailure(err) {
    this._failures++;

    if (this.state === STATES.HALF_OPEN) {
      // Probe failed — back to OPEN
      this.state       = STATES.OPEN;
      this._lastTripped = new Date();
      this._totalTrips++;
      log.warn('Circuit breaker → OPEN (probe failed)', { name: this.name, error: err?.message });
      return;
    }

    if (this.state === STATES.CLOSED && this._failures >= this.opts.failureThreshold) {
      this.state        = STATES.OPEN;
      this._lastTripped = new Date();
      this._totalTrips++;
      log.warn('Circuit breaker tripped → OPEN', {
        name:     this.name,
        failures: this._failures,
        error:    err?.message,
      });
    }
  }
}

// ── Named registry ────────────────────────────────────────────────────────────

const _registry = new Map();

/**
 * Get or create a named circuit breaker.
 *
 * @param {string} name
 * @param {object} [opts]
 * @returns {CircuitBreaker}
 */
function getBreaker(name, opts = {}) {
  if (!_registry.has(name)) {
    _registry.set(name, new CircuitBreaker(name, opts));
  }
  return _registry.get(name);
}

/**
 * Return stats for all registered breakers.
 */
function getAllStats() {
  return [..._registry.values()].map(b => b.getStats());
}

/**
 * Remove a named breaker (rarely needed).
 */
function removeBreaker(name) {
  _registry.delete(name);
}

module.exports = {
  CircuitBreaker,
  STATES: STATES,
  getBreaker,
  getAllStats,
  removeBreaker,
};
