'use strict';

/**
 * AWE-OS — Self-Healing API Routes                               Phase 6E
 *
 * GET  /api/self-healing/overview          — full system healing overview
 * GET  /api/self-healing/resilience        — survivability score + dimensions
 * GET  /api/self-healing/failures          — predictive failure alerts
 * GET  /api/self-healing/recovery          — recovery status + pending retries
 * GET  /api/self-healing/emergency-routing — active emergencies + reroutes
 * GET  /api/self-healing/isolation         — circuit breakers + quarantines
 * GET  /api/self-healing/repair            — auto-repair status
 * GET  /api/self-healing/health            — quick health check
 * POST /api/self-healing/heal              — force immediate healing cycle
 * POST /api/self-healing/repair/:domain    — force repair for specific domain
 * POST /api/self-healing/recover/:id       — force recovery for execution
 */

const express = require('express');
const router  = express.Router();

const SelfHealing = require('../selfHealing');

const { createLogger } = require('../monitoring/logger');
const log = createLogger('route-self-healing');

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      res.json({ success: true, data: result });
    } catch (err) {
      log.error('Self-healing route error', { path: req.path, error: err.message });
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

// GET /api/self-healing/overview
router.get('/overview', wrap(async (req) => {
  const force = req.query.refresh === 'true';
  return SelfHealing.getOverview(force);
}));

// GET /api/self-healing/resilience
router.get('/resilience', wrap(async (req) => {
  const force = req.query.refresh === 'true';
  return SelfHealing.SystemResilienceEngine.getResilienceReport(force);
}));

// GET /api/self-healing/failures
router.get('/failures', wrap(async (req) => {
  const force = req.query.refresh === 'true';
  return SelfHealing.PredictiveFailureEngine.getPredictiveReport(force);
}));

// GET /api/self-healing/recovery
router.get('/recovery', wrap(async () => {
  return SelfHealing.RuntimeRecoveryEngine.getRecoveryStatus();
}));

// GET /api/self-healing/emergency-routing
router.get('/emergency-routing', wrap(async () => {
  return SelfHealing.EmergencyRoutingEngine.getRoutingStatus();
}));

// GET /api/self-healing/isolation
router.get('/isolation', wrap(async () => {
  return SelfHealing.FaultIsolationEngine.getIsolationStatus();
}));

// GET /api/self-healing/repair
router.get('/repair', wrap(async () => {
  return SelfHealing.AutoRepairEngine.getRepairStatus();
}));

// GET /api/self-healing/health
router.get('/health', wrap(async () => {
  const score = await SelfHealing.SystemResilienceEngine.getSurvivabilityScore();
  const alerts = await SelfHealing.PredictiveFailureEngine.getActiveAlerts();
  const isolation = SelfHealing.FaultIsolationEngine.getIsolationStatus();
  return {
    status:              score >= 60 ? 'healthy' : score >= 35 ? 'degraded' : 'critical',
    survivabilityScore:  score,
    activeAlerts:        alerts.length,
    openCircuits:        isolation.openCircuits,
    quarantinedModules:  isolation.quarantinedCount,
    checkedAt:           new Date().toISOString(),
  };
}));

// POST /api/self-healing/heal
router.post('/heal', wrap(async () => {
  return SelfHealing.forceHeal();
}));

// POST /api/self-healing/repair/:domain
router.post('/repair/:domain', wrap(async (req) => {
  const { domain } = req.params;
  return SelfHealing.AutoRepairEngine.repairDomain(domain);
}));

// POST /api/self-healing/recover/:id
router.post('/recover/:id', wrap(async (req) => {
  const { id } = req.params;
  const action  = req.body?.action || 'reconcile';
  return SelfHealing.RuntimeRecoveryEngine.recoverExecution(id, action);
}));

module.exports = router;
