const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  generatePlan,
  getPlanHandler,
  getAllPlansHandler,
  updateStatus,
} = require('../controllers/builder.controller');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────

// AI calls are expensive — 5 per minute prevents runaway costs
const generateLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  message: { success: false, error: 'AI generate limit reached — max 5/minute.', code: 'RATE_LIMITED' },
});

// Read + status updates: standard 30/min matches decision engine
const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// ── Admin guard ───────────────────────────────────────────────
// Only the user whose email matches ADMIN_EMAIL can trigger AI generation.
// If ADMIN_EMAIL is not set, any authenticated user can generate (dev mode).
function requireAdmin(req, res, next) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return next();

  if (req.user?.email !== adminEmail) {
    return res.status(403).json({
      success: false,
      error:   'Admin access required to generate build plans',
      code:    'FORBIDDEN',
    });
  }
  next();
}

// All builder routes require JWT
router.use(requireAuth);

// POST /api/builder/generate — admin + tight rate limit (AI cost control)
router.post('/generate',
  requireAdmin,
  generateLimiter,
  generatePlan
);

// GET  /api/builder/plans
router.get('/plans', readLimiter, getAllPlansHandler);

// GET  /api/builder/plan/:plan_id
router.get('/plan/:plan_id', readLimiter, getPlanHandler);

// PATCH /api/builder/plan/:plan_id/status
router.patch('/plan/:plan_id/status', readLimiter, updateStatus);

module.exports = router;
