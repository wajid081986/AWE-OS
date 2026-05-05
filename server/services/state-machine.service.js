'use strict';

/**
 * AWE-OS — Tool Status State Machine
 *
 * Single source of truth for which status transitions are valid.
 * Used at the API layer (middleware) and mirrored by the DB trigger
 * in migration 007 (trg_validate_tool_status).
 */

// ── Transition table ───────────────────────────────────────────────────────────
const TRANSITIONS = Object.freeze({
  idea:             ['building', 'killed'],
  building:         ['testing', 'failed', 'killed'],
  testing:          ['live', 'needs_fix', 'failed', 'killed'],
  live:             ['scaling', 'needs_fix', 'failed', 'killed'],
  scaling:          ['live', 'needs_fix', 'killed'],
  needs_fix:        ['testing', 'debugging', 'failed', 'killed'],
  debugging:        ['testing', 'needs_fix', 'failed_permanent', 'killed'],
  failed:           ['debugging', 'needs_fix', 'killed'],
  failed_permanent: ['killed'],
  killed:           [],  // terminal
});

const ALL_STATUSES = Object.freeze(Object.keys(TRANSITIONS));

// ── Core validation ────────────────────────────────────────────────────────────
function isValidStatus(status) {
  return ALL_STATUSES.includes(status);
}

function isValidTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  if (from === to) return true;  // idempotent update
  return TRANSITIONS[from].includes(to);
}

function getAllowedTransitions(from) {
  if (!isValidStatus(from)) return [];
  return [...TRANSITIONS[from]];
}

// ── Express middleware factory ─────────────────────────────────────────────────
/**
 * Usage in routes:
 *   router.patch('/tools/:id/status', validateStatusTransition('currentStatus'), handler)
 *
 * The middleware expects:
 *   - req.body.status    — the desired new status
 *   - req.tool           — the existing tool object (set by a prior loadTool middleware),
 *                          OR `fromStatusKey` to specify which body/param key holds the current status
 */
function validateStatusTransition(fromStatusKey = 'status') {
  return (req, res, next) => {
    const newStatus = req.body?.status;
    if (!newStatus) return next();  // not a status-change request

    const currentStatus = req.tool?.status ?? req.body?.[fromStatusKey];
    if (!currentStatus) {
      // No current status available — let the DB trigger handle it
      return next();
    }

    if (!isValidStatus(newStatus)) {
      return res.status(400).json({
        success: false,
        error:   `Invalid status value: "${newStatus}". Must be one of: ${ALL_STATUSES.join(', ')}`,
      });
    }

    if (!isValidTransition(currentStatus, newStatus)) {
      return res.status(409).json({
        success:  false,
        error:    `Invalid status transition: "${currentStatus}" → "${newStatus}"`,
        allowed:  getAllowedTransitions(currentStatus),
      });
    }

    next();
  };
}

module.exports = {
  TRANSITIONS,
  ALL_STATUSES,
  isValidStatus,
  isValidTransition,
  getAllowedTransitions,
  validateStatusTransition,
};
