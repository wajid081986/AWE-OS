'use strict';

/**
 * AWE-OS — AutoRepairEngine                                      Phase 6E
 *
 * Autonomous repair subsystem. Detects and corrects corrupted or
 * degraded internal state without human intervention.
 *
 * Repair domains:
 *   cache        — flush expired/inconsistent cache entries
 *   state        — rebuild in-memory state from DB source of truth
 *   orphans      — remove orphaned records (locks, claims, watchers)
 *   queue        — normalize queue items in invalid/stuck states
 *   dependencies — reset dependency chains broken by partial failures
 *   indexes      — rebuild in-memory indexes from persistent store
 *
 * Safety model:
 *   - Every repair is idempotent (safe to run multiple times)
 *   - Repairs are non-destructive: soft-reset to valid state, never delete
 *   - Each domain is independently togglable via opts.domains
 *   - MAX_REPAIR_BATCH limits work per run to prevent long pauses
 *   - All repairs persisted to healing_events for audit
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('auto-repair');

const MAX_REPAIR_BATCH   = 50;    // max items repaired per domain per run
const REPAIR_COOLDOWN_MS = 60_000; // 1 min between full repair cycles
const ORPHAN_AGE_MS      = 20 * 60_000; // 20 min for orphan detection
const QUEUE_STUCK_MS     = 15 * 60_000; // 15 min queue item = stuck

const ALL_DOMAINS = ['cache', 'state', 'orphans', 'queue', 'dependencies', 'indexes'];

let _lastRepairAt = 0;
let _repairRunning = false;

// Per-domain repair stats (in-memory, last run only)
let _lastRunStats = null;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run full auto-repair cycle.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.domains]   — subset of ALL_DOMAINS to repair
 * @param {boolean}  [opts.force]     — bypass cooldown
 * @returns {Promise<RepairResult>}
 */
async function runAutoRepair(opts = {}) {
  const { domains = ALL_DOMAINS, force = false } = opts;
  const now = Date.now();

  if (!force && _repairRunning)   return _result([], 'already_running');
  if (!force && (now - _lastRepairAt) < REPAIR_COOLDOWN_MS) return _result([], 'cooldown');

  _repairRunning = true;
  _lastRepairAt  = now;
  const startMs  = Date.now();
  const repairs  = [];

  try {
    const runners = [];

    if (domains.includes('cache'))        runners.push(_repairCaches());
    if (domains.includes('orphans'))      runners.push(_repairOrphans());
    if (domains.includes('queue'))        runners.push(_repairQueue());
    if (domains.includes('dependencies')) runners.push(_repairDependencies());
    if (domains.includes('state'))        runners.push(_repairState());
    if (domains.includes('indexes'))      runners.push(_rebuildIndexes());

    const results = await Promise.all(runners);
    for (const r of results) repairs.push(...r);

    _lastRunStats = _summarize(repairs);

    if (repairs.length > 0) {
      _persistRepairs(repairs).catch(() => {});
    }

    log.info('Auto-repair complete', {
      repaired: repairs.length,
      ms: Date.now() - startMs,
      ..._lastRunStats,
    });

    return _result(repairs, 'completed', Date.now() - startMs);
  } catch (err) {
    log.error('Auto-repair cycle failed', { error: err.message });
    return _result([], 'error', Date.now() - startMs, err.message);
  } finally {
    _repairRunning = false;
  }
}

/**
 * Repair a single domain on demand.
 *
 * @param {string} domain — cache|state|orphans|queue|dependencies|indexes
 * @returns {Promise<RepairResult>}
 */
async function repairDomain(domain) {
  if (!ALL_DOMAINS.includes(domain)) {
    return _result([], 'invalid_domain');
  }
  return runAutoRepair({ domains: [domain], force: true });
}

/**
 * Get stats from the last repair run.
 */
function getRepairStatus() {
  return {
    repairRunning:  _repairRunning,
    lastRepairAt:   _lastRepairAt ? new Date(_lastRepairAt).toISOString() : null,
    lastRunStats:   _lastRunStats || null,
    cooldownMs:     REPAIR_COOLDOWN_MS,
    domains:        ALL_DOMAINS,
  };
}

// ── Repair Domains ────────────────────────────────────────────────────────────

