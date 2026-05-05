'use strict';

const UNKNOWN = 'unknown';

function cleanPart(value) {
  const normalized = value === undefined || value === null ? UNKNOWN : String(value);
  return normalized.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || UNKNOWN;
}

function normalizeScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 1) return Math.max(0, Math.min(numeric / 100, 1));
  return Math.max(0, Math.min(numeric, 1));
}

function getScoreRange(score) {
  const normalized = normalizeScore(score);
  if (normalized < 0.3) return 'score_low';
  if (normalized < 0.7) return 'score_mid';
  return 'score_high';
}

function getToolCategory(tool) {
  return tool && (tool.tool_category || tool.category || tool.toolCategory);
}

function buildPatternSignature({ tool, errorType, score }) {
  return [
    cleanPart(tool && tool.tool_type),
    cleanPart(errorType),
    getScoreRange(score),
    cleanPart(getToolCategory(tool)),
  ].join(':');
}

function hasLastThreeMatchingFailures(history, patternSignature) {
  if (!patternSignature || !Array.isArray(history)) return false;

  const failures = history
    .filter((entry) => entry && entry.success === false)
    .slice(-3);

  return failures.length === 3 &&
    failures.every((entry) => entry.pattern_signature === patternSignature);
}

module.exports = {
  buildPatternSignature,
  hasLastThreeMatchingFailures,
  normalizeScore,
};
