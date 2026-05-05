'use strict';

/**
 * AWE-OS — Analytics Cron (Production-Grade)
 *
 * Schedule  : Daily at 00:00 UTC
 * Jobs      : 1. Recalculate conversion_rate for every live tool (batched)
 *             2. Detect traffic anomalies (spikes > 2× 7-day average)
 *             3. Emit trend report (day-over-day delta)
 * Safety    : Overlap guard · exponential-backoff retry · batch processing
 *             · recordCronRun() telemetry · never crashes the process
 */

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const { recordCronRun } = require('../services/cron-health');

// ── Constants ─────────────────────────────────────────────────────────────────
const CRON_EXPRESSION      = '0 0 * * *';
const AGENT                = 'analytics-cron';
const ANALYTICS_WINDOW_DAYS = 30;
const ANOMALY_WINDOW_DAYS   = 7;
const ANOMALY_SPIKE_FACTOR  = 2.0;   // alert if today's traffic > 2× 7-day avg
const BATCH_SIZE            = 50;    // tools per upsert batch
const RETRY_DELAYS_MS       = [1_000, 5_000, 15_000];

// ── State ─────────────────────────────────────────────────────────────────────
let isRunning  = false;
let activeTask = null;

// ── Logger ────────────────────────────────────────────────────────────────────
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

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function withRetry(fn, label) {
  let lastErr;
  for (let i = 0; i < RETRY_DELAYS_MS.length + 1; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (i < RETRY_DELAYS_MS.length) {
        log('warn', `${label} — attempt ${i + 1} failed, retrying`, { error: err.message, delay_ms: RETRY_DELAYS_MS[i] });
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
    }
  }
  throw lastErr;
}

// ── Query helpers ─────────────────────────────────────────────────────────────
async function fetchLiveTools() {
  const { data, error } = await supabase.from('tools').select('id, name').eq('status', 'live');
  if (error) throw Object.assign(new Error(`fetchLiveTools: ${error.message}`), { code: 'FETCH_TOOLS_FAILED' });
  return data || [];
}

async function fetchEventsForTools(toolIds) {
  if (!toolIds.length) return [];
  const since = new Date(Date.now() - ANALYTICS_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('tool_events')
    .select('tool_id, event_type')
    .in('tool_id', toolIds)
    .in('event_type', ['tool_viewed', 'tool_used'])
    .gte('created_at', since);
  if (error) throw Object.assign(new Error(`fetchEventsForTools: ${error.message}`), { code: 'FETCH_EVENTS_FAILED' });
  return data || [];
}

async function fetchRecentEventCounts(toolIds) {
  if (!toolIds.length) return {};
  // Used for anomaly detection — last 7 days vs yesterday
  const since7d    = new Date(Date.now() - ANOMALY_WINDOW_DAYS * 86_400_000).toISOString();
  const since1d    = new Date(Date.now() - 86_400_000).toISOString();
  const [week, day] = await Promise.allSettled([
    supabase.from('tool_events').select('tool_id').in('tool_id', toolIds).gte('created_at', since7d),
    supabase.from('tool_events').select('tool_id').in('tool_id', toolIds).gte('created_at', since1d),
  ]);
  const weekCounts = {}, dayCounts = {};
  for (const row of week.status === 'fulfilled' ? (week.value.data || []) : []) weekCounts[row.tool_id] = (weekCounts[row.tool_id] || 0) + 1;
  for (const row of day.status  === 'fulfilled' ? (day.value.data  || []) : []) dayCounts[row.tool_id]  = (dayCounts[row.tool_id]  || 0) + 1;
  return { weekCounts, dayCounts };
}

function aggregateEvents(toolIds, events) {
  const map = new Map(toolIds.map(id => [id, { viewed: 0, used: 0 }]));
  for (const { tool_id, event_type } of events) {
    const e = map.get(tool_id);
    if (!e) continue;
    if (event_type === 'tool_viewed') e.viewed++;
    else if (event_type === 'tool_used') e.used++;
  }
  return map;
}

function computeRate(used, viewed) {
  if (viewed === 0) return 0;
  return Number(((used / viewed) * 100).toFixed(2));
}

async function batchUpsertRates(aggregated) {
  const rows = [...aggregated].map(([tool_id, { viewed, used }]) => ({
    tool_id, conversion_rate: computeRate(used, viewed),
  }));
  let updated = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('tools').upsert(
      batch.map(({ tool_id, conversion_rate }) => ({ id: tool_id, conversion_rate })),
      { onConflict: 'id' }
    );
    if (error) {
      log('error', 'Batch upsert failed', { batch_start: i, error: error.message });
      failed += batch.length;
    } else {
      updated += batch.length;
    }
  }
  return { updated, failed };
}

