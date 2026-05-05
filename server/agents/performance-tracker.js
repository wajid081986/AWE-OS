'use strict';

const { randomUUID } = require('crypto');
const supabase = require('../db/supabase');
const { buildPatternSignature, normalizeScore } = require('./pattern-detector');

const AGENT = 'learning-engine';
const LEARNING_COOLDOWN_MS = 5000;

function logLearningDecision(payload) {
  const rawLearningScore = Number(payload.learning_score);
  const learningScore = Number.isFinite(rawLearningScore) ? Math.max(0, Math.min(rawLearningScore, 1)) : 0;

  console.log(JSON.stringify({
    agent: AGENT,
    trace_id: payload.trace_id || randomUUID(),
    run_id: payload.run_id || null,
    tool_id: payload.tool_id || null,
    pattern_signature: payload.pattern_signature || null,
    strategy_selected: payload.strategy_selected || null,
    learning_score: learningScore,
    decision_reason: payload.decision_reason || 'default_strategy_fallback',
    message: payload.message || 'learning_decision',
    timestamp: new Date().toISOString(),
  }));
}

function appendHistory(bestStrategy, entry) {
  const base = bestStrategy && typeof bestStrategy === 'object' && !Array.isArray(bestStrategy) ? bestStrategy : {};
  const history = Array.isArray(base.history) ? base.history : [];

  return {
    ...base,
    history: [...history, entry].slice(-10),
    last_pattern_signature: entry.pattern_signature,
    last_outcome: entry.success ? 'success' : 'failure',
    updated_at: entry.timestamp,
  };
}

function isInCooldown(lastUsedAt) {
  if (!lastUsedAt) return false;

  const lastUsedTime = new Date(lastUsedAt).getTime();
  return Number.isFinite(lastUsedTime) && lastUsedTime > 0 && Date.now() - lastUsedTime < LEARNING_COOLDOWN_MS;
}

async function trackPerformance({ tool, toolId, success, score, errorType, strategy, traceId, runId }) {
  const safeToolId = toolId || (tool && tool.id);

  if (!safeToolId) {
    return { tracked: false };
  }

  const normalizedScore = normalizeScore(score);
  const patternSignature = buildPatternSignature({ tool, errorType, score: normalizedScore });
  const succeeded = success === true;
  const entry = {
    success: succeeded,
    score: normalizedScore,
    error_type: errorType || null,
    strategy: strategy || null,
    pattern_signature: patternSignature,
    timestamp: new Date().toISOString(),
  };

  try {
    if (isInCooldown(tool && tool.last_used_at)) {
      logLearningDecision({
        trace_id: traceId,
        run_id: runId,
        tool_id: safeToolId,
        pattern_signature: patternSignature,
        strategy_selected: strategy || null,
        learning_score: normalizedScore,
        decision_reason: 'default_strategy_fallback',
        message: 'learning_cooldown_skipped',
      });
      return { tracked: false, skipped: 'cooldown', pattern_signature: patternSignature };
    }

    const nextBestStrategy = appendHistory(tool && tool.best_strategy, entry);
    const previousUpdatedAt = tool && tool.updated_at;
    let metadataUpdated = true;

    let updateQuery = supabase
      .from('tools')
      .update({
        best_strategy: nextBestStrategy,
        last_used_at: entry.timestamp,
        updated_at: entry.timestamp,
      })
      .eq('id', safeToolId);

    if (previousUpdatedAt) {
      updateQuery = updateQuery.eq('updated_at', previousUpdatedAt);
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select('id');

    if (updateError) {
      logLearningDecision({
        trace_id: traceId,
        run_id: runId,
        tool_id: safeToolId,
        pattern_signature: patternSignature,
        strategy_selected: strategy || null,
        learning_score: normalizedScore,
        decision_reason: 'default_strategy_fallback',
        message: `Learning metadata update failed safely: ${updateError.message}`,
      });
      metadataUpdated = false;
    }

    if (!updateError && previousUpdatedAt && (!updatedRows || updatedRows.length === 0)) {
      logLearningDecision({
        trace_id: traceId,
        run_id: runId,
        tool_id: safeToolId,
        pattern_signature: patternSignature,
        strategy_selected: strategy || null,
        learning_score: normalizedScore,
        decision_reason: 'default_strategy_fallback',
        message: 'stale_update_skipped',
      });
      metadataUpdated = false;
    }

    const rpcName = succeeded ? 'increment_tool_success' : 'increment_tool_failure';
    const { error: rpcError } = await supabase.rpc(rpcName, {
      p_tool_id: safeToolId,
      p_score: normalizedScore,
      p_last_used_at: entry.timestamp,
    });

    if (rpcError) {
      logLearningDecision({
        trace_id: traceId,
        run_id: runId,
        tool_id: safeToolId,
        pattern_signature: patternSignature,
        strategy_selected: strategy || null,
        learning_score: normalizedScore,
        decision_reason: 'default_strategy_fallback',
        message: `Atomic counter update failed safely: ${rpcError.message}`,
      });
      return { tracked: false, pattern_signature: patternSignature };
    }

    logLearningDecision({
      trace_id: traceId,
      run_id: runId,
      tool_id: safeToolId,
      pattern_signature: patternSignature,
      strategy_selected: strategy || null,
      learning_score: normalizedScore,
      decision_reason: succeeded ? 'pattern_based_strategy' : 'default_strategy_fallback',
      message: 'Performance tracked safely',
    });

    return {
      tracked: true,
      metadata_updated: metadataUpdated,
      pattern_signature: patternSignature,
    };
  } catch (err) {
    logLearningDecision({
      trace_id: traceId,
      run_id: runId,
      tool_id: safeToolId,
      pattern_signature: patternSignature,
      strategy_selected: strategy || null,
      learning_score: normalizedScore,
      decision_reason: 'default_strategy_fallback',
      message: `Learning tracker failed safely: ${err && err.message ? err.message : String(err)}`,
    });
    return { tracked: false, pattern_signature: patternSignature };
  }
}

module.exports = {
  trackPerformance,
  logLearningDecision,
};
