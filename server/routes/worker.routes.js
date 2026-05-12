'use strict';

/**
 * AWE-OS — Worker Routes                                       Phase 4E/4F
 *
 * Admin-only endpoints for distributed worker status and cluster health.
 *
 *   GET /api/workers/status      — this worker's info + all live workers
 *   GET /api/workers/dead        — dead workers (missed heartbeat)
 *   GET /api/workers/cluster     — cluster-wide summary
 *   POST /api/workers/rebalance  — force an immediate rebalance cycle
 */

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { workerRegistry }  = require('../runtime/distributed/WorkerRegistry');
const { rebalancer }      = require('../runtime/distributed/Rebalancer');
const { healthEngine }    = require('../runtime/reliability/HealthEngine');
const { getAllStats: getAllCircuitStats } = require('../runtime/reliability/CircuitBreaker');
const { backpressureManager } = require('../runtime/reliability/BackpressureManager');
const { collectWarnings } = require('../monitoring/diagnostics');

const router = express.Router();

// ── GET /api/workers/status ───────────────────────────────────────────────────
router.get('/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [self, live] = await Promise.all([
      Promise.resolve(workerRegistry.getInfo()),
      workerRegistry.getLiveWorkers(),
    ]);
    res.json({ success: true, data: { self, workers: live, count: live.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/workers/dead ─────────────────────────────────────────────────────
router.get('/dead', requireAuth, requireAdmin, async (req, res) => {
  try {
    const dead = await workerRegistry.getDeadWorkers();
    res.json({ success: true, data: dead, count: dead.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/workers/cluster ──────────────────────────────────────────────────
router.get('/cluster', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [live, dead, health, warnings] = await Promise.allSettled([
      workerRegistry.getLiveWorkers(),
      workerRegistry.getDeadWorkers(),
      healthEngine.assess(),
      collectWarnings(),
    ]);

    res.json({
      success: true,
      data: {
        workers: {
          live:  live.status  === 'fulfilled' ? live.value  : [],
          dead:  dead.status  === 'fulfilled' ? dead.value  : [],
        },
        health:         health.status   === 'fulfilled' ? health.value  : null,
        warnings:       warnings.status === 'fulfilled' ? warnings.value : [],
        circuitBreakers: getAllCircuitStats(),
        backpressure:   backpressureManager.getStats(),
        generatedAt:    new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/workers/rebalance ───────────────────────────────────────────────
router.post('/rebalance', requireAuth, requireAdmin, async (req, res) => {
  try {
    await rebalancer.runNow();
    res.json({ success: true, message: 'Rebalance cycle triggered' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
