const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  generateCode,
  getCodeStatus,
  getAllCodes,
  approveCode,
  rejectCode,
} = require('../controllers/codegen.controller');

const router = express.Router();

// GPT-4 code generation is expensive — hard cap at 3/hour per IP
const generateLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             process.env.NODE_ENV === 'production' ? 10 : 50,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            (req) => req.user?.email === process.env.ADMIN_EMAIL,
  keyGenerator:    (req) => req.user?.userId || req.ip,
  message: {
    success: false,
    error:   'Code generation limit reached — max 10 per hour. GPT-4 calls are expensive.',
    code:    'RATE_LIMITED',
  },
});

const readLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests.', code: 'RATE_LIMITED' },
});

// All codegen routes require a valid JWT
router.use(requireAuth);

// POST /api/codegen/generate/:tool_id — start code generation (AI + DB save)
// Must be declared BEFORE /:tool_id to avoid Express path ambiguity
router.post('/generate/:tool_id', generateLimiter, generateCode);

// GET  /api/codegen — fetch ALL generated code records
router.get('/', readLimiter, getAllCodes);

// GET  /api/codegen/:tool_id — fetch generation status + code (safe to poll)
router.get('/:tool_id', readLimiter, getCodeStatus);

// POST /api/codegen/:code_id/approve — human approves code → tool → 'live'
router.post('/:code_id/approve', readLimiter, approveCode);

// POST /api/codegen/:code_id/reject — human rejects → stays 'building', can retry
router.post('/:code_id/reject', readLimiter, rejectCode);

module.exports = router;
