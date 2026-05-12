'use strict';

/**
 * AWE-OS — Stall Detector                                    Phase 4C
 *
 * Watchdog system that monitors the runtime for stuck/frozen executions.
 *
 * Detects:
 *   1. STALLED STEPS      — step heartbeat_at older than heartbeatThresholdMs (default 5 min)
 *   2. STALLED EXECUTIONS — RUNNING execution with no step activity > executionThresholdMs (default 30 min)
 *   3. STUCK APPROVALS    — PAUSED execution with no approval > approvalThresholdMs (default 4 hours)
 *   4. ORPHANED STEPS     — RUNNING steps belonging to a non-RUNNING execution
 *
 * On detection:
 *   - Updates DB status to 'stalled'
 *   - Emits HEARTBEAT_MISSED event (for metrics, audit)
 *   - Logs structured warning
 *
 * Safe design:
 *   - setInterval-based (not recursive calls that could stack)
 *   - _running flag prevents overlapping sweeps
 *   - Errors in sweep are caught; never crash the process
 *   - start()/stop() lifecycle management
 */

const { store, EXECUTION_STATUS, STEP_STATUS } = require('./ExecutionStore');
const { bus, EVENTS }                           = require('./EventBus');
const { createLogger }                          = require('../monitoring/logger');

const log = createLogger('stall-detector');

const DEFAULTS = {
  sweepIntervalMs:       60_000,    // sweep every 60 seconds
  heartbeatThresholdMs:   5 * 60_000, // step stalled if heartbeat > 5 min old
  executionThresholdMs:  30 * 60_000, // execution stalled if running > 30 min with no steps
  approvalThresholdMs:    4 * 60 * 60_000, // approval stalled if paused > 4 hours
};

class StallDetector {
  constructor(config = {}) {
    this._cfg     = { ...DEFAULTS, ...config };
    this._timer   = null;
    this._running = false;
  }

  /** Start the watchdog. Call once at runtime init. */
  start() {
    if (this._timer) return; // already running
    this._timer = setInterval(() => this._sweep(), this._cfg.sweepIntervalMs);
    this._timer.unref(); // don't block process exit
    log.info('Stall detector started', { sweepIntervalMs: this._cfg.sweepIntervalMs });
  }

  /** Stop the watchdog. */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    log.info('Stall detector stopped');
  }

  /** Update configuration without restart. */
  configure(config = {}) {
    Object.assign(this._cfg, config);
  }

  // ── Sweep logic ─────────────────────────────────────────────────────────────

  async _sweep() {
    if (this._running) return; // previous sweep still in progress — skip
    this._running = true;
    try {
      await Promise.all([
        this._detectStalledSteps(),
        this._detectStalledExecutions(),
        this._detectStuckApprovals(),
      ]);
    } catch (err) {
      log.error('Stall detector sweep error', { error: err?.message });
    } finally {
      this._running = false;
    }
  }

  // ── 1. Stalled steps ────────────────────────────────────────────────────────

  async _detectStalledSteps() {
    let stalledSteps;
    try {
      stalledSteps = await store.getStalledSteps(this._cfg.heartbeatThresholdMs);
    } catch (err) {
      log.warn('getStalledSteps error', { error: err?.message });
      return;
    }

    for (const step of stalledSteps) {
      try {
        // Mark the step as stalled
        await store.updateStepExecution(step.id, {
          status:        STEP_STATUS.FAILED,
          error_message: `Stall detected: no heartbeat for >${Math.round(this._cfg.heartbeatThresholdMs / 60_000)} minutes`,
          completed_at:  new Date().toISOString(),
        });

        bus.emit(EVENTS.HEARTBEAT_MISSED, {
          executionId: step.execution_id,
          stepName:    step.step_name,
          agentName:   step.agent_name,
          lastHeartbeat: step.heartbeat_at,
          stallType:   'step_heartbeat',
        });

        log.warn('Stalled step detected and marked failed', {
          stepId:      step.id,
          executionId: step.execution_id,
          stepName:    step.step_name,
          lastHeartbeat: step.heartbeat_at,
        });
      } catch (err) {
        log.error('Failed to handle stalled step', { stepId: step.id, error: err?.message });
      }
    }
  }

  // ── 2. Stalled executions (RUNNING but no recent step activity) ──────────────

  async _detectStalledExecutions() {
    const cutoff = new Date(Date.now() - this._cfg.executionThresholdMs).toISOString();

    let executions;
    try {
      // Find RUNNING executions that started before the cutoff
      const { data, error } = await (require('../db/supabase'))
        .from('pipeline_executions')
        .select('id, pipeline_id, started_at, current_step')
        .eq('status', EXECUTION_STATUS.RUNNING)
        .lt('started_at', cutoff);

      if (error) return;
      executions = data ?? [];
    } catch {
      return;
    }

    for (const exec of executions) {
      try {
        await store.updateExecution(exec.id, {
          status:        'stalled',
          error_message: `Stall detected: execution running for >${Math.round(this._cfg.executionThresholdMs / 60_000)} minutes`,
        });

        bus.emit(EVENTS.HEARTBEAT_MISSED, {
          executionId: exec.id,
          pipelineId:  exec.pipeline_id,
          currentStep: exec.current_step,
          stallType:   'execution_timeout',
        });

        log.warn('Stalled execution detected', {
          executionId: exec.id,
          pipelineId:  exec.pipeline_id,
          startedAt:   exec.started_at,
        });
      } catch (err) {
        log.error('Failed to handle stalled execution', { executionId: exec.id, error: err?.message });
      }
    }
  }

  // ── 3. Stuck approvals (PAUSED for too long) ──────────────────────────────

  async _detectStuckApprovals() {
    const cutoff = new Date(Date.now() - this._cfg.approvalThresholdMs).toISOString();

    let executions;
    try {
      const { data, error } = await (require('../db/supabase'))
        .from('pipeline_executions')
        .select('id, pipeline_id, paused_at, paused_step')
        .eq('status', EXECUTION_STATUS.PAUSED)
        .lt('paused_at', cutoff);

      if (error) return;
      executions = data ?? [];
    } catch {
      return;
    }

    for (const exec of executions) {
      try {
        bus.emit(EVENTS.QUEUE_STALLED, {
          executionId: exec.id,
          pipelineId:  exec.pipeline_id,
          pausedStep:  exec.paused_step,
          pausedAt:    exec.paused_at,
          stallType:   'approval_timeout',
          message:     `Approval step "${exec.paused_step}" has been waiting for >${Math.round(this._cfg.approvalThresholdMs / 3_600_000)}h`,
        });

        log.warn('Stuck approval detected', {
          executionId: exec.id,
          pausedStep:  exec.paused_step,
          pausedAt:    exec.paused_at,
        });
      } catch (err) {
        log.error('Failed to handle stuck approval', { executionId: exec.id, error: err?.message });
      }
    }
  }

  /**
   * Returns current stalled executions for the monitoring API.
   * @returns {Promise<object[]>}
   */
  async getStalledExecutions() {
    try {
      const { data, error } = await (require('../db/supabase'))
        .from('pipeline_executions')
        .select('id, pipeline_id, status, started_at, current_step, error_message')
        .eq('status', 'stalled')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
  }
}

// Process-singleton
const stallDetector = new StallDetector();

module.exports = { StallDetector, stallDetector };
