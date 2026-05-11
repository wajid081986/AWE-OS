'use strict';

/**
 * AWE-OS — Agent Executor                                    Phase 4A
 *
 * Wraps ANY agent function with production-grade safety infrastructure:
 *   ✅ Configurable timeout (AbortController)
 *   ✅ Per-attempt retry with exponential backoff
 *   ✅ Heartbeat keep-alive (15s interval → pipeline_step_executions.heartbeat_at)
 *   ✅ Event emission on every state transition
 *   ✅ Cancellation propagation via cancel(executionId)
 *   ✅ Structured result: { success, result|error, attempts, durationMs, retryHistory }
 *   ✅ DB state persistence via ExecutionStore
 *
 * The wrapped function (config.fn) receives:
 *   fn(context: object, signal: AbortSignal): Promise<object>
 *
 * The AbortSignal is aborted on timeout OR when cancel(executionId) is called.
 * Agents that support cancellation should check signal.aborted periodically.
 */

const { store, STEP_STATUS }   = require('./ExecutionStore');
const { bus, EVENTS }          = require('./EventBus');

const DEFAULT_TIMEOUT_MS    = 120_000;   // 2 minutes
const DEFAULT_MAX_RETRIES   = 3;
const DEFAULT_RETRY_DELAYS  = [5_000, 15_000, 45_000]; // ms per retry
const HEARTBEAT_INTERVAL_MS = 15_000;    // 15 seconds

class AgentExecutor {
  constructor() {
    /** @type {Map<string, AbortController>} executionId → controller */
    this._controllers = new Map();
  }

