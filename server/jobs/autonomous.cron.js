'use strict';

/**
 * AWE-OS — Autonomous Agent Cron (Enterprise-Grade)
 *
 * Schedule  : Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
 * Agent     : autonomous-agent.runAutonomousLoop()
 * Safety    : Overlap guard · circuit breaker (3 failures → 30-min open)
 *             · 10-minute execution budget · structured logging
 *             · recordCronRun() telemetry · never crashes the process
 *
 * Registration (in index.js): call startAutonomousCron() inside app.listen()
 */

const cron = require('node-cron');
const { runAutonomousLoop } = require('../agents/autonomous-agent');
const { recordCronRun }     = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION      = '0 */6 * * *';
const AGENT                = 'autonomous-cron';
const EXECUTION_BUDGET_MS  = 10 * 60_000;   // hard 10-minute cap per run
const CB_FAILURE_THRESHOLD = 3;             // open circuit after N consecutive failures
const CB_RESET_MS          = 30 * 60_000;   // re-attempt after 30 min

const RUN_OPTIONS = Object.freeze({ limit: 10, triggered_by: 'cron' });

// ── State ──────────────────────────────────────────────────────────────────────
let isRunning  = false;
let activeTask = null;

const cb = { failures: 0, openSince: null };   // circuit breaker state

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

// ── Circuit breaker ────────────────────────────────────────────────────────────
function isCircuitOpen() {
  if (cb.openSince === null) return false;
  if (Date.now() - cb.openSince >= CB_RESET_MS) {
    cb.failures  = 0;
    cb.openSince = null;
    log('info', 'Circuit reset — entering half-open state');
    return false;
  }
  return true;
}

function onSuccess() {
  const recovered = cb.failures > 0;
  cb.failures  = 0;
  cb.openSince = null;
  if (recovered) log('info', 'Circuit closed after successful run');
}

function onFailure(err) {
  cb.failures++;
  if (cb.failures >= CB_FAILURE_THRESHOLD && cb.openSince === null) {
    cb.openSince = Date.now();
    log('error', 'Circuit OPEN — pausing autonomous runs', {
      consecutive_failures: cb.failures,
      resumes_in_ms:        CB_RESET_MS,
      error:                err?.message || String(err),
    });
  }
}

// ── Execution budget ───────────────────────────────────────────────────────────
function withBudget(fn, budgetMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('Execution budget exceeded'), { code: 'BUDGET_EXCEEDED' })),
        budgetMs
      )
    ),
  ]);
}

// ── Metrics extraction ─────────────────────────────────────────────────────────
function extractMetrics(summary) {
  if (!summary || typeof summary !== 'object') return {};
  const actions = summary.actions_taken || {};
  return {
    tools_processed: summary.tools_processed      ?? 0,
    plans_generated: actions.plans_generated       ?? 0,
    scaled:          actions.scaled                ?? 0,
    kill_flagged:    actions.kill_flagged          ?? 0,
    errors:          actions.errors                ?? 0,
  };
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeScheduledRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  if (isCircuitOpen()) {
    const remainMs = CB_RESET_MS - (Date.now() - cb.openSince);
    log('warn', 'Circuit OPEN — skipping run', {
      consecutive_failures: cb.failures,
      resets_in_ms:         Math.round(remainMs),
    });
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  log('info', 'Run starting', { options: RUN_OPTIONS, budget_ms: EXECUTION_BUDGET_MS });

  try {
    const summary    = await withBudget(() => runAutonomousLoop(RUN_OPTIONS), EXECUTION_BUDGET_MS);
    const duration_ms = Date.now() - startedAt;

    if (!summary) {
      onFailure(new Error('no summary'));
      log('error', 'Agent returned no summary', { duration_ms });
      await recordCronRun(AGENT, 'error', 'Agent returned no summary');
      return;
    }

    if (summary.skipped) {
      log('warn', 'Run skipped by agent', { reason: summary.reason || 'unknown', duration_ms });
      onSuccess();
      await recordCronRun(AGENT, 'skipped');
      return;
    }

    const metrics = extractMetrics(summary);
    log('info', 'Run complete', { ...metrics, duration_ms });
    onSuccess();
    await recordCronRun(AGENT, 'success', null, {
      records_processed: metrics.tools_processed,
      plans_generated:   metrics.plans_generated,
    });
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    log('error', 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      duration_ms,
    });
    onFailure(err);
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────────
function startAutonomousCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  activeTask = cron.schedule(CRON_EXPRESSION, executeScheduledRun, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)', {
    expression:  CRON_EXPRESSION,
    budget_ms:   EXECUTION_BUDGET_MS,
    cb_threshold: CB_FAILURE_THRESHOLD,
  });
  return activeTask;
}

function stopAutonomousCron() {
  if (activeTask) { activeTask.stop(); activeTask = null; log('info', 'Cron task stopped'); }
}

module.exports = { startAutonomousCron, stopAutonomousCron, executeScheduledRun };
