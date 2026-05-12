'use strict';

/**
 * AWE-OS — Execution State Machine                           Phase 4C
 *
 * Defines all legal execution lifecycle states and the valid transitions
 * between them. Acts as a validation layer — illegal transitions are
 * blocked (returns error) but never throw, preserving backward compat.
 *
 * States (superset of EXECUTION_STATUS in ExecutionStore):
 *   PENDING           — created, not yet queued
 *   QUEUED            — in queue, awaiting slot
 *   RUNNING           — actively executing
 *   WAITING_APPROVAL  — paused at approval gate (maps to 'paused' in DB)
 *   RETRYING          — step failed, backoff delay before next attempt
 *   COMPLETED         — all steps succeeded (terminal)
 *   FAILED            — step or pipeline failed (terminal)
 *   CANCELLED         — cancelled by user or system (terminal)
 *   TIMED_OUT         — overall pipeline timeout exceeded (terminal)
 *   STALLED           — no heartbeat, watchdog flagged as unresponsive
 */

const STATES = Object.freeze({
  PENDING:          'pending',
  QUEUED:           'queued',
  RUNNING:          'running',
  WAITING_APPROVAL: 'paused',    // DB canonical value is 'paused'
  RETRYING:         'retrying',
  COMPLETED:        'completed',
  FAILED:           'failed',
  CANCELLED:        'cancelled',
  TIMED_OUT:        'timed_out',
  STALLED:          'stalled',
});

const TERMINAL_STATES = new Set([
  STATES.COMPLETED,
  STATES.FAILED,
  STATES.CANCELLED,
  STATES.TIMED_OUT,
]);

// adjacency map — from → Set of legal target states
const TRANSITIONS = new Map([
  [STATES.PENDING,          new Set([STATES.QUEUED,   STATES.CANCELLED])],
  [STATES.QUEUED,           new Set([STATES.RUNNING,  STATES.CANCELLED])],
  [STATES.RUNNING,          new Set([STATES.COMPLETED, STATES.FAILED, STATES.CANCELLED,
                                     STATES.TIMED_OUT, STATES.WAITING_APPROVAL,
                                     STATES.STALLED])],
  [STATES.WAITING_APPROVAL, new Set([STATES.RUNNING,  STATES.CANCELLED, STATES.FAILED, STATES.STALLED])],
  [STATES.RETRYING,         new Set([STATES.RUNNING,  STATES.FAILED, STATES.CANCELLED])],
  [STATES.STALLED,          new Set([STATES.FAILED,   STATES.CANCELLED, STATES.RUNNING])],
  // Terminal states have no outgoing transitions
  [STATES.COMPLETED,        new Set()],
  [STATES.FAILED,           new Set()],
  [STATES.CANCELLED,        new Set()],
  [STATES.TIMED_OUT,        new Set()],
]);

// Step-level states (mirrors STEP_STATUS in ExecutionStore + additions)
const STEP_STATES = Object.freeze({
  PENDING:          'pending',
  RUNNING:          'running',
  COMPLETED:        'completed',
  FAILED:           'failed',
  SKIPPED:          'skipped',
  WAITING_APPROVAL: 'waiting_approval',
  APPROVED:         'approved',
  CANCELLED:        'cancelled',
  TIMED_OUT:        'timed_out',
  STALLED:          'stalled',
});

const STEP_TRANSITIONS = new Map([
  [STEP_STATES.PENDING,          new Set([STEP_STATES.RUNNING, STEP_STATES.SKIPPED, STEP_STATES.CANCELLED])],
  [STEP_STATES.RUNNING,          new Set([STEP_STATES.COMPLETED, STEP_STATES.FAILED, STEP_STATES.CANCELLED,
                                          STEP_STATES.TIMED_OUT, STEP_STATES.WAITING_APPROVAL, STEP_STATES.STALLED])],
  [STEP_STATES.WAITING_APPROVAL, new Set([STEP_STATES.APPROVED, STEP_STATES.CANCELLED])],
  [STEP_STATES.APPROVED,         new Set([STEP_STATES.COMPLETED])],
  [STEP_STATES.STALLED,          new Set([STEP_STATES.FAILED, STEP_STATES.CANCELLED])],
  [STEP_STATES.COMPLETED,        new Set()],
  [STEP_STATES.FAILED,           new Set()],
  [STEP_STATES.CANCELLED,        new Set()],
  [STEP_STATES.TIMED_OUT,        new Set()],
  [STEP_STATES.SKIPPED,          new Set()],
]);

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Validate an execution-level state transition.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTransition(from, to) {
  if (!from) return { valid: true }; // first write, no prior state
  const allowed = TRANSITIONS.get(from);
  if (!allowed) {
    return { valid: false, error: `Unknown source state: "${from}"` };
  }
  if (!allowed.has(to)) {
    return {
      valid: false,
      error: `Illegal execution state transition: ${from} → ${to}. Allowed: [${[...allowed].join(', ')}]`,
    };
  }
  return { valid: true };
}

/**
 * Validate a step-level state transition.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStepTransition(from, to) {
  if (!from) return { valid: true };
  const allowed = STEP_TRANSITIONS.get(from);
  if (!allowed) {
    return { valid: false, error: `Unknown step source state: "${from}"` };
  }
  if (!allowed.has(to)) {
    return {
      valid: false,
      error: `Illegal step state transition: ${from} → ${to}. Allowed: [${[...allowed].join(', ')}]`,
    };
  }
  return { valid: true };
}

/** @returns {boolean} */
function isTerminal(state) {
  return TERMINAL_STATES.has(state);
}

/** @returns {boolean} */
function canTransitionTo(from, to) {
  return validateTransition(from, to).valid;
}

/**
 * Build a minimal transition audit record.
 * @returns {{ from, to, at, valid, error? }}
 */
function buildTransitionRecord(from, to, metadata = {}) {
  const { valid, error } = validateTransition(from, to);
  return { from, to, at: new Date().toISOString(), valid, ...(error ? { error } : {}), ...metadata };
}

module.exports = {
  STATES,
  TERMINAL_STATES,
  STEP_STATES,
  validateTransition,
  validateStepTransition,
  isTerminal,
  canTransitionTo,
  buildTransitionRecord,
};