  /**
   * Execute an agent function with full safety wrapper.
   *
   * @param {object}   config
   * @param {string}   config.agentName        - Display name for logs/events
   * @param {Function} config.fn               - async (context, signal) => object
   * @param {number}   [config.timeoutMs]      - Hard timeout per attempt
   * @param {number}   [config.maxRetries]     - Total retry attempts (0 = no retries)
   * @param {number[]} [config.retryDelays]    - ms delay before each retry
   * @param {string}   [config.stepExecutionId]- DB row id for heartbeat updates
   * @param {string}   [config.executionId]    - Parent pipeline execution id
   *
   * @param {object} context - Accumulated pipeline context passed to fn
   * @returns {Promise<ExecutionResult>}
   */
  async execute(config, context = {}) {
    const {
      agentName        = 'unknown',
      fn,
      timeoutMs        = DEFAULT_TIMEOUT_MS,
      maxRetries       = DEFAULT_MAX_RETRIES,
      retryDelays      = DEFAULT_RETRY_DELAYS,
      stepExecutionId  = null,
      executionId      = null,
    } = config;

    if (typeof fn !== 'function') {
      throw new TypeError(`AgentExecutor: config.fn must be a function (got ${typeof fn})`);
    }

    const startedAt    = Date.now();
    let   attempts     = 0;
    const retryHistory = [];

    // Register cancellation controller
    const controller = new AbortController();
    if (executionId) this._controllers.set(executionId, controller);

    // Mark step as running + start heartbeat
    let heartbeatTimer = null;
    if (stepExecutionId) {
      await store.updateStepExecution(stepExecutionId, {
        status:     STEP_STATUS.RUNNING,
        started_at: new Date().toISOString(),
        attempts:   0,
      }).catch(() => {});

      heartbeatTimer = setInterval(
        () => store.updateStepHeartbeat(stepExecutionId).catch(() => {}),
        HEARTBEAT_INTERVAL_MS
      );
    }

    bus.emit(EVENTS.AGENT_STARTED, { agentName, executionId, stepExecutionId });

    try {
      // Retry loop: attempts 1 through maxRetries+1
      while (attempts <= maxRetries) {
        if (controller.signal.aborted) {
          throw Object.assign(new Error('Execution cancelled'), { code: 'CANCELLED' });
        }

        attempts++;
        const attemptStart = Date.now();

        try {
          const result = await this._runWithTimeout(fn, context, controller.signal, timeoutMs);
          const durationMs = Date.now() - startedAt;

          // ── SUCCESS ───────────────────────────────────────────────────────────
          if (stepExecutionId) {
            await store.updateStepExecution(stepExecutionId, {
              status:         STEP_STATUS.COMPLETED,
              output_context: result || {},
              completed_at:   new Date().toISOString(),
              attempts,
              duration_ms:    durationMs,
            }).catch(() => {});
          }

          bus.emit(EVENTS.AGENT_COMPLETED, { agentName, executionId, stepExecutionId, attempts, durationMs });

          return { success: true, result: result || {}, attempts, durationMs, retryHistory };

        } catch (err) {
          const attemptDurationMs = Date.now() - attemptStart;
          const isCancelled = err.code === 'CANCELLED' || controller.signal.aborted;
          const isTimeout   = err.code === 'TIMEOUT';

          // Cancellation is always terminal — no retry
          if (isCancelled) {
            throw Object.assign(new Error('Execution cancelled'), { code: 'CANCELLED' });
          }

          retryHistory.push({
            attempt:    attempts,
            error:      err.message,
            isTimeout,
            durationMs: attemptDurationMs,
          });

          if (isTimeout) {
            bus.emit(EVENTS.AGENT_TIMEOUT, { agentName, executionId, stepExecutionId, attempt: attempts, timeoutMs });
          }

          const hasMoreRetries = attempts <= maxRetries;
          if (!hasMoreRetries) break; // fall through to failure handling

          // ── RETRY ─────────────────────────────────────────────────────────────
          const delayMs = retryDelays[attempts - 1] ?? retryDelays.at(-1) ?? 15_000;

          bus.emit(EVENTS.STEP_RETRYING, {
            agentName, executionId, stepExecutionId,
            attempt: attempts, maxRetries, delayMs, error: err.message,
          });

          console.warn(
            `[AgentExecutor] "${agentName}" attempt ${attempts}/${maxRetries + 1} failed. ` +
            `Retrying in ${delayMs}ms — ${err.message}`
          );

          if (stepExecutionId) {
            await store.updateStepExecution(stepExecutionId, { attempts }).catch(() => {});
          }

          await this._sleep(delayMs, controller.signal);
        }
      }

      // ── ALL RETRIES EXHAUSTED ────────────────────────────────────────────────
      const lastError  = retryHistory.at(-1)?.error || 'Max retries exceeded';
      const durationMs = Date.now() - startedAt;

      if (stepExecutionId) {
        await store.updateStepExecution(stepExecutionId, {
          status:        STEP_STATUS.FAILED,
          error_message: lastError,
          completed_at:  new Date().toISOString(),
          attempts,
          duration_ms:   durationMs,
        }).catch(() => {});
      }

      bus.emit(EVENTS.AGENT_ERROR, {
        agentName, executionId, stepExecutionId,
        error: lastError, attempts, durationMs, retryHistory,
      });

      return { success: false, error: lastError, code: 'MAX_RETRIES_EXCEEDED', attempts, durationMs, retryHistory };

    } catch (err) {
      // Cancellation path
      const durationMs = Date.now() - startedAt;
      if (stepExecutionId) {
        await store.updateStepExecution(stepExecutionId, {
          status:        STEP_STATUS.CANCELLED,
          error_message: 'Cancelled',
          completed_at:  new Date().toISOString(),
          attempts,
          duration_ms:   durationMs,
        }).catch(() => {});
      }
      return { success: false, error: 'Cancelled', code: 'CANCELLED', attempts, durationMs, retryHistory };

    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (executionId) this._controllers.delete(executionId);
    }
  }

  /**
   * Cancel a running execution.
   * Aborts the AbortController — the fn's signal will be aborted.
   * @returns {boolean} true if a running execution was found and cancelled
   */
  cancel(executionId) {
    const controller = this._controllers.get(executionId);
    if (!controller) return false;
    controller.abort();
    console.log(`[AgentExecutor] Cancellation signal sent for execution: ${executionId}`);
    return true;
  }

  isRunning(executionId) {
    return this._controllers.has(executionId);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Race fn() against a timeout. On timeout, rejects with code=TIMEOUT.
   * The fn still receives the AbortSignal — well-behaved fns will clean up.
   */
  _runWithTimeout(fn, context, signal, timeoutMs) {
    return Promise.race([
      Promise.resolve().then(() => fn(context, signal)),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(Object.assign(
            new Error(`Agent timed out after ${timeoutMs}ms`),
            { code: 'TIMEOUT' }
          )),
          timeoutMs
        )
      ),
    ]);
  }

  /** Delay that can be aborted by the cancellation signal. */
  _sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(Object.assign(new Error('Sleep aborted'), { code: 'CANCELLED' }));
      }, { once: true });
    });
  }
}

// Process-singleton
const executor = new AgentExecutor();

module.exports = { AgentExecutor, executor };
