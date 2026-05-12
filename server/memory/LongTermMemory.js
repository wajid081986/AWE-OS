'use strict';

/**
 * AWE-OS — LongTermMemory                                      Phase 5A
 *
 * Persistent intelligence store backed by the `ai_memories` table.
 * Each memory row represents a distilled insight the system can recall and apply.
 *
 * Design:
 *   - All writes are async, fire-and-forget (never block callers)
 *   - Confidence scoring: reads increment usage_count; negative outcomes lower confidence
 *   - Memory types map directly to ai_memories.memory_type column
 *   - Parent/child lineage via parent_id FK (supports memory evolution chains)
 *   - Soft-delete via is_active flag; never hard-delete by default
 *
 * Memory types:
 *   pattern     — execution/failure behavioral pattern
 *   strategy    — proven strategy for tool generation
 *   repair      — successful repair recipe
 *   prompt      — effective prompt structure
 *   seo         — SEO-winning content structure
 *   performance — performance bottleneck + resolution
 *   insight     — general learning insight
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('long-term-memory');

const MEMORY_TYPES = Object.freeze({
  PATTERN:     'pattern',
  STRATEGY:    'strategy',
  REPAIR:      'repair',
  PROMPT:      'prompt',
  SEO:         'seo',
  PERFORMANCE: 'performance',
  INSIGHT:     'insight',
});

const CONFIDENCE_DECAY     = 0.05;   // per failure
const CONFIDENCE_BOOST     = 0.03;   // per success
const MIN_CONFIDENCE       = 0.10;
const MAX_CONFIDENCE       = 1.00;
const RETIREMENT_THRESHOLD = 0.15;   // auto-deactivate below this

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

class LongTermMemory {

  // ── Write API ───────────────────────────────────────────────────────────────

  /**
   * Store a new memory or upsert by subject within the same type.
   *
   * @param {object} params
   * @param {string} params.memoryType    — MEMORY_TYPES value
   * @param {string} params.subject       — Human-readable label
   * @param {object} params.content       — The knowledge payload
   * @param {number} [params.confidence]  — Initial confidence (0–1)
   * @param {string[]} [params.tags]      — Searchable tags
   * @param {string} [params.sourceType]  — 'pipeline'|'tool'|'agent'|'cron'
   * @param {string} [params.sourceId]    — Source entity ID
   * @param {string} [params.parentId]    — Parent memory ID for lineage
   * @returns {Promise<string|null>}      — Memory ID or null on error
   */
  async store(params) {
    const {
      memoryType, subject, content, confidence = 0.5, tags = [],
      sourceType, sourceId, parentId, expiresAt,
    } = params;

    try {
      const row = {
        memory_type:  memoryType,
        subject:      subject.slice(0, 200),
        content,
        confidence:   Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, confidence)),
        tags,
        source_type:  sourceType ?? null,
        source_id:    sourceId   ?? null,
        parent_id:    parentId   ?? null,
        expires_at:   expiresAt  ?? null,
        is_active:    true,
      };

      const { data, error } = await db()
        .from('ai_memories')
        .insert(row)
        .select('id')
        .single();

      if (error) throw error;

      const id = data?.id;
      log.debug('Memory stored', { id, memoryType, subject });
      return id;
    } catch (err) {
      log.warn('LTM store failed', { memoryType, subject, error: err.message });
      return null;
    }
  }

  /**
   * Store or update a memory for a given subject+type combination.
   * If one already exists, updates content + confidence rather than creating a duplicate.
   */
  async upsert(params) {
    const { memoryType, subject } = params;

    try {
      const { data: existing } = await db()
        .from('ai_memories')
        .select('id, confidence, usage_count')
        .eq('memory_type', memoryType)
        .eq('subject', subject.slice(0, 200))
        .eq('is_active', true)
        .order('confidence', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Merge: blend confidences rather than overwrite
        const blendedConf = (existing.confidence + (params.confidence ?? 0.5)) / 2;
        await db()
          .from('ai_memories')
          .update({
            content:     params.content,
            confidence:  Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, blendedConf)),
            tags:        params.tags ?? [],
            updated_at:  new Date().toISOString(),
          })
          .eq('id', existing.id);
        return existing.id;
      }
    } catch (_) {
      // No existing row or DB error — fall through to insert
    }

    return this.store(params);
  }

  // ── Read API ────────────────────────────────────────────────────────────────

  /**
   * Recall memories by type, optionally filtered by tags.
   * Increments usage_count on returned memories.
   *
   * @param {object} opts
   * @param {string} [opts.memoryType]
   * @param {string[]} [opts.tags]      — must contain ALL of these tags
   * @param {number} [opts.limit]
   * @param {number} [opts.minConfidence]
   * @returns {Promise<Array>}
   */
  async recall({ memoryType, tags, limit = 10, minConfidence = 0.1 } = {}) {
    try {
      let q = db()
        .from('ai_memories')
        .select('*')
        .eq('is_active', true)
        .gte('confidence', minConfidence);

      if (memoryType)   q = q.eq('memory_type', memoryType);
      if (tags?.length) q = q.contains('tags', tags);

      const { data } = await q
        .order('confidence', { ascending: false })
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (data?.length) {
        // Fire-and-forget: increment usage counts
        const ids = data.map(m => m.id);
        db().from('ai_memories')
          .update({ usage_count: db().rpc('ai_memories.usage_count + 1'), last_used_at: new Date().toISOString() })
          .in('id', ids)
          .then(() => {})
          .catch(() => {});
      }

      return data ?? [];
    } catch (err) {
      log.warn('LTM recall failed', { memoryType, error: err.message });
      return [];
    }
  }

  /**
   * Recall by tag intersection (ranked by number of matching tags + confidence).
   * This is the core retrieval path for semantic-like search without vectors.
   */
  async recallByTags(tags, { limit = 10, minConfidence = 0.1 } = {}) {
    if (!tags?.length) return [];

    try {
      // Supabase: overlaps operator (&&) returns rows that have ANY matching tag
      const { data } = await db()
        .from('ai_memories')
        .select('*')
        .eq('is_active', true)
        .gte('confidence', minConfidence)
        .overlaps('tags', tags)
        .order('confidence', { ascending: false })
        .limit(limit * 2);  // over-fetch then re-rank

      if (!data?.length) return [];

      // Re-rank by tag overlap count (simulate dot-product similarity)
      const ranked = data.map(m => {
        const overlap = m.tags.filter(t => tags.includes(t)).length;
        return { ...m, _relevance: overlap / tags.length + m.confidence * 0.3 };
      });

      return ranked
        .sort((a, b) => b._relevance - a._relevance)
        .slice(0, limit)
        .map(({ _relevance, ...m }) => m);
    } catch (err) {
      log.warn('LTM recallByTags failed', { error: err.message });
      return [];
    }
  }

  async recallById(id) {
    try {
      const { data } = await db()
        .from('ai_memories')
        .select('*')
        .eq('id', id)
        .single();
      return data ?? null;
    } catch (_) {
      return null;
    }
  }

  // ── Confidence management ───────────────────────────────────────────────────

  async reinforceSuccess(id) {
    await this._adjustConfidence(id, CONFIDENCE_BOOST);
  }

  async reinforceFailure(id) {
    await this._adjustConfidence(id, -CONFIDENCE_DECAY);
  }

  async _adjustConfidence(id, delta) {
    try {
      const { data: mem } = await db()
        .from('ai_memories')
        .select('confidence')
        .eq('id', id)
        .single();

      if (!mem) return;

      const newConf = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, mem.confidence + delta));
      const isActive = newConf >= RETIREMENT_THRESHOLD;

      await db()
        .from('ai_memories')
        .update({ confidence: newConf, is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!isActive) {
        log.info('Memory auto-retired (confidence below threshold)', { id, confidence: newConf });
      }
    } catch (_) {
      // Best-effort
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async retire(id) {
    try {
      await db()
        .from('ai_memories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (_) {}
  }

  async purgeExpired() {
    try {
      const { error } = await db()
        .from('ai_memories')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);
      if (!error) log.debug('Expired memories soft-purged');
    } catch (_) {}
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  async getStats() {
    try {
      const { data } = await db()
        .from('ai_memories')
        .select('memory_type, is_active, confidence');

      const rows = data ?? [];
      const active = rows.filter(r => r.is_active);

      const byType = active.reduce((acc, r) => {
        acc[r.memory_type] = (acc[r.memory_type] ?? 0) + 1;
        return acc;
      }, {});

      const avgConf = active.length > 0
        ? Math.round((active.reduce((s, r) => s + r.confidence, 0) / active.length) * 1000) / 1000
        : 0;

      return {
        totalActive:   active.length,
        totalRetired:  rows.length - active.length,
        byType,
        avgConfidence: avgConf,
      };
    } catch (err) {
      log.warn('LTM stats failed', { error: err.message });
      return { totalActive: 0, byType: {}, avgConfidence: 0 };
    }
  }
}

// Process-singleton
const longTermMemory = new LongTermMemory();

module.exports = {
  LongTermMemory,
  longTermMemory,
  MEMORY_TYPES,
  CONFIDENCE_DECAY,
  CONFIDENCE_BOOST,
  RETIREMENT_THRESHOLD,
};
