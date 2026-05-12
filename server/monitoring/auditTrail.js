'use strict';

/**
 * AWE-OS — Runtime Audit Trail                               Phase 4D
 *
 * Persistent audit log for all significant runtime events.
 * Writes to Supabase `runtime_audit_logs` table (created by migration).
 * Falls back silently if table does not yet exist — never blocks execution.
 *
 * Wired to EventBus in initAuditTrail(bus) at startup.
 * Also exposes logAction() for explicit audit writes (admin approvals, etc.)
 */

const supabase       = require('../db/supabase');
const { createLogger } = require('./logger');

const log = createLogger('audit-trail');

// Action taxonomy — all tracked action types
const ACTIONS = Object.freeze({
  EXECUTION_STARTED:    'execution.started',
  EXECUTION_COMPLETED:  'execution.completed',
  EXECUTION_FAILED:     'execution.failed',
  EXECUTION_CANCELLED:  'execution.cancelled',
  EXECUTION_STALLED:    'execution.stalled',
  EXECUTION_RECOVERED:  'execution.recovered',

  STEP_STARTED:         'step.started',
  STEP_COMPLETED:       'step.completed',
  STEP_FAILED:          'step.failed',
  STEP_RETRIED:         'step.retried',
  STEP_TIMED_OUT:       'step.timed_out',

  APPROVAL_REQUESTED:   'approval.requested',
  APPROVAL_GRANTED:     'approval.granted',
  APPROVAL_AUTO:        'approval.auto',

  QUEUE_ENQUEUED:       'queue.enqueued',
  QUEUE_DEQUEUED:       'queue.dequeued',

  STALL_DETECTED:       'stall.detected',
  RECOVERY_RAN:         'recovery.ran',

  ADMIN_ACTION:         'admin.action',
});

class AuditTrail {
  constructor() {
    this._initialized = false;
    this._buffer      = []; // in-flight writes that couldn't persist
  }

  /**
   * Log an action to the persistent audit log.
   * Best-effort — never throws.
   *
   * @param {object} entry
   * @param {string}   entry.executionId
   * @param {string}   entry.action       - ACTIONS.*
   * @param {object}   [entry.details]    - Freeform metadata
   * @param {string}   [entry.actorId]    - Who triggered this (userId, 'system', 'cron')
   * @param {string}   [entry.pipelineId]
   * @param {string}   [entry.stepName]
   */
  async logAction({ executionId, action, details = {}, actorId = 'system', pipelineId = null, stepName = null }) {
    const record = {
      execution_id: executionId ?? null,
      pipeline_id:  pipelineId  ?? null,
      step_name:    stepName    ?? null,
      action,
      details,
      actor_id:     actorId,
      created_at:   new Date().toISOString(),
    };

    try {
      await supabase.from('runtime_audit_logs').insert(record);
    } catch (err) {
      // Table may not exist yet — log locally and move on
      log.debug('Audit log write failed (table may not exist yet)', { action, error: err?.message });
      this._buffer.push(record);
      if (this._buffer.length > 200) this._buffer.shift();
    }
  }

  /**
   * Retrieve audit entries for a specific execution.
   * Returns empty array if table does not exist.
   *
   * @param {string}   executionId
   * @param {number}   [limit]
   * @returns {Promise<object[]>}
   */
  async getAuditLog(executionId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('runtime_audit_logs')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true })
        .limit(Math.min(Number(limit) || 50, 200));

      if (error) return this._buffer.filter(e => e.execution_id === executionId);
      return data ?? [];
    } catch {
      return this._buffer.filter(e => e.execution_id === executionId);
    }
  }

  /**
   * Wire EventBus listeners for automatic audit writes.
   * Must be called exactly once at startup.
   */
  initAuditTrail(bus) {
    if (this._initialized) return;
    this._initialized = true;

    const { EVENTS } = require('../runtime/EventBus');

    bus.subscribe(EVENTS.PIPELINE_STARTED, (p) => {
      this.logAction({ executionId: p.executionId, pipelineId: p.pipelineId,
        action: ACTIONS.EXECUTION_STARTED, actorId: p.triggeredBy || 'system',
        details: { triggeredBy: p.triggeredBy } }).catch(() => {});
    });

    bus.subscribe(EVENTS.PIPELINE_COMPLETED, (p) => {
      this.logAction({ executionId: p.executionId, pipelineId: p.pipelineId,
        action: ACTIONS.EXECUTION_COMPLETED, details: { durationMs: p.durationMs } }).catch(() => {});
    });

    bus.subscribe(EVENTS.PIPELINE_FAILED, (p) => {
      this.logAction({ executionId: p.executionId, pipelineId: p.pipelineId,
        action: ACTIONS.EXECUTION_FAILED,
        details: { failedStep: p.failedStep, error: p.error } }).catch(() => {});
    });

    bus.subscribe(EVENTS.PIPELINE_CANCELLED, (p) => {
      this.logAction({ executionId: p.executionId, pipelineId: p.pipelineId,
        action: ACTIONS.EXECUTION_CANCELLED }).catch(() => {});
    });

    bus.subscribe(EVENTS.PIPELINE_PAUSED, (p) => {
      this.logAction({ executionId: p.executionId, stepName: p.pausedStep,
        action: ACTIONS.APPROVAL_REQUESTED }).catch(() => {});
    });

    bus.subscribe(EVENTS.PIPELINE_RESUMED, (p) => {
      this.logAction({ executionId: p.executionId, pipelineId: p.pipelineId,
        action: ACTIONS.APPROVAL_GRANTED,
        details: { resumedAfter: p.resumedAfter } }).catch(() => {});
    });

    bus.subscribe(EVENTS.STEP_RETRYING, (p) => {
      this.logAction({ executionId: p.executionId, stepName: p.stepName,
        action: ACTIONS.STEP_RETRIED,
        details: { attempt: p.attempt, maxRetries: p.maxRetries, delayMs: p.delayMs, error: p.error } }).catch(() => {});
    });

    bus.subscribe(EVENTS.HEARTBEAT_MISSED, (p) => {
      this.logAction({ executionId: p.executionId,
        action: ACTIONS.STALL_DETECTED,
        details: { stepName: p.stepName, stallType: p.stallType } }).catch(() => {});
    });

    log.info('Audit trail initialized');
  }
}

// Process-singleton
const auditTrail = new AuditTrail();

module.exports = { AuditTrail, auditTrail, ACTIONS };
