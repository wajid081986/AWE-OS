'use strict';

const { randomUUID }     = require('crypto');
const supabase           = require('../db/supabase');
const { logToAgentLogs } = require('../db/agent-logger');
const { buildPatternSignature, hasLastThreeMatchingFailures } = require('./pattern-detector');
const { trackPerformance, logLearningDecision } = require('./performance-tracker');
const { DEFAULT_STRATEGY, getLearningScore, selectStrategy } = require('./strategy-optimizer');

const LEARNING_ENABLED = true;

/**
 * Minimum number of historical attempts required before the skip gate
 * is allowed to fire. Prevents new/low-data tools from being skipped
 * simply because their history is empty (learning_score defaults to 0).
 */
const MIN_ATTEMPTS_BEFORE_SKIP = 3;

async function fetchLearningTool(toolId) {
  if (!toolId) return null;

  const { data, error } = await supabase
    .from('tools')
    .select('id, tool_type, tool_category, success_count, failure_count, avg_score, best_strategy, last_used_at, updated_at')
    .eq('id', toolId)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function getLearningDecision(toolOrId, context = {}) {
  const traceId = context.traceId || randomUUID();

  if (!LEARNING_ENABLED) {
    const patternSignature = buildPatternSignature({ tool: null, errorType: context.errorType, score: context.score });
    logLearningDecision({
      trace_id: traceId,
      run_id: context.runId,
      tool_id: typeof toolOrId === 'object' && toolOrId !== null ? toolOrId.id : toolOrId,
      pattern_signature: patternSignature,
      strategy_selected: DEFAULT_STRATEGY.strategy,
      learning_score: 0,
      decision_reason: 'default_strategy_fallback',
      message: 'Learning disabled; using default strategy',
    });
    return {
      ...DEFAULT_STRATEGY,
      pattern_signature: patternSignature,
      learning_score: 0,
      decision_reason: 'default_strategy_fallback',
      should_skip: false,
    };
  }

  const tool = typeof toolOrId === 'object' && toolOrId !== null
    ? toolOrId
    : await fetchLearningTool(toolOrId);

  try {
    if (!tool || !tool.id) {
      const patternSignature = buildPatternSignature({ tool: null, errorType: context.errorType, score: context.score });
      logLearningDecision({
        trace_id: traceId,
        run_id: context.runId,
        tool_id: null,
        pattern_signature: patternSignature,
        strategy_selected: DEFAULT_STRATEGY.strategy,
        learning_score: 0,
        decision_reason: 'default_strategy_fallback',
        message: 'Learning unavailable; using default strategy',
      });
      return {
        ...DEFAULT_STRATEGY,
        pattern_signature: patternSignature,
        learning_score: 0,
        decision_reason: 'default_strategy_fallback',
        should_skip: false,
      };
    }

    const decision = await selectStrategy(tool, { ...context, traceId });

    const history = tool.best_strategy && Array.isArray(tool.best_strategy.history)
      ? tool.best_strategy.history.slice(-10)
      : [];

    // ── FIX: never skip a tool that has insufficient execution history.
    // An empty or short history yields learning_score=0 by default, which
    // would incorrectly satisfy the < 0.3 threshold and cause new tools
    // to be permanently skipped before they are ever properly evaluated.
    const totalAttempts = (tool.success_count || 0) + (tool.failure_count || 0);
    const hasEnoughHistory = totalAttempts >= MIN_ATTEMPTS_BEFORE_SKIP;

    const shouldSkip = hasEnoughHistory &&
      decision.learning_score < 0.3 &&
      hasLastThreeMatchingFailures(history, decision.pattern_signature);

    if (shouldSkip) {
      await logToAgentLogs('learning', 'warn',
        `Skipping tool ${tool.id} — repeated low-confidence pattern`,
        { tool_id: tool.id, totalAttempts, pattern_signature: decision.pattern_signature, learning_score: decision.learning_score });
      logLearningDecision({
        trace_id: traceId,
        run_id: context.runId,
        tool_id: tool.id,
        pattern_signature: decision.pattern_signature,
        strategy_selected: decision.strategy,
        learning_score: decision.learning_score,
        decision_reason: 'low_confidence_skip',
        message: `Execution skipped — repeated low-confidence pattern (attempts: ${totalAttempts})`,
      });
    }

    return {
      ...decision,
      should_skip: shouldSkip,
      decision_reason: shouldSkip ? 'low_confidence_skip' : decision.decision_reason,
    };

  } catch (err) {
    const patternSignature = buildPatternSignature({ tool, errorType: context.errorType, score: context.score });
    logLearningDecision({
      trace_id: traceId,
      run_id: context.runId,
      tool_id: tool && tool.id ? tool.id : null,
      pattern_signature: patternSignature,
      strategy_selected: DEFAULT_STRATEGY.strategy,
      learning_score: 0,
      decision_reason: 'default_strategy_fallback',
      message: `Learning failed safely: ${err && err.message ? err.message : String(err)}`,
    });
    return {
      ...DEFAULT_STRATEGY,
      pattern_signature: patternSignature,
      learning_score: 0,
      decision_reason: 'default_strategy_fallback',
      should_skip: false,
    };
  }
}

async function recordLearningOutcome(payload) {
  try {
    if (!LEARNING_ENABLED) {
      return { tracked: false, skipped: 'learning_disabled' };
    }

    return await trackPerformance(payload || {});
  } catch (err) {
    logLearningDecision({
      trace_id: payload && payload.traceId,
      run_id: payload && payload.runId,
      tool_id: payload && (payload.toolId || (payload.tool && payload.tool.id)),
      pattern_signature: null,
      strategy_selected: null,
      learning_score: 0,
      decision_reason: 'default_strategy_fallback',
      message: `Learning outcome failed safely: ${err && err.message ? err.message : String(err)}`,
    });
    return { tracked: false };
  }
}

module.exports = {
  LEARNING_ENABLED,
  fetchLearningTool,
  getLearningDecision,
  getLearningScore,
  recordLearningOutcome,
};
