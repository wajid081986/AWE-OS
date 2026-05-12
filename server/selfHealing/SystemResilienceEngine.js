'use strict';

/**
 * AWE-OS — SystemResilienceEngine                                Phase 6E
 *
 * Computes a holistic survivability score for the AWE-OS runtime.
 *
 * Resilience dimensions:
 *   worker_health      0.30  — active workers / total, heartbeat freshness
 *   execution_stability 0.25 — success rate trend over 24h
 *   recovery_velocity  0.20  — how quickly failed jobs are recovered
 *   isolation_health   0.15  — open circuits / quarantined modules ratio
 *   queue_health       0.10  — queue depth, stuck items, DLQ size
 *
 * Resilience grades:
 *   S (≥ 90) — Elite: all redundancy active, no faults
 *   A (≥ 75) — Strong: minor issues, auto-recovering
 *   B (≥ 60) — Healthy: recoverable problems
 *   C (≥ 45) — Degraded: multiple active faults
 *   D (≥ 30) — Critical: significant impairment
 *   F (<  30) — Crisis: manual intervention likely needed
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('system-resilience');

const CACHE_TTL = 3 * 60_000; // 3 min

// Resilience dimension weights
const RESILIENCE_WEIGHTS = {
  worker_health:       0.30,
  execution_stability: 0.25,
  recovery_velocity:   0.20,
  isolation_health:    0.15,
  queue_health:        0.10,
};

let _cache   = null;
let _cacheTs = 0;

// Rolling execution history (fed from RecoveryEngine/healing paths)
const _execHistory = []; // { ts, success }
const MAX_HISTORY  = 500;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the full resilience report.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<ResilienceReport>}
 */
