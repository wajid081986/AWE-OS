'use strict';

/**
 * AWE-OS — Structured Logger                                 Phase 4D
 *
 * Produces correlation-ID-aware, execution-ID-aware structured JSON logs.
 * Designed to coexist with existing console.log usage — does not replace it.
 *
 * Usage:
 *   const logger = createLogger('orchestrator')
 *   logger.info('Pipeline started', { executionId, pipelineId })
 *   logger.error('Step failed', { executionId, stepName, error: err.message })
 *
 * Output format (one JSON line per entry):
 *   {"level":"info","layer":"orchestrator","msg":"Pipeline started",
 *    "executionId":"...","ts":"2026-05-12T...","correlationId":"..."}
 */

const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
});

// Respect LOG_LEVEL env var; default INFO in production, DEBUG in dev
const MIN_LEVEL_NAME = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG')).toUpperCase();
const MIN_LEVEL      = LOG_LEVELS[MIN_LEVEL_NAME] ?? LOG_LEVELS.INFO;

class Logger {
  /**
   * @param {string} layer - Module/component name (orchestrator, stall-detector, etc.)
   * @param {object} [baseCtx] - Context fields bound to all log lines from this instance
   */
  constructor(layer, baseCtx = {}) {
    this._layer   = layer;
    this._baseCtx = baseCtx;
  }

  /**
   * Create a child logger with additional bound context.
   * @returns {Logger}
   */
  child(ctx = {}) {
    return new Logger(this._layer, { ...this._baseCtx, ...ctx });
  }

  debug(msg, ctx = {}) { this._write('debug', msg, ctx); }
  info (msg, ctx = {}) { this._write('info',  msg, ctx); }
  warn (msg, ctx = {}) { this._write('warn',  msg, ctx); }
  error(msg, ctx = {}) { this._write('error', msg, ctx); }

  // ── Internals ──────────────────────────────────────────────────────────────

  _write(level, msg, ctx) {
    if (LOG_LEVELS[level.toUpperCase()] < MIN_LEVEL) return;

    const entry = {
      level,
      layer: this._layer,
      msg,
      ...this._baseCtx,
      ...ctx,
      ts: new Date().toISOString(),
    };

    // Sanitise: convert Error objects to message strings
    if (entry.error instanceof Error) {
      entry.error = entry.error.message;
    }

    const line = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else if (level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}

/**
 * Factory — creates a layer-bound logger.
 * @param {string} layer
 * @param {object} [baseCtx]
 * @returns {Logger}
 */
function createLogger(layer, baseCtx = {}) {
  return new Logger(layer, baseCtx);
}

module.exports = { Logger, createLogger, LOG_LEVELS };
