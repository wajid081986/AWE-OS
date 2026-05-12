'use strict';

/**
 * AWE-OS — Runtime Bootstrap                                 Phase 4A/4B/4C/4D
 *
 * Single entry point for all runtime infrastructure.
 * Call initializeRuntime() once inside app.listen() callback.
 *
 * Phase 4A/4B: EventBus, ExecutionStore, AgentExecutor, PipelineOrchestrator
 * Phase 4C: StateMachine, LockManager, RetryPolicy, StallDetector, ExecutionQueue, Recovery
 * Phase 4D: Logger, RuntimeMetrics, AuditTrail
 */

const { bus, EVENTS }                    = require('./EventBus');
const { store }                          = require('./ExecutionStore');
const { executor }                       = require('./AgentExecutor');
const { orchestrator }                   = require('./PipelineOrchestrator');
const { getPipeline, listPipelines }     = require('./PipelineDefinitions');
const { validatePipeline, validatePipelineEnhanced, topologicalSort, detectCycles } = require('./PipelineValidator');
const { EXECUTION_STATUS, STEP_STATUS }  = require('./ExecutionStore');

// Phase 4C
const { stateMachine: _sm, STATES, validateTransition, isTerminal } = (() => {
  const sm = require('./stateMachine');
  return { stateMachine: sm, ...sm };
})();
const { lockManager }    = require('./LockManager');
const { executionQueue } = require('./ExecutionQueue');
const { stallDetector }  = require('./StallDetector');
const { runRecovery }    = require('./recovery');
const { POLICIES: retryPolicies } = require('./retryPolicy');
const { classify: classifyError }  = require('./errorClassifier');

// Phase 4D
const { createLogger }   = require('../monitoring/logger');
const { metrics }        = require('../monitoring/runtimeMetrics');
const { auditTrail }     = require('../monitoring/auditTrail');

const log = createLogger('runtime');

// ── System-wide event listeners ─────────────────────────────────────────────────

function registerSystemListeners() {
  // Log all pipeline lifecycle events
  bus.subscribe('pipeline.*', (payload) => {
    const { _event, executionId, pipelineId, error } = payload;
    const level = _event.includes('failed') || _event.includes('error') ? 'error' : 'info';
    log[level](`Pipeline event: ${_event}`, { executionId, pipelineId, error });
  });

  // Alert on heartbeat misses (stall detector output)
  bus.subscribe(EVENTS.HEARTBEAT_MISSED, (payload) => {
    log.warn('Heartbeat missed / stall detected', payload);
  });

  // Alert on runtime errors
  bus.subscribe(EVENTS.RUNTIME_ERROR, (payload) => {
    log.error('Runtime error event', payload);
  });

  // Alert on queue stalls (stuck approvals)
  bus.subscribe(EVENTS.QUEUE_STALLED, (payload) => {
    log.warn('Queue stall detected', payload);
  });
}

// ── Startup initialization ───────────────────────────────────────────────────────

async function initializeRuntime() {
  try {
    // 1. System-wide listeners (logging)
    registerSystemListeners();

    // 2. Phase 4D — wire metrics + audit trail to EventBus
    metrics.initMetrics(bus);
    auditTrail.initAuditTrail(bus);

    // 3. Phase 4C — initialize execution queue
    executionQueue.init();

    // 4. Phase 4C — crash recovery (replaces basic recoverInterruptedExecutions)
    const recoveryResult = await runRecovery();

    // 5. Phase 4C — start stall detector watchdog
    stallDetector.start();

    log.info('Runtime initialized', {
      pipelines: listPipelines().map(p => p.id),
      recovery:  recoveryResult,
    });

  } catch (err) {
    // Init failure must never crash the server
    log.error('initializeRuntime error', { error: err?.message });
    console.error('[Runtime] initializeRuntime error:', err?.message);
  }
}

// ── Graceful shutdown ────────────────────────────────────────────────────────────

function shutdownRuntime() {
  stallDetector.stop();
  lockManager.destroy();
  log.info('Runtime shutdown complete');
}

// ── Exports ──────────────────────────────────────────────────────────────────────

module.exports = {
  // Bootstrap
  initializeRuntime,
  shutdownRuntime,

  // Singletons — Phase 4A/4B
  bus,
  store,
  executor,
  orchestrator,

  // Pipeline registry helpers
  getPipeline,
  listPipelines,

  // Validation utilities
  validatePipeline,
  validatePipelineEnhanced,
  topologicalSort,
  detectCycles,

  // Status enums
  EVENTS,
  EXECUTION_STATUS,
  STEP_STATUS,

  // Phase 4C
  lockManager,
  executionQueue,
  stallDetector,
  runRecovery,
  retryPolicies,
  classifyError,
  validateTransition,
  isTerminal,
  STATES,

  // Phase 4D
  log,
  metrics,
  auditTrail,
  createLogger,
};
