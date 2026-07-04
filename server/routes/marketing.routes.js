'use strict';

const express                     = require('express');
const rateLimit                   = require('express-rate-limit');
const requireAuth                 = require('../middleware/auth');
const { requireAdmin }            = require('../middleware/admin.middleware');
const {
  getDashboard,
  generateBlog,
  triggerWeeklyContent,
  getBlogs,
  updateBlogStatus,
  generateNewsletter,
  getNewsletters,
  generateAdCopy,
  getAdCopy,
  createReferral,
  getReferrals,
  trackReferralClick,
  generateInfluencers,
  getInfluencers,
  generateComparison,
  getComparisons,
  generateCampaign,
  getCampaigns,
  getCalendar,
  generateCalendar,
  getSocialQueue,
  sendNewsletterTest,
  sendNewsletterConfirm,
  unsubscribeNewsletter,
} = require('../controllers/marketing.controller');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────

const generateLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Generation limit reached. Try again in an hour.', code: 'RATE_LIMITED' },
});

const newsletterLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Generation limit reached. Try again in an hour.', code: 'RATE_LIMITED' },
});

const adLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Generation limit reached. Try again in an hour.', code: 'RATE_LIMITED' },
});

const calendarLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             2,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Generation limit reached. Try again in an hour.', code: 'RATE_LIMITED' },
});

// This one loops over every active tool, publishes live, and tweets — cap tight.
const weeklyContentTriggerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Trigger limit reached. Max 3/hour.', code: 'RATE_LIMITED' },
});

// ── Public routes (no JWT) ────────────────────────────────────

router.post('/referral/:code/click', trackReferralClick);
// The link a recipient clicks from inside a newsletter email itself —
// necessarily unauthenticated, gated only by the signed token in the URL.
router.get('/newsletter/unsubscribe', unsubscribeNewsletter);

// ── JWT-protected routes ──────────────────────────────────────

router.use(requireAuth);

router.get('/dashboard',             getDashboard);

router.post('/blog/generate',        generateLimiter,    generateBlog);
// Manually fires the exact weekly-content cron job (auto-publish + auto-tweet) —
// admin-only since it publishes live and posts to the company Twitter account.
router.post('/weekly-content/trigger', weeklyContentTriggerLimiter, requireAdmin, triggerWeeklyContent);
router.get('/blogs',                 getBlogs);
router.patch('/blog/:id/status',     updateBlogStatus);

router.post('/newsletter/generate',  newsletterLimiter,  generateNewsletter);
router.get('/newsletters',           getNewsletters);
// Real sends are admin-only and human-triggered — no cron path reaches these.
router.post('/newsletter/:id/send-test', requireAdmin, sendNewsletterTest);
router.post('/newsletter/:id/send',      requireAdmin, sendNewsletterConfirm);

router.post('/ads/generate',         adLimiter,          generateAdCopy);
router.get('/ads',                   getAdCopy);

router.post('/referral',             createReferral);
router.get('/referrals',             getReferrals);

router.post('/influencers/generate', generateLimiter,    generateInfluencers);
router.get('/influencers',           getInfluencers);

router.post('/comparison/generate',  generateLimiter,    generateComparison);
router.get('/comparisons',           getComparisons);

router.post('/campaign/generate',    generateLimiter,    generateCampaign);
router.get('/campaigns',             getCampaigns);

router.get('/calendar',              getCalendar);
router.post('/calendar/generate',    calendarLimiter,    generateCalendar);

// Operational visibility into the tweet retry queue — admin-only, same
// requireAuth (JWT) chain as the rest of this router.
router.get('/social-queue',          requireAdmin,       getSocialQueue);

module.exports = router;
