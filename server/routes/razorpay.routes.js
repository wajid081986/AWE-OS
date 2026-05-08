const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');
const {
  getPlans,
  createOrder,
  verifyPayment,
  handleWebhook,
  checkCredit,
} = require('../controllers/payment.controller');

// ── Public ───────────────────────────────────────────────────
router.get('/plans',    getPlans);

// Webhook — Razorpay sends raw JSON; signature verified inside handler
router.post('/webhook', (req, res, next) => {
  // Capture raw body for signature verification
  req.rawBody = JSON.stringify(req.body);
  next();
}, handleWebhook);

// ── Authenticated ─────────────────────────────────────────────
router.post('/create-order', requireAuth, createOrder);
router.post('/verify',       requireAuth, verifyPayment);
router.get('/check-credit',  requireAuth, checkCredit);

module.exports = router;
