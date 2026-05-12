'use strict';

/**
 * AWE-OS — SelfHealingEngine                                     Phase 6E
 *
 * Master orchestrator for all self-healing workflows.
 *
 * Coordinates:
 *   RuntimeRecoveryEngine   — stuck jobs, dead workers, orphaned claims
 *   AutoRepairEngine        — cache/state/queue/dependency repairs
 *   FaultIsolationEngine    — circuit breakers, quarantine, degradation
 *   PredictiveFailureEngine — failure probability signals
 *   SystemResilienceEngine  — survivability score
 *   EmergencyRoutingEngine  — workload rerouting during emergencies
 *
 * Healing cycle (runs every HEAL_INTERVAL_MS):
 *   1. Expire stale quarantines + circuit probe resets
 *   2. Run predictive analysis — declare emergencies if CRITICAL
 *   3. Run recovery scan (stuck/dead/orphan)
 *   4. Run auto-repair (caches/state/queue)
 *   5. Compute resilience score
 *   6. Persist healing summary
 */

const { createLogger } = require('../monitoring/logger');

const RuntimeRecoveryEngine  = require('./RuntimeRecoveryEngine');
const AutoRepairEngine        = require('./AutoRepairEngine');
const FaultIsolationEngine    = require('./FaultIsolationEngine');
const PredictiveFailureEngine = require('./PredictiveFailureEngine');
const SystemResilienceEngine  = require('./SystemResilienceEngine');
const EmergencyRoutingEngine  = require('./EmergencyRoutingEngine');

const log = createLogger('self-healing');

const HEAL_INTERVAL_MS = 2 * 60_000;   // master cycle every 2 min
const MAX_CYCLE_MS     = 90_000;        // max time per cycle before force-abort

let _cycleRunning  = false;
let _lastCycleAt   = 0;
let _intervalId    = null;
let _cycleCount    = 0;
let _lastSummary   = null;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the autonomous healing loop.
 */
function start() {
  if (_intervalId) return;

  log.info('SelfHealingEngine starting', { intervalMs: HEAL_INTERVAL_MS });

  // Run immediately, then on interval
  _runHealingCycle().catch(err => log.error('Initial healing cycle error', { error: err.message }));

  _intervalId = setInterval(() => {
    _runHealingCycle().catch(err => log.error('Healing cycle error', { error: err.message }));
  }, HEAL_INTERVAL_MS);
}

/**
 * Stop the healing loop.
 */
function stop() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
    log.info('SelfHealingEngine stopped');
  }
}

/**
 * Force an immediate healing cycle (bypass cooldown).
 *
 * @returns {Promise<HealingSummary>}
 */
async function forceHeal() {
  return _runHealingCycle({ force: true });
}

/**
 * Get the system health overview.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<HealingOverview>}
 */
