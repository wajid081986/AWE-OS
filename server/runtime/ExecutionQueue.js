'use strict';

/**
 * AWE-OS — Execution Queue                                   Phase 4C
 *
 * Lightweight in-process queue that controls pipeline execution concurrency.
 * Sits between the HTTP trigger and PipelineOrchestrator.execute().
 *
 * Features:
 *   - FIFO queue with numeric priority support (lower = higher priority)
 *   - Concurrency limit (default MAX_CONCURRENT = 5)
 *   - Backpressure: rejects enqueue when queue > maxDepth
 *   - Slot freed automatically on PIPELINE_COMPLETED / FAILED / CANCELLED events
 *   - Queue depth exposed via getMetrics()
 *   - LockManager integration prevents duplicate executions
 *
 * Design decision:
 *   ExecutionQueue.enqueue() returns a Promise<string> (executionId) that
 *   resolves immediately after the execution row is created. The pipeline
 *   runs asynchronously as always — callers still poll for status.
 */

const { orchestrator }   = require('./PipelineOrchestrator');
const { store }          = require('./ExecutionStore');
const { bus, EVENTS }    = require('./EventBus');
const { lockManager }    = require('./LockManager');
const { createLogger }   = require('../monitoring/logger');

const log = createLogger('execution-queue');

const MAX_CONCURRENT = parseInt(process.env.PIPELINE_MAX_CONCURRENT || '5', 10);
const MAX_QUEUE_DEPTH = parseInt(process.env.PIPELINE_MAX_QUEUE_DEPTH || '50', 10);
const LOCK_TTL_MS     = 15 * 60_000; // 15 min lock per pipeline instance

class ExecutionQueue {
  constructor(maxConcurrent = MAX_CONCURRENT, maxDepth = MAX_QUEUE_DEPTH) {
    this._maxConcurrent = maxConcurrent;
    this._maxDepth      = maxDepth;
    this._activeCount   = 0;
    this._queue         = []; // { pipelineId, triggeredBy, context, priority, resolve, reject, enqueuedAt }

    this._counters = {
      enqueued:   0,
      dequeued:   0,
      rejected:   0,
      completed:  0,
      failed:     0,
    };

    this._initialized = false;
  }

  /**
   * Wire EventBus listeners to free slots when executions finish.
   * Must be called once at startup.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    const freeSlot = (p) => {
      if (p.executionId) {
        lockManager.release(`exec:active:${p.executionId}`);
      }
      this._activeCount = Math.max(0, this._activeCount - 1);
      this._counters.completed++;
      this._drain();
    };

    const failSlot = (p) => {
      if (p.executionId) {
        lockManager.release(`exec:active:${p.executionId}`);
      }
      this._activeCount = Math.max(0, this._activeCount - 1);
      this._counters.failed++;
      this._drain();
    };

    bus.subscribe(EVENTS.PIPELINE_COMPLETED, freeSlot);
    bus.subscribe(EVENTS.PIPELINE_FAILED,    failSlot);
    bus.subscribe(EVENTS.PIPELINE_CANCELLED, failSlot);

    log.info('Execution queue initialized', { maxConcurrent: this._maxConcurrent, maxDepth: this._maxDepth });
  }

  /**
   * Enqueue a pipeline for execution.
   *
   * @param {string} pipelineId
   * @param {string} triggeredBy
   * @param {object} context
   * @param {number} [priority]  - Lower = higher priority. Default 10.
   * @returns {Promise<string>}   Resolves to executionId
   * @throws if queue is at capacity (backpressure)
   */
  enqueue(pipelineId, triggeredBy = 'api', context = {}, priority = 10) {
    // Backpressure guard
    if (this._queue.length >= this._maxDepth) {
      this._counters.rejected++;
      return Promise.reject(
        Object.assign(
          new Error(`Execution queue at capacity (depth: ${this._queue.length}/${this._maxDepth}). Try again shortly.`),
          { code: 'QUEUE_FULL' }
        )
      );
    }

    this._counters.enqueued++;

    // If slot available, dispatch immediately without queuing
    if (this._activeCount < this._maxConcurrent) {
      return this._dispatch(pipelineId, triggeredBy, context);
    }

    // Otherwise, add to queue and return a promise that resolves when dispatched
    return new Promise((resolve, reject) => {
      const item = { pipelineId, triggeredBy, context, priority, resolve, reject, enqueuedAt: Date.now() };
      this._queue.push(item);
      // Keep queue sorted by priority (stable sort: lower priority number = dispatched first)
      this._queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);

      log.info('Execution queued (waiting for slot)', {
        pipelineId, triggeredBy, priority, queueDepth: this._queue.length,
      });
    });
  }

  getMetrics() {
    return {
      activeCount:    this._activeCount,
      maxConcurrent:  this._maxConcurrent,
      queueDepth:     this._queue.length,
      maxDepth:       this._maxDepth,
      utilizationPct: this._maxConcurrent > 0
        ? +((this._activeCount / this._maxConcurrent) * 100).toFixed(1)
        : 0,
      counters: { ...this._counters },
    };
  }

  getQueuedItems() {
    return this._queue.map(({ pipelineId, triggeredBy, priority, enqueuedAt }) => ({
      pipelineId, triggeredBy, priority, enqueuedAt,
      waitMs: Date.now() - enqueuedAt,
    }));
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  async _dispatch(pipelineId, triggeredBy, context) {
    this._activeCount++;
    this._counters.dequeued++;

    try {
      const executionId = await orchestrator.execute(pipelineId, triggeredBy, context);
      lockManager.acquire(`exec:active:${executionId}`, executionId, LOCK_TTL_MS);
      log.info('Execution dispatched', { pipelineId, executionId, activeCount: this._activeCount });
      return executionId;
    } catch (err) {
      this._activeCount = Math.max(0, this._activeCount - 1);
      this._counters.failed++;
      log.error('Execution dispatch failed', { pipelineId, error: err?.message });
      throw err;
    }
  }

  _drain() {
    if (this._queue.length === 0) return;
    if (this._activeCount >= this._maxConcurrent) return;

    const next = this._queue.shift();
    if (!next) return;

    const { pipelineId, triggeredBy, context, resolve, reject } = next;

    this._dispatch(pipelineId, triggeredBy, context)
      .then(resolve)
      .catch(reject);
  }
}

// Process-singleton
const executionQueue = new ExecutionQueue();

module.exports = { ExecutionQueue, executionQueue };
