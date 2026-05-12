'use strict';

/**
 * AWE-OS — IntelligencePool                                    Phase 5C
 *
 * Shared cross-agent intelligence store. Any agent can contribute knowledge;
 * all agents can retrieve it. Built on top of the existing MemoryManager
 * to avoid a parallel storage system.
 *
 * Design:
 *   - Contributions go to: in-memory cache + MemoryManager (LTM) + DB intelligence_sharing
 *   - Queries: in-memory first, then DB fallback
 *   - Tag-based search (matches existing SemanticMemory pattern)
 *   - Confidence weighting: high-confidence contributions surface first
 *   - TTL support: contributions can expire (default: 7 days for session intel)
 *   - Non-blocking: all writes are fire-and-forget
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('intelligence-pool');

const POOL_CACHE_MAX  = 500;   // max in-memory entries
const DEFAULT_TTL_MS  = 7 * 24 * 60 * 60 * 1000;  // 7 days

class IntelligencePool {
  constructor() {
    this._cache = new Map();  // tag → [{ contributor, subject, intelligence, confidence, ts }]
    this._memoryManager = null;
    this._contributionCount = 0;
    this._queryCount = 0;
    this._initialized = false;
  }

  /**
   * Wire to MemoryManager. Called once at startup.
   */
  init(memoryManager) {
    if (this._initialized) return;
    this._initialized = true;
    this._memoryManager = memoryManager;
    log.info('IntelligencePool initialized');
  }

  /**
   * Contribute intelligence to the shared pool.
   *
   * @param {string}   agentId      — contributing agent
   * @param {string}   subject      — what this intelligence is about
   * @param {object}   intelligence — the knowledge payload
   * @param {string[]} tags         — searchable tags
   * @param {object}   [options]    — { confidence, ttlMs }
   */
  async contribute(agentId, subject, intelligence, tags = [], options = {}) {
    const confidence = options.confidence ?? 0.7;
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const entry = {
      contributorAgent: agentId,
      subject,
      intelligence,
      tags,
      confidence,
      expiresAt,
      contributedAt: new Date().toISOString(),
    };

    // In-memory cache: index by each tag
    for (const tag of tags) {
      if (!this._cache.has(tag)) this._cache.set(tag, []);
      const bucket = this._cache.get(tag);
      bucket.unshift(entry);
      if (bucket.length > 20) bucket.pop(); // cap per-tag cache
    }

    this._contributionCount++;

    // Persist asynchronously
    setImmediate(async () => {
      try {
        // Write to intelligence_sharing table
        const supabase = require('../../db/supabase');
        const { data } = await supabase.from('intelligence_sharing').insert({
          contributor_agent: agentId,
          subject,
          intelligence,
          tags,
          confidence,
          expires_at: expiresAt,
        }).select('id').single();

        // Also write to long-term memory for cross-system retrieval
        if (this._memoryManager && tags.length > 0) {
          await this._memoryManager.rememberSuccess({
            subject:    `intelligence:${agentId}:${subject}`,
            content:    intelligence,
            tags:       ['intelligence', agentId, ...tags].filter(Boolean),
            sourceType: 'intelligence-pool',
            sourceId:   agentId,
            confidence,
          });
        }

        log.debug('Intelligence contributed', { agentId, subject, tags });
      } catch (err) {
        log.warn('IntelligencePool contribution persist failed', { error: err.message });
      }
    });

    return entry;
  }

  /**
   * Query the pool for intelligence matching given tags.
   * Returns entries sorted by confidence desc.
   *
   * @param {string[]} tags
   * @param {object}  [options] — { limit, minConfidence, includeExpired }
   */
  async query(tags = [], options = {}) {
    const limit = options.limit ?? 10;
    const minConf = options.minConfidence ?? 0.3;
    this._queryCount++;

    // 1. Check in-memory cache
    const cacheResults = [];
    for (const tag of tags) {
      const bucket = this._cache.get(tag) ?? [];
      for (const entry of bucket) {
        if (entry.confidence >= minConf) cacheResults.push(entry);
      }
    }

    if (cacheResults.length >= Math.ceil(limit / 2)) {
      return this._deduplicate(cacheResults)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
    }

    // 2. DB fallback
    try {
      const supabase = require('../../db/supabase');
      let q = supabase
        .from('intelligence_sharing')
        .select('*')
        .gte('confidence', minConf)
        .eq('is_active', true)
        .overlaps('tags', tags)
        .order('confidence', { ascending: false })
        .limit(limit);

      if (!options.includeExpired) {
        q = q.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      }

      const { data } = await q;
      const dbResults = (data ?? []).map(r => ({
        contributorAgent: r.contributor_agent,
        subject:          r.subject,
        intelligence:     r.intelligence,
        tags:             r.tags,
        confidence:       r.confidence,
        expiresAt:        r.expires_at,
        contributedAt:    r.contributed_at,
        id:               r.id,
      }));

      const merged = this._deduplicate([...cacheResults, ...dbResults]);
      return merged.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
    } catch (err) {
      log.warn('IntelligencePool DB query failed', { error: err.message });
      return cacheResults.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
    }
  }

  /**
   * Get all intelligence contributed by a specific agent.
   */
  async getFromAgent(agentId, limit = 20) {
    try {
      const supabase = require('../../db/supabase');
      const { data } = await supabase
        .from('intelligence_sharing')
        .select('*')
        .eq('contributor_agent', agentId)
        .eq('is_active', true)
        .order('contributed_at', { ascending: false })
        .limit(limit);
      return data ?? [];
    } catch (_) { return []; }
  }

  /**
   * Vote on a piece of intelligence (helpful/unhelpful feedback).
   */
  async vote(intelligenceId, helpful) {
    try {
      const supabase = require('../../db/supabase');
      const column = helpful ? 'helpful_votes' : 'unhelpful_votes';
      const { data } = await supabase
        .from('intelligence_sharing')
        .select(column)
        .eq('id', intelligenceId)
        .single();
      if (data) {
        await supabase
          .from('intelligence_sharing')
          .update({ [column]: (data[column] ?? 0) + 1 })
          .eq('id', intelligenceId);
      }
    } catch (_) {}
  }

  async getStats() {
    const cacheSize = [...this._cache.values()].reduce((s, b) => s + b.length, 0);
    let dbTotal = 0;
    try {
      const supabase = require('../../db/supabase');
      const { count } = await supabase
        .from('intelligence_sharing')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      dbTotal = count ?? 0;
    } catch (_) {}

    return {
      cacheEntries:      cacheSize,
      dbTotal,
      contributionCount: this._contributionCount,
      queryCount:        this._queryCount,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _deduplicate(entries) {
    const seen = new Set();
    return entries.filter(e => {
      const key = `${e.contributorAgent}:${e.subject}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

const intelligencePool = new IntelligencePool();

module.exports = { IntelligencePool, intelligencePool };