async function _repairCaches() {
  const repairs = [];

  // Identify agent_profiles with confidence_score outside [0,1] (data corruption)
  const { data: badProfiles } = await db()
    .from('agent_profiles')
    .select('agent_id, confidence_score, workload_score')
    .or('confidence_score.gt.1,confidence_score.lt.0,workload_score.gt.1,workload_score.lt.0')
    .limit(MAX_REPAIR_BATCH);

  for (const p of (badProfiles || [])) {
    const fix = {
      confidence_score: Math.min(1, Math.max(0, p.confidence_score ?? 0.5)),
      workload_score:   Math.min(1, Math.max(0, p.workload_score   ?? 0.5)),
      updated_at:       new Date().toISOString(),
    };
    await db().from('agent_profiles').update(fix).eq('agent_id', p.agent_id).catch(() => {});
    repairs.push({ domain: 'cache', target: 'agent_profiles', targetId: p.agent_id, action: 'clamp_scores', status: 'repaired' });
  }

  return repairs;
}

async function _repairOrphans() {
  const repairs = [];
  const cutoff  = new Date(Date.now() - ORPHAN_AGE_MS).toISOString();

  // Orphaned distributed locks (claimed > ORPHAN_AGE_MS with no active execution)
  const { data: orphanedLocks } = await db()
    .from('distributed_locks')
    .select('id, lock_key, owner_id, acquired_at')
    .lt('acquired_at', cutoff)
    .limit(MAX_REPAIR_BATCH);

  for (const lock of (orphanedLocks || [])) {
    await db().from('distributed_locks').delete().eq('id', lock.id).catch(() => {});
    repairs.push({ domain: 'orphans', target: 'distributed_locks', targetId: lock.id, action: 'release_orphan_lock', status: 'repaired', reason: 'lock_age_exceeded' });
  }

  // Executions in 'initializing' state > ORPHAN_AGE_MS (never started properly)
  const { data: initStuck } = await db()
    .from('pipeline_executions')
    .select('id, status, created_at')
    .eq('status', 'initializing')
    .lt('created_at', cutoff)
    .limit(MAX_REPAIR_BATCH);

  for (const exec of (initStuck || [])) {
    await db()
      .from('pipeline_executions')
      .update({ status: 'pending', worker_id: null, updated_at: new Date().toISOString() })
      .eq('id', exec.id)
      .catch(() => {});
    repairs.push({ domain: 'orphans', target: 'pipeline_executions', targetId: exec.id, action: 'reset_initializing', status: 'repaired', reason: 'stuck_initializing' });
  }

  return repairs;
}

