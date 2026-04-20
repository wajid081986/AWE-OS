const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  generateIdeas,
  getIdeas,
  getPendingIdeas,
  approveIdea,
  ignoreIdea,
} = require('../controllers/idea.controller');

const router = express.Router();

// AI generation is expensive and guarded by in-pipeline rate limit too
const generateLimiter = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hour
  max:             2,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  message: { success: false, error: 'Idea generation limit reached — max 2 per hour.', code: 'RATE_LIMITED' },
});

const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// All idea routes require JWT
router.use(requireAuth);

// ── Existing routes ───────────────────────────────────────────
// POST /api/ideas/generate
router.post('/generate', generateLimiter, generateIdeas);

// GET  /api/ideas
router.get('/', readLimiter, getIdeas);

// ── New routes ────────────────────────────────────────────────
// GET  /api/ideas/pending
router.get('/pending', readLimiter, getPendingIdeas);

// POST /api/ideas/approve
router.post('/approve', readLimiter, approveIdea);

// POST /api/ideas/ignore
router.post('/ignore', readLimiter, ignoreIdea);

module.exports = router;
