'use strict';

/**
 * AWE-OS — Learning Routes                                     Phase 5B
 *
 * Admin-only endpoints for the Autonomous Learning Engine.
 *
 *   GET  /api/learning/stats          — learning engine stats summary
 *   GET  /api/learning/events         — recent learning events
 *   GET  /api/learning/velocity       — learning velocity (events/day)
 *   GET  /api/learning/prompts/top    — top performing prompts
 *   GET  /api/learning/prompts/bottom — worst performing prompts
 *   GET  /api/learning/prompts/stats  — prompt evolution stats
 *   GET  /api/learning/prompts/:id/lineage — prompt lineage chain
 *   GET  /api/learning/optimizations  — pending optimization suggestions
 *   POST /api/learning/optimizations/:id/apply   — mark suggestion applied
 *   POST /api/learning/optimizations/:id/reject  — mark suggestion rejected
 *   POST /api/learning/pipelines/run/:name       — manually trigger a pipeline (a|b|c)
 *   GET  /api/learning/repair         — repair history
 *   GET  /api/learning/feedback       — closed-loop feedback summary
 */

const express  = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { promptEvolutionEngine } = require('../learning/PromptEvolutionEngine');
const { optimizationAdvisor }   = require('../learning/OptimizationAdvisor');
const { learningPipelines }     = require('../learning/LearningPipelines');
const { learningEventCapture }  = require('../learning/LearningEventCapture');
const supabase                  = require('../db/supabase');

const router = express.Router();

// ── GET /api/learning/stats ───────────────────────────────────────────────────
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [promptStats, optimStats, captureStats, pipelineStats] = await Promise.allSettled([
      promptEvolutionEngine.getStats(),
      optimizationAdvisor.getStats(),
      Promise.resolve(learningEventCapture.getStats()),
      Promise.resolve(learningPipelines.getStats()),
    ]);

    // Quick event count from DB
    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const { data: eventCounts } = await supabase
      .from('learning_events')
      .select('outcome')
      .gte('learned_at', since24h);

    const counts = (eventCounts ?? []).reduce((acc, e) => {
      acc[e.outcome] = (acc[e.outcome] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        prompts:      promptStats.status  === 'fulfilled' ? promptStats.value  : null,
        optimization: optimStats.status   === 'fulfilled' ? optimStats.value   : null,
        capture:      captureStats.status === 'fulfilled' ? captureStats.value : null,
        pipelines:    pipelineStats.status === 'fulfilled' ? pipelineStats.value : null,
        events24h:    counts,
        generatedAt:  new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/events ──────────────────────────────────────────────────
router.get('/events', requireAuth, requireAdmin, async (req, res) => {
  const limit   = Math.min(Number(req.query.limit) || 50, 200);
  const outcome = req.query.outcome ?? null;
  const hours   = Math.min(Number(req.query.hours) || 24, 168);

  try {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    let q = supabase
      .from('learning_events')
      .select('id, event_type, source_type, source_id, outcome, score, pipeline_id, agent_name, error_category, duration_ms, learned_at, processed')
      .gte('learned_at', since);

    if (outcome) q = q.eq('outcome', outcome);

    const { data, error } = await q
      .order('learned_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ success: true, data: data ?? [], count: (data ?? []).length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/velocity ────────────────────────────────────────────────
router.get('/velocity', requireAuth, requireAdmin, async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  try {
    const { data, error } = await supabase.rpc('get_learning_velocity', { p_days: days });
    if (error) throw error;
    res.json({ success: true, data: data ?? [], days });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/prompts/top ─────────────────────────────────────────────
router.get('/prompts/top', requireAuth, requireAdmin, async (req, res) => {
  const limit    = Math.min(Number(req.query.limit) || 10, 50);
  const category = req.query.category ?? null;
  try {
    const data = await promptEvolutionEngine.getTop(limit, category);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/prompts/bottom ──────────────────────────────────────────
router.get('/prompts/bottom', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  try {
    const data = await promptEvolutionEngine.getBottom(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/prompts/stats ───────────────────────────────────────────
router.get('/prompts/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await promptEvolutionEngine.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/prompts/:id/lineage ─────────────────────────────────────
router.get('/prompts/:id/lineage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const chain = await promptEvolutionEngine.getLineage(req.params.id);
    res.json({ success: true, data: chain, depth: chain.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/optimizations ───────────────────────────────────────────
router.get('/optimizations', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  try {
    const data = await optimizationAdvisor.getPendingSuggestions(limit);
    const stats = await optimizationAdvisor.getStats();
    res.json({ success: true, data, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/learning/optimizations/:id/apply ───────────────────────────────
router.post('/optimizations/:id/apply', requireAuth, requireAdmin, async (req, res) => {
  try {
    await optimizationAdvisor.updateStatus(req.params.id, 'applied', req.user?.id ?? 'admin');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/learning/optimizations/:id/reject ──────────────────────────────
router.post('/optimizations/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    await optimizationAdvisor.updateStatus(req.params.id, 'rejected', req.user?.id ?? 'admin');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/learning/pipelines/run/:name ────────────────────────────────────
router.post('/pipelines/run/:name', requireAuth, requireAdmin, async (req, res) => {
  const { name } = req.params;
  try {
    if (name === 'a')     { await learningPipelines.runA(); }
    else if (name === 'b') { await learningPipelines.runB(); }
    else if (name === 'c') { await learningPipelines.runC(); }
    else return res.status(400).json({ success: false, error: 'Unknown pipeline. Use a, b, or c' });

    res.json({ success: true, message: `Pipeline ${name.toUpperCase()} triggered` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/repair ──────────────────────────────────────────────────
router.get('/repair', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const hours = Math.min(Number(req.query.hours) || 48, 168);

  try {
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const { data, error } = await supabase
      .from('repair_history')
      .select('id, tool_id, error_pattern, error_category, fix_type, success, confidence_before, confidence_after, duration_ms, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const rows = data ?? [];
    const successRate = rows.length > 0
      ? Math.round((rows.filter(r => r.success).length / rows.length) * 100)
      : 0;

    res.json({ success: true, data: rows, count: rows.length, successRate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/learning/feedback ────────────────────────────────────────────────
router.get('/feedback', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const { data, error } = await supabase
      .from('learning_feedback')
      .select('strategy_type, outcome, confidence_before, confidence_after, score, applied_at')
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    const rows = data ?? [];

    // Aggregate by strategy_type
    const byStrategy = rows.reduce((acc, r) => {
      if (!acc[r.strategy_type]) acc[r.strategy_type] = { total: 0, success: 0, avgConfidenceDrift: 0 };
      acc[r.strategy_type].total++;
      if (r.outcome === 'success') acc[r.strategy_type].success++;
      const drift = (r.confidence_after ?? 0) - (r.confidence_before ?? 0);
      acc[r.strategy_type].avgConfidenceDrift += drift;
      return acc;
    }, {});

    for (const s of Object.values(byStrategy)) {
      s.successRate = s.total > 0 ? Math.round((s.success / s.total) * 100) : 0;
      s.avgConfidenceDrift = s.total > 0 ? Math.round((s.avgConfidenceDrift / s.total) * 1000) / 1000 : 0;
    }

    res.json({ success: true, data: rows.slice(0, 20), byStrategy });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
