'use strict';

/**
 * AWE-OS — ExecutionClaimer                                    Phase 4E
 *
 * Atomic DB-based execution claiming — prevents duplicate execution when
 * multiple processes race to pick up a queued execution.
 *
 * Strategy: Postgres UPDATE ... WHERE claimed_by_worker_id IS NULL
 * Only one UPDATE will match; concurrent claimers get 0 rows affected.
 */

const { workerRegistry } = require('./WorkerRegistry');
const { createLogger }   = require('../../monitoring/logger');

const log = createLogger('execution-claimer');

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

/**
 * Attempt to claim an execution for this worker.
 * Returns true if claimed, false if already claimed by another worker.
 *
 * @param {string} executionId
 * @returns {Promise<boolean>}
 */
async function claim(executionId) {
  const { workerId } = workerRegistry;

  try {
    // Atomic claim: only succeeds if claimed_by_worker_id is NULL
    const { data, error } = await db()
      .from('pipeline_executions')
      .update({ claimed_by_worker_id: workerId })
      .eq('id', executionId)
      .is('claimed_by_worker_id', null)
      .select('id');

    if (error) {
      // Column doesn't exist yet (pre-migration) — fall through, allow claim
      if (error.message?.includes('claimed_by_worker_id') ||
          error.code === '42703') {
        log.debug('claimed_by_worker_id column missing — single-process mode', { executionId });
        return true;
      }
      log.warn('Claim query error', { executionId, error: error.message });
      return true; // Be permissive on DB errors — better than blocking
    }

    const claimed = Array.isArray(data) ? data.length > 0 : !!data;

    if (!claimed) {
      log.debug('Execution already claimed by another worker', { executionId });
    } else {
      log.debug('Execution claimed', { executionId, workerId });
    }

    return claimed;
  } catch (err) {
    // DB unavailable — allow claim (single-process safe fallback)
    log.warn('Claim check unavailable', { executionId, error: err.message });
    return true;
  }
}

/**
 * Release the claim on an execution (on completion, failure, or crash).
 * This allows another process to re-claim for recovery purposes.
 *
 * @param {string} executionId
 */
async function unclaim(executionId) {
  const { workerId } = workerRegistry;

  try {
    await db()
      .from('pipeline_executions')
      .update({ claimed_by_worker_id: null })
      .eq('id', executionId)
      .eq('claimed_by_worker_id', workerId);
  } catch (_) {
    // Best-effort
  }
}

/**
 * Return all executions claimed by a specific worker.
 * Used by Rebalancer to reclaim orphaned executions from dead workers.
 *
 * @param {string} workerId
 * @returns {Promise<Array>}
 */
async function getClaimedBy(workerId) {
  try {
    const { data } = await db()
      .from('pipeline_executions')
      .select('id, pipeline_id, status, started_at')
      .eq('claimed_by_worker_id', workerId)
      .in('status', ['running', 'queued', 'retrying']);

    return data ?? [];
  } catch (_) {
    return [];
  }
}

/**
 * Force-reclaim executions from a dead worker (called by Rebalancer).
 * Marks them as failed so recovery.js can pick them up on next cycle.
 *
 * @param {string} deadWorkerId
 * @returns {Promise<number>} count of reclaimed executions
 */
async function reclaimFromDeadWorker(deadWorkerId) {
  try {
    const orphaned = await getClaimedBy(deadWorkerId);
    if (!orphaned.length) return 0;

    const ids = orphaned.map(e => e.id);
    await db()
      .from('pipeline_executions')
      .update({
        status:              'failed',
        claimed_by_worker_id: null,
        error_message:       `Worker ${deadWorkerId} died — execution orphaned`,
        completed_at:        new Date().toISOString(),
      })
      .in('id', ids);

    log.warn('Orphaned executions reclaimed from dead worker', {
      deadWorkerId,
      count: ids.length,
      executionIds: ids,
    });

    return ids.length;
  } catch (err) {
    log.warn('Reclaim from dead worker failed', { deadWorkerId, error: err.message });
    return 0;
  }
}

module.exports = {
  claim,
  unclaim,
  getClaimedBy,
  reclaimFromDeadWorker,
};