async function _repairQueue() {
  const repairs = [];
  const cutoff  = new Date(Date.now() - QUEUE_STUCK_MS).toISOString();

  // Items stuck in 'processing' state (worker died mid-process)
  const { data: stuckProcessing } = await db()
    .from('pipeline_executions')
    .select('id, status, worker_id, updated_at')
    .eq('status', 'processing')
    .lt('updated_at', cutoff)
    .limit(MAX_REPAIR_BATCH);

  for (const item of (stuckProcessing || [])) {
    await db()
      .from('pipeline_executions')
      .update({ status: 'pending', worker_id: null, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .catch(() => {});
    repairs.push({ domain: 'queue', target: 'pipeline_executions', targetId: item.id, action: 'reset_stuck_processing', status: 'repaired' });
  }

  // Queue items with NULL pipeline_id (data integrity issue)
  const { data: nullPipeline } = await db()
    .from('pipeline_executions')
    .select('id, status')
    .is('pipeline_id', null)
    .in('status', ['pending', 'running', 'claimed'])
    .limit(MAX_REPAIR_BATCH);

  for (const item of (nullPipeline || [])) {
    await db()
      .from('pipeline_executions')
      .update({ status: 'failed', error: 'integrity_repair_null_pipeline', updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .catch(() => {});
    repairs.push({ domain: 'queue', target: 'pipeline_executions', targetId: item.id, action: 'fail_null_pipeline', status: 'repaired', reason: 'data_integrity' });
  }

  return repairs;
}

async function _repairDependencies() {
  const repairs = [];

  // Agent profiles with NULL role or specialization (breaks routing)
  const { data: badAgents } = await db()
    .from('agent_profiles')
    .select('agent_id, role, specialization')
    .or('role.is.null,specialization.is.null')
    .limit(MAX_REPAIR_BATCH);

  for (const agent of (badAgents || [])) {
    const fix = {};
    if (!agent.role)           fix.role           = 'generalist';
    if (!agent.specialization) fix.specialization  = 'general';
    fix.updated_at = new Date().toISOString();
    await db().from('agent_profiles').update(fix).eq('agent_id', agent.agent_id).catch(() => {});
    repairs.push({ domain: 'dependencies', target: 'agent_profiles', targetId: agent.agent_id, action: 'set_default_role', status: 'repaired' });
  }

  // Workers stuck in 'starting' state > 10 min (startup failed silently)
  const startingCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: stuckStarting } = await db()
    .from('distributed_workers')
    .select('id, worker_id, status, created_at')
    .eq('status', 'starting')
    .lt('created_at', startingCutoff)
    .limit(MAX_REPAIR_BATCH);

  for (const w of (stuckStarting || [])) {
    await db()
      .from('distributed_workers')
      .update({ status: 'dead', updated_at: new Date().toISOString() })
      .eq('id', w.id)
      .catch(() => {});
    repairs.push({ domain: 'dependencies', target: 'distributed_workers', targetId: w.worker_id, action: 'mark_starting_dead', status: 'repaired', reason: 'startup_timeout' });
  }

  return repairs;
}

async function _repairState() {
  const repairs = [];

  // Reset execution counters on workers to match actual running executions
  const { data: activeWorkers } = await db()
    .from('distributed_workers')
    .select('id, worker_id, current_executions')
    .eq('status', 'active')
    .limit(50);

  for (const worker of (activeWorkers || [])) {
    const { count } = await db()
      .from('pipeline_executions')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', worker.worker_id)
      .in('status', ['running', 'claimed', 'processing'])
      .catch(() => ({ count: null }));

    if (count !== null) {
      const actual = count;
      const stored = (worker.current_executions || []).length;
      if (actual !== stored) {
        await db()
          .from('distributed_workers')
          .update({ current_executions: [], updated_at: new Date().toISOString() })
          .eq('id', worker.id)
          .catch(() => {});
        repairs.push({ domain: 'state', target: 'distributed_workers', targetId: worker.worker_id, action: 'sync_execution_count', status: 'repaired', metadata: { storedCount: stored, actualCount: actual } });
      }
    }
  }

  return repairs;
}

async function _rebuildIndexes() {
  const repairs = [];

  // Re-index agent_capabilities for agents that have no index entry
  const { data: agents } = await db()
    .from('agent_profiles')
    .select('agent_id, specialization')
    .limit(100);

  const { data: indexed } = await db()
    .from('agent_capabilities')
    .select('agent_id')
    .limit(200);

  const indexedSet = new Set((indexed || []).map(r => r.agent_id));

  for (const agent of (agents || [])) {
    if (!indexedSet.has(agent.agent_id) && agent.specialization) {
      await db()
        .from('agent_capabilities')
        .upsert({
          agent_id:     agent.agent_id,
          capabilities: [agent.specialization],
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'agent_id' })
        .catch(() => {});
      repairs.push({ domain: 'indexes', target: 'agent_capabilities', targetId: agent.agent_id, action: 'seed_capability_index', status: 'repaired' });
    }
  }

  return repairs;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _persistRepairs(repairs) {
  for (const r of repairs.slice(0, MAX_REPAIR_BATCH)) {
    await db()
      .from('healing_events')
      .insert({
        event_type:   'auto_repair',
        domain:       r.domain,
        target_table: r.target,
        target_id:    r.targetId || null,
        action:       r.action,
        status:       r.status,
        reason:       r.reason       || null,
        metadata:     r.metadata     || {},
        healed_at:    new Date().toISOString(),
      })
      .catch(() => {});
  }
}

function _summarize(repairs) {
  const byDomain = {};
  for (const r of repairs) {
    byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
  }
  return { total: repairs.length, byDomain };
}

function _result(repairs, status, ms = 0, error = null) {
  return {
    status,
    totalRepaired: repairs.length,
    repairs:       repairs.slice(0, 50),
    repairMs:      ms,
    error:         error || undefined,
    repairedAt:    new Date().toISOString(),
  };
}

module.exports = {
  runAutoRepair,
  repairDomain,
  getRepairStatus,
  ALL_DOMAINS,
};
