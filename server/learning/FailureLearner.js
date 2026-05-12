'use strict';

/**
 * AWE-OS — FailureLearner                                      Phase 5B
 *
 * Root-cause analysis and repair correlation for failed executions.
 * When a pipeline fails, this module:
 *   1. Classifies the error using existing errorClassifier
 *   2. Builds a pattern signature
 *   3. Searches for similar past failures in LongTermMemory
 *   4. Correlates with repair_history for known fixes
 *   5. Stores the failure in LongTermMemory + updates runtime_patterns
 *   6. Generates a prevention strategy recommendation
 *   7. Records tool performance history row
 *
 * Called by LearningEventCapture.processEvent() — never directly.
 */

const { memoryManager }        = require('../memory/MemoryManager');
const { classify: classifyErr } = require('../runtime/errorClassifier');
const { buildPatternSignature } = require('../agents/pattern-detector');
const { createLogger }          = require('../monitoring/logger');

const log = createLogger('failure-learner');

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

async function processEvent(event, rawPayload) {
  if (!event || event.outcome !== 'failure') return;

  try {
    const errorMsg  = rawPayload?.error?.message ?? rawPayload?.error ?? event.metadata?.errorMsg ?? null;
    const toolId    = rawPayload?.toolId ?? rawPayload?.context?.toolId ?? null;
    const toolSlug  = rawPayload?.toolSlug ?? null;
    const pipelineId = event.pipeline_id;
    const execId    = event.execution_id;

    // 1. Classify error
    const classification = _classifyError(errorMsg, rawPayload);

    // 2. Build pattern signature (compatible with existing pattern-detector.js)
    const patternSig = event.pattern_signature
      ?? buildPatternSignature({
        tool:      rawPayload?.tool ?? { tool_type: rawPayload?.toolType },
        errorType: classification.category,
        score:     event.score ?? 0,
      });

    // 3. Look for similar past failures
    const similarFailures = await memoryManager.getSimilarFailures(patternSig, 3);

    // 4. Correlate with repair history
    const knownFix = await _findKnownFix(patternSig, classification.category);

    // 5. Build prevention strategy
    const prevention = _buildPreventionStrategy(classification, similarFailures, knownFix);

    // 6. Store failure in long-term memory
    await memoryManager.rememberFailure({
      subject:   `failure:${pipelineId}:${patternSig}`,
      content: {
        pipelineId,
        executionId:    execId,
        toolId,
        errorMessage:   errorMsg,
        errorCategory:  classification.category,
        patternSig,
        retryable:      classification.retryable,
        prevention,
        similarCount:   similarFailures.length,
        knownFixExists: !!knownFix,
        failedAt:       event.learned_at,
      },
      tags:        ['failure', classification.category, pipelineId, patternSig?.split(':')[0]].filter(Boolean),
      sourceType:  'pipeline',
      sourceId:    pipelineId,
      confidence:  0.6,
    });

    // 7. Update runtime_patterns
    await _updatePattern(patternSig, 'failure', toolId);

    // 8. Record tool performance history
    await _recordPerformance({ toolId, toolSlug, execId, pipelineId, event, classification });

    // 9. Mark event processed
    if (event.id) {
      await db()
        .from('learning_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id);
    }

    log.debug('Failure learned', {
      pipelineId,
      category:    classification.category,
      patternSig,
      knownFix:    !!knownFix,
      similarCount: similarFailures.length,
    });

  } catch (err) {
    log.warn('FailureLearner.processEvent failed', { error: err.message });
  }
}

/**
 * Record a repair attempt outcome. Called by repair agents.
 */
async function recordRepair({ toolId, executionId, errorPattern, errorCategory, errorMessage, fixType, fixApplied, success, durationMs }) {
  try {
    const confBefore = 0.5;
    const confAfter  = success ? Math.min(1, confBefore + 0.15) : Math.max(0.1, confBefore - 0.1);

    await db().from('repair_history').insert({
      tool_id:           toolId        ?? null,
      execution_id:      executionId   ?? null,
      error_pattern:     errorPattern,
      error_category:    errorCategory ?? null,
      error_message:     errorMessage  ?? null,
      fix_type:          fixType       ?? 'manual',
      fix_applied:       fixApplied    ?? {},
      success,
      confidence_before: confBefore,
      confidence_after:  confAfter,
      duration_ms:       durationMs ?? null,
      resolved_at:       success ? new Date().toISOString() : null,
    });

    // Store in long-term memory
    await memoryManager.rememberRepair({
      subject:   `repair:${errorPattern}:${fixType}`,
      content:   { errorPattern, errorCategory, fixType, fixApplied, success, durationMs },
      tags:      ['repair', fixType, errorCategory, success ? 'fix_success' : 'fix_failed'].filter(Boolean),
      sourceType: 'tool',
      sourceId:   toolId,
      success,
    });

  } catch (err) {
    log.warn('recordRepair failed', { error: err.message });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _classifyError(errorMsg, payload) {
  const errObj = {
    message: errorMsg ?? '',
    code:    payload?.error?.code ?? payload?.errorCode ?? '',
  };
  try {
    return classifyErr(errObj);
  } catch (_) {
    return { category: 'UNKNOWN', retryable: false, severity: 'medium' };
  }
}

async function _findKnownFix(patternSig, errorCategory) {
  try {
    const { data } = await db()
      .from('repair_history')
      .select('fix_type, fix_applied, confidence_after, attempts')
      .eq('error_pattern', patternSig)
      .eq('success', true)
      .order('confidence_after', { ascending: false })
      .limit(1)
      .single();
    return data ?? null;
  } catch (_) {
    // Try broader category match
    try {
      const { data } = await db()
        .from('repair_history')
        .select('fix_type, fix_applied, confidence_after')
        .eq('error_category', errorCategory)
        .eq('success', true)
        .order('confidence_after', { ascending: false })
        .limit(1)
        .single();
      return data ?? null;
    } catch (_) {
      return null;
    }
  }
}

function _buildPreventionStrategy(classification, similarFailures, knownFix) {
  const strategy = {
    errorCategory: classification.category,
    retryable:     classification.retryable,
    severity:      classification.severity,
    recommendation: null,
    knownFix:      null,
    confidence:    0.5,
  };

  if (knownFix) {
    strategy.knownFix       = knownFix.fix_type;
    strategy.recommendation = `Apply known fix: ${knownFix.fix_type}`;
    strategy.confidence     = knownFix.confidence_after ?? 0.7;
    return strategy;
  }

  if (similarFailures.length >= 2) {
    strategy.recommendation = `Pattern seen ${similarFailures.length} times before — consider escalating to manual review`;
    strategy.confidence     = 0.6;
    return strategy;
  }

  if (classification.retryable) {
    strategy.recommendation = 'Retry with exponential backoff';
    strategy.confidence     = 0.55;
  } else {
    strategy.recommendation = 'Non-retryable failure — manual intervention required';
    strategy.confidence     = 0.7;
  }

  return strategy;
}

async function _updatePattern(patternSig, type, toolId) {
  try {
    const { data: existing } = await db()
      .from('runtime_patterns')
      .select('id, occurrences, confidence, affected_tools')
      .eq('signature', patternSig)
      .single();

    if (existing) {
      const tools = existing.affected_tools ?? [];
      if (toolId && !tools.includes(toolId)) tools.push(toolId);

      await db()
        .from('runtime_patterns')
        .update({
          occurrences:    existing.occurrences + 1,
          last_seen_at:   new Date().toISOString(),
          confidence:     Math.max(0.1, existing.confidence - 0.02),
          affected_tools: tools.slice(-20),  // cap at 20
          updated_at:     new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await db().from('runtime_patterns').insert({
        pattern_type:   type,
        signature:      patternSig,
        occurrences:    1,
        confidence:     0.45,
        affected_tools: toolId ? [toolId] : [],
      });
    }
  } catch (_) {}
}

async function _recordPerformance({ toolId, toolSlug, execId, pipelineId, event, classification }) {
  try {
    await db().from('tool_performance_history').insert({
      tool_id:         toolId     ?? 'unknown',
      tool_slug:       toolSlug   ?? null,
      execution_id:    execId     ?? null,
      pipeline_run_id: pipelineId ?? null,
      score:           event.score ?? 0,
      outcome:         'failure',
      duration_ms:     event.duration_ms ?? null,
      error_category:  classification.category,
      retry_count:     0,
      metadata: {
        patternSig: event.pattern_signature,
        severity:   classification.severity,
      },
    });
  } catch (_) {}
}

module.exports = { processEvent, recordRepair };
