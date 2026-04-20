const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  analyze, getStrategies, updateStatus,
  createExperiment, recordView, recordConversion,
  concludeExp, getExperiments,
} = require('../controllers/monetization.controller');

const router = express.Router();

// AI analysis calls are expensive — cap at 5/hour per user
const analyzeLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.user?.userId || req.ip,
  message: { success: false, error: 'Analysis limit reached — max 5/hour.', code: 'RATE_LIMITED' },
});

const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// All routes require JWT
router.use(requireAuth);

// ── Strategy routes ───────────────────────────────────────────
router.post('/analyze/:tool_id',        analyzeLimiter, analyze);
router.get('/strategies/:tool_id',      readLimiter,    getStrategies);
router.patch('/strategy/:id/status',    readLimiter,    updateStatus);

// ── Experiment routes ─────────────────────────────────────────
router.post('/experiment',              readLimiter,    createExperiment);
router.post('/experiment/:id/view',     readLimiter,    recordView);
router.post('/experiment/:id/convert',  readLimiter,    recordConversion);
router.post('/experiment/:id/conclude', readLimiter,    concludeExp);
router.get('/experiments/:tool_id',     readLimiter,    getExperiments);

module.exports = router;
