'use strict';

/**
 * AWE-OS — ShortTermMemory                                     Phase 5A
 *
 * TTL-based in-memory ring buffer for runtime/session intelligence.
 * Stores recent executions, prompt chains, failure signals, and pipeline
 * context so agents can access cross-step context without DB round-trips.
 *
 * Design:
 *   - Pure in-process Map; no DB dependency (intentional — speed first)
 *   - Capped ring buffer: oldest entries evicted when max capacity reached
 *   - TTL sweep runs every SWEEP_INTERVAL_MS
 *   - All writes are synchronous; reads are synchronous
 *   - Categorized by memory_type for targeted retrieval
 *
 * Memory types:
 *   execution   — pipeline run context and outputs
 *   failure     — recent failure signals with error details
 *   success     — recent success patterns
 *   prompt      — recently used prompt hashes and scores
 *   context     — arbitrary runtime context blobs
 *   repair      — recent repair attempts
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('short-term-memory');

const DEFAULT_TTL_MS       = 30 * 60_000;   // 30 minutes
const MAX_ENTRIES          = Number(process.env.STM_MAX_ENTRIES || 500);
const SWEEP_INTERVAL_MS    = 5 * 60_000;    // sweep every 5 min

const MEMORY_TYPES = Object.freeze({
  EXECUTION: 'execution',
  FAILURE:   'failure',
  SUCCESS:   'success',
  PROMPT:    'prompt',
  CONTEXT:   'context',
  REPAIR:    'repair',
});

class ShortTermMemory {
  constructor() {
    this._store      = new Map();  // key → entry
    this._insertOrder = [];        // ring buffer order (oldest first)
    this._sweepTimer = null;
    this._stats = {
      writes: 0,
      reads:  0,
      hits:   0,
      evictions: 0,
      sweeps: 0,
    };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  start() {
    if (this._sweepTimer) return;
    this._sweepTimer = setInterval(() => this._sweep(), SWEEP_INTERVAL_MS);
    this._sweepTimer.unref();
    log.info('ShortTermMemory started', { maxEntries: MAX_ENTRIES, ttlMs: DEFAULT_TTL_MS });
  }

  stop() {
    if (this._sweepTimer) { clearInterval(this._sweepTimer); this._sweepTimer = null; }
    this._store.clear();
    this._insertOrder = [];
  }

  // ── Write API ───────────────────────────────────────────────────────────────

  /**
   * Store a value with optional TTL and tags.
   *
   * @param {string} key
   * @param {*}      value
   * @param {object} [opts]
   * @param {string} [opts.type]    — MEMORY_TYPES value
   * @param {number} [opts.ttlMs]   — override default TTL
   * @param {string[]} [opts.tags]  — searchable tags
   */
  set(key, value, opts = {}) {
    const ttlMs    = opts.ttlMs    ?? DEFAULT_TTL_MS;
    const type     = opts.type     ?? MEMORY_TYPES.CONTEXT;
    const tags     = opts.tags     ?? [];
    const now      = Date.now();

    // Evict oldest if at capacity
    if (!this._store.has(key) && this._insertOrder.length >= MAX_ENTRIES) {
      const oldest = this._insertOrder.shift();
      this._store.delete(oldest);
      this._stats.evictions++;
    }

    if (!this._store.has(key)) {
      this._insertOrder.push(key);
    }

    this._store.set(key, {
      value,
      type,
      tags,
      createdAt:  now,
      expiresAt:  now + ttlMs,
    });

    this._stats.writes++;
  }

  // ── Read API ────────────────────────────────────────────────────────────────

  get(key) {
    this._stats.reads++;
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this._evict(key); return null; }
    this._stats.hits++;
    return entry.value;
  }

  /**
   * Return all active entries of a given type, newest first.
   */
  getByType(type, limit = 50) {
    const now = Date.now();
    const results = [];
    for (const [key, entry] of this._store) {
      if (entry.type === type && now <= entry.expiresAt) {
        results.push({ key, ...entry });
      }
    }
    return results
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Return all active entries that include ALL of the given tags.
   */
  getByTags(tags, limit = 20) {
    if (!tags?.length) return [];
    const now = Date.now();
    const results = [];
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) continue;
      if (tags.every(t => entry.tags.includes(t))) {
        results.push({ key, ...entry });
      }
    }
    return results
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Return the N most recently added active entries.
   */
  getRecent(n = 20) {
    const now = Date.now();
    const results = [];
    // Iterate insertOrder in reverse (newest last)
    for (let i = this._insertOrder.length - 1; i >= 0 && results.length < n; i--) {
      const key   = this._insertOrder[i];
      const entry = this._store.get(key);
      if (entry && now <= entry.expiresAt) {
        results.push({ key, ...entry });
      }
    }
    return results;
  }

  has(key) {
    const entry = this._store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this._evict(key); return false; }
    return true;
  }

  delete(key) {
    this._evict(key);
  }

  // ── Convenience writes (typed) ──────────────────────────────────────────────

  rememberExecution(executionId, data, ttlMs = DEFAULT_TTL_MS) {
    this.set(`exec:${executionId}`, data, {
      type: MEMORY_TYPES.EXECUTION,
      ttlMs,
      tags: ['execution', data?.pipelineId, data?.status].filter(Boolean),
    });
  }

  rememberFailure(key, data, ttlMs = 60 * 60_000) {
    this.set(`fail:${key}`, data, {
      type: MEMORY_TYPES.FAILURE,
      ttlMs,
      tags: ['failure', data?.errorCategory, data?.pipelineId].filter(Boolean),
    });
  }

  rememberSuccess(key, data, ttlMs = 2 * 60 * 60_000) {
    this.set(`success:${key}`, data, {
      type: MEMORY_TYPES.SUCCESS,
      ttlMs,
      tags: ['success', data?.pipelineId, data?.category].filter(Boolean),
    });
  }

  rememberPrompt(promptHash, data) {
    this.set(`prompt:${promptHash}`, data, {
      type:  MEMORY_TYPES.PROMPT,
      ttlMs: 4 * 60 * 60_000,  // 4 hours
      tags:  ['prompt', data?.role, data?.category].filter(Boolean),
    });
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  getStats() {
    return {
      size:       this._store.size,
      maxEntries: MAX_ENTRIES,
      hitRate:    this._stats.reads > 0
        ? Math.round((this._stats.hits / this._stats.reads) * 100) / 100
        : 0,
      ...this._stats,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _evict(key) {
    this._store.delete(key);
    const idx = this._insertOrder.indexOf(key);
    if (idx !== -1) this._insertOrder.splice(idx, 1);
  }

  _sweep() {
    const now     = Date.now();
    let   removed = 0;
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) {
        this._evict(key);
        removed++;
      }
    }
    this._stats.sweeps++;
    if (removed > 0) log.debug('STM sweep', { removed, remaining: this._store.size });
  }
}

// Process-singleton
const shortTermMemory = new ShortTermMemory();

module.exports = { ShortTermMemory, shortTermMemory, MEMORY_TYPES, DEFAULT_TTL_MS };
