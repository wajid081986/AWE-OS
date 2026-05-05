'use strict';

function isValidTool(tool) {
  const debugAttempts = Number(tool && tool.debug_attempts !== undefined && tool.debug_attempts !== null ? tool.debug_attempts : 0);

  return !!(
    tool &&
    tool.id &&
    String(tool.id).trim() !== '' &&
    Number.isFinite(debugAttempts) &&
    debugAttempts >= 0
  );
}

function isRepeatedFailure(debugMeta, errorType) {
  const history = Array.isArray(debugMeta && debugMeta.history) ? debugMeta.history : [];
  let repeatedCount = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i] || history[i].error_type !== errorType) break;
    repeatedCount++;
  }

  return repeatedCount >= 2;
}

function appendDebugMeta(debugMeta, entry) {
  const base = debugMeta && typeof debugMeta === 'object' && !Array.isArray(debugMeta) ? debugMeta : {};
  const history = Array.isArray(base.history) ? base.history : [];

  return {
    ...base,
    ...entry,
    history: [...history, entry].slice(-10),
  };
}

module.exports = { isValidTool, isRepeatedFailure, appendDebugMeta };