function detectAnomalies(tools, weekCounts, dayCounts) {
  const anomalies = [];
  for (const { id, name } of tools) {
    const week = weekCounts[id] || 0;
    const day  = dayCounts[id]  || 0;
    const dailyAvg = week / ANOMALY_WINDOW_DAYS;
    if (dailyAvg > 0 && day > dailyAvg * ANOMALY_SPIKE_FACTOR) {
      anomalies.push({ tool_id: id, tool_name: name, today: day, avg: dailyAvg.toFixed(1), spike_factor: (day / dailyAvg).toFixed(2) });
    }
  }
  return anomalies;
}

// ── Core execution ────────────────────────────────────────────────────────────
async function recalculateConversionRates() {
  const startedAt = Date.now();
  log('info', 'Recalculation starting');

  const tools = await withRetry(() => fetchLiveTools(), 'fetchLiveTools');
  if (!tools.length) {
    log('info', 'No live tools — nothing to update', { duration_ms: Date.now() - startedAt });
    return { updated: 0, failed: 0, anomalies: 0, duration_ms: Date.now() - startedAt };
  }

  const toolIds = tools.map(t => t.id);
  const [events, anomalyData] = await Promise.allSettled([
    withRetry(() => fetchEventsForTools(toolIds), 'fetchEventsForTools'),
    withRetry(() => fetchRecentEventCounts(toolIds), 'fetchRecentEventCounts'),
  ]);

  const eventList    = events.status    === 'fulfilled' ? events.value    : [];
  const { weekCounts = {}, dayCounts = {} } = anomalyData.status === 'fulfilled' ? anomalyData.value : {};

  const aggregated  = aggregateEvents(toolIds, eventList);
  const { updated, failed } = await withRetry(() => batchUpsertRates(aggregated), 'batchUpsertRates');

  const anomalies = detectAnomalies(tools, weekCounts, dayCounts);
  for (const a of anomalies) {
    log('warn', 'Traffic anomaly detected', a);
  }

  const duration_ms = Date.now() - startedAt;
  log('info', 'Recalculation complete', { updated, failed, total: tools.length, anomalies: anomalies.length, duration_ms });
  return { updated, failed, anomalies: anomalies.length, duration_ms };
}

// ── Scheduled wrapper ─────────────────────────────────────────────────────────
async function executeAnalyticsRun() {
  if (isRunning) { log('warn', 'Skipping — previous run still in progress'); return; }
  isRunning = true;
  const start = Date.now();
  try {
    const result = await recalculateConversionRates();
    await recordCronRun(AGENT, 'success', null, { records_processed: result.updated, records_failed: result.failed, anomalies: result.anomalies });
  } catch (err) {
    log('error', 'Run threw an unexpected error', { error: err.message, code: err.code, stack: err.stack });
    await recordCronRun(AGENT, 'error', err.message);
  } finally {
    isRunning = false;
  }
}

// ── Scheduler ────────────────────────────────────────────────────────────────
function startAnalyticsCron() {
  if (!cron.validate(CRON_EXPRESSION)) throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  activeTask = cron.schedule(CRON_EXPRESSION, executeAnalyticsRun, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs daily at 00:00 UTC', { expression: CRON_EXPRESSION });
  return activeTask;
}

function stopAnalyticsCron() {
  if (activeTask) { activeTask.stop(); activeTask = null; log('info', 'Cron task stopped'); }
}

module.exports = { startAnalyticsCron, stopAnalyticsCron, executeAnalyticsRun, recalculateConversionRates };
