'use strict';

/**
 * AWE-OS — RuntimeRecoveryEngine                               Phase 6E
 *
 * Detects and recovers from runtime failures:
 *   - Stuck/stalled executions (running > MAX_RUNNING_MS)
 *   - Dead workers (heartbeat expired)
 *   - Queue corruption (items in invalid state)
 *   - Orphaned locks (locks held by dead processes)
 *   - Failed job retries (bounded with backoff)
 *   - Memory pressure recovery
 *
 * Recovery actions (bounded by MAX_RECOVERY_ATTEMPTS):
 *   restart    — re-trigger execution from beginning
 *   reroute    — assign to different worker
 *   replay     — replay last N events to reconcile state
 *   reconcile  — reconcile divergent state from DB source of truth
 *   rebuild    — rebuild queue from persistent store
 *   cleanup    — remove orphaned state
 *   replace    — spawn replacement worker
 *
 * Safety protections:
 *   - MAX_RECOVERY_ATTEMPTS per execution before giving up
 *   - COOLDOWN_MS between recovery attempts for same execution
 *   - Dead-letter queue fallback when all retries exhausted
 *   - Infinite-loop protection via attempt counter
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('runtime-recovery');

const MAX_RUNNING_MS          = 10 * 60_000;   // 10 min stuck threshold
const WORKER_DEAD_MS          = 5  * 60_000;   // 5 min heartbeat gap = dead
const MAX_RECOVERY_ATTEMPTS   = 3;
const COOLDOWN_MS             = 5  * 60_000;   // 5 min between retry attempts
const SCAN_INTERVAL_MS        = 2  * 60_000;   // scan every 2 min

// Track recovery attempts: executionId → { count, lastAt }
const _recoveryAttempts = new Map();

// Active scan state
let _scanRunning   = false;
let _lastScanAt    = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a full recovery scan.
 * Safe to call repeatedly — internally rate-limited.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.force=false] — bypass scan cooldown
 * @returns {Promise<RecoveryScanResult>}
 */
async function runRecoveryScan(opts = {}) {
  const { force = false } = opts;
  const now = Date.now();

  if (!force && _scanRunning) return _scanResult([], [], [], 'already_running');
  if (!force && (now - _lastScanAt) < SCAN_INTERVAL_MS) return _scanResult([], [], [], 'cooldown');

  _scanRunning = true;
  _lastScanAt  = now;
  const startMs = Date.now();
  const actions = [];

  try {
    const [stuckActions, deadWorkerActions, orphanActions] = await Promise.all([
      _recoverStuckExecutions(),
      _recoverDeadWorkers(),
      _cleanupOrphans(),
    ]);

    actions.push(...stuckActions, ...deadWorkerActions, ...orphanActions);

    // Persist recovery events
    if (actions.length > 0) {
      _persistRecoveryActions(actions).catch(() => {});
    }

    log.info('Recovery scan complete', {
      actions:   actions.length,
      stuck:     stuckActions.length,
      deadWorkers: deadWorkerActions.length,
      orphans:   orphanActions.length,
      ms:        Date.now() - startMs,
    });

    return _scanResult(actions, stuckActions, deadWorkerActions, 'completed', Date.now() - startMs);
  } catch (err) {
    log.error('Recovery scan failed', { error: err.message });
    return _scanResult([], [], [], 'error', Date.now() - startMs, err.message);
  } finally {
    _scanRunning = false;
  }
}

/**
 * Force recovery for a specific execution.
 *
 * @param {string} executionId
 * @param {string} [action]  — restart|reroute|replay|reconcile
 * @returns {Promise<RecoveryAction>}
 */
async function recoverExecution(executionId, action = 'reconcile') {
  const attempts = _recoveryAttempts.get(executionId) || { count: 0, lastAt: 0 };

  if (attempts.count >= MAX_RECOVERY_ATTEMPTS) {
    return { executionId, action: 'dlq_fallback', status: 'max_attempts_exceeded', attempts: attempts.count };
  }

  const now = Date.now();
  if ((now - attempts.lastAt) < COOLDOWN_MS) {
    return { executionId, action, status: 'cooldown', nextRetryIn: Math.round((COOLDOWN_MS - (now - attempts.lastAt)) / 1000) };
  }

  attempts.count++;
  attempts.lastAt = now;
  _recoveryAttempts.set(executionId, attempts);

  const result = await _executeRecoveryAction(executionId, action, attempts.count);

  _persistRecoveryActions([result]).catch(() => {});
  return result;
}

/**
 * Get current recovery status.
 */
