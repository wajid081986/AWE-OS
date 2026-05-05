'use strict';

/**
 * AWE-OS — Idea Generation Cron
 *
 * Schedule  : Every 12 hours (00:00 and 12:00 UTC)
 * Agent     : idea-pipeline.generateAndStoreIdeas()
 * Safety    : Backlog cap check · idempotency guard · structured logging
 *             · never crashes the server process
 *
 * Registration (in index.js):
 *   const { startIdeaCron } = require('./crons/idea-cron');
 *   startIdeaCron();
 */

const cron = require('node-cron');

const { generateAndStoreIdeas } = require('../agents/idea-pipeline');

// ── Config ────────────────────────────────────────────────────

const CRON_EXPRESSION = '0 */12 * * *';   // 00:00 and 12:00 UTC
const AGENT           = 'idea-cron';

const DEFAULT_OPTIONS = Object.freeze({
  category:        'micro_saas',
  count:           5,
  target_audience: 'solopreneurs',
});

// ── State — prevents overlapping runs ─────────────────────────

let isRunning = false;

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
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch (_) {
    // Last-resort fallback — plain string
    console.log(`[${AGENT}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Core execution ────────────────────────────────────────────

/**
 * Run one cycle of idea generation.
 *
 * Idempotency guard: if a previous run is still in progress
 * (e.g. slow AI call), this cycle is skipped — no overlapping runs.
 *
 * @returns {Promise<void>}
 */
async function executeIdeaRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning       = true;
  const startedAt = Date.now();

  log('info', 'Run starting');

  try {
    const result = await generateAndStoreIdeas(DEFAULT_OPTIONS);

    const durationMs = Date.now() - startedAt;

    if (!result || !result.success) {
      log('error', 'Run returned failure', {
        error:      result?.error || 'unknown',
        duration_ms: durationMs,
      });
      return;
    }

    if (result.skipped_reason === 'backlog_cap') {
      log('info', 'Skipped — backlog cap reached', {
        skipped_reason: result.skipped_reason,
        duration_ms:    durationMs,
      });
      return;
    }

    log('info', 'Run complete', {
      generated:   result.generated  ?? 0,
      inserted:    result.inserted   ?? 0,
      skipped:     result.skipped    ?? 0,
      failed:      result.failed     ?? 0,
      duration_ms: durationMs,
    });
  } catch (err) {
    // Must NEVER re-throw — a cron callback that throws can crash
    // the entire Node process in some environments.
    log('error', 'Run threw an unexpected error', {
      error:      err?.message || String(err),
      stack:      err?.stack   || null,
      duration_ms: Date.now() - startedAt,
    });
  } finally {
    isRunning = false;
  }
}

// ── Scheduler registration ────────────────────────────────────

/**
 * Register the idea-generation cron schedule.
 * Call ONCE from index.js at server startup.
 *
 * @returns {import('node-cron').ScheduledTask}
 */
function startIdeaCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    // This would only happen if CRON_EXPRESSION is edited incorrectly.
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }

  const task = cron.schedule(CRON_EXPRESSION, executeIdeaRun, {
    scheduled: true,
    timezone:  'UTC',
  });

  log('info', `Registered — runs every 12 hours (00:00, 12:00 UTC)`, {
    expression: CRON_EXPRESSION,
  });

  return task;
}

// ── Exports ───────────────────────────────────────────────────
//
// No top-level side effects.
// startIdeaCron() is called exclusively by index.js.
// executeIdeaRun() is exported so integration tests can trigger
// a run directly without waiting for the schedule.

module.exports = { startIdeaCron, executeIdeaRun };
