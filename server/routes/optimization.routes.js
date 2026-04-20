const express     = require('express');
const rateLimit   = require('express-rate-limit');
const router      = express.Router();
const auth        = require('../middleware/auth');
const {
  analyzeTool,
  getSuggestions,
  applySuggestion,
  dismissSuggestion,
  runAll,
} = require('../controllers/optimization.controller');

// Rate limit — AI calls are expensive
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: 'Too many analysis requests'
  },
});

// All routes JWT protected
router.post('/analyze/:tool_id',         auth, analyzeLimiter, analyzeTool);
router.get('/suggestions/:tool_id',      auth, getSuggestions);
router.patch('/suggestion/:id/apply',    auth, applySuggestion);
router.patch('/suggestion/:id/dismiss',  auth, dismissSuggestion);
router.post('/run-all',                  auth, runAll);

module.exports = router;
