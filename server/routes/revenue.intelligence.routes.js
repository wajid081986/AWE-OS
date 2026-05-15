'use strict';

/**
 * AWE-OS — Revenue Intelligence API Routes                      Phase 6C
 *
 * GET /api/revenue-intel/predictions  — per-tool revenue predictions
 * GET /api/revenue-intel/analytics    — full ecosystem revenue analytics
 * GET /api/revenue-intel/health       — revenue health snapshot
 * GET /api/revenue-intel/optimization — conversion optimization analyses
 * GET /api/revenue-intel/pricing      — pricing recommendations
 * GET /api/revenue-intel/forecast     — revenue forecast by category
 * GET /api/revenue-intel/learning     — learning signals + drift detection
 * POST /api/revenue-intel/refresh     — force-refresh all caches
 * POST /api/revenue-intel/evaluate    — record actual revenue for drift tracking
 * POST /api/revenue-intel/tool/:id    — single-tool full revenue pipeline
 */

const express = require('express');
const router  = express.Router();
const {
  getAnalytics,
  getPredictions,
  getPricing,
  getOptimization,
  getForecast,
  getLearning,
  runToolRevenuePipeline,
  invalidateAllCaches,
  RevenueLearningEngine,
} = require('../revenue');

const { createLogger } = require('../monitoring/logger');
const log = createLogger('revenue-intel-routes');

// ── GET /api/revenue-intel/predictions ────────────────────────────────────────
router.get('/predictions', async (req, res) => {
  try {
    const result = await getPredictions();
    res.json({ ok: true, ...result });
  } catch (err) {
    log.warn('GET /predictions failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Revenue predictions unavailable' });
  }
});

// ── GET /api/revenue-intel/analytics ─────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const report = await getAnalytics(forceRefresh);
    res.json({ ok: true, ...report });
  } catch (err) {
    log.warn('GET /analytics failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Revenue analytics unavailable' });
  }
});

// ── GET /api/revenue-intel/health ─────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const report = await getAnalytics();
    res.json({
      ok:                   true,
      revenueHealthScore:   report.revenueHealthScore,
      concentrationRisk:    report.concentrationRisk,
      giniCoefficient:      report.giniCoefficient,
      totalEstimatedMRR:    report.totalEstimatedMRR,
      monetizationEfficiency: report.monetizationEfficiency,
      riskFlags:            report.riskFlags,
      recommendations:      report.recommendations,
      toolCount:            report.toolCount,
      analyzedAt:           report.analyzedAt,
    });
  } catch (err) {
    log.warn('GET /health failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Revenue health unavailable' });
  }
});

// ── GET /api/revenue-intel/optimization ──────────────────────────────────────
router.get('/optimization', async (req, res) => {
  try {
    const result = await getOptimization();
    res.json({ ok: true, ...result });
  } catch (err) {
    log.warn('GET /optimization failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Conversion optimization unavailable' });
  }
});

// ── GET /api/revenue-intel/pricing ───────────────────────────────────────────
router.get('/pricing', async (req, res) => {
  try {
    const result = await getPricing();
    res.json({ ok: true, ...result });
  } catch (err) {
    log.warn('GET /pricing failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Pricing intelligence unavailable' });
  }
});

// ── GET /api/revenue-intel/forecast ──────────────────────────────────────────
router.get('/forecast', async (req, res) => {
  try {
    const result = await getForecast();
    res.json({ ok: true, ...result });
  } catch (err) {
    log.warn('GET /forecast failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Revenue forecast unavailable' });
  }
});

// ── GET /api/revenue-intel/learning ──────────────────────────────────────────
router.get('/learning', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const signals = await getLearning(forceRefresh);
    res.json({ ok: true, ...signals });
  } catch (err) {
    log.warn('GET /learning failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Learning signals unavailable' });
  }
});

// ── POST /api/revenue-intel/refresh ──────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    invalidateAllCaches();
    const [analytics, learning] = await Promise.all([
      getAnalytics(true),
      getLearning(true),
    ]);
    res.json({
      ok:          true,
      message:     'Revenue intelligence caches refreshed',
      healthScore: analytics.revenueHealthScore,
      totalMRR:    analytics.totalEstimatedMRR,
      driftAlert:  learning.driftAlert,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    log.warn('POST /refresh failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Cache refresh failed' });
  }
});

// ── POST /api/revenue-intel/evaluate ─────────────────────────────────────────
router.post('/evaluate', async (req, res) => {
  try {
    const { toolId, toolSlug, category, predictedRevenue, actualRevenue, horizonDays, confidenceScore } = req.body;
    if (!toolId || actualRevenue == null || predictedRevenue == null) {
      return res.status(400).json({ ok: false, error: 'toolId, predictedRevenue, actualRevenue required' });
    }
    await RevenueLearningEngine.recordEvaluation({
      toolId, toolSlug, category, predictedRevenue, actualRevenue,
      horizonDays: horizonDays || 30,
      confidenceScore,
    });
    res.json({ ok: true, message: 'Evaluation recorded' });
  } catch (err) {
    log.warn('POST /evaluate failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Evaluation recording failed' });
  }
});

// ── POST /api/revenue-intel/tool/:id ─────────────────────────────────────────
router.post('/tool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: tool } = await require('../db/supabase')
      .from('tools')
      .select('*')
      .eq('id', id)
      .single();

    if (!tool) return res.status(404).json({ ok: false, error: 'Tool not found' });

    const report = await runToolRevenuePipeline(tool);
    res.json({ ok: true, ...report });
  } catch (err) {
    log.warn('POST /tool/:id failed', { error: err.message });
    res.status(500).json({ ok: false, error: 'Tool revenue pipeline failed' });
  }
});

module.exports = router;
