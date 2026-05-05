'use strict';

/**
 * AWE-OS — Autonomous Agent Cron
 *
 * Schedule  : Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
 * Agent     : autonomous-agent.runAutonomousLoop()
 * Safety    : Overlap guard · structured logging · graceful shutdown
 *             · never crashes the server process
 *
 * Registration (in index.js):
 *   const { startAutonomousCron } = require('./crons/autonomous-cron');
 *   startAutonomousCron();
 */

const cron = require('node-cron');

const { runAutonomousLoop }  = require('../agents/autonomous-agent');
const { recordCronRun }      = require('../services/cron-health');

// ── Config ────────────────────────────────────────────────────

const CRON_EXPRESSION = '0 */6 * * *';   // 00:00, 06:00, 12:00, 18:00 UTC
const AGENT           = 'autonomous-cron';

const RUN_OPTIONS = Object.freeze({
  limit:        10,
  triggered_by: 'cron',
});

// ── State — prevents overlapping runs ─────────────────────────

let isRunning  = false;
let activeTask = null;   // reference kept so tests can call task.stop()

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

// ── Core execution ────────────────────────────────────────────

/**
 * Run one cycle of the autonomous agent loop.
 *
 * Idempotency guard: if a previous run is still in progress
 * this cycle is skipped — no overlapping runs.
 *
 * @returns {Promise<void>}
 */
async function executeScheduledRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning       = true;
  const startedAt = Date.now();

  log('info', 'Run starting', { options: RUN_OPTIONS });

  try {
    const summary = await runAutonomousLoop(RUN_OPTIONS);

    const durationMs = Date.now() - startedAt;

    if (!summary) {
      log('error', 'Agent returned no summary', { duration_ms: durationMs });
      return;
    }

    if (summary.skipped) {
      log('warn', 'Run skipped by agent', {
        reason:      summary.reason || 'unknown',
        duration_ms: durationMs,
      });
      await recordCronRun('autonomous-cron', 'skipped');
      return;
    }

    log('info', 'Run complete', {
      tools_processed: summary.tools_processed          ?? 0,
      plans_generated: summary.actions_taken?.plans_generated ?? 0,
      scaled:          summary.actions_taken?.scaled          ?? 0,
      kill_flagged:    summary.actions_taken?.kill_flagged    ?? 0,
      errors:          summary.actions_taken?.errors          ?? 0,
      duration_ms:     summary.duration_ms ?? durationMs,
    });
    await recordCronRun('autonomous-cron', 'success');
  } catch (err) {
    log('error', 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      stack:       err?.stack   || null,
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun('autonomous-cron', 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler registration ────────────────────────────────────

/**
 * Register the autonomous-agent cron schedule.
 * Call ONCE from index.js at server startup.
 *
 * @returns {import('node-cron').ScheduledTask}
 */
function startAutonomousCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }

  activeTask = cron.schedule(CRON_EXPRESSION, executeScheduledRun, {
    scheduled: true,
    timezone:  'UTC',
  });

  log('info', 'Registered — runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)', {
    expression: CRON_EXPRESSION,
  });

  return activeTask;
}

/**
 * Stop the active cron task — useful for graceful shutdown and tests.
 * Safe to call even if startAutonomousCron() was never called.
 */
function stopAutonomousCron() {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
    log('info', 'Cron task stopped');
  }
}

// ── Exports ───────────────────────────────────────────────────
//
// No top-level side effects.
// startAutonomousCron() is called exclusively by index.js.
// executeScheduledRun() is exported so integration tests can
// trigger a run directly without waiting for the schedule.

module.exports = { startAutonomousCron, stopAutonomousCron, executeScheduledRun };
