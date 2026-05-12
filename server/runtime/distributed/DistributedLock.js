'use strict';

/**
 * AWE-OS — DistributedLock                                     Phase 4E
 *
 * Upgrades LockManager with an optional DB-backed mode.
 * In single-process deployments the in-process LockManager is sufficient.
 * In multi-process deployments the DB layer prevents duplicate claims.
 *
 * Strategy:
 *   1. Always acquire the in-process lock first (fast, synchronous).
 *   2. If DB is available, attempt an INSERT into `runtime_distributed_locks`.
 *      If the INSERT fails (conflict) another process owns it — release in-process lock and return false.
 *   3. Release cleans up both layers.
 *
 * DB schema (runtime_distributed_locks):
 *   key TEXT PK, owner_id TEXT, acquired_at TIMESTAMPTZ, expires_at TIMESTAMPTZ
 */

const { lockManager }  = require('../LockManager');
const { createLogger } = require('../../monitoring/logger');

const log = createLogger('distributed-lock');

const DEFAULT_TTL_MS = 10 * 60_000;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// Track which keys this process holds DB locks for (for cleanup on release)
const _dbLocks = new Map(); // key → { owner, expiresAt }

/**
 * Acquire a distributed lock.
 *
 * @param {string} key         - Lock key (e.g. "exec:uuid")
 * @param {string} owner       - Owner identifier (e.g. workerId or executionId)
 * @param {number} [ttlMs]     - TTL in milliseconds
 * @returns {Promise<boolean>} - true if lock acquired, false if held by someone else
 */
async function acquire(key, owner, ttlMs = DEFAULT_TTL_MS) {
  // Step 1: In-process lock (re-entrant for same owner)
  const inProc = lockManager.acquire(key, owner, ttlMs);
  if (!inProc) return false;

  // Step 2: DB lock (best-effort; fail gracefully if DB unavailable)
  try {
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await db().from('runtime_distributed_locks')
      .insert({
        key,
        owner_id:    owner,
        acquired_at: new Date().toISOString(),
        expires_at:  expiresAt,
      });

    if (error) {
      // Conflict code 23505 = unique_violation → another process holds it
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        // Check if existing lock is expired; if so, forcefully take it
        const { data: existing } = await db().from('runtime_distributed_locks')
          .select('expires_at, owner_id')
          .eq('key', key)
          .single();

        if (existing && new Date(existing.expires_at) < new Date()) {
          // Expired lock — steal it
          await db().from('runtime_distributed_locks')
            .update({ owner_id: owner, acquired_at: new Date().toISOString(), expires_at: expiresAt })
            .eq('key', key);
          _dbLocks.set(key, { owner, expiresAt });
          log.debug('Stale DB lock stolen', { key, from: existing.owner_id, to: owner });
          return true;
        }

        // Active lock held by another process
        lockManager.release(key, owner);
        log.debug('DB lock conflict — held by another process', { key, holder: existing?.owner_id });
        return false;
      }

      // Other DB error — fall through (in-process lock is sufficient for single-proc)
      log.warn('DB lock insert failed (non-conflict)', { key, error: error.message });
    } else {
      _dbLocks.set(key, { owner, expiresAt });
    }
  } catch (err) {
    // DB unavailable — continue with in-process lock only
    log.warn('DB lock unavailable, using in-process only', { key, error: err.message });
  }

  return true;
}

/**
 * Release a distributed lock.
 *
 * @param {string} key
 * @param {string} owner
 * @returns {Promise<boolean>}
 */
async function release(key, owner) {
  lockManager.release(key, owner);

  if (_dbLocks.has(key)) {
    _dbLocks.delete(key);
    try {
      await db().from('runtime_distributed_locks')
        .delete()
        .eq('key', key)
        .eq('owner_id', owner);
    } catch (_) {
      // Best-effort
    }
  }

  return true;
}

/**
 * Check if a key is locked (checks in-process map; does NOT query DB).
 * For cross-process awareness, use isLockedDB().
 */
function isLocked(key) {
  return lockManager.isLocked(key);
}

/**
 * Check if a key is locked in DB (cross-process awareness).
 */
async function isLockedDB(key) {
  try {
    const { data } = await db().from('runtime_distributed_locks')
      .select('owner_id, expires_at')
      .eq('key', key)
      .single();

    if (!data) return false;
    return new Date(data.expires_at) > new Date();
  } catch (_) {
    return lockManager.isLocked(key);
  }
}

/**
 * Purge all expired locks from DB (called by Rebalancer / startup sweep).
 */
async function purgeExpiredLocks() {
  try {
    const { error } = await db().from('runtime_distributed_locks')
      .delete()
      .lt('expires_at', new Date().toISOString());
    if (!error) log.debug('Expired distributed locks purged');
  } catch (_) {
    // Best-effort
  }
}

module.exports = {
  acquire,
  release,
  isLocked,
  isLockedDB,
  purgeExpiredLocks,
  DEFAULT_TTL_MS,
};
