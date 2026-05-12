'use strict';

/**
 * AWE-OS — Agent Economy API Routes                              Phase 6D
 *
 * GET  /api/agent-economy/overview         — full economy overview
 * GET  /api/agent-economy/leaderboard      — economy rankings
 * GET  /api/agent-economy/marketplace      — demand heatmaps + routing matrix
 * GET  /api/agent-economy/specializations  — specialization analysis
 * GET  /api/agent-economy/contributions    — contribution rankings
 * GET  /api/agent-economy/coordination     — coordination analysis
 * GET  /api/agent-economy/health           — economy health summary
 * POST /api/agent-economy/refresh          — force-refresh all caches
 * POST /api/agent-economy/route            — route a task to the optimal agent
 */

const express = require('express');
const router  = express.Router();
const {
  getOverview,
  getLeaderboard,
  getMarketplace,
  getSpecializations,
  getContributions,
  getCoordination,
  getHealth,
  routeTask,
  refreshAll,
} = require('../agents/economy');

const { createLogger } = require('../monitoring/logger');
const log = createLogger('route-agent-economy');

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      res.json({ success: true, data: result });
    } catch (err) {
      log.error('Agent economy route error', { path: req.path, error: err.message });
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

// GET /api/agent-economy/overview
router.get('/overview', wrap(async (req) => {
  const force = req.query.refresh === 'true';
  return getOverview(force);
}));

// GET /api/agent-economy/leaderboard
router.get('/leaderboard', wrap(async () => {
  return getLeaderboard();
}));

// GET /api/agent-economy/marketplace
router.get('/marketplace', wrap(async (req) => {
  const force = req.query.refresh === 'true';
  return getMarketplace(force);
}));

// GET /api/agent-economy/specializations
router.get('/specializations', wrap(async () => {
  return getSpecializations();
}));

// GET /api/agent-economy/contributions
router.get('/contributions', wrap(async () => {
  return getContributions();
}));

// GET /api/agent-economy/coordination
router.get('/coordination', wrap(async () => {
  return getCoordination();
}));

// GET /api/agent-economy/health
router.get('/health', wrap(async () => {
  return getHealth();
}));

// POST /api/agent-economy/refresh
router.post('/refresh', wrap(async () => {
  return refreshAll();
}));

// POST /api/agent-economy/route
router.post('/route', wrap(async (req) => {
  const { category, capability, priority } = req.body || {};
  if (!category) return { routed: false, reason: 'missing_category' };
  return routeTask({ category, capability, priority });
}));

module.exports = router;
