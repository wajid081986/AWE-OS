'use strict';

/**
 * AWE-OS — Pipeline Crash Recovery                           Phase 4C
 *
 * Enhanced recovery module called once at server startup.
 * Replaces and extends the basic recoverInterruptedExecutions() in PipelineOrchestrator.
 *
 * Recovery actions:
 *   1. RUNNING executions → mark as FAILED (server restarted, state is unknown)
 *   2. PAUSED executions  → keep alive (approval gates survive restarts)
 *   3. Stalled executions → mark as FAILED (already stalled before restart)
 *   4. Stale QUEUED items → mark as FAILED (were never started)
 *   5. Orphaned step rows → mark as FAILED (parent execution is terminal)
 *
 * Recovery is logged in the audit trail and emits events.
 * Never auto-resumes RUNNING executions — always requires re-trigger.
 */

const { store, EXECUTION_STATUS } = require('./ExecutionStore');
const { bus, EVENTS }             = require('./EventBus');
const { auditTrail, ACTIONS }     = require('../monitoring/auditTrail');
const { createLogger }            = require('../monitoring/logger');

const log = createLogger('recovery');

// How old a RUNNING execution must be to be considered orphaned by a crash
const INTERRUPTED_THRESHOLD_MS = 30 * 60_000; // 30 minutes

// How old a QUEUED execution must be before we consider it stale
const STALE_QUEUED_THRESHOLD_MS = 60 * 60_000; // 1 hour

/**
 * Main recovery function — call once in initializeRuntime().
 *
 * @returns {Promise<{ recovered: number, paused: number, stale: number }>}
 */
async function runRecovery() {
  const result = { recovered: 0, paused: 0, stale: 0, errors: 0 };
  log.info('Starting crash recovery');

  try {
    await Promise.all([
      _recoverInterruptedExecutions(result),
      _recoverStaleQueued(result),
      _recoverStalledExecutions(result),
      _logResumedApprovals(result),
    ]);
  } catch (err) {
    log.error('Recovery error', { error: err?.message });
    result.errors++;
  }

  log.info('Crash recovery complete', result);

  auditTrail.logAction({
    executionId: null,
    action: ACTIONS.RECOVERY_RAN,
    details: result,
    actorId: 'system',
  }).catch(() => {});

  return result;
}

// ── Individual recovery strategies ──────────────────────────────────────────

async function _recoverInterruptedExecutions(result) {
  const cutoff = new Date(Date.now() - INTERRUPTED_THRESHOLD_MS).toISOString();

  const { data, error } = await (require('../db/supabase'))
    .from('pipeline_executions')
    .select('id, pipeline_id, started_at, triggered_by')
    .eq('status', EXECUTION_STATUS.RUNNING)
    .lt('started_at', cutoff);

  if (error || !data?.length) return;

  for (const exec of data) {
    try {
      await store.finalizeExecution(
        exec.id,
        EXECUTION_STATUS.FAILED,
        {},
        'Server restarted — execution interrupted. Re-trigger from admin panel.'
      );

      bus.emit(EVENTS.PIPELINE_FAILED, {
        executionId: exec.id,
        pipelineId:  exec.pipeline_id,
        error:       'Server restart recovery',
        _source:     'recovery',
      });

      log.warn('Interrupted execution recovered → FAILED', {
        executionId: exec.id,
        pipelineId:  exec.pipeline_id,
        startedAt:   exec.started_at,
      });

      result.recovered++;
    } catch (err) {
      log.error('Failed to recover execution', { executionId: exec.id, error: err?.message });
      result.errors++;
    }
  }
}

async function _recoverStaleQueued(result) {
  const cutoff = new Date(Date.now() - STALE_QUEUED_THRESHOLD_MS).toISOString();

  const { data, error } = await (require('../db/supabase'))
    .from('pipeline_executions')
    .select('id, pipeline_id, started_at')
    .eq('status', EXECUTION_STATUS.QUEUED)
    .lt('started_at', cutoff);

  if (error || !data?.length) return;

  for (const exec of data) {
    try {
      await store.finalizeExecution(
        exec.id,
        EXECUTION_STATUS.FAILED,
        {},
        'Stale queued execution — never started. Server restart cleared the queue.'
      );

      result.stale++;

      log.warn('Stale queued execution recovered → FAILED', {
        executionId: exec.id,
        pipelineId:  exec.pipeline_id,
      });
    } catch (err) {
      log.error('Failed to recover stale queued execution', { executionId: exec.id, error: err?.message });
      result.errors++;
    }
  }
}

async function _recoverStalledExecutions(result) {
  // Executions already in 'stalled' state — ensure they're finalized
  const { data, error } = await (require('../db/supabase'))
    .from('pipeline_executions')
    .select('id, pipeline_id, started_at')
    .eq('status', 'stalled');

  if (error || !data?.length) return;

  for (const exec of data) {
    try {
      await store.finalizeExecution(
        exec.id,
        EXECUTION_STATUS.FAILED,
        {},
        'Stalled execution finalized during server restart recovery.'
      );

      result.recovered++;

      log.warn('Pre-stalled execution finalized → FAILED', {
        executionId: exec.id,
        pipelineId:  exec.pipeline_id,
      });
    } catch (err) {
      log.error('Failed to finalize stalled execution', { executionId: exec.id, error: err?.message });
      result.errors++;
    }
  }
}

async function _logResumedApprovals(result) {
  // PAUSED executions are intentional — they survive restarts.
  // Just log them so the admin knows they're still waiting.
  const { data } = await (require('../db/supabase'))
    .from('pipeline_executions')
    .select('id, pipeline_id, paused_step, paused_at')
    .eq('status', EXECUTION_STATUS.PAUSED)
    .limit(20);

  const paused = data ?? [];
  if (paused.length > 0) {
    log.info(`${paused.length} approval-gate execution(s) still waiting after restart`, {
      executions: paused.map(e => ({ id: e.id, step: e.paused_step, pausedAt: e.paused_at })),
    });
  }

  result.paused = paused.length;
}

module.exports = { runRecovery };
