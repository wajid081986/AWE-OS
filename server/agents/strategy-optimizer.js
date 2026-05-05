'use strict';

const { randomUUID } = require('crypto');
const supabase = require('../db/supabase');
const { buildPatternSignature, normalizeScore } = require('./pattern-detector');
const { logLearningDecision } = require('./performance-tracker');

const MIN_SAMPLE_SIZE = 5;
const DEGRADE_THRESHOLD = 0.3;
const DEFAULT_STRATEGY = Object.freeze({
  strategy: 'default',
  confidence: 0,
});

function safeCount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function getHistory(bestStrategy) {
  return bestStrategy && Array.isArray(bestStrategy.history) ? bestStrategy.history.slice(-10) : [];
}

function getRecentSuccessRate(history) {
  if (!history.length) return 0;
  const successes = history.filter((entry) => entry && entry.success === true).length;
  return successes / history.length;
}

function getLearningScore(tool) {
  const successCount = safeCount(tool && tool.success_count);
  const failureCount = safeCount(tool && tool.failure_count);
  const total = successCount + failureCount;
  const overallSuccessRate = total > 0 ? successCount / total : 0;
  const recentSuccessRate = getRecentSuccessRate(getHistory(tool && tool.best_strategy));
  const learningScore = (recentSuccessRate * 0.7) + (overallSuccessRate * 0.3);

  return Math.max(0, Math.min(normalizeScore(learningScore), 1));
}

function getSampleSize(tool) {
  return safeCount(tool && tool.success_count) + safeCount(tool && tool.failure_count);
}

async function degradeStrategy(toolId, patternSignature, learningScore, context = {}) {
  try {
    let updateQuery = supabase
      .from('tools')
      .update({
        best_strategy: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', toolId);

    if (context.previousUpdatedAt) {
      updateQuery = updateQuery.eq('updated_at', context.previousUpdatedAt);
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select('id');

    if (updateError) {
      logLearningDecision({
        trace_id: context.traceId,
        run_id: context.runId,
        tool_id: toolId,
        pattern_signature: patternSignature,
        strategy_selected: DEFAULT_STRATEGY.strategy,
        learning_score: learningScore,
        decision_reason: 'default_strategy_fallback',
        message: `Strategy degradation failed safely: ${updateError.message}`,
      });
      return;
    }

    if (context.previousUpdatedAt && (!Array.isArray(updatedRows) || updatedRows.length === 0)) {
      logLearningDecision({
        trace_id: context.traceId,
        run_id: context.runId,
        tool_id: toolId,
        pattern_signature: patternSignature,
        strategy_selected: DEFAULT_STRATEGY.strategy,
        learning_score: learningScore,
        decision_reason: 'default_strategy_fallback',
        message: 'stale_update_skipped',
      });
    }
  } catch (err) {
    logLearningDecision({
      trace_id: context.traceId,
      run_id: context.runId,
      tool_id: toolId,
      pattern_signature: patternSignature,
      strategy_selected: DEFAULT_STRATEGY.strategy,
      learning_score: learningScore,
      decision_reason: 'default_strategy_fallback',
      message: `Strategy degradation failed safely: ${err && err.message ? err.message : String(err)}`,
    });
  }
}

async function selectStrategy(tool, context = {}) {
  const traceId = context.traceId || randomUUID();
  const safeTool = tool && typeof tool === 'object' ? tool : {};
  const patternSignature = buildPatternSignature({
    tool: safeTool,
    errorType: context.errorType,
    score: context.score,
  });
  const learningScore = getLearningScore(safeTool);
  const sampleSize = getSampleSize(safeTool);

  if (!safeTool.id || sampleSize < MIN_SAMPLE_SIZE) {
    logLearningDecision({
      trace_id: traceId,
      run_id: context.runId,
      tool_id: safeTool.id || null,
      pattern_signature: patternSignature,
      strategy_selected: DEFAULT_STRATEGY.strategy,
      learning_score: learningScore,
      decision_reason: sampleSize < MIN_SAMPLE_SIZE ? 'insufficient_data' : 'default_strategy_fallback',
      message: 'Using default strategy fallback',
    });

    return {
      ...DEFAULT_STRATEGY,
      learning_score: learningScore,
      pattern_signature: patternSignature,
      decision_reason: sampleSize < MIN_SAMPLE_SIZE ? 'insufficient_data' : 'default_strategy_fallback',
    };
  }

  if (learningScore < DEGRADE_THRESHOLD) {
    await degradeStrategy(safeTool.id, patternSignature, learningScore, {
      traceId,
      runId: context.runId,
      previousUpdatedAt: safeTool.updated_at,
    });

    logLearningDecision({
      trace_id: traceId,
      run_id: context.runId,
      tool_id: safeTool.id,
      pattern_signature: patternSignature,
      strategy_selected: DEFAULT_STRATEGY.strategy,
      learning_score: learningScore,
      decision_reason: 'strategy_degraded',
      message: 'Strategy degraded due to low learning score',
    });

    return {
      ...DEFAULT_STRATEGY,
      learning_score: learningScore,
      pattern_signature: patternSignature,
      decision_reason: 'strategy_degraded',
    };
  }

  const selected = safeTool.best_strategy && safeTool.best_strategy.strategy
    ? safeTool.best_strategy.strategy
    : DEFAULT_STRATEGY.strategy;

  logLearningDecision({
    trace_id: traceId,
    run_id: context.runId,
    tool_id: safeTool.id,
    pattern_signature: patternSignature,
    strategy_selected: selected,
    learning_score: learningScore,
    decision_reason: selected === DEFAULT_STRATEGY.strategy ? 'default_strategy_fallback' : 'pattern_based_strategy',
    message: 'Strategy selected safely',
  });

  return {
    strategy: selected,
    confidence: learningScore,
    learning_score: learningScore,
    pattern_signature: patternSignature,
    decision_reason: selected === DEFAULT_STRATEGY.strategy ? 'default_strategy_fallback' : 'pattern_based_strategy',
  };
}

module.exports = {
  DEFAULT_STRATEGY,
  DEGRADE_THRESHOLD,
  MIN_SAMPLE_SIZE,
  getLearningScore,
  getSampleSize,
  selectStrategy,
};
