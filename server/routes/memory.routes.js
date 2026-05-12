'use strict';

/**
 * AWE-OS — Memory Routes                                       Phase 5A
 *
 * Admin-only endpoints for AI Memory Layer inspection and management.
 *
 *   GET  /api/memory/stats        — memory system stats (all three layers)
 *   GET  /api/memory/recent       — recent short-term memory entries
 *   GET  /api/memory/search       — search long-term memories by tags
 *   GET  /api/memory/:id          — retrieve a specific long-term memory
 *   POST /api/memory/reinforce    — manually reinforce a memory (success/failure)
 *   DELETE /api/memory/:id        — retire a memory
 *   GET  /api/memory/patterns     — runtime patterns (sorted by occurrences)
 *   GET  /api/memory/performance  — tool performance history summary
 */

const express  = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { memoryManager }  = require('../memory/MemoryManager');
const { longTermMemory } = require('../memory/LongTermMemory');
const { semanticMemory } = require('../memory/SemanticMemory');
const supabase           = require('../db/supabase');

const router = express.Router();

// ── GET /api/memory/stats ─────────────────────────────────────────────────────
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await memoryManager.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/memory/recent ────────────────────────────────────────────────────
router.get('/recent', requireAuth, requireAdmin, (req, res) => {
  try {
    const type  = req.query.type ?? null;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const items = type
      ? require('../memory/ShortTermMemory').shortTermMemory.getByType(type, limit)
      : require('../memory/ShortTermMemory').shortTermMemory.getRecent(limit);

    res.json({ success: true, data: items, count: items.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/memory/search ────────────────────────────────────────────────────
router.get('/search', requireAuth, requireAdmin, async (req, res) => {
  const tags  = req.query.tags ? req.query.tags.split(',').map(t => t.trim()) : [];
  const type  = req.query.type ?? null;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const minConf = Number(req.query.minConfidence) || 0.1;

  try {
    let results;
    if (tags.length > 0) {
      results = await memoryManager.getRelatedMemories(tags, limit);
    } else if (type) {
      results = await longTermMemory.recall({ memoryType: type, limit, minConfidence: minConf });
    } else {
      results = await longTermMemory.recall({ limit, minConfidence: minConf });
    }
    res.json({ success: true, data: results, count: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/memory/:id ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memory  = await longTermMemory.recallById(req.params.id);
    const related = memory ? semanticMemory.getRelated(req.params.id, 5) : [];
    if (!memory) return res.status(404).json({ success: false, error: 'Memory not found' });
    res.json({ success: true, data: memory, related });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/memory/reinforce ────────────────────────────────────────────────
router.post('/reinforce', requireAuth, requireAdmin, async (req, res) => {
  const { id, success } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  try {
    await memoryManager.reinforce(id, success !== false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/memory/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await longTermMemory.retire(req.params.id);
    await semanticMemory.deindex(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/memory/patterns ──────────────────────────────────────────────────
router.get('/patterns/list', requireAuth, requireAdmin, async (req, res) => {
  const limit    = Math.min(Number(req.query.limit) || 20, 100);
  const type     = req.query.type ?? null;
  const resolved = req.query.resolved === 'true';

  try {
    let q = supabase
      .from('runtime_patterns')
      .select('*');

    if (type)     q = q.eq('pattern_type', type);
    if (!resolved) q = q.eq('is_resolved', false);

    const { data, error } = await q
      .order('occurrences', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ success: true, data: data ?? [], count: (data ?? []).length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/memory/performance/summary ───────────────────────────────────────
router.get('/performance/summary', requireAuth, requireAdmin, async (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 24, 168);

  try {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const { data, error } = await supabase
      .from('tool_performance_history')
      .select('tool_id, tool_slug, outcome, score, duration_ms, recorded_at')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const rows    = data ?? [];
    const success = rows.filter(r => r.outcome === 'success');
    const failed  = rows.filter(r => r.outcome === 'failure');
    const avgScore = success.length
      ? Math.round(success.reduce((s, r) => s + (r.score ?? 0), 0) / success.length)
      : null;

    res.json({
      success: true,
      data:    rows.slice(0, 50),  // latest 50 rows
      summary: {
        total:      rows.length,
        successPct: rows.length > 0 ? Math.round((success.length / rows.length) * 100) : 0,
        avgScore,
        failureCount: failed.length,
        windowHours: hours,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
