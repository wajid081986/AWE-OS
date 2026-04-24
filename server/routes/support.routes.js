'use strict';

const express     = require('express');
const rateLimit   = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const {
  submitTicket,
  getDashboard,
  getTickets,
  getTicket,
  replyTicket,
  resolveTicketCtrl,
  getBugs,
  updateBug,
  getFeatures,
  updateFeature,
  getKnowledgeBase,
  getKBArticle,
  generateKB,
  kbHelpful,
  submitSurvey,
} = require('../controllers/support.controller');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────

const ticketLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.headers['x-forwarded-for'] || req.ip,
  message: {
    success: false,
    error:   'Too many tickets submitted. Try again in an hour.',
    code:    'RATE_LIMITED',
  },
});

// ── PUBLIC routes (no JWT) ────────────────────────────────────────────────────
// Register the literal /kb/generate FIRST so it is never swallowed by /kb/:slug
// (POST method differs from the GET /kb/:slug public route, but explicit ordering
// prevents /kb/:id/helpful from matching "generate" as an id param)

router.post('/kb/generate',   requireAuth, generateKB);

router.post('/ticket',        ticketLimiter, submitTicket);
router.get('/kb',             getKnowledgeBase);
router.get('/kb/:slug',       getKBArticle);
router.post('/kb/:id/helpful', kbHelpful);
router.post('/survey',        submitSurvey);

// ── JWT-protected routes ──────────────────────────────────────────────────────

router.use(requireAuth);

router.get('/dashboard',            getDashboard);

router.get('/tickets',              getTickets);
router.get('/ticket/:id',           getTicket);
router.post('/ticket/:id/reply',    replyTicket);
router.patch('/ticket/:id/resolve', resolveTicketCtrl);

router.get('/bugs',                 getBugs);
router.patch('/bug/:id',            updateBug);

router.get('/features',             getFeatures);
router.patch('/feature/:id',        updateFeature);

module.exports = router;
