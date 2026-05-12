'use strict';

/**
 * AWE-OS — Lock Manager                                      Phase 4C
 *
 * In-process execution lock — prevents duplicate pipeline triggers
 * and concurrent mutation corruption.
 *
 * Design:
 *   - Map-based, no external dependencies
 *   - TTL on every lock (auto-expires to prevent deadlocks on crash)
 *   - Re-entrant for the same owner (idempotent acquire)
 *   - Thread-safe within a single Node.js process (event loop is single-threaded)
 *   - NOT distributed — for multi-process safety use a DB row lock (Phase 5)
 *
 * Lock keys:
 *   Callers must design keys to be as specific as needed.
 *   Example: 'exec:pipeline-id:user-id' → prevents same user re-triggering same pipeline
 *            'exec:execution-id'        → prevents concurrent mutations of one execution
 */

const DEFAULT_TTL_MS = 10 * 60_000; // 10 minutes — enough for the longest pipeline step

class LockManager {
  constructor() {
    /** @type {Map<string, { owner: string, acquiredAt: number, ttlMs: number }>} */
    this._locks = new Map();

    // Sweep expired locks every 5 minutes to prevent memory leaks
    this._sweepTimer = setInterval(() => this._sweep(), 5 * 60_000);
    this._sweepTimer.unref(); // don't block process exit
  }

  /**
   * Try to acquire a lock.
   *
   * @param {string} key        - Unique lock identifier
   * @param {string} owner      - Who is acquiring (executionId, userId, etc.)
   * @param {number} [ttlMs]    - Auto-release after this many ms (default 10 min)
   * @returns {boolean}           true = acquired; false = already locked by someone else
   */
  acquire(key, owner = 'system', ttlMs = DEFAULT_TTL_MS) {
    const existing = this._locks.get(key);

    if (existing) {
      // Allow re-entrant acquire by the same owner
      if (existing.owner === owner) {
        existing.acquiredAt = Date.now(); // refresh TTL
        return true;
      }
      // Expired lock — treat as available
      if (Date.now() - existing.acquiredAt > existing.ttlMs) {
        this._locks.delete(key);
      } else {
        return false;
      }
    }

    this._locks.set(key, { owner, acquiredAt: Date.now(), ttlMs });
    return true;
  }

  /**
   * Release a lock.
   * Safe to call even if the lock is not held.
   *
   * @param {string} key
   * @param {string} [owner]  - If provided, only release if the owner matches
   * @returns {boolean}         true = released; false = not held or owner mismatch
   */
  release(key, owner = null) {
    const existing = this._locks.get(key);
    if (!existing) return false;
    if (owner && existing.owner !== owner) return false;
    this._locks.delete(key);
    return true;
  }

  /**
   * @returns {boolean}
   */
  isLocked(key) {
    const existing = this._locks.get(key);
    if (!existing) return false;
    if (Date.now() - existing.acquiredAt > existing.ttlMs) {
      this._locks.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get metadata about a held lock (for diagnostics).
   * @returns {{ owner: string, acquiredAt: number, ttlMs: number, remainingMs: number } | null}
   */
  getLockInfo(key) {
    const existing = this._locks.get(key);
    if (!existing) return null;
    const remainingMs = existing.ttlMs - (Date.now() - existing.acquiredAt);
    if (remainingMs <= 0) {
      this._locks.delete(key);
      return null;
    }
    return { ...existing, remainingMs };
  }

  /** @returns {{ total: number, keys: string[] }} */
  getStats() {
    this._sweep();
    return { total: this._locks.size, keys: [...this._locks.keys()] };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  _sweep() {
    const now = Date.now();
    for (const [key, lock] of this._locks) {
      if (now - lock.acquiredAt > lock.ttlMs) {
        this._locks.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this._sweepTimer);
    this._locks.clear();
  }
}

// Process-singleton
const lockManager = new LockManager();

module.exports = { LockManager, lockManager };
