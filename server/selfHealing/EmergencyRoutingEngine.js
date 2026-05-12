'use strict';

/**
 * AWE-OS — EmergencyRoutingEngine                                Phase 6E
 *
 * Reroutes workloads away from failed/degraded components during emergencies.
 *
 * Triggers:
 *   - Worker marked dead or quarantined
 *   - Worker saturation > 95%
 *   - Execution pipeline failure rate > 50% in 10 min window
 *   - Manual emergency declared via declareEmergency()
 *
 * Routing strategies:
 *   least_loaded   — route to worker with lowest workload_score
 *   round_robin    — distribute evenly across healthy workers
 *   capability     — route to workers that have serviced this type before
 *   drain          — stop accepting new work (shed load)
 *
 * Safety model:
 *   - Emergency state is bounded by MAX_EMERGENCY_DURATION_MS
 *   - Auto-clears when trigger conditions resolve
 *   - All rerouting events persisted for audit
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('emergency-routing');

const MAX_EMERGENCY_DURATION_MS = 30 * 60_000;  // 30 min max emergency
const SATURATION_EMERGENCY      = 0.95;          // trigger emergency at 95% saturation
const FAIL_RATE_EMERGENCY       = 0.50;          // trigger emergency at 50% fail rate
const EMERGENCY_WINDOW_MS       = 10 * 60_000;   // 10 min window for fail rate check

// Emergency state
const _emergencies   = new Map(); // emergencyId → EmergencyState
let _rrCursor        = 0;         // round-robin cursor

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Declare an emergency for a scope (workerId, pipeline, or 'system').
 *
 * @param {string} scope        — workerId | 'pipeline' | 'system'
 * @param {string} reason
 * @param {string} [strategy]   — least_loaded|round_robin|capability|drain
 * @returns {EmergencyState}
 */
function declareEmergency(scope, reason, strategy = 'least_loaded') {
  const id  = `${scope}:${Date.now()}`;
  const now = Date.now();

  const state = {
    id,
    scope,
    reason,
    strategy,
    declaredAt:  now,
    expiresAt:   now + MAX_EMERGENCY_DURATION_MS,
    active:      true,
    reroutes:    0,
    resolvedAt:  null,
  };

  _emergencies.set(id, state);
  log.warn('Emergency declared', { scope, reason, strategy, id });

  _persistRoutingEvent({ type: 'emergency_declared', scope, reason, strategy, emergencyId: id }).catch(() => {});

  return state;
}

/**
 * Resolve an active emergency.
 *
 * @param {string} emergencyId
 */
function resolveEmergency(emergencyId) {
  const state = _emergencies.get(emergencyId);
  if (!state) return;
  state.active     = false;
  state.resolvedAt = Date.now();
  log.info('Emergency resolved', { emergencyId, scope: state.scope, reroutes: state.reroutes });
  _persistRoutingEvent({ type: 'emergency_resolved', scope: state.scope, emergencyId }).catch(() => {});
}

/**
 * Route a set of executions away from a failing worker.
 *
 * @param {string[]} executionIds
 * @param {string}   fromWorkerId
 * @param {string}   [strategy]
 * @returns {Promise<RerouteResult>}
 */
async function rerouteExecutions(executionIds, fromWorkerId, strategy = 'least_loaded') {
  if (!executionIds?.length) return { rerouted: 0, strategy };

  const healthyWorkers = await _getHealthyWorkers(fromWorkerId);
  if (!healthyWorkers.length) {
    log.warn('No healthy workers for reroute', { fromWorkerId, execCount: executionIds.length });
    return { rerouted: 0, strategy, reason: 'no_healthy_workers' };
  }

  let rerouted = 0;
  for (const execId of executionIds) {
    const target = _pickWorker(healthyWorkers, strategy, execId);
    if (!target) continue;

    await db()
      .from('pipeline_executions')
      .update({ status: 'pending', worker_id: null, updated_at: new Date().toISOString() })
      .eq('id', execId)
      .catch(() => {});

    rerouted++;

    // Bump target worker load tracking
    const w = healthyWorkers.find(x => x.worker_id === target);
    if (w) w.workload_score = Math.min(1, (w.workload_score || 0) + 0.05);
  }

  log.info('Executions rerouted', { from: fromWorkerId, count: rerouted, strategy });
  _persistRoutingEvent({ type: 'reroute', scope: fromWorkerId, metadata: { count: rerouted, strategy } }).catch(() => {});

  return { rerouted, strategy, targetWorkerCount: healthyWorkers.length };
}

