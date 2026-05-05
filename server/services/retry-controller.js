'use strict';

const MAX_DEBUG_ATTEMPTS = 3;

function getRetryDecision(attempts) {
  const currentAttempts = Number.isFinite(Number(attempts)) && Number(attempts) >= 0 ? Number(attempts) : 0;
  const nextAttempt = currentAttempts + 1;
  const delayMs = Math.min(Math.pow(2, currentAttempts) * 1000, 30_000);

  return {
    nextAttempt,
    delayMs,
    exceeded: nextAttempt >= MAX_DEBUG_ATTEMPTS,
    // Absolute timestamp for the next allowed retry — stored in DB so the
    // agent doesn't sleep in-process; it just skips tools whose time hasn't come.
    nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
  };
}

module.exports = { getRetryDecision, MAX_DEBUG_ATTEMPTS };
