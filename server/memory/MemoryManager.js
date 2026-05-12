'use strict';

/**
 * AWE-OS — MemoryManager                                       Phase 5A
 *
 * Unified facade over all three memory layers.
 * This is the ONLY entry point agents should use — never call layers directly.
 *
 * Write-through hierarchy:
 *   write → ShortTermMemory (immediate)
 *         → LongTermMemory (async, best-effort)
 *         → SemanticMemory (async, best-effort)
 *
 * Read hierarchy:
 *   query → ShortTermMemory first (cache hit)
 *          → LongTermMemory (DB)
 *          → SemanticMemory (tag-ranked)
 *
 * All writes are fire-and-forget for long-term + semantic layers.
 * ShortTermMemory writes are synchronous.
 */

const { shortTermMemory, MEMORY_TYPES: STM_TYPES } = require('./ShortTermMemory');
const { longTermMemory,  MEMORY_TYPES: LTM_TYPES } = require('./LongTermMemory');
const { semanticMemory }                            = require('./SemanticMemory');
const { createLogger }                              = require('../monitoring/logger');

const log = createLogger('memory-manager');

// Unified type map (both layers use same type values)
const TYPES = LTM_TYPES;

class MemoryManager {

  // ── Execution context ──────────────────────────────────────────────────────

  /**
   * Remember a pipeline execution context (short-term, quickly fading).
   * Used by agents to access cross-step context within a pipeline run.
   */
  rememberExecution(executionId, data) {
    shortTermMemory.rememberExecution(executionId, data);
  }

  /**
   * Retrieve execution context if still in short-term memory.
   */
  getExecutionContext(executionId) {
    return shortTermMemory.get(`exec:${executionId}`);
  }

  // ── Success memory ──────────────────────────────────────────────────────────

  /**
   * Record a successful generation/pipeline outcome.
   * Writes to both STM (fast access) and LTM (persistent).
   *
   * @param {object} params
   * @param {string} params.subject         — human-readable label
   * @param {object} params.content         — success payload
   * @param {string[]} params.tags          — searchable tags
   * @param {string} [params.sourceType]
   * @param {string} [params.sourceId]
   * @param {number} [params.confidence]
   */
  async rememberSuccess(params) {
    const { subject, content, tags = [], sourceType, sourceId, confidence = 0.7 } = params;
    const stmKey = `success:${sourceType}:${sourceId}`;

    // Short-term: immediate, fast
    shortTermMemory.rememberSuccess(stmKey, content);

    // Long-term: persistent
    setImmediate(async () => {
      try {
        const id = await longTermMemory.upsert({
          memoryType: TYPES.STRATEGY,
          subject,
          content,
          confidence,
          tags,
          sourceType,
          sourceId,
        });

        if (id && tags.length) {
          await semanticMemory.index(id, tags);
        }
      } catch (err) {
        log.warn('rememberSuccess LTM write failed', { error: err.message });
      }
    });
  }

  // ── Failure memory ──────────────────────────────────────────────────────────

  /**
   * Record a failure with its classification and context.
   */
  async rememberFailure(params) {
    const { subject, content, tags = [], sourceType, sourceId, confidence = 0.6 } = params;
    const stmKey = `fail:${sourceType}:${sourceId}`;

    shortTermMemory.rememberFailure(stmKey, content);

    setImmediate(async () => {
      try {
        const id = await longTermMemory.upsert({
          memoryType: TYPES.PATTERN,
          subject,
          content,
          confidence,
          tags: ['failure', ...tags],
          sourceType,
          sourceId,
        });

        if (id) await semanticMemory.index(id, ['failure', ...tags]);
      } catch (err) {
        log.warn('rememberFailure LTM write failed', { error: err.message });
      }
    });
  }

  // ── Repair memory ───────────────────────────────────────────────────────────

