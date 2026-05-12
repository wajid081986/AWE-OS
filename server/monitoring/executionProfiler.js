'use strict';

/**
 * AWE-OS — ExecutionProfiler                                   Phase 4F
 *
 * Detects slow agents and pipelines by tracking execution durations.
 * Wires into EventBus to auto-profile every execution.
 *
 * Defines "slow" as exceeding a configurable threshold (default: 2 min).
 * Stores a rolling window of the N slowest executions.
 */

const { createLogger } = require('./logger');

const log = createLogger('execution-profiler');

const SLOW_THRESHOLD_MS = Number(process.env.SLOW_EXEC_THRESHOLD_MS || 120_000); // 2 min
const MAX_SLOW_RECORDS  = 50;

class ExecutionProfiler {
  constructor() {
    this._inFlight  = new Map();   // executionId → { startedAt, pipelineId }
    this._slowLog   = [];          // last MAX_SLOW_RECORDS slow executions
    this._totalProfiled = 0;
    this._slowCount = 0;
  }

  /**
   * Wire into EventBus to auto-track all executions.
   *
   * @param {object} bus — EventBus instance
   */
  init(bus) {
    const { EVENTS } = require('../runtime/EventBus');

    bus.subscribe(EVENTS.PIPELINE_STARTED, ({ executionId, pipelineId }) => {
      if (executionId) this._start(executionId, pipelineId);
    });

    bus.subscribe(EVENTS.PIPELINE_COMPLETED, ({ executionId }) => {
      if (executionId) this._finish(executionId, 'completed');
    });

    bus.subscribe(EVENTS.PIPELINE_FAILED, ({ executionId }) => {
      if (executionId) this._finish(executionId, 'failed');
    });

    log.info('ExecutionProfiler wired to EventBus');
  }

  /**
   * Manually start tracking an execution.
   */
  _start(executionId, pipelineId) {
    this._inFlight.set(executionId, { startedAt: Date.now(), pipelineId });
  }

  /**
   * Manually finish tracking an execution.
   */
  _finish(executionId, outcome) {
    const entry = this._inFlight.get(executionId);
    if (!entry) return;

    this._inFlight.delete(executionId);
    this._totalProfiled++;

    const durationMs = Date.now() - entry.startedAt;

    if (durationMs >= SLOW_THRESHOLD_MS) {
      this._slowCount++;
      const record = {
        executionId,
        pipelineId:  entry.pipelineId,
        durationMs,
        outcome,
        detectedAt:  new Date().toISOString(),
      };
      this._slowLog.push(record);
      if (this._slowLog.length > MAX_SLOW_RECORDS) this._slowLog.shift();

      log.warn('Slow execution detected', record);
    }
  }

  /**
   * Return a list of recent slow executions.
   */
  getSlowLog(limit = 20) {
    return this._slowLog.slice(-limit).reverse();
  }

  /**
   * Return currently in-flight executions with elapsed time.
   */
  getInFlight() {
    const now = Date.now();
    return [...this._inFlight.entries()].map(([id, e]) => ({
      executionId: id,
      pipelineId:  e.pipelineId,
      elapsedMs:   now - e.startedAt,
      slow:        (now - e.startedAt) >= SLOW_THRESHOLD_MS,
    }));
  }

  /**
   * Stats snapshot for diagnostics.
   */
  getStats() {
    return {
      inFlightCount:   this._inFlight.size,
      totalProfiled:   this._totalProfiled,
      slowCount:       this._slowCount,
      slowThresholdMs: SLOW_THRESHOLD_MS,
      slowRate:        this._totalProfiled > 0
        ? Math.round((this._slowCount / this._totalProfiled) * 100) / 100
        : 0,
    };
  }
}

// Process-singleton
const executionProfiler = new ExecutionProfiler();

module.exports = { ExecutionProfiler, executionProfiler };
