'use strict';

/**
 * AWE-OS — Pipeline Orchestrator                             Phase 4B
 *
 * Core DAG execution engine. Responsibilities:
 *   1. Topological sort of steps → dependency-safe execution order
 *   2. Context accumulation — each step's output feeds subsequent steps
 *   3. Approval gate handling — pause + resume cycle
 *   4. Cancellation propagation — cancel() aborts current step + marks CANCELLED
 *   5. Crash recovery awareness — on startup, interrupted executions are marked FAILED
 *   6. Full observability — all state changes persisted to ExecutionStore + EventBus
 *
 * EXECUTION MODEL:
 *   orchestrator.execute() → returns executionId immediately (fire-and-forget async)
 *   Caller polls GET /api/pipelines/executions/:id for status updates
 *   Approval gates pause the pipeline — admin calls approve() to resume
 *
 * SAFETY:
 *   - Cancelled pipelines never reach publish steps
 *   - Failed steps propagate failure to the entire pipeline
 *   - All state transitions are DB-persisted before the function returns
 */

const { store, EXECUTION_STATUS, STEP_STATUS } = require('./ExecutionStore');
const { executor }                              = require('./AgentExecutor');
const { bus, EVENTS }                           = require('./EventBus');
const { getPipeline }                           = require('./PipelineDefinitions');
const { topologicalSort }                       = require('./PipelineValidator');

function log(level, msg, data = {}) {
  const line = JSON.stringify({ layer: 'orchestrator', level, msg, ...data, ts: new Date().toISOString() });
  if      (level === 'error') console.error(line);
  else if (level === 'warn')  console.warn(line);
  else                        console.log(line);
}

class PipelineOrchestrator {

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Start a new pipeline execution and return the executionId immediately.
   * The pipeline runs asynchronously — callers poll for status.
   *
   * @param {string} pipelineId   - Must exist in PIPELINE_REGISTRY
   * @param {string} triggeredBy  - 'admin' | 'cron' | 'api' | userId
   * @param {object} inputContext - Initial context for first step
   * @returns {Promise<string>}   executionId
   */
  async execute(pipelineId, triggeredBy = 'api', inputContext = {}) {
    const pipeline = getPipeline(pipelineId);
    if (!pipeline) throw new Error(`Pipeline not found: "${pipelineId}"`);
    if (!pipeline.steps?.length) throw new Error(`Pipeline "${pipelineId}" has no steps`);

    const executionId = await store.createExecution(pipelineId, triggeredBy, inputContext);

    bus.emit(EVENTS.PIPELINE_STARTED, { pipelineId, executionId, triggeredBy });
    log('info', 'Pipeline execution started', { pipelineId, executionId, triggeredBy });

    // Fire-and-forget — HTTP response returns executionId before pipeline completes
    setImmediate(() => {
      this._runPipeline(executionId, pipeline, { ...inputContext }).catch(err => {
        log('error', 'Unhandled pipeline error', { executionId, error: err?.message });
      });
    });

    return executionId;
  }

  /**
   * Approve a paused step and resume the pipeline.
   * Called after a human reviews the paused execution.
   *
   * @param {string} executionId
   * @param {string} stepName       - Must match execution.paused_step
   * @param {string} approverUserId
   */
  async approve(executionId, stepName, approverUserId) {
    const execution = await store.getExecution(executionId);

    if (execution.status !== EXECUTION_STATUS.PAUSED) {
      throw new Error(`Cannot approve — execution is not paused (status: ${execution.status})`);
    }
    if (execution.paused_step !== stepName) {
      throw new Error(`Paused step is "${execution.paused_step}", not "${stepName}"`);
    }

    // Mark the approval step row as APPROVED
    const steps      = await store.getStepExecutions(executionId);
    const stepRow    = steps.find(s => s.step_name === stepName);
    if (stepRow) {
      await store.updateStepExecution(stepRow.id, {
        status:         STEP_STATUS.APPROVED,
        completed_at:   new Date().toISOString(),
        output_context: {
          approved:   true,
          approvedBy: approverUserId,
          approvedAt: new Date().toISOString(),
        },
      });
    }

    await store.updateExecution(executionId, { approved_by: approverUserId });

    log('info', 'Step approved — resuming pipeline', { executionId, stepName, approverUserId });

    // Resume automatically after approval
    await this._resumeFromApproval(executionId, stepName);
  }

