'use strict';

/**
 * AWE-OS — Data Retention Cron
 *
 * Schedule  : Daily at 03:00 UTC
 * Purges    : pipeline_metrics (30d) · autonomous_logs (90d)
 *             · resolved failed_jobs (14d) · tool_usage_events (90d)
 * Safety    : Overlap guard · never crashes the process
 *             · recordCronRun() telemetry · structured JSON logging
 */

const cron         = require('node-cron');
const supabase     = require('../db/supabase');
const { recordCronRun } = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION = '0 3 * * *';
const AGENT           = 'retention-cron';

const RETENTION = Object.freeze({
  pipeline_metrics: { rpc: 'purge_old_pipeline_metrics', days: 30  },
  autonomous_logs:  { rpc: 'purge_old_autonomous_logs',  days: 90  },
  failed_jobs:      { rpc: 'purge_resolved_failed_jobs', days: 14  },
  tool_usage_events:{ rpc: 'purge_old_usage_events',     days: 90  },
});

// ── State ──────────────────────────────────────────────────────────────────────
let isRunning = false;

// ── Logger ─────────────────────────────────────────────────────────────────────
function log(level, message, data = {}) {
  try {
    const line = JSON.stringify({ agent: AGENT, level, message, ...data, ts: new Date().toISOString() });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch (_) {
    console.log(`[${AGENT}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeRetention() {
  if (isRunning) {
    log('warn', 'Skipping — previous retention run still in progress');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  log('info', 'Retention run starting', { tables: Object.keys(RETENTION) });

  const results   = {};
  let   totalRows = 0;
  let   hasErrors = false;

  try {
    const settled = await Promise.allSettled(
      Object.entries(RETENTION).map(async ([table, cfg]) => {
        const { data, error } = await supabase.rpc(cfg.rpc, { p_days: cfg.days });
        if (error) throw Object.assign(new Error(error.message), { table });
        const deleted = typeof data === 'number' ? data : 0;
        return { table, deleted, days: cfg.days };
      }),
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { table, deleted, days } = outcome.value;
        results[table] = { deleted, days };
        totalRows += deleted;
        log('info', 'Purge complete', { table, deleted, retention_days: days });
      } else {
        const err = outcome.reason;
        const table = err?.table || 'unknown';
        results[table] = { error: err?.message };
        hasErrors = true;
        log('error', 'Purge failed', { table, error: err?.message });
      }
    }

    const duration_ms = Date.now() - startedAt;
    const status      = hasErrors ? 'error' : 'success';

    log(hasErrors ? 'warn' : 'info', 'Retention run complete', {
      total_rows_deleted: totalRows,
      tables:             results,
      duration_ms,
    });

    await recordCronRun(AGENT, status, hasErrors ? 'One or more purges failed' : null, {
      records_processed: totalRows,
      tables:            results,
    });
  } catch (err) {
    log('error', 'Retention run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────────
function startRetentionCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  const task = cron.schedule(CRON_EXPRESSION, executeRetention, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs daily at 03:00 UTC', {
    expression:      CRON_EXPRESSION,
    retention_policy: Object.fromEntries(
      Object.entries(RETENTION).map(([t, c]) => [t, `${c.days}d`]),
    ),
  });
  return task;
}

module.exports = { startRetentionCron, executeRetention };
