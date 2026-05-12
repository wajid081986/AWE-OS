'use strict';

/**
 * AWE-OS — WorkerRegistry                                      Phase 4E
 *
 * Tracks this process as a "worker" in the `runtime_workers` table.
 * Single-process deployments work fine — the worker is just self.
 * Multi-process deployments see all live workers via DB.
 *
 * DB schema (runtime_workers):
 *   id TEXT PK, hostname TEXT, pid INT, version TEXT, status TEXT,
 *   capabilities JSONB, active_jobs INT, memory_mb NUMERIC,
 *   registered_at TIMESTAMPTZ, last_heartbeat_at TIMESTAMPTZ, metadata JSONB
 */

const os   = require('os');
const { randomUUID } = require('crypto');
const { createLogger } = require('../../monitoring/logger');

const log = createLogger('worker-registry');

const HEARTBEAT_INTERVAL_MS  = 30_000;   // 30 s
const DEAD_THRESHOLD_MS      = 90_000;   // 3 missed heartbeats = dead
const SWEEP_INTERVAL_MS      = 60_000;   // prune dead workers every 60 s
const VERSION                = process.env.npm_package_version || '1.0.0';

// Lazily required to avoid triggering supabase env check during module load
let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

class WorkerRegistry {
  constructor() {
    this.workerId    = randomUUID();
    this.hostname    = os.hostname();
    this.pid         = process.pid;
    this.status      = 'idle';
    this.activeJobs  = 0;
    this.capabilities = ['pipeline', 'agent'];

    this._heartbeatTimer = null;
    this._sweepTimer     = null;
    this._registered     = false;
    this._destroyed      = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Register this worker in DB and start heartbeat + sweep timers.
   * Safe to call multiple times (no-op after first registration).
   */
  async register(capabilities = null) {
    if (this._registered || this._destroyed) return;

    if (capabilities) this.capabilities = capabilities;

    try {
      await db().from('runtime_workers').upsert({
        id:               this.workerId,
        hostname:         this.hostname,
        pid:              this.pid,
        version:          VERSION,
        status:           'active',
        capabilities:     this.capabilities,
        active_jobs:      0,
        memory_mb:        this._memoryMb(),
        registered_at:    new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        metadata:         {},
      }, { onConflict: 'id' });

      this._registered = true;
      this.status = 'active';
      log.info('Worker registered', { workerId: this.workerId, hostname: this.hostname, pid: this.pid });
    } catch (err) {
      // DB unavailable — still work in degraded mode
      log.warn('Worker registration skipped (DB unavailable)', { error: err.message });
      this._registered = true; // prevent retry spam
    }

    this._startHeartbeat();
    this._startSweep();
  }

  /**
   * Mark this worker as gracefully shutting down and remove from DB.
   */
  async deregister() {
    if (this._destroyed) return;
    this._destroyed = true;

    clearInterval(this._heartbeatTimer);
    clearInterval(this._sweepTimer);

    try {
      await db().from('runtime_workers')
        .update({ status: 'offline', last_heartbeat_at: new Date().toISOString() })
        .eq('id', this.workerId);
      log.info('Worker deregistered', { workerId: this.workerId });
    } catch (_) {
      // Best-effort
    }
  }

  /**
   * Increment/decrement active job counter and flush to DB.
   */
  async incrementJobs()  { this.activeJobs++; await this._flushJobCount(); }
  async decrementJobs()  { this.activeJobs = Math.max(0, this.activeJobs - 1); await this._flushJobCount(); }

  /**
   * Return current worker metadata object (used by other distributed modules).
   */
  getInfo() {
    return {
      workerId:    this.workerId,
      hostname:    this.hostname,
      pid:         this.pid,
      version:     VERSION,
      status:      this.status,
      activeJobs:  this.activeJobs,
      capabilities: this.capabilities,
      memoryMb:    this._memoryMb(),
    };
  }

  /**
   * Return all live workers from DB.
   */
  async getLiveWorkers() {
    try {
      const since = new Date(Date.now() - DEAD_THRESHOLD_MS).toISOString();
      const { data } = await db().from('runtime_workers')
        .select('*')
        .eq('status', 'active')
        .gte('last_heartbeat_at', since);
      return data ?? [];
    } catch (_) {
      return [this.getInfo()]; // fallback: just this worker
    }
  }

  /**
   * Return all workers that missed their heartbeat window (presumed dead).
   */
  async getDeadWorkers() {
    try {
      const since = new Date(Date.now() - DEAD_THRESHOLD_MS).toISOString();
      const { data } = await db().from('runtime_workers')
        .select('id, hostname, pid, last_heartbeat_at, active_jobs')
        .eq('status', 'active')
        .lt('last_heartbeat_at', since);
      return data ?? [];
    } catch (_) {
      return [];
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _startHeartbeat() {
    this._heartbeatTimer = setInterval(() => this._beat(), HEARTBEAT_INTERVAL_MS);
    this._heartbeatTimer.unref();
  }

  _startSweep() {
    this._sweepTimer = setInterval(() => this._sweep(), SWEEP_INTERVAL_MS);
    this._sweepTimer.unref();
  }

  async _beat() {
    if (this._destroyed) return;
    try {
      await db().from('runtime_workers')
        .update({
          last_heartbeat_at: new Date().toISOString(),
          memory_mb:         this._memoryMb(),
          active_jobs:       this.activeJobs,
          status:            'active',
        })
        .eq('id', this.workerId);
    } catch (_) {
      // Heartbeat failure is non-fatal
    }
  }

  async _sweep() {
    if (this._destroyed) return;
    try {
      const dead = await this.getDeadWorkers();
      if (!dead.length) return;

      const ids = dead.map(w => w.id);
      await db().from('runtime_workers')
        .update({ status: 'dead' })
        .in('id', ids);

      log.warn('Dead workers pruned', { count: dead.length, ids });
    } catch (_) {
      // Sweep failure is non-fatal
    }
  }

  async _flushJobCount() {
    try {
      await db().from('runtime_workers')
        .update({ active_jobs: this.activeJobs })
        .eq('id', this.workerId);
    } catch (_) {
      // Best-effort
    }
  }

  _memoryMb() {
    return Math.round(process.memoryUsage().heapUsed / 1_048_576);
  }
}

// Process-singleton
const workerRegistry = new WorkerRegistry();

module.exports = { WorkerRegistry, workerRegistry, DEAD_THRESHOLD_MS };