  /**
   * Cancel a running or paused pipeline.
   * Aborts any currently executing step via AgentExecutor.
   */
  async cancel(executionId) {
    const execution = await store.getExecution(executionId);
    const cancellable = [EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.PAUSED, EXECUTION_STATUS.QUEUED];

    if (!cancellable.includes(execution.status)) {
      throw new Error(`Cannot cancel — execution status is "${execution.status}"`);
    }

    executor.cancel(executionId);
    await store.finalizeExecution(executionId, EXECUTION_STATUS.CANCELLED, {}, 'Cancelled by user');
    bus.emit(EVENTS.PIPELINE_CANCELLED, { executionId, pipelineId: execution.pipeline_id });
    log('info', 'Pipeline cancelled', { executionId });
  }

  // ── Internal: full pipeline runner ──────────────────────────────────────────

  /**
   * @param {string}  executionId
   * @param {object}  pipeline        - Pipeline definition
   * @param {object}  initialContext  - Starting context (input + any resumed state)
   * @param {string|null} resumeAfter - If resuming, skip steps up to and including this name
   */
  async _runPipeline(executionId, pipeline, initialContext, resumeAfter = null) {
    await store.updateExecution(executionId, {
      status:     EXECUTION_STATUS.RUNNING,
      started_at: new Date().toISOString(),
    });

    // Resolve execution order
    const { order, error: sortError } = topologicalSort(pipeline.steps);
    if (sortError) {
      await store.finalizeExecution(executionId, EXECUTION_STATUS.FAILED, {}, sortError);
      bus.emit(EVENTS.PIPELINE_FAILED, { executionId, error: sortError });
      log('error', 'Pipeline DAG sort failed', { executionId, error: sortError });
      return;
    }

    const stepMap    = new Map(pipeline.steps.map(s => [s.name, s]));
    const accContext = { ...initialContext };

    // If resuming after approval gate, pre-populate context from all completed steps
    let skipMode = !!resumeAfter;
    if (skipMode) {
      const completedSteps = await store.getStepExecutions(executionId);
      for (const s of completedSteps) {
        if ([STEP_STATUS.COMPLETED, STEP_STATUS.APPROVED].includes(s.status)) {
          Object.assign(accContext, s.output_context ?? {});
        }
      }
    }

    try {
      for (const stepName of order) {
        // In skip mode: fast-forward past already-completed steps
        if (skipMode) {
          if (stepName === resumeAfter) skipMode = false;
          continue;
        }

        // Abort if cancelled while iterating
        const liveExec = await store.getExecution(executionId).catch(() => null);
        if (liveExec?.status === EXECUTION_STATUS.CANCELLED) {
          log('info', 'Pipeline was cancelled — halting mid-execution', { executionId });
          return;
        }

        const step = stepMap.get(stepName);
        if (!step) { log('warn', `Step "${stepName}" in order but missing from definition`, { executionId }); continue; }

        const stepResult = await this._executeStep(executionId, step, order.indexOf(stepName), accContext);

        // Paused at approval gate — stop here, resume() will re-enter _runPipeline
        if (stepResult.paused) {
          log('info', 'Pipeline paused at approval gate', { executionId, step: stepName });
          return;
        }

        if (!stepResult.success) {
          const errMsg = stepResult.error || `Step "${stepName}" failed`;
          await store.finalizeExecution(executionId, EXECUTION_STATUS.FAILED, accContext, errMsg);
          bus.emit(EVENTS.PIPELINE_FAILED, { executionId, pipelineId: pipeline.id, failedStep: stepName, error: errMsg });
          log('error', 'Pipeline failed', { executionId, failedStep: stepName, error: errMsg });
          return;
        }

        // Merge step output into accumulated context for downstream steps
        Object.assign(accContext, stepResult.result ?? {});
      }

      // All steps completed
      await store.finalizeExecution(executionId, EXECUTION_STATUS.COMPLETED, accContext);
      bus.emit(EVENTS.PIPELINE_COMPLETED, { executionId, pipelineId: pipeline.id });
      log('info', 'Pipeline completed successfully', { executionId, pipelineId: pipeline.id });

    } catch (err) {
      const errMsg = err?.message || 'Unexpected pipeline runtime error';
      await store.finalizeExecution(executionId, EXECUTION_STATUS.FAILED, accContext, errMsg).catch(() => {});
      bus.emit(EVENTS.PIPELINE_FAILED, { executionId, error: errMsg });
      log('error', 'Pipeline threw uncaught error', { executionId, error: errMsg });
    }
  }

