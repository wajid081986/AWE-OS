'use strict';

/**
 * AWE-OS — Self-Optimization Routes                            Phase 5D
 *
 * Admin-only endpoints for the Self-Optimization Engine.
 *
 *  GET  /api/self-optimize/status              — optimization engine status
 *  GET  /api/self-optimize/bottlenecks         — active runtime bottlenecks
 *  GET  /api/self-optimize/events              — optimization events (history)
 *  GET  /api/self-optimize/recommendations     — pending recommendations (ranked)
 *  GET  /api/self-optimize/recommendations/auto — auto-applicable recommendations
 *  POST /api/self-optimize/recommendations/:id/apply   — apply recommendation
 *  POST /api/self-optimize/recommendations/:id/dismiss — dismiss recommendation
 *  POST /api/self-optimize/analyze             — run analysis cycle (all optimizers)
 *  GET  /api/self-optimize/tuning/history      — autonomous tuning history
 *  POST /api/self-optimize/tuning/:id/rollback — rollback a tuning
 *  PUT  /api/self-optimize/tuning/toggle       — enable/disable autonomous tuning
 *  POST /api/self-optimize/tuning/reset-breaker — reset circuit breaker
 *  GET  /api/self-optimize/decisions           — decision history
 *  POST /api/self-optimize/decisions/coordinate — coordinate a new decision
 */

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const {
  runtimeOptimizer,
  pipelineOptimizer,
  optimizationRecommender,
  autonomousTuner,
  decisionCoordinator,
} = require('../optimization');

const router = express.Router();

// All self-optimization routes require admin
router.use(requireAuth, requireAdmin);

// ── GET /api/self-optimize/status ─────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const [runtimeStats, tunerStats, recommenderStats, decisionStats] = await Promise.allSettled([
      Promise.resolve(runtimeOptimizer.getStats()),
      Promise.resolve(autonomousTuner.getStats()),
      optimizationRecommender.getStats(),
      decisionCoordinator.getStats(),
    ]);

    res.json({
      success: true,
      data: {
        runtime:     runtimeStats.status    === 'fulfilled' ? runtimeStats.value    : null,
        tuner:       tunerStats.status      === 'fulfilled' ? tunerStats.value      : null,
        recommender: recommenderStats.status === 'fulfilled' ? recommenderStats.value : null,
        decisions:   decisionStats.status   === 'fulfilled' ? decisionStats.value   : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/self-optimize/bottlenecks ───────────────────────────────────────
router.get('/bottlenecks', (req, res) => {
  try {
    const bottlenecks = runtimeOptimizer.getBottlenecks();
    res.json({ success: true, data: bottlenecks, count: bottlenecks.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/self-optimize/events ────────────────────────────────────────────
router.get('/events', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const source = req.query.source ?? 'memory';  // 'memory' or 'db'

  try {
    if (source === 'db') {
      const supabase = require('../db/supabase');
      let q = supabase
        .from('optimization_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);
      if (req.query.unresolved === 'true') q = q.eq('resolved', false);
      const { data } = await q;
      return res.json({ success: true, data: data ?? [], count: (data ?? []).length });
    }

    const events = runtimeOptimizer.getEvents(limit);
    res.json({ success: true, data: events, count: events.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/self-optimize/recommendations ───────────────────────────────────
router.get('/recommendations', async (req, res) => {
  const limit    = Math.min(Number(req.query.limit)  || 20, 100);
  const minConf  = Number(req.query.minConfidence)   || 0;
  const priority = req.query.priority                || undefined;
  const source   = req.query.source                  || undefined;

  try {
    const recs = await optimizationRecommender.getRecommendations({ limit, minConfidence: minConf, priority, source });
    res.json({ success: true, data: recs, count: recs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/self-optimize/recommendations/auto ──────────────────────────────
router.get('/recommendations/auto', async (req, res) => {
  const limit   = Math.min(Number(req.query.limit) || 5, 20);
  const minConf = Number(req.query.minConfidence)  || 0.80;

  try {
    const recs = await optimizationRecommender.getAutoApplicable(limit, minConf);
    res.json({ success: true, data: recs, count: recs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/self-optimize/recommendations/:id/apply ────────────────────────
router.post('/recommendations/:id/apply', async (req, res) => {
  try {
    const appliedBy = req.user?.userId ?? req.user?.id ?? 'admin';
    const result = await optimizationRecommender.applyRecommendation(req.params.id, appliedBy);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ALREADY_PROCESSED' ? 409 : 500;
    res.status(status).json({ success: false, error: err.message, code: err.code });
  }
});

// ── POST /api/self-optimize/recommendations/:id/dismiss ──────────────────────
router.post('/recommendations/:id/dismiss', async (req, res) => {
  try {
    const reason = req.body?.reason ?? '';
    await optimizationRecommender.dismissRecommendation(req.params.id, reason);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/self-optimize/analyze ──────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  try {
    const result = await optimizationRecommender.runAnalysisCycle();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/self-optimize/tuning/history ────────────────────────────────────
router.get('/tuning/history', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const source = req.query.source ?? 'memory';

  try {
    if (source === 'db') {
      const supabase = require('../db/supabase');
      const { data } = await supabase
        .from('runtime_tuning')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(limit);
      return res.json({ success: true, data: data ?? [], count: (data ?? []).length });
    }

    const history = autonomousTuner.getTuningHistory(limit);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/self-optimize/tuning/:id/rollback ──────────────────────────────
router.post('/tuning/:id/rollback', async (req, res) => {
  try {
    const reason = req.body?.reason ?? 'admin_rollback';
    await autonomousTuner.rollback(req.params.id, reason);
    res.json({ success: true });
  } catch (err) {
    const status = err.code === 'TUNING_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ success: false, error: err.message, code: err.code });
  }
});

// ── PUT /api/self-optimize/tuning/toggle ─────────────────────────────────────
router.put('/tuning/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled (boolean) required' });
    }
    autonomousTuner.setEnabled(enabled);
    res.json({ success: true, enabled });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/self-optimize/tuning/reset-breaker ─────────────────────────────
router.post('/tuning/reset-breaker', (req, res) => {
  try {
    autonomousTuner.resetBreaker();
    res.json({ success: true, message: 'Circuit breaker reset' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/self-optimize/decisions ─────────────────────────────────────────
router.get('/decisions', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const source = req.query.source ?? 'memory';

  try {
    if (source === 'db') {
      const supabase = require('../db/supabase');
      const { data } = await supabase
        .from('decision_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return res.json({ success: true, data: data ?? [], count: (data ?? []).length });
    }

    const history = decisionCoordinator.getHistory(limit);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/self-optimize/decisions/coordinate ─────────────────────────────
router.post('/decisions/coordinate', async (req, res) => {
  const { decisionType, question, options, context, agentIds } = req.body;
  if (!question || !options?.length) {
    return res.status(400).json({ success: false, error: 'question and options required' });
  }

  try {
    const result = await decisionCoordinator.coordinate({
      decisionType: decisionType ?? 'lifecycle',
      question,
      options,
      context:  context ?? {},
      agentIds,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
