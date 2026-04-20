const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const { triggerRun, getLogs, getLastRun } = require('../controllers/autonomous.controller');

const router = express.Router();

// POST trigger is expensive (runs OpenAI + DB writes): max 5 per hour
const triggerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  message: { success: false, error: 'Manual trigger limit reached — max 5/hour.', code: 'RATE_LIMITED' },
});

// Read endpoints: standard 30/min
const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// All routes require a valid JWT
router.use(requireAuth);

router.post('/run',      triggerLimiter, triggerRun);
router.get('/logs',      readLimiter,    getLogs);
router.get('/last-run',  readLimiter,    getLastRun);

module.exports = router;
