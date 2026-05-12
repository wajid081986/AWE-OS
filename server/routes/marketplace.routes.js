'use strict';

/**
 * AWE-OS — Marketplace Expansion API Routes                    Phase 6B
 *
 * All routes are admin-only.
 *
 * GET  /api/marketplace/trends           — trend analysis report
 * GET  /api/marketplace/opportunities    — ranked expansion opportunities
 * GET  /api/marketplace/health           — ecosystem health snapshot
 * GET  /api/marketplace/launch-queue     — current pending/in-progress queue
 * GET  /api/marketplace/expansion-plan   — full expansion plan
 * GET  /api/marketplace/recommendations  — learning-based recommendations
 * POST /api/marketplace/queue            — queue an opportunity for launch
 * POST /api/marketplace/approve/:id      — approve a queued opportunity
 * POST /api/marketplace/reject/:id       — reject a queued opportunity
 * POST /api/marketplace/refresh          — force-refresh all caches
 */

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const marketplace = require('../marketplace');

const router = express.Router();

// Conservative rate limit for heavy pipeline calls
const pipelineLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { error: 'Too many marketplace requests. Max 20 per minute.' },
});

// ── GET /api/marketplace/trends ──────────────────────────────────────────────
router.get('/trends', requireAuth, requireAdmin, pipelineLimiter, async (req, res) => {
  try {
    const trends = await marketplace.getTrends();
    res.json({ success: true, ...trends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/marketplace/opportunities ──────────────────────────────────────
router.get('/opportunities', requireAuth, requireAdmin, pipelineLimiter, async (req, res) => {
  try {
    const maxPerCategory = Math.min(Number(req.query.maxPerCategory) || 2, 5);
    const minScore       = Math.max(Number(req.query.minScore) || 40, 20);
    const ranked = await marketplace.getOpportunities({ maxPerCategory, minScore });
    res.json({ success: true, ...ranked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/marketplace/health ──────────────────────────────────────────────
router.get('/health', requireAuth, requireAdmin, pipelineLimiter, async (req, res) => {
  try {
    const health = await marketplace.getEcosystemHealth();
    res.json({ success: true, ...health });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/marketplace/launch-queue ────────────────────────────────────────
router.get('/launch-queue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const queue = await marketplace.getLaunchQueue();
    res.json({ success: true, queue, count: queue.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/marketplace/expansion-plan ──────────────────────────────────────
router.get('/expansion-plan', requireAuth, requireAdmin, pipelineLimiter, async (req, res) => {
  try {
    const report = await marketplace.runExpansionPipeline();
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/marketplace/recommendations ─────────────────────────────────────
router.get('/recommendations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const learning = await marketplace.getLearningSignals();
    res.json({ success: true, ...learning });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/marketplace/queue ──────────────────────────────────────────────
router.post('/queue', requireAuth, requireAdmin, async (req, res) => {
  const { opportunity } = req.body;
  if (!opportunity?.title || !opportunity?.category) {
    return res.status(400).json({ success: false, error: 'opportunity.title and opportunity.category are required' });
  }

  try {
    const result = await marketplace.queueOpportunity(opportunity, req.user.userId);
    if (!result.success) {
      return res.status(422).json({ success: false, error: result.message });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/marketplace/approve/:id ────────────────────────────────────────
router.post('/approve/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await marketplace.approveLaunch(req.params.id, req.user.userId);
    if (!result.success) {
      return res.status(422).json({ success: false, error: result.message });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/marketplace/reject/:id ─────────────────────────────────────────
router.post('/reject/:id', requireAuth, requireAdmin, async (req, res) => {
  const { reason = '' } = req.body;
  try {
    const result = await marketplace.rejectLaunch(req.params.id, reason, req.user.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/marketplace/refresh ────────────────────────────────────────────
router.post('/refresh', requireAuth, requireAdmin, async (req, res) => {
  try {
    marketplace.invalidateAllCaches();
    const report = await marketplace.runExpansionPipeline({ forceRefresh: true });
    res.json({ success: true, message: 'All caches invalidated and pipeline re-run', ...report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