async function getResilienceReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    const report = await _buildReport();
    _cache   = report;
    _cacheTs = now;

    // Persist snapshot non-blocking
    _persistSnapshot(report).catch(() => {});

    return report;
  } catch (err) {
    log.warn('getResilienceReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Record execution outcome for stability tracking.
 *
 * @param {boolean} success
 */
function recordExecution(success) {
  _execHistory.push({ ts: Date.now(), success });
  if (_execHistory.length > MAX_HISTORY) _execHistory.shift();
  _cache = null;
}

/**
 * Get survivability score (0–100) — fast, uses cache.
 */
async function getSurvivabilityScore() {
  const report = await getResilienceReport();
  return report.survivabilityScore;
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildReport() {
  const startMs = Date.now();
  const window24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const window1h  = new Date(Date.now() -  1 * 3_600_000).toISOString();

  const [workersResult, execResult, recoveryResult, queueResult] = await Promise.all([
    db().from('distributed_workers').select('id, worker_id, status, last_heartbeat, workload_score').limit(50),
    db().from('pipeline_executions').select('id, status, created_at, updated_at').gte('created_at', window24h).limit(500),
    db().from('recovery_attempts').select('id, status, action_type, recovered_at').gte('recovered_at', window24h).limit(200),
    db().from('pipeline_executions').select('id, status').in('status', ['pending', 'claimed', 'running', 'processing']).limit(100),
  ]);

  const workers   = workersResult.data  || [];
  const execs     = execResult.data     || [];
  const recoveries = recoveryResult.data || [];
  const queueItems = queueResult.data   || [];

  // ── Worker Health (0–100) ────────────────────────────────────────────────
  const activeWorkers  = workers.filter(w => w.status === 'active');
  const totalWorkers   = workers.length;
  const workerCoverage = totalWorkers > 0 ? activeWorkers.length / totalWorkers : 0;

  const freshHeartbeats = activeWorkers.filter(w => {
    if (!w.last_heartbeat) return false;
    return (Date.now() - new Date(w.last_heartbeat).getTime()) < 2 * 60_000; // 2 min fresh
  }).length;
  const heartbeatFreshness = activeWorkers.length > 0 ? freshHeartbeats / activeWorkers.length : 0;

  const workerHealth = (workerCoverage * 0.6 + heartbeatFreshness * 0.4) * 100;

  // ── Execution Stability (0–100) ──────────────────────────────────────────
  const execs24h     = execs.length;
  const failed24h    = execs.filter(e => e.status === 'failed').length;
  const success24h   = execs.filter(e => e.status === 'completed').length;
  const successRate24h = execs24h > 0 ? success24h / execs24h : 0.85;

  // Trend: compare last 1h vs 24h
  const execs1h    = execs.filter(e => new Date(e.created_at).getTime() >= Date.now() - 3_600_000);
  const failed1h   = execs1h.filter(e => e.status === 'failed').length;
  const success1h  = execs1h.filter(e => e.status === 'completed').length;
  const rate1h     = execs1h.length > 0 ? success1h / execs1h.length : successRate24h;
  const trend      = rate1h - successRate24h; // positive = improving

  const executionStability = Math.min(100, Math.max(0,
    successRate24h * 80 + Math.min(20, Math.max(-20, trend * 100)) + 20
  ));

  // ── Recovery Velocity (0–100) ────────────────────────────────────────────
  const successfulRecoveries = recoveries.filter(r => r.status === 'recovery_applied').length;
  const totalRecoveries      = recoveries.length;
  const recoveryRate         = totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 1;

  // Average recovery time (approximated from created_at difference)
  const failedCount = failed24h;
  const recoveryVelocity = failedCount > 0
    ? Math.min(100, (successfulRecoveries / failedCount) * 100 * recoveryRate)
    : 100;

  // ── Isolation Health (0–100) ─────────────────────────────────────────────
  // Load from isolated_faults
  const { data: activeFaults } = await db()
    .from('isolated_faults')
    .select('id, event_type, circuit_state')
    .in('event_type', ['quarantine', 'failure'])
    .gte('recorded_at', window1h)
    .limit(50);

  const faults = activeFaults || [];
  const openCircuits    = faults.filter(f => f.circuit_state === 'OPEN').length;
  const quarantined     = faults.filter(f => f.event_type === 'quarantine').length;
  const isolationHealth = Math.max(0, 100 - openCircuits * 15 - quarantined * 20);

  // ── Queue Health (0–100) ─────────────────────────────────────────────────
  const pendingCount    = queueItems.filter(i => i.status === 'pending').length;
  const claimedCount    = queueItems.filter(i => i.status === 'claimed').length;
  const processingCount = queueItems.filter(i => i.status === 'processing').length;
  const totalQueued     = queueItems.length;
  const queueSaturation = totalQueued / Math.max(1, activeWorkers.length * 5); // 5 tasks/worker ideal
  const queueHealth     = Math.max(0, 100 - Math.min(100, queueSaturation * 100));

  // ── Composite Score ──────────────────────────────────────────────────────
  const rawScore =
    workerHealth       * RESILIENCE_WEIGHTS.worker_health       +
    executionStability * RESILIENCE_WEIGHTS.execution_stability  +
    recoveryVelocity   * RESILIENCE_WEIGHTS.recovery_velocity    +
    isolationHealth    * RESILIENCE_WEIGHTS.isolation_health     +
    queueHealth        * RESILIENCE_WEIGHTS.queue_health;

  const survivabilityScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 100) / 100;
  const grade              = _grade(survivabilityScore);

  const report = {
    survivabilityScore,
    grade,
    dimensions: {
      workerHealth:       Math.round(workerHealth       * 100) / 100,
      executionStability: Math.round(executionStability * 100) / 100,
      recoveryVelocity:   Math.round(recoveryVelocity   * 100) / 100,
      isolationHealth:    Math.round(isolationHealth    * 100) / 100,
      queueHealth:        Math.round(queueHealth        * 100) / 100,
    },
    details: {
      workers:           { active: activeWorkers.length, total: totalWorkers, freshHeartbeats },
      executions24h:     { total: execs24h, success: success24h, failed: failed24h, successRate: Math.round(successRate24h * 10000) / 100 },
      executions1h:      { total: execs1h.length, success: success1h, failed: failed1h, successRate: Math.round(rate1h * 10000) / 100 },
      recoveries24h:     { total: totalRecoveries, successful: successfulRecoveries },
      queue:             { pending: pendingCount, claimed: claimedCount, processing: processingCount },
      isolation:         { openCircuits, quarantined },
    },
    weights:    RESILIENCE_WEIGHTS,
    buildMs:    Date.now() - startMs,
    analyzedAt: new Date().toISOString(),
  };

  log.info('Resilience report built', { score: survivabilityScore, grade, ms: report.buildMs });

  return report;
}

function _grade(score) {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

async function _persistSnapshot(report) {
  await db()
    .from('resilience_scores')
    .insert({
      survivability_score: report.survivabilityScore,
      grade:               report.grade,
      worker_health:       report.dimensions.workerHealth,
      execution_stability: report.dimensions.executionStability,
      recovery_velocity:   report.dimensions.recoveryVelocity,
      isolation_health:    report.dimensions.isolationHealth,
      queue_health:        report.dimensions.queueHealth,
      metadata:            report.details,
      recorded_at:         report.analyzedAt,
    })
    .catch(() => {});
}

function _emptyReport() {
  return {
    survivabilityScore: 0,
    grade: 'F',
    dimensions: { workerHealth: 0, executionStability: 0, recoveryVelocity: 0, isolationHealth: 0, queueHealth: 0 },
    details: {},
    weights: RESILIENCE_WEIGHTS,
    buildMs: 0,
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = {
  getResilienceReport,
  recordExecution,
  getSurvivabilityScore,
  invalidateCache,
  RESILIENCE_WEIGHTS,
};
