'use strict';

/**
 * AWE-OS — Execution Store                                   Phase 4A
 *
 * Supabase-backed persistence for all pipeline and step execution state.
 * Zero in-memory caching — all state lives in the DB so executions survive
 * process restarts and are visible from any admin session.
 *
 * Tables (created by migration 009):
 *   pipeline_executions       — one row per pipeline run instance
 *   pipeline_step_executions  — one row per step within a run
 */

const supabase = require('../db/supabase');

// ── Status enums ───────────────────────────────────────────────────────────────
const EXECUTION_STATUS = Object.freeze({
  QUEUED:    'queued',
  RUNNING:   'running',
  PAUSED:    'paused',      // waiting at approval gate
  COMPLETED: 'completed',
  FAILED:    'failed',
  CANCELLED: 'cancelled',
});

const STEP_STATUS = Object.freeze({
  PENDING:          'pending',
  RUNNING:          'running',
  COMPLETED:        'completed',
  FAILED:           'failed',
  SKIPPED:          'skipped',
  WAITING_APPROVAL: 'waiting_approval',
  APPROVED:         'approved',
  CANCELLED:        'cancelled',
});

// ── ExecutionStore ─────────────────────────────────────────────────────────────
class ExecutionStore {

  // ── Pipeline executions ──────────────────────────────────────────────────────