async function getOverview(forceRefresh = false) {
  const [resilience, predictive, recovery, routing] = await Promise.all([
    SystemResilienceEngine.getResilienceReport(forceRefresh),
    PredictiveFailureEngine.getPredictiveReport(forceRefresh),
    Promise.resolve(RuntimeRecoveryEngine.getRecoveryStatus()),
    Promise.resolve(EmergencyRoutingEngine.getRoutingStatus()),
  ]);

  return {
    resilience,
    predictive: {
      summary:    predictive.summary,
      alerts:     predictive.alerts.slice(0, 10),
      analyzedAt: predictive.analyzedAt,
    },
    recovery,
    routing,
    isolation:     FaultIsolationEngine.getIsolationStatus(),
    repair:        AutoRepairEngine.getRepairStatus(),
    healingEngine: {
      running:       !!_intervalId,
      cycleCount:    _cycleCount,
      lastCycleAt:   _lastCycleAt ? new Date(_lastCycleAt).toISOString() : null,
      lastSummary:   _lastSummary,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Record a module failure (delegates to FaultIsolationEngine).
 */
function recordFailure(moduleId, opts = {}) {
  FaultIsolationEngine.recordFailure(moduleId, opts);
}

/**
 * Record a module success (delegates to FaultIsolationEngine).
 */
function recordSuccess(moduleId) {
  FaultIsolationEngine.recordSuccess(moduleId);
}

/**
 * Check if a module is allowed to execute.
 */
function canExecute(moduleId) {
  return FaultIsolationEngine.canExecute(moduleId);
}

/**
 * Feed a metric data point to PredictiveFailureEngine.
 */
function feedMetric(metricKey, value) {
  PredictiveFailureEngine.feedMetric(metricKey, value);
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _runHealingCycle(opts = {}) {
  const { force = false } = opts;
  const now = Date.now();

  if (!force && _cycleRunning) return _summary('already_running');

  _cycleRunning = true;
  _lastCycleAt  = now;
  _cycleCount++;
  const startMs = Date.now();

  const cycleResults = {
    emergencies:  null,
    predictive:   null,
    recovery:     null,
    repair:       null,
    resilience:   null,
  };

  try {
    // Step 1: Auto-release expired quarantines
    const released = FaultIsolationEngine.autoReleaseExpired();
    if (released.length > 0) {
      log.info('Quarantines auto-released', { count: released.length, modules: released });
    }

    // Step 2: Evaluate for new emergency conditions
    cycleResults.emergencies = await EmergencyRoutingEngine.evaluateAndDeclare();

    // Step 3: Predictive analysis — emit warnings for HIGH/CRITICAL
    cycleResults.predictive = await PredictiveFailureEngine.getPredictiveReport(true);
    for (const alert of cycleResults.predictive.alerts) {
      if (alert.risk === 'CRITICAL') {
        log.error('CRITICAL failure predicted', { component: alert.componentId, probability: alert.probability, ttf: alert.ttfEstimate });
      } else if (alert.risk === 'HIGH') {
        log.warn('HIGH failure risk detected', { component: alert.componentId, probability: alert.probability });
      }
    }

    // Step 4: Recovery scan (concurrent with repair)
    const [recoveryScan, repairRun] = await Promise.all([
      RuntimeRecoveryEngine.runRecoveryScan({ force }),
      AutoRepairEngine.runAutoRepair({ force }),
    ]);
    cycleResults.recovery = recoveryScan;
    cycleResults.repair   = repairRun;

    // Record successful recovery outcomes
    if (recoveryScan.stuckRecovered > 0 || recoveryScan.deadWorkers > 0) {
      SystemResilienceEngine.recordExecution(true);
    }

    // Step 5: Compute resilience (force refresh after repairs)
    cycleResults.resilience = await SystemResilienceEngine.getResilienceReport(true);

    const duration = Date.now() - startMs;

    const summary = {
      status:          'completed',
      cycleNum:        _cycleCount,
      duration,
      resilience:      cycleResults.resilience.survivabilityScore,
      grade:           cycleResults.resilience.grade,
      stuckRecovered:  recoveryScan.stuckRecovered,
      deadWorkers:     recoveryScan.deadWorkers,
      repaired:        repairRun.totalRepaired,
      newEmergencies:  cycleResults.emergencies.newlyDeclared,
      criticalAlerts:  cycleResults.predictive.summary.criticalCount,
      completedAt:     new Date().toISOString(),
    };

    _lastSummary = summary;
    _persistCycleSummary(summary).catch(() => {});

    log.info('Healing cycle complete', summary);
    return summary;
  } catch (err) {
    const summary = _summary('error', err.message, Date.now() - startMs);
    _lastSummary = summary;
    log.error('Healing cycle failed', { error: err.message, cycleNum: _cycleCount });
    return summary;
  } finally {
    _cycleRunning = false;
  }
}

async function _persistCycleSummary(summary) {
  await db()
    .from('healing_events')
    .insert({
      event_type:   'healing_cycle',
      domain:       'system',
      target_table: null,
      target_id:    null,
      action:       'full_cycle',
      status:       summary.status,
      metadata: {
        cycleNum:       summary.cycleNum,
        duration:       summary.duration,
        resilience:     summary.resilience,
        grade:          summary.grade,
        stuckRecovered: summary.stuckRecovered,
        deadWorkers:    summary.deadWorkers,
        repaired:       summary.repaired,
      },
      healed_at: summary.completedAt || new Date().toISOString(),
    })
    .catch(() => {});
}

function _summary(status, error = null, ms = 0) {
  return {
    status,
    cycleNum:    _cycleCount,
    duration:    ms,
    error:       error || undefined,
    completedAt: new Date().toISOString(),
  };
}

module.exports = {
  start,
  stop,
  forceHeal,
  getOverview,
  recordFailure,
  recordSuccess,
  canExecute,
  feedMetric,

  // Direct engine access
  RuntimeRecoveryEngine,
  AutoRepairEngine,
  FaultIsolationEngine,
  PredictiveFailureEngine,
  SystemResilienceEngine,
  EmergencyRoutingEngine,
};
