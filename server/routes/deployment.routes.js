'use strict';

const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  getHealth,
  preDeployCheck,
  startDeploy,
  completeDeploy,
  getHistory,
  getHealthHistory,
} = require('../controllers/deployment.controller');

const router = express.Router();

// Health checks: max 60/min (called every 30 min by cron + manual)
const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// Write operations: max 10/hour (start/complete deploys)
const writeLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many deploy operations. Max 10/hour.', code: 'RATE_LIMITED' },
});

router.use(requireAuth);

router.get('/health',         readLimiter,  getHealth);
router.post('/pre-check',     readLimiter,  preDeployCheck);
router.post('/start',         writeLimiter, startDeploy);
router.post('/complete',      writeLimiter, completeDeploy);
router.get('/history',        readLimiter,  getHistory);
router.get('/health-history', readLimiter,  getHealthHistory);

module.exports = router;
