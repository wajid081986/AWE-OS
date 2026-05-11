'use strict';

/**
 * AWE-OS — Runtime Bootstrap                                 Phase 4A/4B
 *
 * Single entry point for all runtime infrastructure.
 * Call initializeRuntime() once inside app.listen() callback.
 *
 * Initializes:
 *   1. EventBus with system-wide listeners (log all events at info level)
 *   2. Crash recovery — marks interrupted executions as FAILED
 *   3. Exports all runtime singletons for use by routes and services
 */

const { bus, EVENTS }          = require('./EventBus');
const { store }                = require('./ExecutionStore');
const { executor }             = require('./AgentExecutor');
const { orchestrator }         = require('./PipelineOrchestrator');
const { getPipeline, listPipelines } = require('./PipelineDefinitions');
const { validatePipeline, topologicalSort, detectCycles } = require('./PipelineValidator');
const { EXECUTION_STATUS, STEP_STATUS } = require('./ExecutionStore');

// ── System-wide event listeners ─────────────────────────────────────────────────

function registerSystemListeners() {
  // Log all pipeline lifecycle events
  bus.subscribe('pipeline.*', (payload) => {
    const { _event, executionId, pipelineId, error } = payload;
    const level = _event.includes('failed') || _event.includes('error') ? 'error' : 'info';
    console[level === 'error' ? 'error' : 'log'](
      JSON.stringify({ layer: 'runtime-event', event: _event, executionId, pipelineId, error, ts: payload._ts })
    );
  });

  // Alert on heartbeat misses
  bus.subscribe(EVENTS.HEARTBEAT_MISSED, (payload) => {
    console.warn(
      JSON.stringify({ layer: 'runtime-event', event: 'heartbeat.missed', ...payload })
    );
  });

  // Alert on runtime errors
  bus.subscribe(EVENTS.RUNTIME_ERROR, (payload) => {
    console.error(
      JSON.stringify({ layer: 'runtime-event', event: 'runtime.error', ...payload })
    );
  });
}

// ── Startup initialization ───────────────────────────────────────────────────────

async function initializeRuntime() {
  try {
    // 1. Wire up system-wide listeners
    registerSystemListeners();

    // 2. Recover any executions that were interrupted by server restart
    await orchestrator.recoverInterruptedExecutions();

    console.log(
      JSON.stringify({
        layer:     'runtime',
        event:     'initialized',
        pipelines: listPipelines().map(p => p.id),
        ts:        new Date().toISOString(),
      })
    );
  } catch (err) {
    // Runtime init failure must never crash the server — log and continue
    console.error('[Runtime] initializeRuntime error:', err?.message);
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────────

module.exports = {
  // Bootstrap
  initializeRuntime,

  // Singletons
  bus,
  store,
  executor,
  orchestrator,

  // Pipeline registry helpers
  getPipeline,
  listPipelines,

  // Validation utilities
  validatePipeline,
  topologicalSort,
  detectCycles,

  // Status enums (re-exported for convenience)
  EVENTS,
  EXECUTION_STATUS,
  STEP_STATUS,
};
