'use strict';

/**
 * AWE-OS — Testing Agent Cron (Enterprise-Grade)
 *
 * Schedule  : Daily at 04:00 UTC (09:30 IST)
 *             Runs after autonomous-cron (00:00/06:00) and decision-cron (02:00)
 *             so it always tests the latest published state of tools.
 *
 * Agent     : testing-agent.core.runTestingAgent()
 * Safety    : Overlap guard · regression detection (pass rate vs previous run)
 *             · test coverage gap analysis (tools with no tests this cycle)
 *             · 15-minute execution budget · recordCronRun() telemetry
 *             · never crashes the server process
 *
 * Registration (in index.js): call startTestingCron() inside app.listen()
 */

const cron = require('node-cron');
const { runTestingAgent } = require('../agents/testing-agent.core');
const { recordCronRun }   = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION     = '0 4 * * *';
const AGENT               = 'testing-cron';
const EXECUTION_BUDGET_MS = 15 * 60_000;   // 15-minute hard cap
const REGRESSION_DROP_PCT = 10;            // warn if pass rate drops > 10% from previous run

// ── State ──────────────────────────────────────────────────────────────────────
let isRunning  = false;
let activeTask = null;

const prevRun = {
  pass_rate_pct: null,   // 0-100, updated after each run for regression detection
  tools_tested:  null,   // used for coverage gap comparison
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

// ── Agent validator ────────────────────────────────────────────────────────────
function assertAgentLoaded() {
  if (typeof runTestingAgent !== 'function') {
    throw new Error(
      `[${AGENT}] runTestingAgent is not a function — check the export in agents/testing-agent.core.js`
    );
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

// ── Regression detection ───────────────────────────────────────────────────────
function checkRegression(currentPassRatePct) {
  if (prevRun.pass_rate_pct === null || currentPassRatePct === null) return;
  const drop = prevRun.pass_rate_pct - currentPassRatePct;
  if (drop >= REGRESSION_DROP_PCT) {
    log('warn', 'Regression detected — pass rate dropped', {
      previous_pass_rate_pct: prevRun.pass_rate_pct,
      current_pass_rate_pct:  currentPassRatePct,
      drop_pct:               Number(drop.toFixed(1)),
      alert_threshold_pct:    REGRESSION_DROP_PCT,
    });
  }
}

// ── Coverage gap analysis ──────────────────────────────────────────────────────
function checkCoverageGap(result) {
  const toolsTested = result?.tools_tested ?? 0;
  if (prevRun.tools_tested !== null && toolsTested < prevRun.tools_tested) {
    log('warn', 'Coverage gap — fewer tools tested than previous run', {
      current_tools_tested:  toolsTested,
      previous_tools_tested: prevRun.tools_tested,
      gap:                   prevRun.tools_tested - toolsTested,
    });
  }

  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const untestedCategories = [...new Set(errors.map(e => e?.category).filter(Boolean))];
  if (untestedCategories.length > 0) {
    log('warn', 'Coverage gap — error-prone tool categories', { categories: untestedCategories });
  }
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeTestingRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  log('info', 'Run starting', { budget_ms: EXECUTION_BUDGET_MS });

  try {
    const result = await withBudget(() => runTestingAgent(), EXECUTION_BUDGET_MS);
    const duration_ms = Date.now() - startedAt;

    if (!result || typeof result !== 'object') {
      log('info', 'Run complete — agent returned no structured summary', { duration_ms });
      await recordCronRun(AGENT, 'success');
      return;
    }

    const {
      tests_run    = 0,
      tests_passed = 0,
      tests_failed = 0,
      tools_tested = 0,
      skipped      = 0,
      errors       = [],
    } = result;

    const pass_rate_pct = tests_run > 0
      ? Number(((tests_passed / tests_run) * 100).toFixed(1))
      : null;

    // Regression and coverage analysis
    checkRegression(pass_rate_pct);
    checkCoverageGap(result);

    log('info', 'Run complete', {
      tests_run,
      tests_passed,
      tests_failed,
      tools_tested,
      skipped,
      error_count:    Array.isArray(errors) ? errors.length : 0,
      pass_rate_pct,
      prev_pass_rate: prevRun.pass_rate_pct,
      duration_ms,
    });

    // Surface individual failures at warn level
    if (Array.isArray(errors) && errors.length > 0) {
      for (const err of errors.slice(0, 10)) {
        log('warn', 'Test failure', {
          tool_id:  err?.tool_id  || null,
          test:     err?.test     || 'unknown',
          reason:   err?.reason   || err?.message || String(err),
        });
      }
    }

    // Update state for next run's regression check
    prevRun.pass_rate_pct = pass_rate_pct;
    prevRun.tools_tested  = tools_tested;

    const status = tests_failed > 0 && tests_passed === 0 ? 'error' : 'success';
    await recordCronRun(AGENT, status, null, {
      records_processed: tests_run,
      tests_passed,
      tests_failed,
      pass_rate_pct,
    });
  } catch (err) {
    log('error', 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────────
function startTestingCron() {
  assertAgentLoaded();
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  activeTask = cron.schedule(CRON_EXPRESSION, executeTestingRun, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs daily at 04:00 UTC', {
    expression:  CRON_EXPRESSION,
    budget_ms:   EXECUTION_BUDGET_MS,
    regression_alert_pct: REGRESSION_DROP_PCT,
  });
  return activeTask;
}

function stopTestingCron() {
  if (activeTask) { activeTask.stop(); activeTask = null; log('info', 'Cron task stopped'); }
}

module.exports = { startTestingCron, stopTestingCron, executeTestingRun };