  /**
   * Record an applied repair and whether it succeeded.
   */
  async rememberRepair(params) {
    const { subject, content, tags = [], sourceType, sourceId, success, confidence } = params;

    setImmediate(async () => {
      try {
        const conf = confidence ?? (success ? 0.75 : 0.3);
        const id = await longTermMemory.store({
          memoryType: TYPES.REPAIR,
          subject,
          content: { ...content, success },
          confidence: conf,
          tags: ['repair', success ? 'fix_success' : 'fix_failed', ...tags],
          sourceType,
          sourceId,
        });

        if (id) await semanticMemory.index(id, ['repair', ...tags]);
      } catch (err) {
        log.warn('rememberRepair LTM write failed', { error: err.message });
      }
    });
  }

  // ── Prompt memory ───────────────────────────────────────────────────────────

  /**
   * Record a prompt hash and its observed quality.
   */
  rememberPrompt(promptHash, data) {
    shortTermMemory.rememberPrompt(promptHash, data);
  }

  /**
   * Retrieve a recently used prompt from short-term memory.
   */
  getPromptContext(promptHash) {
    return shortTermMemory.get(`prompt:${promptHash}`);
  }

  // ── Retrieval ───────────────────────────────────────────────────────────────

  /**
   * Get best patterns for a given memory type (ranked by confidence).
   */
  async getBestPatterns(memoryType, limit = 5) {
    return longTermMemory.recall({ memoryType, limit, minConfidence: 0.4 });
  }

  /**
   * Contextual retrieval: find memories related to given tags.
   * Searches semantic index first, then falls back to LTM tag query.
   */
  async getRelatedMemories(tags, limit = 10) {
    if (!tags?.length) return [];

    // Semantic search first (in-process, fast)
    const semanticResults = semanticMemory.search(tags, { limit });

    if (semanticResults.length >= limit / 2) {
      // Enrich with full memory objects from LTM
      const ids = semanticResults.map(r => r.memoryId);
      try {
        const { data } = await require('../db/supabase')
          .from('ai_memories')
          .select('*')
          .in('id', ids)
          .eq('is_active', true);

        const ranked = (data ?? []).map(m => {
          const semResult = semanticResults.find(r => r.memoryId === m.id);
          return { ...m, _score: semResult?.score ?? 0 };
        }).sort((a, b) => b._score - a._score);

        return ranked.slice(0, limit);
      } catch (_) {}
    }

    // Fallback: direct LTM tag query
    return longTermMemory.recallByTags(tags, { limit });
  }

  /**
   * Find similar failure memories to the given pattern signature.
   */
  async getSimilarFailures(patternSignature, limit = 5) {
    const tags = patternSignature.split(':').filter(Boolean);
    return longTermMemory.recall({
      memoryType: TYPES.PATTERN,
      tags:       ['failure', ...tags.slice(0, 2)],
      limit,
      minConfidence: 0.1,
    });
  }

  /**
   * Recent runtime intelligence from short-term memory.
   */
  getRecentContext(type, limit = 10) {
    if (type) return shortTermMemory.getByType(type, limit);
    return shortTermMemory.getRecent(limit);
  }

  // ── Feedback ────────────────────────────────────────────────────────────────

  /**
   * Reinforce a stored long-term memory after a successful outcome.
   */
  async reinforce(memoryId, success) {
    if (success) {
      await longTermMemory.reinforceSuccess(memoryId);
    } else {
      await longTermMemory.reinforceFailure(memoryId);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  async getStats() {
    const [ltmStats, semStats] = await Promise.allSettled([
      longTermMemory.getStats(),
      Promise.resolve(semanticMemory.getStats()),
    ]);

    return {
      shortTerm: shortTermMemory.getStats(),
      longTerm:  ltmStats.status  === 'fulfilled' ? ltmStats.value  : null,
      semantic:  semStats.status  === 'fulfilled' ? semStats.value  : null,
    };
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  async initialize() {
    shortTermMemory.start();
    await semanticMemory.warmFromDB(3000);
    log.info('MemoryManager initialized');
  }

  destroy() {
    shortTermMemory.stop();
  }
}

// Process-singleton
const memoryManager = new MemoryManager();

module.exports = { MemoryManager, memoryManager, TYPES };
