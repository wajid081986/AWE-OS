'use strict';

function getDebugStrategy(score, errorType) {
  if (errorType === 'FK_VIOLATION')     return 'skip_and_log';
  if (errorType === 'VALIDATION_ERROR') return 'sanitize_and_retry';
  if (errorType === 'TRANSIENT_ERROR')  return 'retry_with_backoff';
  if (errorType === 'LOGIC_ERROR')      return 'rebuild_full';
  // UNKNOWN error — use score as tiebreaker
  const numScore = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  if (numScore < 30) return 'rebuild_full';
  if (numScore < 60) return 'optimize_fix';
  return 'sanitize_and_retry';
}

function strategyToStatus(strategy) {
  return strategy === 'skip_and_log' ? 'failed_permanent' : 'building';
}

module.exports = { getDebugStrategy, strategyToStatus };
