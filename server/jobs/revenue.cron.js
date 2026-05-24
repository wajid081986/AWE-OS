'use strict';

/**
 * AWE-OS — Revenue Analysis Cron (Enterprise-Grade)
 *
 * Schedule  : Daily at 23:59 UTC
 * Agent     : revenue-agent (calculateDailySnapshot, findUpsellOpportunities, trackFailedPayments)
 * Safety    : Overlap guard · MRR/ARR growth rate · churn prediction
 *             · revenue anomaly detection · structured logging
 *             · recordCronRun() telemetry · never crashes the process
 *             · auto-starts on require (registered via bare require() in index.js)
 */

const cron = require('node-cron');
const {
  calculateDailySnapshot,
  findUpsellOpportunities,
  trackFailedPayments,
} = require('../agents/revenue-agent');
const { recordCronRun } = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION          = '59 23 * * *';
const AGENT                    = 'revenue-cron';
const REVENUE_HISTORY_WINDOW   = 7;      // days to keep for anomaly detection
const REVENUE_ANOMALY_DROP_PCT = 50;     // alert if daily revenue drops > 50% from avg
const CHURN_ALERT_THRESHOLD    = 3;      // alert if failed payments spike 3 consecutive runs

// ── State ──────────────────────────────────────────────────────────────────────
let isRunning = false;

const state = {
  previousMRR:           null,      // last recorded MRR for growth-rate calc
  revenueHistory:        [],        // last N daily_revenue values
  consecutiveFailRuns:   0,         // for churn prediction
};

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

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function withRetry(fn, label, delays = [1_000, 5_000]) {
  let lastErr;
  for (let i = 0; i <= delays.length; i++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (i < delays.length) {
        log('warn', `${label} — attempt ${i + 1} failed, retrying`, { error: err.message, delay_ms: delays[i] });
        await new Promise(r => setTimeout(r, delays[i]));
      }
    }
  }
  throw lastErr;
}

// ── MRR / ARR growth rate ──────────────────────────────────────────────────────
function computeGrowthRate(current, previous) {
  if (!previous || previous === 0) return null;
  return Number(((current - previous) / previous * 100).toFixed(2));
}

function logMrrGrowth(mrr) {
  if (mrr == null) return;
  const growth = computeGrowthRate(mrr, state.previousMRR);
  if (growth !== null) {
    const level = growth < -10 ? 'warn' : 'info';
    log(level, 'MRR growth rate', {
      mrr_current:    mrr,
      mrr_previous:   state.previousMRR,
      growth_pct:     growth,
      arr_current:    Math.round(mrr * 12),
      arr_previous:   Math.round(state.previousMRR * 12),
    });
  }
  state.previousMRR = mrr;
}

// ── Revenue anomaly detection ──────────────────────────────────────────────────
function checkRevenueAnomaly(dailyRevenue) {
  if (dailyRevenue == null) return;
  state.revenueHistory.push(dailyRevenue);
  if (state.revenueHistory.length > REVENUE_HISTORY_WINDOW) state.revenueHistory.shift();

  const history = state.revenueHistory;
  if (history.length < 3) return;   // need at least 3 data points

  const prevValues = history.slice(0, -1);
  const avg = prevValues.reduce((a, b) => a + b, 0) / prevValues.length;

  if (avg > 0 && dailyRevenue < avg * (1 - REVENUE_ANOMALY_DROP_PCT / 100)) {
    log('warn', 'Revenue anomaly detected — significant daily drop', {
      daily_revenue:   dailyRevenue,
      recent_avg:      Number(avg.toFixed(2)),
      drop_pct:        Number(((avg - dailyRevenue) / avg * 100).toFixed(1)),
      alert_threshold: REVENUE_ANOMALY_DROP_PCT,
    });
  }
}

// ── Churn prediction ───────────────────────────────────────────────────────────
function checkChurnRisk(totalFailed) {
  if (totalFailed > 0) {
    state.consecutiveFailRuns++;
    if (state.consecutiveFailRuns >= CHURN_ALERT_THRESHOLD) {
      log('warn', 'Churn risk elevated — failed payments trending up', {
        consecutive_runs_with_failures: state.consecutiveFailRuns,
        current_failed_count:           totalFailed,
      });
    }
  } else {
    if (state.consecutiveFailRuns > 0) {
      log('info', 'Failed payment streak cleared', { was_consecutive: state.consecutiveFailRuns });
    }
    state.consecutiveFailRuns = 0;
  }
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeDailyRevenue() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  log('info', 'Daily revenue analysis starting');

  let recordsProcessed = 0;
  let errors = 0;

  try {
    // Daily snapshot
    let snapshot = null;
    try {
      snapshot = await withRetry(() => calculateDailySnapshot(), 'calculateDailySnapshot');
      log('info', 'Daily snapshot', {
        daily_revenue: snapshot?.daily_revenue ?? null,
        mrr:           snapshot?.mrr           ?? null,
        churn_rate:    snapshot?.churn_rate    ?? null,
      });
      logMrrGrowth(snapshot?.mrr);
      checkRevenueAnomaly(snapshot?.daily_revenue);
      recordsProcessed++;
    } catch (err) {
      errors++;
      log('error', 'calculateDailySnapshot failed', { error: err.message });
    }

    // Upsell opportunities
    try {
      const upsells = await withRetry(() => findUpsellOpportunities(), 'findUpsellOpportunities');
      log('info', 'Upsell opportunities', {
        total_found:        upsells?.total_found        ?? 0,
        estimated_revenue:  upsells?.estimated_revenue  ?? 0,
      });
      recordsProcessed++;
    } catch (err) {
      errors++;
      log('error', 'findUpsellOpportunities failed', { error: err.message });
    }

    // Failed payments — informs churn prediction
    try {
      const failed = await withRetry(() => trackFailedPayments(), 'trackFailedPayments');
      log('info', 'Failed payments', {
        total_failed:        failed?.total_failed        ?? 0,
        total_amount_lost:   failed?.total_amount_lost   ?? 0,
      });
      checkChurnRisk(failed?.total_failed ?? 0);
      recordsProcessed++;
    } catch (err) {
      errors++;
      log('error', 'trackFailedPayments failed', { error: err.message });
    }

    const duration_ms = Date.now() - startedAt;
    const status = errors === 3 ? 'error' : 'success';

    log('info', 'Daily revenue analysis complete', {
      records_processed: recordsProcessed,
      errors,
      duration_ms,
    });

    await recordCronRun(AGENT, status, errors === 3 ? 'All sub-tasks failed' : null, {
      records_processed: recordsProcessed,
      errors,
    });
  } catch (err) {
    log('error', 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler — auto-starts on require ────────────────────────────────────────
function startRevenueCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  const task = cron.schedule(CRON_EXPRESSION, executeDailyRevenue, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs daily at 23:59 UTC', { expression: CRON_EXPRESSION });
  return task;
}

module.exports = { startRevenueCron, executeDailyRevenue };
