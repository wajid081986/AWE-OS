'use strict';

/**
 * AWE-OS — Retry Policy                                      Phase 4C
 *
 * Pluggable retry policy objects. Each policy exposes:
 *   shouldRetry(error, attemptNumber)  — boolean
 *   getDelay(attemptNumber)            — ms to wait before next attempt
 *
 * Preset policies:
 *   DEFAULT      — 3 retries, exponential backoff, error-classification-aware
 *   CONSERVATIVE — 2 retries, longer delays, non-transient errors rejected
 *   AGGRESSIVE   — 5 retries, shorter delays
 *   NO_RETRY     — always returns shouldRetry=false
 *
 * These policies are standalone — AgentExecutor keeps its own retry loop;
 * these are used by new components (StallDetector, recovery, queue).
 */

const { isNonRetryable } = require('./errorClassifier');

// Add ±10% jitter to prevent thundering herd on simultaneous failures
function withJitter(ms) {
  const jitter = ms * 0.10 * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(ms + jitter));
}

class RetryPolicy {
  /**
   * @param {object} options
   * @param {number}   options.maxRetries        - Max retry attempts (0 = no retries)
   * @param {number[]} options.baseDelaysMs       - Base delay per attempt (ms); last entry repeated
   * @param {boolean}  options.classifyErrors     - If true, skip retry for non-retryable errors
   * @param {boolean}  options.useJitter          - Add ±10% jitter to delays (default true)
   * @param {number}   options.maxDelayMs         - Cap individual delay (default 5 min)
   */
  constructor({
    maxRetries      = 3,
    baseDelaysMs    = [5_000, 15_000, 45_000],
    classifyErrors  = true,
    useJitter       = true,
    maxDelayMs      = 300_000,
  } = {}) {
    this.maxRetries     = maxRetries;
    this.baseDelaysMs   = baseDelaysMs;
    this.classifyErrors = classifyErrors;
    this.useJitter      = useJitter;
    this.maxDelayMs     = maxDelayMs;
  }

  /**
   * Decide whether another attempt should be made.
   *
   * @param {Error|null} error       - The error from the last attempt
   * @param {number}     attempt     - Number of attempts already made (1-based)
   * @returns {boolean}
   */
  shouldRetry(error, attempt) {
    if (attempt > this.maxRetries) return false;
    if (this.classifyErrors && error && isNonRetryable(error)) return false;
    return true;
  }

  /**
   * Get the delay before attempt number `attempt`.
   * Uses exponential backoff with optional jitter.
   *
   * @param {number} attempt - Attempt number (1 = first retry)
   * @returns {number} milliseconds
   */
  getDelay(attempt) {
    const idx = Math.min(attempt - 1, this.baseDelaysMs.length - 1);
    const base = this.baseDelaysMs[idx] ?? this.baseDelaysMs.at(-1) ?? 5_000;
    const raw  = Math.min(base, this.maxDelayMs);
    return this.useJitter ? withJitter(raw) : raw;
  }

  toConfig() {
    return {
      maxRetries:    this.maxRetries,
      baseDelaysMs:  this.baseDelaysMs,
      classifyErrors: this.classifyErrors,
    };
  }
}

// ── Preset policies ────────────────────────────────────────────────────────────

const POLICIES = Object.freeze({
  DEFAULT: new RetryPolicy({
    maxRetries:    3,
    baseDelaysMs:  [5_000, 15_000, 45_000],
    classifyErrors: true,
    useJitter:     true,
  }),

  CONSERVATIVE: new RetryPolicy({
    maxRetries:    2,
    baseDelaysMs:  [15_000, 60_000],
    classifyErrors: true,
    useJitter:     true,
  }),

  AGGRESSIVE: new RetryPolicy({
    maxRetries:    5,
    baseDelaysMs:  [1_000, 3_000, 10_000, 20_000, 30_000],
    classifyErrors: false,
    useJitter:     true,
  }),

  NO_RETRY: new RetryPolicy({
    maxRetries:    0,
    baseDelaysMs:  [],
    classifyErrors: false,
  }),
});

/**
 * Build a custom retry policy from AgentExecutor-style config
 * (maxRetries + retryDelays array). Used for compatibility.
 */
function fromAgentConfig({ maxRetries = 3, retryDelays = [5_000, 15_000, 45_000] } = {}) {
  return new RetryPolicy({ maxRetries, baseDelaysMs: retryDelays, classifyErrors: true, useJitter: false });
}

module.exports = { RetryPolicy, POLICIES, fromAgentConfig };
