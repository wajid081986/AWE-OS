'use strict';

const supabase = require('../db/supabase');

/**
 * Record the result of a cron run in cron_health table.
 * Never throws — a health-tracking failure must never crash the cron itself.
 *
 * @param {string}      cronName  - Must match a cron_name in cron_health table
 * @param {'success'|'error'|'skipped'} status
 * @param {string|null} [error]   - Error message if status === 'error'
 * @param {object|null} [metadata] - Optional run metrics (records_processed, anomalies, etc.)
 */
async function recordCronRun(cronName, status, error = null, metadata = null) {
  try {
    const { error: rpcErr } = await supabase.rpc('record_cron_run', {
      p_cron_name: cronName,
      p_status:    status,
      p_error:     error   || null,
      p_meta:      metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    });

    if (rpcErr) {
      console.error(`[CRON HEALTH] Failed to record run for "${cronName}":`, rpcErr.message);
    }
  } catch (err) {
    console.error(`[CRON HEALTH] Unexpected error recording run for "${cronName}":`, err.message);
  }
}

/**
 * Check whether any cron job has missed its expected interval.
 * Returns a list of overdue cron names (empty = all healthy).
 *
 * intervalMap: { 'analytics-cron': 24 * 60, ... }  (values in MINUTES)
 */
async function checkCronHealth(intervalMap = {}) {
  try {
    const { data, error } = await supabase
      .from('cron_health')
      .select('cron_name, last_run_at');

    if (error) {
      console.error('[CRON HEALTH] checkCronHealth query failed:', error.message);
      return [];
    }

    const now = Date.now();
    const overdue = [];

    for (const row of data || []) {
      const expectedIntervalMs = (intervalMap[row.cron_name] ?? 0) * 60 * 1000;
      if (expectedIntervalMs === 0) continue;

      const lastRunMs = row.last_run_at ? new Date(row.last_run_at).getTime() : 0;
      const overdueFactor = 2; // alert if 2× interval has passed

      if (now - lastRunMs > expectedIntervalMs * overdueFactor) {
        overdue.push({
          cron_name:     row.cron_name,
          last_run_at:   row.last_run_at,
          overdue_by_ms: now - lastRunMs - expectedIntervalMs,
        });
      }
    }

    if (overdue.length > 0) {
      console.error('[CRON HEALTH] OVERDUE CRONS DETECTED:', JSON.stringify(overdue));
    }

    return overdue;
  } catch (err) {
    console.error('[CRON HEALTH] checkCronHealth failed:', err.message);
    return [];
  }
}

module.exports = { recordCronRun, checkCronHealth };