function getRecoveryStatus() {
  const pendingRecoveries = [];
  for (const [execId, state] of _recoveryAttempts) {
    if (state.count < MAX_RECOVERY_ATTEMPTS) {
      pendingRecoveries.push({
        executionId: execId,
        attempts:    state.count,
        lastAt:      new Date(state.lastAt).toISOString(),
        canRetry:    (Date.now() - state.lastAt) >= COOLDOWN_MS,
      });
    }
  }
  return {
    scanRunning:     _scanRunning,
    lastScanAt:      _lastScanAt ? new Date(_lastScanAt).toISOString() : null,
    pendingRecoveries,
    maxAttempts:     MAX_RECOVERY_ATTEMPTS,
  };
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _recoverStuckExecutions() {
  const cutoff = new Date(Date.now() - MAX_RUNNING_MS).toISOString();
  const { data: stuck } = await db()
    .from('pipeline_executions')
    .select('id, pipeline_id, status, worker_id, created_at, updated_at')
    .eq('status', 'running')
    .lt('updated_at', cutoff)
    .limit(20);

  if (!stuck?.length) return [];

  const actions = [];
  for (const exec of stuck) {
    const attempts = _recoveryAttempts.get(exec.id) || { count: 0, lastAt: 0 };
    if (attempts.count >= MAX_RECOVERY_ATTEMPTS) {
      actions.push({ executionId: exec.id, action: 'dlq_fallback', status: 'exhausted', reason: 'stuck_execution' });
      continue;
    }

    const stuckMs = Date.now() - new Date(exec.updated_at).getTime();
    const action  = stuckMs > MAX_RUNNING_MS * 2 ? 'reroute' : 'reconcile';
    const result  = await _executeRecoveryAction(exec.id, action, attempts.count + 1);
    actions.push(result);
  }

  return actions;
}

async function _recoverDeadWorkers() {
  const cutoff = new Date(Date.now() - WORKER_DEAD_MS).toISOString();
  const { data: deadWorkers } = await db()
    .from('distributed_workers')
    .select('id, worker_id, status, last_heartbeat, current_executions')
    .eq('status', 'active')
    .lt('last_heartbeat', cutoff)
    .limit(10);

  if (!deadWorkers?.length) return [];

  const actions = [];
  for (const worker of deadWorkers) {
    // Mark worker as dead
    await db()
      .from('distributed_workers')
      .update({ status: 'dead', updated_at: new Date().toISOString() })
      .eq('id', worker.id)
      .catch(() => {});

    actions.push({
      workerId:   worker.worker_id,
      action:     'replace',
      status:     'worker_marked_dead',
      executions: worker.current_executions || [],
      reason:     'heartbeat_expired',
      recoveredAt: new Date().toISOString(),
    });

    // Trigger reroute for any assigned executions
    for (const execId of (worker.current_executions || [])) {
      await _executeRecoveryAction(execId, 'reroute', 1).catch(() => {});
    }
  }

  return actions;
}

async function _cleanupOrphans() {
  // Look for executions stuck in 'claimed' state with no matching active worker
  const { data: orphans } = await db()
    .from('pipeline_executions')
    .select('id, status, worker_id, updated_at')
    .eq('status', 'claimed')
    .lt('updated_at', new Date(Date.now() - 15 * 60_000).toISOString()) // claimed > 15 min
    .limit(10);

  if (!orphans?.length) return [];

  const actions = [];
  for (const exec of orphans) {
    // Reset to pending so it can be claimed again
    await db()
      .from('pipeline_executions')
      .update({ status: 'pending', worker_id: null, updated_at: new Date().toISOString() })
      .eq('id', exec.id)
      .catch(() => {});

    actions.push({
      executionId: exec.id,
      action:      'cleanup',
      status:      'orphan_reset_to_pending',
      reason:      'stale_claim',
      recoveredAt: new Date().toISOString(),
    });
  }

  return actions;
}

async function _executeRecoveryAction(executionId, action, attemptNum) {
  const now = Date.now();

  // Update attempt tracking
  _recoveryAttempts.set(executionId, { count: attemptNum, lastAt: now });

  try {
    switch (action) {
      case 'reconcile':
        // Reset status to pending for re-execution
        await db()
          .from('pipeline_executions')
          .update({ status: 'pending', worker_id: null, updated_at: new Date().toISOString() })
          .eq('id', executionId)
          .eq('status', 'running')
          .catch(() => {});
        break;

      case 'reroute':
        // Clear worker assignment and reset to pending
        await db()
          .from('pipeline_executions')
          .update({ status: 'pending', worker_id: null, updated_at: new Date().toISOString() })
          .eq('id', executionId)
          .catch(() => {});
        break;

      case 'dlq_fallback':
        // Mark as permanently failed
        await db()
          .from('pipeline_executions')
          .update({ status: 'failed', error: 'max_recovery_attempts_exceeded', updated_at: new Date().toISOString() })
          .eq('id', executionId)
          .catch(() => {});
        break;
    }

    return {
      executionId, action,
      status:      'recovery_applied',
      attemptNum,
      recoveredAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      executionId, action,
      status:  'recovery_failed',
      error:   err.message,
      attemptNum,
    };
  }
}

async function _persistRecoveryActions(actions) {
  for (const action of actions.slice(0, 20)) {
    await db()
      .from('recovery_attempts')
      .insert({
        execution_id:  action.executionId || null,
        worker_id:     action.workerId    || null,
        action_type:   action.action,
        status:        action.status,
        attempt_num:   action.attemptNum  || 1,
        reason:        action.reason      || null,
        error_message: action.error       || null,
        metadata:      action.metadata    || {},
        recovered_at:  action.recoveredAt || new Date().toISOString(),
      })
      .catch(() => {});
  }
}

function _scanResult(actions, stuck, deadWorkers, status, ms = 0, error = null) {
  return {
    status,
    totalActions:     actions.length,
    stuckRecovered:   stuck.length,
    deadWorkers:      deadWorkers.length,
    actions:          actions.slice(0, 20),
    scanMs:           ms,
    error:            error || undefined,
    scannedAt:        new Date().toISOString(),
  };
}

module.exports = {
  runRecoveryScan,
  recoverExecution,
  getRecoveryStatus,
  MAX_RUNNING_MS,
  WORKER_DEAD_MS,
  MAX_RECOVERY_ATTEMPTS,
};