  /** Execute one step — routes to approval handler or AgentExecutor. */
  async _executeStep(executionId, step, stepIndex, accContext) {
    const { name: stepName, type, agentName, fn, timeoutMs, maxRetries, retryDelays, autoApproveCondition } = step;

    log('info', `Executing step "${stepName}"`, { executionId, stepIndex, type: type || 'normal' });
    await store.updateExecution(executionId, { current_step: stepName }).catch(() => {});
    bus.emit(EVENTS.STEP_STARTED, { executionId, stepName, stepIndex, agentName });

    // ── Approval gate ──────────────────────────────────────────────────────────
    if (type === 'approval') {
      const shouldAutoApprove =
        typeof autoApproveCondition === 'function' && autoApproveCondition(accContext) === true;

      const stepExecId = await store.createStepExecution(
        executionId, stepName, stepIndex, 'approval-gate', accContext
      ).catch(() => null);

      if (shouldAutoApprove) {
        log('info', `Auto-approving step "${stepName}"`, { executionId });
        if (stepExecId) {
          await store.updateStepExecution(stepExecId, {
            status:         STEP_STATUS.APPROVED,
            completed_at:   new Date().toISOString(),
            output_context: { approved: true, autoApproved: true, approvedAt: new Date().toISOString() },
          }).catch(() => {});
        }
        bus.emit(EVENTS.STEP_COMPLETED, { executionId, stepName, autoApproved: true });
        return { success: true, result: { approved: true, autoApproved: true } };
      }

      // Pause — persist state and return paused signal
      if (stepExecId) {
        await store.updateStepExecution(stepExecId, {
          status:     STEP_STATUS.WAITING_APPROVAL,
          started_at: new Date().toISOString(),
        }).catch(() => {});
      }

      await store.updateExecution(executionId, {
        status:       EXECUTION_STATUS.PAUSED,
        paused_at:    new Date().toISOString(),
        paused_step:  stepName,
        current_step: stepName,
      });

      bus.emit(EVENTS.PIPELINE_PAUSED, { executionId, pausedStep: stepName });
      return { success: true, paused: true, stepName };
    }

    // ── Normal step ────────────────────────────────────────────────────────────
    const stepExecId = await store.createStepExecution(
      executionId, stepName, stepIndex, agentName ?? null, accContext
    ).catch(() => null);

    const result = await executor.execute(
      {
        agentName,
        fn,
        timeoutMs:       timeoutMs   ?? 120_000,
        maxRetries:      maxRetries  ?? 3,
        retryDelays:     retryDelays ?? [5_000, 15_000, 45_000],
        stepExecutionId: stepExecId,
        executionId,
      },
      accContext
    );

    bus.emit(
      result.success ? EVENTS.STEP_COMPLETED : EVENTS.STEP_FAILED,
      { executionId, stepName, agentName, success: result.success, error: result.error }
    );

    return result;
  }

  /** Re-enter _runPipeline after a human approves the gate. */
  async _resumeFromApproval(executionId, approvedStepName) {
    const execution = await store.getExecution(executionId);
    const pipeline  = getPipeline(execution.pipeline_id);
    if (!pipeline) throw new Error(`Pipeline definition missing for resume: ${execution.pipeline_id}`);

    await store.updateExecution(executionId, {
      status:      EXECUTION_STATUS.RUNNING,
      resumed_at:  new Date().toISOString(),
      paused_at:   null,
      paused_step: null,
    });

    bus.emit(EVENTS.PIPELINE_RESUMED, { executionId, pipelineId: execution.pipeline_id, resumedAfter: approvedStepName });

    setImmediate(() => {
      this._runPipeline(executionId, pipeline, execution.input_context, approvedStepName).catch(err => {
        log('error', 'Error resuming pipeline', { executionId, error: err?.message });
      });
    });
  }

  // ── Startup crash recovery ───────────────────────────────────────────────────

  /**
   * Call once at server startup.
   * Finds executions that were RUNNING when the server last shut down
   * and marks them as FAILED. We never auto-resume unknown mid-execution state.
   */
  async recoverInterruptedExecutions() {
    try {
      const interrupted = await store.getInterruptedExecutions();
      if (interrupted.length === 0) return;

      log('warn', `Found ${interrupted.length} interrupted execution(s) — marking as failed`, {});

      for (const exec of interrupted) {
        await store.finalizeExecution(
          exec.id,
          EXECUTION_STATUS.FAILED,
          {},
          'Server restart — execution interrupted. Re-trigger from admin panel.'
        ).catch(() => {});

        log('warn', 'Interrupted execution marked as failed', {
          executionId: exec.id,
          pipelineId:  exec.pipeline_id,
          startedAt:   exec.started_at,
        });
      }
    } catch (err) {
      log('error', 'recoverInterruptedExecutions error', { error: err?.message });
    }
  }
}

// Process-singleton
const orchestrator = new PipelineOrchestrator();

module.exports = { PipelineOrchestrator, orchestrator };
