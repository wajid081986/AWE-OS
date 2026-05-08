'use strict';

const { randomUUID }     = require('crypto');
const supabase           = require('../db/supabase');
const { logToAgentLogs } = require('../db/agent-logger');
const { classifyError } = require('../services/error-classifier');
const { getDebugStrategy, strategyToStatus } = require('../services/debug-strategy-engine');
const { getRetryDecision, MAX_DEBUG_ATTEMPTS } = require('../services/retry-controller');
const { isValidTool, isRepeatedFailure, appendDebugMeta } = require('../services/debug-guard');
const { getLearningDecision, recordLearningOutcome } = require('./learning-engine');

const AGENT = 'auto-debug-agent';

function log(level, payload) {
  const entry = {
    timestamp: new Date().toISOString(),
    trace_id: payload.trace_id || null,
    debug_run_id: payload.debug_run_id || null,
    level,
    agent: AGENT,
    tool_id: payload.tool_id || null,
    operation: payload.operation || 'unknown',
    error_type: payload.error_type || null,
    strategy: payload.strategy || null,
    message: payload.message,
    metadata: payload.metadata || {},
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
    return;
  }

  console.log(output);
}

function getScore(testData) {
  const score = testData && typeof testData.score === 'number' ? testData.score : testData && testData.test_score;
  return typeof score === 'number' && !Number.isNaN(score) ? score : null;
}

async function recoverStuckDebugging(debugRunId) {
  const traceId = randomUUID();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tools')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'debugging')
    .lt('updated_at', cutoff)
    .select('id');

  if (error) {
    log('error', {
      trace_id: traceId,
      debug_run_id: debugRunId,
      operation: 'recover_stuck_debugging',
      message: 'Failed to recover stuck debugging tools',
      metadata: { error: error.message },
    });
    return;
  }

  log('info', {
    trace_id: traceId,
    debug_run_id: debugRunId,
    operation: 'recover_stuck_debugging',
    message: 'Recovered stuck debugging tools',
    metadata: { count: Array.isArray(data) ? data.length : 0 },
  });
}

const DEBUG_BATCH_SIZE = 20;

async function fetchAndLockTools(debugRunId) {
  const traceId = randomUUID();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('tools')
    .update({
      status: 'debugging',
      updated_at: now,
    })
    .in('status', ['failed', 'needs_fix'])
    .lt('debug_attempts', MAX_DEBUG_ATTEMPTS)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)  // skip tools still in backoff
    .limit(DEBUG_BATCH_SIZE)
    .select('*');

  if (error) {
    log('error', {
      trace_id: traceId,
      debug_run_id: debugRunId,
      operation: 'fetch_and_lock_tools',
      message: 'Failed to lock tools for debugging',
      metadata: { error: error.message },
    });
    return [];
  }

  log('info', {
    trace_id: traceId,
    debug_run_id: debugRunId,
    operation: 'fetch_and_lock_tools',
    message: 'Locked tools for debugging',
    metadata: { count: Array.isArray(data) ? data.length : 0 },
  });

  return Array.isArray(data) ? data : [];
}

async function fetchLatestTest(toolId, traceId, debugRunId) {
  const { data, error } = await supabase
    .from('tool_tests')
    .select('*')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log('error', {
      trace_id: traceId,
      debug_run_id: debugRunId,
      tool_id: toolId,
      operation: 'fetch_latest_test',
      message: 'Failed to fetch latest test',
      metadata: { error: error.message },
    });
    return null;
  }

  if (!data) {
    log('info', {
      trace_id: traceId,
      debug_run_id: debugRunId,
      tool_id: toolId,
      operation: 'fetch_latest_test',
      message: 'no_test_data',
    });
    return null;
  }

  return data;
}

async function updateDebugDecision({ tool, traceId, debugRunId, errorType, strategy, finalStatus, retry, decisionReason }) {
  const entry = {
    strategy,
    error_type: errorType,
    decision_reason: decisionReason || null,
    attempt: retry.nextAttempt,
    trace_id: traceId,
    debug_run_id: debugRunId,
    timestamp: new Date().toISOString(),
    backoff_ms: retry.delayMs,
    final_status: finalStatus,
  };

  const debugMeta = appendDebugMeta(tool.debug_meta, entry);

  const updatePayload = {
    status:         finalStatus,
    debug_attempts: retry.nextAttempt,
    debug_meta:     debugMeta,
    updated_at:     new Date().toISOString(),
  };

  // Persist backoff deadline so future runs skip this tool until it's ready
  if (finalStatus === 'building' && retry.nextRetryAt) {
    updatePayload.next_retry_at = retry.nextRetryAt;
  }

  const { error } = await supabase
    .from('tools')
    .update(updatePayload)
    .eq('id', tool.id)
    .eq('status', 'debugging');

  if (error) {
    log('error', {
      trace_id: traceId,
      debug_run_id: debugRunId,
      tool_id: tool.id,
      operation: 'update_debug_decision',
      error_type: errorType,
      strategy,
      message: 'Failed to persist debug decision',
      metadata: { error: error.message },
    });
    return false;
  }

  log('info', {
    trace_id: traceId,
    debug_run_id: debugRunId,
    tool_id: tool.id,
    operation: 'update_debug_decision',
    error_type: errorType,
    strategy,
    message: 'Persisted debug decision',
    metadata: {
      status: finalStatus,
      attempts: retry.nextAttempt,
      backoff_ms: retry.delayMs,
    },
  });

  return true;
}

