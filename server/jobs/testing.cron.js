'use strict';

/**
 * AWE-OS — Testing Agent Cron
 *
 * Schedule  : Daily at 04:00 UTC (09:30 IST)
 *             Runs after autonomous-cron (00:00/06:00) and decision-cron (02:00)
 *             so it always tests the latest published state of tools.
 *
 * Agent     : testing-agent.core.runTestingAgent()
 * Safety    : Overlap guard · structured logging · graceful shutdown
 *             · never crashes the server process
 *
 * Registration (in index.js):
 *   const { startTestingCron } = require('./crons/testing-cron');
 *   startTestingCron();
 */

const cron = require('node-cron');

const { runTestingAgent } = require('../agents/testing-agent.core');

// ── Config ────────────────────────────────────────────────────

const CRON_EXPRESSION = '0 4 * * *';   // 04:00 UTC daily
const AGENT           = 'testing-cron';

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

// ── Agent validator ───────────────────────────────────────────

/**
 * Guard against a missing or mis-exported testing agent.
 * Throws clearly at startup rather than silently at runtime.
 *
 * @throws {Error} if runTestingAgent is not a function
 */
function assertAgentLoaded() {
  if (typeof runTestingAgent !== 'function') {
    throw new Error(
      `[${AGENT}] runTestingAgent is not a function — ` +
      'check the export in agents/testing-agent.core.js'
    );
  }
}

// ── Core execution ────────────────────────────────────────────

/**
 * Run one cycle of the testing agent.
 *
 * Idempotency guard: if a previous run is still in progress
 * this cycle is skipped — no overlapping runs.
 *
 * The testing agent's return value is treated as advisory — if it
 * returns a structured summary we log it; if it returns nothing we
 * still consider the run complete (agent may log internally).
 *
 * @returns {Promise<void>}
 */
async function executeTestingRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning       = true;
  const startedAt = Date.now();

  log('info', 'Run starting');

  try {
    const result = await runTestingAgent();

    const durationMs = Date.now() - startedAt;

    // Log structured summary if agent returns one; tolerate void return.
    if (result && typeof result === 'object') {
      const {
        tests_run       = 0,
        tests_passed    = 0,
        tests_failed    = 0,
        tools_tested    = 0,
        skipped         = 0,
        errors          = [],
      } = result;

      const pass_rate =
        tests_run > 0
          ? `${Math.round((tests_passed / tests_run) * 100)}%`
          : 'N/A';

      log('info', 'Run complete', {
        tests_run,
        tests_passed,
        tests_failed,
        tools_tested,
        skipped,
        error_count: Array.isArray(errors) ? errors.length : 0,
        pass_rate,
        duration_ms: durationMs,
      });

      // Surface individual test failures at warn level for observability
      if (Array.isArray(errors) && errors.length > 0) {
        for (const err of errors) {
          log('warn', 'Test failure recorded', {
            tool_id:  err?.tool_id  || null,
            test:     err?.test     || 'unknown',
            reason:   err?.reason   || err?.message || String(err),
          });
        }
      }
    } else {
      // Agent returned void / null — run still considered successful
      log('info', 'Run complete — agent returned no summary', {
        duration_ms: durationMs,
      });
    }
  } catch (err) {
    // Must NEVER re-throw — an uncaught cron callback can crash
    // the Node process in environments running Node 15+.
    log('error', 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      stack:       err?.stack   || null,
      duration_ms: Date.now() - startedAt,
    });
  } finally {
    isRunning = false;
  }
}

// ── Scheduler registration ────────────────────────────────────

/**
 * Register the testing-agent cron schedule.
 * Call ONCE from index.js at server startup.
 *
 * @returns {import('node-cron').ScheduledTask}
 */
function startTestingCron() {
  assertAgentLoaded();

  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }

  activeTask = cron.schedule(CRON_EXPRESSION, executeTestingRun, {
    scheduled: true,
    timezone:  'UTC',
  });

  log('info', 'Registered — runs daily at 04:00 UTC (09:30 IST)', {
    expression: CRON_EXPRESSION,
  });

  return activeTask;
}

/**
 * Stop the active cron task — useful for graceful shutdown and tests.
 * Safe to call even if startTestingCron() was never called.
 */
function stopTestingCron() {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
    log('info', 'Cron task stopped');
  }
}

// ── Exports ───────────────────────────────────────────────────
//
// No top-level side effects.
// startTestingCron() is called exclusively by index.js.
// executeTestingRun() is exported so integration tests can
// trigger a run directly without waiting for the schedule.

module.exports = { startTestingCron, stopTestingCron, executeTestingRun };
