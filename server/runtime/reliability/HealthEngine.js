'use strict';

/**
 * AWE-OS — HealthEngine                                        Phase 4F
 *
 * Composite runtime health assessment. Aggregates signals from all
 * subsystems and returns a single health verdict + breakdown.
 *
 * Health levels: healthy → degraded → unhealthy
 * Used by /api/runtime/health endpoint and admin dashboard.
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('health-engine');

const HEALTH = Object.freeze({
  HEALTHY:   'healthy',
  DEGRADED:  'degraded',
  UNHEALTHY: 'unhealthy',
});

// Thresholds
const STALL_WARN_COUNT     = 2;
const STALL_CRIT_COUNT     = 5;
const FAILURE_RATE_WARN    = 0.25;  // 25% failures → degraded
const FAILURE_RATE_CRIT    = 0.60;  // 60% failures → unhealthy
const CIRCUIT_OPEN_WARN    = 1;
const CIRCUIT_OPEN_CRIT    = 3;
const QUEUE_UTIL_WARN      = 0.70;  // 70% queue depth → degraded
const QUEUE_UTIL_CRIT      = 0.90;

class HealthEngine {
  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Run all health checks and return composite result.
   *
   * @returns {Promise<{
   *   status: string,
   *   checks: Record<string, { status: string, detail: string }>,
   *   generatedAt: string
   * }>}
   */
  async assess() {
    const checks = await this._runChecks();
    const statuses = Object.values(checks).map(c => c.status);

    let overall;
    if (statuses.includes(HEALTH.UNHEALTHY)) overall = HEALTH.UNHEALTHY;
    else if (statuses.includes(HEALTH.DEGRADED)) overall = HEALTH.DEGRADED;
    else overall = HEALTH.HEALTHY;

    if (overall !== HEALTH.HEALTHY) {
      log.warn('Health assessment', { status: overall, checks });
    }

    return { status: overall, checks, generatedAt: new Date().toISOString() };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async _runChecks() {
    const results = await Promise.allSettled([
      this._checkQueue(),
      this._checkCircuitBreakers(),
      this._checkStalls(),
      this._checkMemory(),
      this._checkBackpressure(),
    ]);

    return {
      queue:          this._settle(results[0]),
      circuitBreakers: this._settle(results[1]),
      stalls:         this._settle(results[2]),
      memory:         this._settle(results[3]),
      backpressure:   this._settle(results[4]),
    };
  }

  _settle(result) {
    if (result.status === 'rejected') {
      return { status: HEALTH.DEGRADED, detail: `Check failed: ${result.reason?.message}` };
    }
    return result.value;
  }

  async _checkQueue() {
    try {
      const { executionQueue } = require('../ExecutionQueue');
      const m = executionQueue.getMetrics();
      const util = m.utilizationPct / 100;

      if (util >= QUEUE_UTIL_CRIT) return { status: HEALTH.UNHEALTHY, detail: `Queue ${m.utilizationPct}% full` };
      if (util >= QUEUE_UTIL_WARN) return { status: HEALTH.DEGRADED,  detail: `Queue ${m.utilizationPct}% full` };
      return { status: HEALTH.HEALTHY, detail: `Queue ${m.utilizationPct}% (${m.activeCount}/${m.maxConcurrent} active)` };
    } catch (_) {
      return { status: HEALTH.HEALTHY, detail: 'Queue check unavailable' };
    }
  }

  async _checkCircuitBreakers() {
    try {
      const { getAllStats } = require('./CircuitBreaker');
      const all  = getAllStats();
      const open = all.filter(b => b.state === 'OPEN').length;

      if (open >= CIRCUIT_OPEN_CRIT) return { status: HEALTH.UNHEALTHY, detail: `${open} circuit breakers OPEN` };
      if (open >= CIRCUIT_OPEN_WARN) return { status: HEALTH.DEGRADED,  detail: `${open} circuit breaker(s) OPEN` };
      return { status: HEALTH.HEALTHY, detail: `${all.length} breaker(s), all CLOSED/HALF_OPEN` };
    } catch (_) {
      return { status: HEALTH.HEALTHY, detail: 'No circuit breakers registered' };
    }
  }

  async _checkStalls() {
    try {
      const { stallDetector } = require('../StallDetector');
      const stalled = await stallDetector.getStalledExecutions();
      const count = stalled.length;

      if (count >= STALL_CRIT_COUNT) return { status: HEALTH.UNHEALTHY, detail: `${count} stalled executions` };
      if (count >= STALL_WARN_COUNT) return { status: HEALTH.DEGRADED,  detail: `${count} stalled execution(s)` };
      return { status: HEALTH.HEALTHY, detail: count === 0 ? 'No stalls' : `${count} stall(s)` };
    } catch (_) {
      return { status: HEALTH.HEALTHY, detail: 'Stall check unavailable' };
    }
  }

  async _checkMemory() {
    const heapMb = Math.round(process.memoryUsage().heapUsed / 1_048_576);
    const rssMb  = Math.round(process.memoryUsage().rss / 1_048_576);

    if (heapMb > 800) return { status: HEALTH.UNHEALTHY, detail: `Heap ${heapMb}MB (critical)` };
    if (heapMb > 500) return { status: HEALTH.DEGRADED,  detail: `Heap ${heapMb}MB (elevated)` };
    return { status: HEALTH.HEALTHY, detail: `Heap ${heapMb}MB, RSS ${rssMb}MB` };
  }

  async _checkBackpressure() {
    try {
      const { backpressureManager, LEVELS } = require('./BackpressureManager');
      const level = backpressureManager.check();
      const name  = backpressureManager.levelName;

      if (level >= LEVELS.CRITICAL) return { status: HEALTH.UNHEALTHY, detail: `Backpressure: ${name}` };
      if (level >= LEVELS.HIGH)     return { status: HEALTH.DEGRADED,  detail: `Backpressure: ${name}` };
      return { status: HEALTH.HEALTHY, detail: `Backpressure: ${name}` };
    } catch (_) {
      return { status: HEALTH.HEALTHY, detail: 'Backpressure check unavailable' };
    }
  }
}

// Process-singleton
const healthEngine = new HealthEngine();

module.exports = { HealthEngine, healthEngine, HEALTH };