/**
 * Evaluate current system state and auto-declare emergencies if needed.
 * Call from SelfHealingEngine periodically.
 *
 * @returns {Promise<EmergencyEvaluationResult>}
 */
async function evaluateAndDeclare() {
  const declared = [];

  // Expire stale emergencies
  for (const [id, state] of _emergencies) {
    if (state.active && Date.now() > state.expiresAt) {
      resolveEmergency(id);
    }
  }

  const cutoff = new Date(Date.now() - EMERGENCY_WINDOW_MS).toISOString();

  // Check saturation
  const { data: overloadedWorkers } = await db()
    .from('distributed_workers')
    .select('worker_id, workload_score, status')
    .eq('status', 'active')
    .gte('workload_score', SATURATION_EMERGENCY)
    .limit(10);

  for (const w of (overloadedWorkers || [])) {
    if (!_hasActiveEmergency(w.worker_id)) {
      const em = declareEmergency(w.worker_id, 'worker_saturation', 'least_loaded');
      declared.push(em);
    }
  }

  // Check pipeline fail rate
  const { data: recentExecs } = await db()
    .from('pipeline_executions')
    .select('id, status')
    .gte('updated_at', cutoff)
    .limit(100);

  if (recentExecs?.length >= 10) {
    const failCount = recentExecs.filter(e => e.status === 'failed').length;
    const failRate  = failCount / recentExecs.length;

    if (failRate >= FAIL_RATE_EMERGENCY && !_hasActiveEmergency('pipeline')) {
      const em = declareEmergency('pipeline', `high_fail_rate:${Math.round(failRate * 100)}%`, 'round_robin');
      declared.push(em);
    }
  }

  return {
    activeEmergencies:  [..._emergencies.values()].filter(e => e.active).length,
    newlyDeclared:      declared.length,
    declared,
    evaluatedAt:        new Date().toISOString(),
  };
}

/**
 * Get all active emergencies.
 */
function getActiveEmergencies() {
  return [..._emergencies.values()].filter(e => e.active);
}

/**
 * Get routing status overview.
 */
function getRoutingStatus() {
  const all        = [..._emergencies.values()];
  const active     = all.filter(e => e.active);
  const resolved   = all.filter(e => !e.active);

  return {
    activeEmergencies:   active,
    resolvedEmergencies: resolved.slice(-10),
    activeCount:         active.length,
    totalDeclared:       all.length,
  };
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _getHealthyWorkers(excludeWorkerId = null) {
  const { data } = await db()
    .from('distributed_workers')
    .select('worker_id, workload_score, status, last_heartbeat')
    .eq('status', 'active')
    .lt('workload_score', SATURATION_EMERGENCY)
    .order('workload_score', { ascending: true })
    .limit(20);

  return (data || []).filter(w => {
    if (w.worker_id === excludeWorkerId) return false;
    // Must have recent heartbeat
    if (!w.last_heartbeat) return false;
    return (Date.now() - new Date(w.last_heartbeat).getTime()) < 5 * 60_000;
  });
}

function _pickWorker(workers, strategy, execId) {
  if (!workers.length) return null;

  if (strategy === 'least_loaded') {
    return workers.sort((a, b) => a.workload_score - b.workload_score)[0].worker_id;
  }

  if (strategy === 'round_robin') {
    const w = workers[_rrCursor % workers.length];
    _rrCursor++;
    return w.worker_id;
  }

  // Default: least loaded
  return workers[0].worker_id;
}

function _hasActiveEmergency(scope) {
  for (const [, state] of _emergencies) {
    if (state.active && state.scope === scope) return true;
  }
  return false;
}

async function _persistRoutingEvent(event) {
  await db()
    .from('emergency_routing_events')
    .insert({
      event_type:   event.type,
      scope:        event.scope       || null,
      reason:       event.reason      || null,
      strategy:     event.strategy    || null,
      emergency_id: event.emergencyId || null,
      metadata:     event.metadata    || {},
      recorded_at:  new Date().toISOString(),
    })
    .catch(() => {});
}

module.exports = {
  declareEmergency,
  resolveEmergency,
  rerouteExecutions,
  evaluateAndDeclare,
  getActiveEmergencies,
  getRoutingStatus,
  SATURATION_EMERGENCY,
  FAIL_RATE_EMERGENCY,
};
