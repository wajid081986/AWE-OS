'use strict';

/**
 * AWE-OS — Rebalancer                                          Phase 4E
 *
 * Periodically checks for dead workers and reclaims their orphaned executions.
 * Runs on a slow cadence (every 2 min) since WorkerRegistry already sweeps dead
 * workers every 60 s.
 *
 * Flow:
 *   1. Find workers with status = 'dead' (WorkerRegistry._sweep marks them)
 *   2. For each dead worker, call ExecutionClaimer.reclaimFromDeadWorker()
 *   3. Mark the dead worker as 'cleaned' so we don't re-process it
 *   4. Optionally purge expired distributed locks
 */

const { workerRegistry }         = require('./WorkerRegistry');
const { reclaimFromDeadWorker }  = require('./ExecutionClaimer');
const { purgeExpiredLocks }      = require('./DistributedLock');
const { createLogger }           = require('../../monitoring/logger');

const log = createLogger('rebalancer');

const REBALANCE_INTERVAL_MS = 2 * 60_000;  // 2 minutes

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

class Rebalancer {
  constructor() {
    this._timer    = null;
    this._running  = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._cycle(), REBALANCE_INTERVAL_MS);
    this._timer.unref();
    log.info('Rebalancer started', { intervalMs: REBALANCE_INTERVAL_MS });
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Force a rebalance cycle immediately (used in tests / manual recovery). */
  async runNow() {
    return this._cycle();
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async _cycle() {
    if (this._running) return;
    this._running = true;

    let totalReclaimed = 0;

    try {
      // 1. Find all dead workers that haven't been cleaned yet
      const { data: deadWorkers } = await db()
        .from('runtime_workers')
        .select('id, hostname, pid, last_heartbeat_at')
        .eq('status', 'dead');

      if (!deadWorkers?.length) {
        await purgeExpiredLocks();
        return;
      }

      log.info('Rebalancer: reclaiming from dead workers', { count: deadWorkers.length });

      for (const worker of deadWorkers) {
        if (worker.id === workerRegistry.workerId) continue; // never reclaim ourselves

        const reclaimed = await reclaimFromDeadWorker(worker.id);
        totalReclaimed += reclaimed;

        // Mark cleaned so we don't re-process
        try {
          await db()
            .from('runtime_workers')
            .update({ status: 'cleaned' })
            .eq('id', worker.id);
        } catch (_) {
          // Best-effort
        }
      }

      // 2. Purge expired distributed locks
      await purgeExpiredLocks();

      if (totalReclaimed > 0) {
        log.warn('Rebalancer cycle complete', {
          deadWorkers: deadWorkers.length,
          reclaimedExecutions: totalReclaimed,
        });
      }
    } catch (err) {
      log.warn('Rebalancer cycle error', { error: err.message });
    } finally {
      this._running = false;
    }
  }
}

// Process-singleton
const rebalancer = new Rebalancer();

module.exports = { Rebalancer, rebalancer };
