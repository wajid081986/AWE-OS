'use strict';

/**
 * AWE-OS — DeadLetterQueue                                     Phase 4F
 *
 * Failed execution forensics and replay.
 * Stores permanently-failed executions in `runtime_dlq` table.
 * Replay re-enqueues an execution via PipelineOrchestrator.
 *
 * DB schema (runtime_dlq):
 *   id TEXT PK, execution_id TEXT, pipeline_id TEXT, failure_reason TEXT,
 *   error_message TEXT, input JSONB, context JSONB, attempts INT,
 *   failed_at TIMESTAMPTZ, replayed_at TIMESTAMPTZ, replay_execution_id TEXT,
 *   status TEXT DEFAULT 'dead'
 */

const { createLogger } = require('../../monitoring/logger');
const { bus, EVENTS }  = require('../EventBus');

const log = createLogger('dead-letter-queue');

// In-memory ring buffer fallback when DB is unavailable (max 100 entries)
const _memBuffer = [];
const MEM_BUFFER_MAX = 100;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Push a permanently-failed execution to the DLQ.
 *
 * @param {object} params
 * @param {string} params.executionId
 * @param {string} params.pipelineId
 * @param {string} params.failureReason   - human-readable reason (e.g. 'MAX_RETRIES_EXCEEDED')
 * @param {string} [params.errorMessage]
 * @param {object} [params.input]         - original execution input
 * @param {object} [params.context]       - execution context snapshot
 * @param {number} [params.attempts]      - how many times this was retried
 */
async function push(params) {
  const { executionId, pipelineId, failureReason, errorMessage, input, context, attempts } = params;
  const { randomUUID } = require('crypto');

  const entry = {
    id:             randomUUID(),
    execution_id:   executionId,
    pipeline_id:    pipelineId,
    failure_reason: failureReason,
    error_message:  errorMessage ?? null,
    input:          input         ?? null,
    context:        context        ?? null,
    attempts:       attempts       ?? 0,
    failed_at:      new Date().toISOString(),
    replayed_at:    null,
    replay_execution_id: null,
    status:         'dead',
  };

  try {
    const { error } = await db().from('runtime_dlq').insert(entry);
    if (error) throw error;
    log.warn('Execution pushed to DLQ', { executionId, pipelineId, failureReason });
  } catch (err) {
    // Fall back to in-memory buffer
    log.warn('DLQ DB write failed — using memory buffer', { executionId, error: err.message });
    _memBuffer.push(entry);
    if (_memBuffer.length > MEM_BUFFER_MAX) _memBuffer.shift();
  }

  try {
    bus.emit(EVENTS.PIPELINE_FAILED, { executionId, pipelineId, error: failureReason, dlq: true });
  } catch (_) {}
}

/**
 * List DLQ entries (admin view).
 *
 * @param {{ limit?: number, status?: string, pipelineId?: string }} opts
 * @returns {Promise<Array>}
 */
async function list(opts = {}) {
  const { limit = 50, status = 'dead', pipelineId = null } = opts;

  try {
    let q = db().from('runtime_dlq').select('*').eq('status', status);
    if (pipelineId) q = q.eq('pipeline_id', pipelineId);
    const { data, error } = await q.order('failed_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (_) {
    return [..._memBuffer].reverse().slice(0, limit);
  }
}

/**
 * Replay a DLQ entry — re-enqueue the execution via PipelineOrchestrator.
 *
 * @param {string} dlqEntryId
 * @param {string} [actorId]   - admin user ID initiating the replay
 * @returns {Promise<{ success: boolean, executionId?: string, error?: string }>}
 */
async function replay(dlqEntryId, actorId = 'system') {
  try {
    // Fetch the DLQ entry
    let entry;
    const { data, error } = await db().from('runtime_dlq').select('*').eq('id', dlqEntryId).single();
    if (error) throw error;
    entry = data;

    if (!entry) return { success: false, error: 'DLQ entry not found' };
    if (entry.status === 'replayed') return { success: false, error: 'Already replayed' };

    // Lazy-load orchestrator to avoid circular deps at module load time
    const { orchestrator } = require('../PipelineOrchestrator');

    const newExecId = await orchestrator.run(entry.pipeline_id, {
      ...(entry.input ?? {}),
      _replayedFrom:  entry.execution_id,
      _replayedBy:    actorId,
      _replayedAt:    new Date().toISOString(),
    });

    // Mark as replayed
    await db().from('runtime_dlq')
      .update({
        status:              'replayed',
        replayed_at:         new Date().toISOString(),
        replay_execution_id: newExecId,
      })
      .eq('id', dlqEntryId);

    log.info('DLQ entry replayed', { dlqEntryId, newExecId, pipelineId: entry.pipeline_id, actorId });
    return { success: true, executionId: newExecId };
  } catch (err) {
    log.warn('DLQ replay failed', { dlqEntryId, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Delete a DLQ entry (admin cleanup).
 *
 * @param {string} dlqEntryId
 */
async function remove(dlqEntryId) {
  try {
    await db().from('runtime_dlq').delete().eq('id', dlqEntryId);
  } catch (_) {}
}

/**
 * Summary counts for the admin dashboard.
 */
async function getSummary() {
  try {
    const { data } = await db()
      .from('runtime_dlq')
      .select('status');

    const counts = (data ?? []).reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    return { dead: counts.dead ?? 0, replayed: counts.replayed ?? 0, total: (data ?? []).length };
  } catch (_) {
    return { dead: _memBuffer.length, replayed: 0, total: _memBuffer.length, source: 'memory' };
  }
}

module.exports = { push, list, replay, remove, getSummary };
