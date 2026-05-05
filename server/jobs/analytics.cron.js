'use strict';

/**
 * AWE-OS — Analytics Cron
 *
 * Schedule  : Daily at 00:00 UTC
 * Job       : Recalculate conversion_rate for every live tool
 *             using a single batched query (no N+1 problem)
 * Safety    : Overlap guard · structured logging · atomic batch update
 *             · never crashes the server process
 *
 * Registration (in index.js):
 *   const { startAnalyticsCron } = require('./crons/analytics-cron');
 *   startAnalyticsCron();
 */

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const { recordCronRun } = require('../services/cron-health');

// ── Config ────────────────────────────────────────────────────

const CRON_EXPRESSION = '0 0 * * *';   // 00:00 UTC daily
const AGENT           = 'analytics-cron';

// ── State — prevents overlapping runs ─────────────────────────

let isRunning  = false;
let activeTask = null;

// ── Structured logger ─────────────────────────────────────────

/**
 * Emit a structured JSON log line.
 * Never throws — logging must never interrupt the cron flow.
 *
 * @param {'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
function log(level, message, data = {}) {
  try {
    const line = JSON.stringify({
      agent:     AGENT,
      level,
      message,
      ...data,
      timestamp: new Date().toISOString(),
    });
    if (level === 'error') console.error(line);
    else if (level === 'warn')  console.warn(line);
    else console.log(line);
  } catch (_) {
    console.log(`[${AGENT}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Query helpers ─────────────────────────────────────────────

/**
 * Fetch all live tools (id + name only).
 *
 * @returns {Promise<{ id: string, name: string }[]>}
 */
async function fetchLiveTools() {
  const { data, error } = await supabase
    .from('tools')
    .select('id, name')
    .eq('status', 'live');

  if (error) throw Object.assign(
    new Error(`Failed to fetch live tools: ${error.message}`),
    { code: 'FETCH_TOOLS_FAILED', cause: error }
  );

  return data || [];
}

const ANALYTICS_WINDOW_DAYS = 30;

/**
 * Fetch tool_viewed + tool_used events for ALL given tool IDs
 * in a SINGLE query, limited to the last 30 days to prevent unbounded scans.
 *
 * @param {string[]} toolIds
 * @returns {Promise<{ tool_id: string, event_type: string }[]>}
 */
