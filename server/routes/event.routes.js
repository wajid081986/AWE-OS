const express     = require('express');
const rateLimit   = require('express-rate-limit');
const controller  = require('../controllers/event.controller');
const requireAuth = require('../middleware/auth');
const { validateEvent, validateRevenue, validateToolId } = require('../middleware/validateEvent');

// ── Rate limiter: 100 requests per minute per IP ──────────────
// Applied to the public /track endpoint only. Read endpoints are
// already protected by requireAuth which is a softer gate.
const trackLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  keyGenerator:   (req) => req.ip,
  message: { success: false, error: 'Too many requests — slow down.' },
});

// ── Event router — mounted at /api/events ─────────────────────
const eventRouter = express.Router();

// Public — anonymous tracking allowed (no auth required)
eventRouter.post('/track',
  trackLimiter,
  validateEvent,
  controller.trackEvent
);

// Protected — dashboard/analytics reads
eventRouter.get('/tool/:tool_id',
  requireAuth,
  validateToolId,
  controller.getToolEvents
);

eventRouter.get('/summary/:tool_id',
  requireAuth,
  validateToolId,
  controller.getSummary
);

// ── Revenue router — mounted at /api/revenue ──────────────────
const revenueRouter = express.Router();

revenueRouter.post('/log',
  requireAuth,
  validateRevenue,
  controller.logRevenue
);

revenueRouter.get('/:tool_id',
  requireAuth,
  validateToolId,
  controller.getRevenueSummary
);

module.exports = { eventRouter, revenueRouter };
