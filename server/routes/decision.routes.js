const express    = require('express');
const rateLimit  = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const { getDecision, getAllDecisions, approveDecision, rejectDecision } = require('../controllers/decision.controller');

const router = express.Router();

// 30 requests per minute per IP.
// Decision evaluation is DB-intensive (multi-table read + conditional write),
// so a tighter limit than the global 100/15min is warranted.
const decisionLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  message: { success: false, error: 'Too many decision requests — slow down.' },
});

// All decision routes require a valid JWT.
// The engine reads and conditionally writes tools.status — it must
// never be exposed to unauthenticated callers.
router.use(requireAuth);
router.use(decisionLimiter);

// GET /api/decision              — evaluate all live/scaling tools
// GET /api/decision/:tool_id     — evaluate one tool
//
// Order matters: specific route before param route so Express doesn't
// try to parse "all" as a tool_id UUID (it would fail UUID validation
// in the controller, but this is cleaner).
// POST routes BEFORE /:tool_id to prevent Express matching 'approve'/'reject' as a UUID param
router.post('/approve',  approveDecision);
router.post('/reject',   rejectDecision);
router.get('/',          getAllDecisions);
router.get('/:tool_id',  getDecision);

module.exports = router;
