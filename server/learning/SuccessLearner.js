'use strict';

/**
 * AWE-OS — SuccessLearner                                      Phase 5B
 *
 * Extracts reusable intelligence from successful pipeline executions.
 * When a pipeline completes successfully, this module:
 *   1. Extracts key patterns from the output context
 *   2. Stores a success memory in LongTermMemory
 *   3. Records a tool_performance_history row
 *   4. Reinforces any prompt version that was used
 *   5. Updates runtime_patterns (increment success occurrences)
 *   6. Marks the learning_event as processed
 *
 * Called by LearningEventCapture.processEvent() — never directly.
 */

const { memoryManager }    = require('../memory/MemoryManager');
const { createLogger }     = require('../monitoring/logger');

const log = createLogger('success-learner');

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

async function processEvent(event, rawPayload) {
  if (!event || event.outcome !== 'success') return;

  try {
    const { execution_id: execId, pipeline_id: pipelineId, score, duration_ms: durationMs } = event;
    const ctx     = rawPayload?.outputContext ?? rawPayload?.context ?? {};
    const toolId  = ctx?.toolId ?? rawPayload?.toolId ?? null;
    const toolSlug = ctx?.toolSlug ?? rawPayload?.toolSlug ?? null;

    // 1. Record tool performance history
    await _recordPerformance({ toolId, toolSlug, execId, pipelineId, score, durationMs, ctx });

    // 2. Build success tags for memory storage
    const tags = _buildSuccessTags({ pipelineId, toolId, ctx });

    // 3. Store in long-term memory
    await memoryManager.rememberSuccess({
      subject:    `success:${pipelineId}:${new Date().toISOString().slice(0, 10)}`,
      content: {
        pipelineId,
        executionId: execId,
        toolId,
        score,
        durationMs,
        keyOutputs: _extractKeyOutputs(ctx),
        successAt:  event.learned_at,
      },
      tags,
      sourceType:  'pipeline',
      sourceId:    pipelineId,
      confidence:  Math.max(0.1, (score ?? 80) / 100),
    });

    // 4. Update pattern library
    if (event.pattern_signature) {
      await _reinforcePattern(event.pattern_signature, 'success');
    }

    // 5. Reinforce prompt version if a hash is tracked
    const promptHash = ctx?.promptHash ?? rawPayload?.promptHash;
    if (promptHash) {
      await _reinforcePrompt(promptHash, score, execId, pipelineId, toolId);
    }

    // 6. Mark event processed
    if (event.id) {
      await db()
        .from('learning_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id);
    }

  } catch (err) {
    log.warn('SuccessLearner.processEvent failed', { error: err.message });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function _recordPerformance({ toolId, toolSlug, execId, pipelineId, score, durationMs, ctx }) {
  try {
    await db().from('tool_performance_history').insert({
      tool_id:         toolId    ?? 'unknown',
      tool_slug:       toolSlug  ?? null,
      execution_id:    execId    ?? null,
      pipeline_run_id: pipelineId ?? null,
      score:           score     ?? null,
      outcome:         'success',
      duration_ms:     durationMs ?? null,
      retry_count:     ctx?.retryCount ?? 0,
      metadata: {
        category: ctx?.category,
        qualityScore: ctx?.qualityScore,
      },
    });
  } catch (_) {}
}

function _buildSuccessTags({ pipelineId, toolId, ctx }) {
  return [
    'success',
    pipelineId,
    toolId       ? `tool:${toolId}` : null,
    ctx?.category ? `category:${ctx.category}` : null,
  ].filter(Boolean);
}

function _extractKeyOutputs(ctx) {
  if (!ctx || typeof ctx !== 'object') return {};
  const safe = {};
  for (const key of ['qualityScore', 'category', 'toolType', 'deploymentUrl', 'score']) {
    if (ctx[key] !== undefined) safe[key] = ctx[key];
  }
  return safe;
}

async function _reinforcePattern(signature, outcome) {
  try {
    const { data: existing } = await db()
      .from('runtime_patterns')
      .select('id, occurrences, confidence')
      .eq('signature', signature)
      .single();

    if (existing) {
      const newConf = outcome === 'success'
        ? Math.min(1, existing.confidence + 0.02)
        : Math.max(0.1, existing.confidence - 0.05);

      await db()
        .from('runtime_patterns')
        .update({
          occurrences:  existing.occurrences + 1,
          last_seen_at: new Date().toISOString(),
          confidence:   newConf,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await db().from('runtime_patterns').insert({
        pattern_type: outcome,
        signature,
        occurrences:  1,
        confidence:   outcome === 'success' ? 0.65 : 0.45,
        pattern_type: 'success',
      });
    }
  } catch (_) {}
}

async function _reinforcePrompt(promptHash, score, execId, pipelineId, toolId) {
  try {
    const { data: pv } = await db()
      .from('prompt_versions')
      .select('id, score, success_count, failure_count, usage_count')
      .eq('prompt_hash', promptHash)
      .single();

    if (!pv) return;  // Not tracked yet — PromptEvolutionEngine will register on next use

    const normalizedScore = Math.max(0, Math.min(100, score ?? 80)) / 100;
    // Weighted moving average: new_score = old_score * 0.8 + new_contribution * 0.2
    const newScore = Math.round((pv.score * 0.8 + normalizedScore * 0.2) * 1000) / 1000;

    await db()
      .from('prompt_versions')
      .update({
        score:         newScore,
        success_count: pv.success_count + 1,
        usage_count:   pv.usage_count + 1,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', pv.id);

    // Record generation score
    await db().from('generation_scores').insert({
      prompt_version_id: pv.id,
      prompt_hash:       promptHash,
      tool_id:           toolId,
      execution_id:      execId,
      pipeline_id:       pipelineId,
      score:             score ?? 80,
      outcome:           'success',
      quality_indicators: { promptHash, normalizedScore },
    });

  } catch (_) {}
}

module.exports = { processEvent };
