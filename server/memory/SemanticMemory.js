'use strict';

/**
 * AWE-OS — SemanticMemory                                      Phase 5A
 *
 * Tag-indexed contextual retrieval layer. Embedding-ready architecture.
 *
 * CURRENT IMPLEMENTATION: Tag-based scoring (no external vector DB).
 *   Retrieval = tag intersection + weight sum + confidence boost.
 *   Suitable for production with up to ~50K memories.
 *
 * VECTOR MIGRATION PATH (future Phase 6+):
 *   1. Enable pgvector extension in Supabase
 *   2. Add `embedding VECTOR(1536)` column to semantic_tags table
 *   3. Replace tag-match scoring with cosine similarity query
 *   4. Keep existing tag columns as metadata/fallback
 *
 * The semantic_tags table stores (memory_id, tag, weight) tuples.
 * indexMemory() writes these tags. search() retrieves by intersection scoring.
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('semantic-memory');

// In-memory tag index for fast lookup (no DB round-trip for hot paths)
// Map<tag → Set<memoryId>>
const _tagIndex = new Map();

// Map<memoryId → {tags: Map<tag, weight>}>
const _memoryIndex = new Map();

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

class SemanticMemory {

  // ── Index API ───────────────────────────────────────────────────────────────

  /**
   * Index a memory with weighted tags.
   * Writes to both in-process cache and semantic_tags table.
   *
   * @param {string} memoryId       — UUID from ai_memories
   * @param {Array<string|{tag:string,weight:number}>} tags
   */
  async index(memoryId, tags) {
    if (!memoryId || !tags?.length) return;

    const normalized = tags.map(t =>
      typeof t === 'string'
        ? { tag: t.toLowerCase().trim(), weight: 1.0 }
        : { tag: t.tag.toLowerCase().trim(), weight: t.weight ?? 1.0 }
    ).filter(t => t.tag);

    // 1. In-memory index
    if (!_memoryIndex.has(memoryId)) {
      _memoryIndex.set(memoryId, { tags: new Map() });
    }
    const memEntry = _memoryIndex.get(memoryId);
    for (const { tag, weight } of normalized) {
      memEntry.tags.set(tag, weight);
      if (!_tagIndex.has(tag)) _tagIndex.set(tag, new Set());
      _tagIndex.get(tag).add(memoryId);
    }

    // 2. DB persistence (best-effort)
    try {
      const rows = normalized.map(({ tag, weight }) => ({
        memory_id: memoryId,
        tag,
        weight: Math.max(0, Math.min(1, weight)),
      }));

      await db()
        .from('semantic_tags')
        .upsert(rows, { onConflict: 'memory_id,tag' });
    } catch (err) {
      log.warn('Semantic tag DB write failed', { memoryId, error: err.message });
    }
  }

  /**
   * Remove all tags for a memory (called when memory is retired).
   */
  async deindex(memoryId) {
    const entry = _memoryIndex.get(memoryId);
    if (entry) {
      for (const tag of entry.tags.keys()) {
        _tagIndex.get(tag)?.delete(memoryId);
        if (_tagIndex.get(tag)?.size === 0) _tagIndex.delete(tag);
      }
      _memoryIndex.delete(memoryId);
    }

    try {
      await db().from('semantic_tags').delete().eq('memory_id', memoryId);
    } catch (_) {}
  }

  // ── Search API ──────────────────────────────────────────────────────────────

  /**
   * Search for memories by query tags.
   * Returns ranked list of { memoryId, score } objects.
   *
   * Scoring formula:
   *   score = Σ(weight_i for matching tags) / total_query_tags
   *   + confidence_boost (from ai_memories.confidence × 0.2)
   *
   * VECTOR MIGRATION NOTE:
   *   Replace this method body with pgvector cosine_similarity() call.
   *   Keep the same return signature: [{ memoryId, score }]
   *
   * @param {string[]} queryTags
   * @param {object}   [opts]
   * @param {number}   [opts.limit]
   * @param {number}   [opts.minScore]
   * @returns {{ memoryId: string, score: number }[]}
   */
  search(queryTags, { limit = 10, minScore = 0.1 } = {}) {
    if (!queryTags?.length) return [];

    const normalized = queryTags.map(t => t.toLowerCase().trim()).filter(Boolean);
    const scores = new Map();  // memoryId → score

    for (const tag of normalized) {
      const tagWeight = 1.0 / normalized.length;  // equal weight per query tag
      const memoryIds = _tagIndex.get(tag);
      if (!memoryIds) continue;

      for (const memoryId of memoryIds) {
        const memEntry = _memoryIndex.get(memoryId);
        if (!memEntry) continue;
        const storedWeight = memEntry.tags.get(tag) ?? 1.0;
        scores.set(memoryId, (scores.get(memoryId) ?? 0) + tagWeight * storedWeight);
      }
    }

    return [...scores.entries()]
      .filter(([, score]) => score >= minScore)
      .map(([memoryId, score]) => ({ memoryId, score: Math.round(score * 1000) / 1000 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Find memories related to a given memory (shares tags).
   *
   * @param {string} memoryId
   * @param {number} [limit]
   * @returns {string[]} related memory IDs
   */
  getRelated(memoryId, limit = 5) {
    const entry = _memoryIndex.get(memoryId);
    if (!entry) return [];

    const queryTags = [...entry.tags.keys()];
    return this.search(queryTags, { limit: limit + 1 })
      .filter(r => r.memoryId !== memoryId)
      .slice(0, limit)
      .map(r => r.memoryId);
  }

  /**
   * Warm the in-memory index from DB on startup.
   * Call once during initialization to restore the in-process index.
   */
  async warmFromDB(limit = 5000) {
    try {
      const { data } = await db()
        .from('semantic_tags')
        .select('memory_id, tag, weight')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!data?.length) return;

      for (const row of data) {
        const { memory_id: memId, tag, weight } = row;

        if (!_memoryIndex.has(memId)) {
          _memoryIndex.set(memId, { tags: new Map() });
        }
        _memoryIndex.get(memId).tags.set(tag, weight);

        if (!_tagIndex.has(tag)) _tagIndex.set(tag, new Set());
        _tagIndex.get(tag).add(memId);
      }

      log.info('SemanticMemory index warmed from DB', {
        rows:    data.length,
        tags:    _tagIndex.size,
        memories: _memoryIndex.size,
      });
    } catch (err) {
      log.warn('SemanticMemory warm failed', { error: err.message });
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  getStats() {
    return {
      indexedMemories: _memoryIndex.size,
      uniqueTags:      _tagIndex.size,
      // vectorMigrationReady: false — toggle to true when pgvector is enabled
      vectorMigrationReady: false,
    };
  }
}

// Process-singleton
const semanticMemory = new SemanticMemory();

module.exports = { SemanticMemory, semanticMemory };
