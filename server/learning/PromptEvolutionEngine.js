'use strict';

/**
 * AWE-OS — PromptEvolutionEngine                              Phase 5B
 *
 * Scores, versions, and auto-retires prompts used in AI generation.
 * Works in concert with prompt-builder.js (which creates prompt_hash fingerprints).
 *
 * Lifecycle:
 *   1. recordPrompt()    — registers a new prompt_hash on first use
 *   2. recordScore()     — updates running score after each generation
 *   3. evolve()          — creates a mutated child prompt version
 *   4. retireWeak()      — auto-retires prompts below RETIREMENT_SCORE
 *   5. getTop/Bottom()   — dashboard queries
 *
 * Score formula (weighted moving average):
 *   new_score = old_score * DECAY + new_sample * (1 - DECAY)
 *
 * Retirement:
 *   - score < RETIREMENT_SCORE after MIN_USAGES uses → status = 'retired'
 *   - Retired prompts are never deleted; their lineage is preserved
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('prompt-evolution');

const SCORE_DECAY        = 0.80;    // how much old score is preserved
const RETIREMENT_SCORE   = 0.30;    // below this after MIN_USAGES → retire
const PROMOTION_SCORE    = 0.80;    // above this after MIN_USAGES → promote
const MIN_USAGES         = 5;       // minimum uses before retirement/promotion decisions
const MAX_VERSION_DEPTH  = 10;      // max lineage chain length

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

class PromptEvolutionEngine {

  // ── Registration ────────────────────────────────────────────────────────────

  /**
   * Register a prompt hash if not already tracked.
   * Called when a prompt is first used in generation.
   *
   * @param {object} params
   * @param {string} params.promptHash      — SHA-256 from prompt-builder.js
   * @param {string} params.promptName      — human label
   * @param {string} params.content         — full prompt text
   * @param {string} [params.role]
   * @param {string} [params.category]
   * @param {string} [params.strategy]
   * @param {string} [params.outputFormat]
   * @param {string} [params.parentHash]    — parent prompt hash (for lineage)
   * @returns {Promise<string|null>}        — prompt_versions.id
   */
  async recordPrompt(params) {
    const { promptHash, promptName, content, role, category, strategy, outputFormat, parentHash } = params;

    try {
      // Check if already registered
      const { data: existing } = await db()
        .from('prompt_versions')
        .select('id')
        .eq('prompt_hash', promptHash)
        .single();

      if (existing) return existing.id;

      // Find parent ID from parentHash
      let parentId = null;
      if (parentHash) {
        const { data: parent } = await db()
          .from('prompt_versions')
          .select('id, version, prompt_name')
          .eq('prompt_hash', parentHash)
          .single();
        parentId = parent?.id ?? null;
      }

      // Get next version number for this prompt_name
      const { data: latest } = await db()
        .from('prompt_versions')
        .select('version')
        .eq('prompt_name', promptName)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (latest?.version ?? 0) + 1;

      const { data, error } = await db()
        .from('prompt_versions')
        .insert({
          prompt_name:       promptName,
          version:           nextVersion,
          prompt_hash:       promptHash,
          content:           content.slice(0, 10_000),
          role:              role        ?? null,
          category:          category    ?? null,
          strategy:          strategy    ?? null,
          output_format:     outputFormat ?? null,
          score:             0.500,
          usage_count:       0,
          success_count:     0,
          failure_count:     0,
          status:            'active',
          parent_id:         parentId,
          evolved_from_hash: parentHash ?? null,
        })
        .select('id')
        .single();

      if (error) throw error;
      log.debug('Prompt registered', { promptHash: promptHash.slice(0, 12), promptName, version: nextVersion });
      return data?.id;

    } catch (err) {
      log.warn('recordPrompt failed', { promptName, error: err.message });
      return null;
    }
  }

  // ── Scoring ─────────────────────────────────────────────────────────────────

  /**
   * Record a generation outcome and update the prompt's running score.
   *
   * @param {object} params
   * @param {string} params.promptHash
   * @param {number} params.score           — 0–100
   * @param {string} params.outcome         — 'success'|'failure'|'partial'
   * @param {string} [params.executionId]
   * @param {string} [params.pipelineId]
   * @param {string} [params.toolId]
   * @param {object} [params.qualityIndicators]
   * @param {number} [params.generationTimeMs]
   */
  async recordScore(params) {
    const { promptHash, score, outcome, executionId, pipelineId, toolId, qualityIndicators, generationTimeMs } = params;

    try {
      const { data: pv } = await db()
        .from('prompt_versions')
        .select('id, score, usage_count, success_count, failure_count, status')
        .eq('prompt_hash', promptHash)
        .single();

      if (!pv) return;  // Auto-register on next explicit recordPrompt() call

      const normalizedScore  = Math.max(0, Math.min(100, score)) / 100;
      const newScore         = Math.round((pv.score * SCORE_DECAY + normalizedScore * (1 - SCORE_DECAY)) * 1000) / 1000;
      const newSuccessCount  = pv.success_count + (outcome === 'success' ? 1 : 0);
      const newFailureCount  = pv.failure_count + (outcome === 'failure' ? 1 : 0);
      const newUsageCount    = pv.usage_count + 1;

      // Determine status change
      let newStatus = pv.status;
      if (newUsageCount >= MIN_USAGES) {
        if (newScore < RETIREMENT_SCORE && newStatus === 'active') {
          newStatus = 'retired';
          log.info('Prompt auto-retired', { promptHash: promptHash.slice(0, 12), score: newScore });
        } else if (newScore >= PROMOTION_SCORE && newStatus === 'active') {
          newStatus = 'promoted';
          log.info('Prompt promoted', { promptHash: promptHash.slice(0, 12), score: newScore });
        }
      }

      await db()
        .from('prompt_versions')
        .update({
          score:         newScore,
          usage_count:   newUsageCount,
          success_count: newSuccessCount,
          failure_count: newFailureCount,
          status:        newStatus,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', pv.id);

      // Record generation score
      await db().from('generation_scores').insert({
        prompt_version_id:  pv.id,
        prompt_hash:        promptHash,
        tool_id:            toolId       ?? null,
        execution_id:       executionId  ?? null,
        pipeline_id:        pipelineId   ?? null,
        score:              score,
        quality_indicators: qualityIndicators ?? {},
        outcome:            outcome,
        generation_time_ms: generationTimeMs ?? null,
      });

    } catch (err) {
      log.warn('recordScore failed', { promptHash: promptHash?.slice(0, 12), error: err.message });
    }
  }

  // ── Evolution ───────────────────────────────────────────────────────────────

  /**
   * Evolve a prompt: create a child version with mutations applied.
   * The child starts with the parent's score * 0.9 (cautious start).
   *
   * @param {string} parentHash       — hash of the parent prompt
   * @param {object} mutations        — changes to apply
   * @param {string} [mutations.role]
   * @param {string} [mutations.strategy]
   * @param {string} [mutations.outputFormat]
   * @param {string} mutations.content — new prompt content
   * @param {string} mutations.hash   — new prompt hash
   * @returns {Promise<string|null>}  — new prompt_versions.id
   */
  async evolve(parentHash, mutations) {
    try {
      const { data: parent } = await db()
        .from('prompt_versions')
        .select('*')
        .eq('prompt_hash', parentHash)
        .single();

      if (!parent) return null;

      // Check lineage depth — prevent infinite evolution chains
      const depth = await this._getLineageDepth(parent.id);
      if (depth >= MAX_VERSION_DEPTH) {
        log.warn('Max evolution depth reached — aborting evolution', { parentHash: parentHash.slice(0, 12), depth });
        return null;
      }

      return this.recordPrompt({
        promptHash:   mutations.hash,
        promptName:   parent.prompt_name,
        content:      mutations.content ?? parent.content,
        role:         mutations.role         ?? parent.role,
        category:     mutations.category     ?? parent.category,
        strategy:     mutations.strategy     ?? parent.strategy,
        outputFormat: mutations.outputFormat ?? parent.output_format,
        parentHash,
      });
    } catch (err) {
      log.warn('evolve failed', { error: err.message });
      return null;
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  async getTop(limit = 10, category = null) {
    try {
      let q = db()
        .from('prompt_versions')
        .select('id, prompt_name, version, score, usage_count, success_count, failure_count, status, created_at')
        .in('status', ['active', 'promoted']);

      if (category) q = q.eq('category', category);

      const { data } = await q
        .order('score', { ascending: false })
        .limit(limit);
      return data ?? [];
    } catch (_) { return []; }
  }

  async getBottom(limit = 10) {
    try {
      const { data } = await db()
        .from('prompt_versions')
        .select('id, prompt_name, version, score, usage_count, status, updated_at')
        .eq('status', 'active')
        .gte('usage_count', MIN_USAGES)
        .order('score', { ascending: true })
        .limit(limit);
      return data ?? [];
    } catch (_) { return []; }
  }

  async getLineage(promptVersionId) {
    const chain = [];
    let   currentId = promptVersionId;

    for (let i = 0; i < MAX_VERSION_DEPTH; i++) {
      try {
        const { data } = await db()
          .from('prompt_versions')
          .select('id, prompt_name, version, score, status, parent_id')
          .eq('id', currentId)
          .single();

        if (!data) break;
        chain.push(data);
        if (!data.parent_id) break;
        currentId = data.parent_id;
      } catch (_) { break; }
    }

    return chain;
  }

  async getStats() {
    try {
      const { data } = await db()
        .from('prompt_versions')
        .select('status, score');

      const rows = data ?? [];
      const byStatus = rows.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {});

      const active = rows.filter(r => r.status === 'active');
      const avgScore = active.length > 0
        ? Math.round((active.reduce((s, r) => s + r.score, 0) / active.length) * 1000) / 1000
        : 0;

      return { total: rows.length, byStatus, avgScore };
    } catch (_) {
      return { total: 0, byStatus: {}, avgScore: 0 };
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async _getLineageDepth(versionId) {
    let depth = 0, current = versionId;
    while (depth < MAX_VERSION_DEPTH) {
      try {
        const { data } = await db()
          .from('prompt_versions')
          .select('parent_id')
          .eq('id', current)
          .single();
        if (!data?.parent_id) break;
        current = data.parent_id;
        depth++;
      } catch (_) { break; }
    }
    return depth;
  }
}

// Process-singleton
const promptEvolutionEngine = new PromptEvolutionEngine();

module.exports = {
  PromptEvolutionEngine,
  promptEvolutionEngine,
  RETIREMENT_SCORE,
  PROMOTION_SCORE,
  MIN_USAGES,
};