function logEscalation({ tool, traceId, debugRunId, errorType, strategy, attempts, message }) {
  log('error', {
    trace_id: traceId,
    debug_run_id: debugRunId,
    tool_id: tool.id,
    operation: 'escalate_failure',
    error_type: errorType,
    strategy,
    message: 'Permanent failure',
    metadata: {
      severity: 'CRITICAL',
      attempts,
      reason: message,
    },
  });
}

async function processTool(tool, debugRunId) {
  const traceId = randomUUID();

  try {
    if (!isValidTool(tool)) {
      log('error', {
        trace_id: traceId,
        debug_run_id: debugRunId,
        tool_id: tool && tool.id ? tool.id : null,
        operation: 'validate_tool',
        message: 'Invalid tool data; skipping safely',
      });
      return { processed: false };
    }

    const testData = await fetchLatestTest(tool.id, traceId, debugRunId);
    if (!testData) {
      return { processed: false };
    }

    const score = getScore(testData);
    if (score === null) {
      log('error', {
        trace_id: traceId,
        debug_run_id: debugRunId,
        tool_id: tool.id,
        operation: 'validate_test_data',
        message: 'Invalid test score; skipping safely',
      });
      return { processed: false };
    }

    const errorType = classifyError(testData);
    const repeated = isRepeatedFailure(tool.debug_meta, errorType);
    const retry = getRetryDecision(tool.debug_attempts || 0);
    const learningDecision = await getLearningDecision(tool, {
      errorType,
      score,
      traceId,
      runId: debugRunId,
    });
    const learnedStrategy = learningDecision.strategy && learningDecision.strategy !== 'default'
      ? learningDecision.strategy
      : null;
    const strategy = repeated || learningDecision.should_skip
      ? 'skip_and_log'
      : (learnedStrategy || getDebugStrategy(score, errorType));
    const finalStatus = repeated || retry.exceeded || learningDecision.should_skip
      ? 'failed_permanent'
      : strategyToStatus(strategy);

    // Backoff is stored in the DB as next_retry_at (set inside updateDebugDecision).
    // The agent skips tools whose next_retry_at is in the future on the next run,
    // eliminating in-process blocking sleep that could stall the entire batch.
    if (finalStatus === 'building' && retry.delayMs > 0) {
      log('info', {
        trace_id: traceId,
        debug_run_id: debugRunId,
        tool_id: tool.id,
        operation: 'retry_backoff_scheduled',
        error_type: errorType,
        strategy,
        message: 'Backoff scheduled via next_retry_at — no in-process sleep',
        metadata: { backoff_ms: retry.delayMs, next_retry_at: retry.nextRetryAt },
      });
    }

    await updateDebugDecision({
      tool,
      traceId,
      debugRunId,
      errorType,
      strategy,
      finalStatus,
      retry,
      decisionReason: learningDecision.decision_reason,
    });

    await recordLearningOutcome({
      tool,
      toolId: tool.id,
      success: finalStatus !== 'failed_permanent',
      score,
      errorType,
      strategy,
      traceId,
      runId: debugRunId,
    });

    if (finalStatus === 'failed_permanent') {
      logEscalation({
        tool,
        traceId,
        debugRunId,
        errorType,
        strategy,
        attempts: retry.nextAttempt,
        message: repeated ? 'Repeated error detected' : 'Retry limit reached',
      });
    }

    return { processed: true, status: finalStatus };
  } catch (err) {
    log('error', {
      trace_id: traceId,
      debug_run_id: debugRunId,
      tool_id: tool && tool.id ? tool.id : null,
      operation: 'process_tool',
      message: 'Tool debug failed safely',
      metadata: { error: err && err.message ? err.message : String(err) },
    });
    return { processed: false };
  }
}

async function runAutoDebugAgent() {
  const debugRunId = randomUUID();

  try {
    await logToAgentLogs('auto-debug', 'info', 'Starting auto debug run', { debugRunId });
    log('info', {
      trace_id: randomUUID(),
      debug_run_id: debugRunId,
      operation: 'run_auto_debug_agent',
      message: 'Starting auto debug run',
    });

    await recoverStuckDebugging(debugRunId);

    const tools = await fetchAndLockTools(debugRunId);
    const results = [];

    for (const tool of tools) {
      try {
        results.push(await processTool(tool, debugRunId));
      } catch (err) {
        log('error', {
          trace_id: randomUUID(),
          debug_run_id: debugRunId,
          tool_id: tool && tool.id ? tool.id : null,
          operation: 'run_auto_debug_agent',
          message: 'Loop failure; continuing',
          metadata: { error: err && err.message ? err.message : String(err) },
        });
      }
    }

    await logToAgentLogs('auto-debug', 'info', 'Completed auto debug run', { debugRunId, processed: results.length });
    log('info', {
      trace_id: randomUUID(),
      debug_run_id: debugRunId,
      operation: 'run_auto_debug_agent',
      message: 'Completed auto debug run',
      metadata: { processed: results.length },
    });

    return results;
  } catch (err) {
    await logToAgentLogs('auto-debug', 'error', 'Auto debug run failed safely', { debugRunId, error: err?.message });
    log('error', {
      trace_id: randomUUID(),
      debug_run_id: debugRunId,
      operation: 'run_auto_debug_agent',
      message: 'Auto debug run failed safely',
      metadata: { error: err && err.message ? err.message : String(err) },
    });
    return [];
  }
}

module.exports = { runAutoDebugAgent, processTool };