  async createExecution(pipelineId, triggeredBy, inputContext = {}) {
    const { data, error } = await supabase
      .from('pipeline_executions')
      .insert({
        pipeline_id:   pipelineId,
        triggered_by:  String(triggeredBy),
        status:        EXECUTION_STATUS.QUEUED,
        input_context: inputContext,
        started_at:    new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw new Error(`ExecutionStore.createExecution: ${error.message}`);
    return data.id;
  }

  async updateExecution(executionId, updates) {
    const { error } = await supabase
      .from('pipeline_executions')
      .update(updates)
      .eq('id', executionId);

    if (error) throw new Error(`ExecutionStore.updateExecution: ${error.message}`);
  }

  async finalizeExecution(executionId, status, outputContext = {}, errorMessage = null) {
    const { error } = await supabase
      .from('pipeline_executions')
      .update({
        status,
        output_context: outputContext,
        error_message:  errorMessage,
        completed_at:   new Date().toISOString(),
        current_step:   null,
      })
      .eq('id', executionId);

    if (error) throw new Error(`ExecutionStore.finalizeExecution: ${error.message}`);
  }

  async getExecution(executionId) {
    const { data, error } = await supabase
      .from('pipeline_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (error) throw new Error(`Execution not found: ${executionId}`);
    return data;
  }

  /**
   * Returns all executions currently in a non-terminal state.
   * Used by admin dashboard and recovery logic.
   */
  async getActiveExecutions() {
    const { data, error } = await supabase
      .from('pipeline_executions')
      .select('*')
      .in('status', [EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.QUEUED, EXECUTION_STATUS.PAUSED])
      .order('started_at', { ascending: false });

    if (error) throw new Error(`ExecutionStore.getActiveExecutions: ${error.message}`);
    return data ?? [];
  }

  /**
   * Returns execution history, optionally filtered by pipelineId.
   */
  async getExecutionHistory(pipelineId = null, limit = 20) {
    let query = supabase
      .from('pipeline_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 20, 100));

    if (pipelineId) query = query.eq('pipeline_id', pipelineId);

    const { data, error } = await query;
    if (error) throw new Error(`ExecutionStore.getExecutionHistory: ${error.message}`);
    return data ?? [];
  }

  /**
   * Find executions that were RUNNING when the server last shut down.
   * Identified by: status=running AND started_at > 30 minutes ago.
   * These are orphaned — the worker process that owned them is gone.
   */
  async getInterruptedExecutions() {
    const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data, error } = await supabase
      .from('pipeline_executions')
      .select('id, pipeline_id, triggered_by, started_at')
      .eq('status', EXECUTION_STATUS.RUNNING)
      .lt('started_at', cutoff);

    if (error) return [];
    return data ?? [];
  }

  // ── Step executions ──────────────────────────────────────────────────────────

  async createStepExecution(executionId, stepName, stepIndex, agentName = null, inputContext = {}) {
    const { data, error } = await supabase
      .from('pipeline_step_executions')
      .insert({
        execution_id:  executionId,
        step_name:     stepName,
        step_index:    stepIndex,
        agent_name:    agentName,
        status:        STEP_STATUS.PENDING,
        input_context: inputContext,
      })
      .select('id')
      .single();

    if (error) throw new Error(`ExecutionStore.createStepExecution: ${error.message}`);
    return data.id;
  }

  async updateStepExecution(stepExecutionId, updates) {
    const { error } = await supabase
      .from('pipeline_step_executions')
      .update(updates)
      .eq('id', stepExecutionId);

    if (error) throw new Error(`ExecutionStore.updateStepExecution: ${error.message}`);
  }

  /**
   * Keep-alive heartbeat — updates heartbeat_at to prove the step is still alive.
   * Best-effort: never throws because a heartbeat failure must not kill the worker.
   */
  async updateStepHeartbeat(stepExecutionId) {
    try {
      await supabase
        .from('pipeline_step_executions')
        .update({ heartbeat_at: new Date().toISOString() })
        .eq('id', stepExecutionId);
    } catch (_) {}
  }

  async getStepExecutions(executionId) {
    const { data, error } = await supabase
      .from('pipeline_step_executions')
      .select('*')
      .eq('execution_id', executionId)
      .order('step_index', { ascending: true });

    if (error) throw new Error(`ExecutionStore.getStepExecutions: ${error.message}`);
    return data ?? [];
  }

  /**
   * Get the last successfully completed step for resume calculation.
   */
  async getLastCompletedStep(executionId) {
    const { data } = await supabase
      .from('pipeline_step_executions')
      .select('step_name, step_index, output_context')
      .eq('execution_id', executionId)
      .in('status', [STEP_STATUS.COMPLETED, STEP_STATUS.APPROVED])
      .order('step_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ?? null;
  }

  /**
   * Find RUNNING steps whose heartbeat_at is older than heartbeatThresholdMs.
   * These are stalled — their worker likely crashed or hung.
   */
  async getStalledSteps(heartbeatThresholdMs = 5 * 60_000) {
    const cutoff = new Date(Date.now() - heartbeatThresholdMs).toISOString();
    const { data, error } = await supabase
      .from('pipeline_step_executions')
      .select('id, execution_id, step_name, agent_name, heartbeat_at')
      .eq('status', STEP_STATUS.RUNNING)
      .lt('heartbeat_at', cutoff);

    if (error) return [];
    return data ?? [];
  }

  // ── Runtime metrics (admin dashboard) ───────────────────────────────────────

  async getPipelineMetrics(windowHours = 24) {
    const since = new Date(Date.now() - windowHours * 60 * 60_000).toISOString();

    const { data: executions, error } = await supabase
      .from('pipeline_executions')
      .select('pipeline_id, status, started_at, completed_at')
      .gte('created_at', since);

    if (error) return null;

    const rows     = executions ?? [];
    const total    = rows.length;
    const byStatus = {};
    const byPipeline = {};

    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] || 0) + 1;
      if (!byPipeline[row.pipeline_id]) {
        byPipeline[row.pipeline_id] = { total: 0, completed: 0, failed: 0 };
      }
      byPipeline[row.pipeline_id].total++;
      if (row.status === 'completed') byPipeline[row.pipeline_id].completed++;
      if (row.status === 'failed')    byPipeline[row.pipeline_id].failed++;
    }

    const completed  = byStatus.completed || 0;
    const failed     = byStatus.failed    || 0;
    const successRate = total > 0 ? completed / total : 0;

    return {
      total, byStatus, byPipeline, successRate,
      failureRate: total > 0 ? failed / total : 0,
      windowHours,
    };
  }
}

// Process-singleton
const store = new ExecutionStore();

module.exports = { ExecutionStore, store, EXECUTION_STATUS, STEP_STATUS };
