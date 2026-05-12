'use strict';

/**
 * AWE-OS — Diagnostics                                         Phase 4F
 *
 * Human-readable runtime warnings aggregator.
 * Collects signals from all subsystems and returns structured warning objects.
 * Used by /api/runtime/health and the admin dashboard.
 */

const { createLogger } = require('./logger');

const log = createLogger('diagnostics');

const SEVERITY = Object.freeze({
  INFO:  'info',
  WARN:  'warn',
  ERROR: 'error',
});

/**
 * Collect all active runtime warnings from all subsystems.
 *
 * @returns {Promise<Array<{ severity, source, message, detail, ts }>>}
 */
async function collectWarnings() {
  const warnings = [];
  const ts = new Date().toISOString();

  const checks = await Promise.allSettled([
    _checkMemory(warnings, ts),
    _checkCircuitBreakers(warnings, ts),
    _checkBackpressure(warnings, ts),
    _checkQueue(warnings, ts),
    _checkStalls(warnings, ts),
    _checkSlowExecutions(warnings, ts),
    _checkDeadLetterQueue(warnings, ts),
    _checkDeadWorkers(warnings, ts),
  ]);

  for (const c of checks) {
    if (c.status === 'rejected') {
      log.warn('Diagnostics check threw', { error: c.reason?.message });
    }
  }

  return warnings.sort((a, b) => {
    const order = { error: 0, warn: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
}

// ── Individual checks ─────────────────────────────────────────────────────────

async function _checkMemory(out, ts) {
  try {
    const { memoryProfiler } = require('./memoryProfiler');
    const stats = memoryProfiler.getStats();
    const { heapUsedMb } = stats.current;
    const { warnMb, critMb } = stats.thresholds;

    if (heapUsedMb >= critMb) {
      out.push({ severity: SEVERITY.ERROR, source: 'memory', ts,
        message: `Heap usage critical: ${heapUsedMb}MB (threshold: ${critMb}MB)`,
        detail:  { heapUsedMb, critMb, growthMbPerMin: stats.growthMbPerMin } });
    } else if (heapUsedMb >= warnMb) {
      out.push({ severity: SEVERITY.WARN, source: 'memory', ts,
        message: `Heap usage elevated: ${heapUsedMb}MB (threshold: ${warnMb}MB)`,
        detail:  { heapUsedMb, warnMb, growthMbPerMin: stats.growthMbPerMin } });
    }

    if (stats.growthMbPerMin > 5) {
      out.push({ severity: SEVERITY.WARN, source: 'memory', ts,
        message: `Heap growing at ${stats.growthMbPerMin}MB/min — possible leak`,
        detail: stats });
    }
  } catch (_) {}
}

async function _checkCircuitBreakers(out, ts) {
  try {
    const { getAllStats } = require('../runtime/reliability/CircuitBreaker');
    for (const b of getAllStats()) {
      if (b.state === 'OPEN') {
        out.push({ severity: SEVERITY.ERROR, source: `circuit-breaker:${b.name}`, ts,
          message: `Circuit breaker OPEN: ${b.name}`,
          detail:  b });
      } else if (b.state === 'HALF_OPEN') {
        out.push({ severity: SEVERITY.WARN, source: `circuit-breaker:${b.name}`, ts,
          message: `Circuit breaker probing (HALF_OPEN): ${b.name}`,
          detail:  b });
      }
    }
  } catch (_) {}
}

async function _checkBackpressure(out, ts) {
  try {
    const { backpressureManager, LEVELS } = require('../runtime/reliability/BackpressureManager');
    const level = backpressureManager.check();
    if (level >= LEVELS.CRITICAL) {
      out.push({ severity: SEVERITY.ERROR, source: 'backpressure', ts,
        message: `System under CRITICAL backpressure — new work is being rejected`,
        detail:  backpressureManager.getStats() });
    } else if (level >= LEVELS.HIGH) {
      out.push({ severity: SEVERITY.WARN, source: 'backpressure', ts,
        message: `System under HIGH backpressure — low-priority work is being rejected`,
        detail:  backpressureManager.getStats() });
    }
  } catch (_) {}
}

async function _checkQueue(out, ts) {
  try {
    const { executionQueue } = require('../runtime/ExecutionQueue');
    const m = executionQueue.getMetrics();
    if (m.utilizationPct >= 90) {
      out.push({ severity: SEVERITY.ERROR, source: 'queue', ts,
        message: `Queue almost full: ${m.utilizationPct}% capacity used`,
        detail:  m });
    } else if (m.utilizationPct >= 70) {
      out.push({ severity: SEVERITY.WARN, source: 'queue', ts,
        message: `Queue depth elevated: ${m.utilizationPct}% capacity used`,
        detail:  m });
    }
  } catch (_) {}
}

async function _checkStalls(out, ts) {
  try {
    const { stallDetector } = require('../runtime/StallDetector');
    const stalled = await stallDetector.getStalledExecutions();
    if (stalled.length > 0) {
      out.push({ severity: SEVERITY.WARN, source: 'stalls', ts,
        message: `${stalled.length} stalled execution(s) detected`,
        detail:  { count: stalled.length, executionIds: stalled.map(e => e.id) } });
    }
  } catch (_) {}
}

async function _checkSlowExecutions(out, ts) {
  try {
    const { executionProfiler } = require('./executionProfiler');
    const inFlight = executionProfiler.getInFlight();
    const slow = inFlight.filter(e => e.slow);
    if (slow.length > 0) {
      out.push({ severity: SEVERITY.WARN, source: 'slow-executions', ts,
        message: `${slow.length} currently running execution(s) exceed slow threshold`,
        detail:  { slow } });
    }
  } catch (_) {}
}

async function _checkDeadLetterQueue(out, ts) {
  try {
    const dlq = require('../runtime/reliability/DeadLetterQueue');
    const summary = await dlq.getSummary();
    if (summary.dead > 0) {
      out.push({ severity: SEVERITY.WARN, source: 'dlq', ts,
        message: `${summary.dead} execution(s) in dead-letter queue`,
        detail:  summary });
    }
  } catch (_) {}
}

async function _checkDeadWorkers(out, ts) {
  try {
    const { workerRegistry } = require('../runtime/distributed/WorkerRegistry');
    const dead = await workerRegistry.getDeadWorkers();
    if (dead.length > 0) {
      out.push({ severity: SEVERITY.WARN, source: 'workers', ts,
        message: `${dead.length} worker(s) missed heartbeat (presumed dead)`,
        detail:  { dead } });
    }
  } catch (_) {}
}

module.exports = { collectWarnings, SEVERITY };