async function fetchEventsForTools(toolIds) {
  if (toolIds.length === 0) return [];

  const since = new Date(Date.now() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tool_events')
    .select('tool_id, event_type')
    .in('tool_id', toolIds)
    .in('event_type', ['tool_viewed', 'tool_used'])
    .gte('created_at', since);

  if (error) throw Object.assign(
    new Error(`Failed to fetch tool events: ${error.message}`),
    { code: 'FETCH_EVENTS_FAILED', cause: error }
  );

  return data || [];
}

/**
 * Group events by tool_id and count views + uses.
 *
 * @param {string[]} toolIds
 * @param {{ tool_id: string, event_type: string }[]} events
 * @returns {Map<string, { viewed: number, used: number }>}
 */
function aggregateEvents(toolIds, events) {
  // Pre-seed every tool with zero counts so tools with no events
  // still get their conversion_rate reset to 0 (not skipped).
  const map = new Map(
    toolIds.map((id) => [id, { viewed: 0, used: 0 }])
  );

  for (const { tool_id, event_type } of events) {
    const entry = map.get(tool_id);
    if (!entry) continue;   // should not happen, but guard anyway
    if (event_type === 'tool_viewed') entry.viewed++;
    else if (event_type === 'tool_used')   entry.used++;
  }

  return map;
}

/**
 * Compute conversion rate.
 * Guards against division-by-zero: returns 0 when no views exist.
 *
 * @param {number} used
 * @param {number} viewed
 * @returns {number} Percentage rounded to 2 decimal places
 */
function computeRate(used, viewed) {
  if (viewed === 0) return 0;
  return Number(((used / viewed) * 100).toFixed(2));
}

/**
 * Build the upsert payload and push it to Supabase in one call.
 * Uses upsert (not update) so a missing row never causes a silent skip.
 *
 * @param {Map<string, { viewed: number, used: number }>} aggregated
 * @returns {Promise<{ updated: number, failed: number, breakdown: object[] }>}
 */
async function batchUpdateRates(aggregated) {
  const breakdown = [];

  for (const [toolId, { viewed, used }] of aggregated) {
    breakdown.push({
      tool_id:         toolId,
      conversion_rate: computeRate(used, viewed),
    });
  }

  // Single round-trip for all tools
  const { error } = await supabase
    .from('tools')
    .upsert(breakdown, { onConflict: 'id' });

  if (error) throw Object.assign(
    new Error(`Batch update failed: ${error.message}`),
    { code: 'BATCH_UPDATE_FAILED', cause: error }
  );

  return {
    updated:   breakdown.length,
    failed:    0,
    breakdown,
  };
}

// ── Core execution ────────────────────────────────────────────

/**
 * Recalculate conversion_rate for every live tool.
 *
 * Strategy:
 *   1. Fetch all live tool IDs — 1 query
 *   2. Fetch all relevant events for those IDs — 1 query (batched, no N+1)
 *   3. Aggregate in memory — O(n), zero DB round-trips
 *   4. Upsert all rates — 1 query
 *
 * Total: 3 DB queries regardless of how many tools exist.
 *
 * @returns {Promise<{ updated: number, failed: number, duration_ms: number }>}
 */
async function recalculateConversionRates() {
  const startedAt = Date.now();

  log('info', 'Recalculation starting');

  // 1. Live tools
  const tools = await fetchLiveTools();

  if (tools.length === 0) {
    const duration_ms = Date.now() - startedAt;
    log('info', 'No live tools found — nothing to update', { duration_ms });
    return { updated: 0, failed: 0, duration_ms };
  }

  const toolIds = tools.map((t) => t.id);
  log('info', 'Live tools fetched', { count: tools.length });

  // 2. All events in one query
  const events = await fetchEventsForTools(toolIds);
  log('info', 'Events fetched', { count: events.length });

  // 3. Aggregate in memory
  const aggregated = aggregateEvents(toolIds, events);

  // Debug: log per-tool breakdown at info level (truncated for large fleets)
  const sample = [...aggregated.entries()].slice(0, 10);
  for (const [id, { viewed, used }] of sample) {
    const tool = tools.find((t) => t.id === id);
    log('info', 'Tool rate computed', {
      tool_id:         id,
      tool_name:       tool?.name || 'unknown',
      viewed,
      used,
      conversion_rate: computeRate(used, viewed),
    });
  }
  if (aggregated.size > 10) {
    log('info', `... and ${aggregated.size - 10} more tools (truncated)`);
  }

  // 4. Single batch upsert
  const { updated, failed, breakdown } = await batchUpdateRates(aggregated);

  const duration_ms = Date.now() - startedAt;

  log('info', 'Recalculation complete', {
    updated,
    failed,
    total:      tools.length,
    duration_ms,
  });

  return { updated, failed, duration_ms };
}

// ── Scheduled wrapper ─────────────────────────────────────────

/**
 * Scheduled entry point — wraps recalculateConversionRates()
 * with an overlap guard and a catch-all so the process never crashes.
 *
 * @returns {Promise<void>}
 */
async function executeAnalyticsRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning = true;

  try {
    await recalculateConversionRates();
    await recordCronRun('analytics-cron', 'success');
  } catch (err) {
    log('error', 'Run threw an unexpected error', {
      error: err?.message || String(err),
      code:  err?.code    || null,
      stack: err?.stack   || null,
    });
    await recordCronRun('analytics-cron', 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler registration ────────────────────────────────────

/**
 * Register the analytics cron schedule.
 * Call ONCE from index.js at server startup.
 *
 * @returns {import('node-cron').ScheduledTask}
 */
function startAnalyticsCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }

  activeTask = cron.schedule(CRON_EXPRESSION, executeAnalyticsRun, {
    scheduled: true,
    timezone:  'UTC',
  });

  log('info', 'Registered — runs daily at 00:00 UTC', {
    expression: CRON_EXPRESSION,
  });

  return activeTask;
}

/**
 * Stop the active cron task — useful for graceful shutdown and tests.
 */
function stopAnalyticsCron() {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
    log('info', 'Cron task stopped');
  }
}

// ── Exports ───────────────────────────────────────────────────
//
// No top-level side effects.
// startAnalyticsCron() is called exclusively by index.js.
// recalculateConversionRates() and executeAnalyticsRun() are
// exported so integration tests can trigger runs directly.

module.exports = {
  startAnalyticsCron,
  stopAnalyticsCron,
  executeAnalyticsRun,
  recalculateConversionRates,
};
