const Razorpay = require('razorpay');
const crypto   = require('crypto');

// ── Plan catalogue ───────────────────────────────────────────
// amounts are in paise (1 INR = 100 paise)
const PLANS = {
  pro_monthly: {
    id:           'pro_monthly',
    name:         'Pro Monthly',
    amount:       279900,        // ₹2799 ≈ $9.99
    currency:     'INR',
    interval:     'monthly',
    isPro:        true,
    expiresInDays: 31,
  },
  pro_yearly: {
    id:           'pro_yearly',
    name:         'Pro Yearly',
    amount:       2239900,       // ₹22399 ≈ $79.99
    currency:     'INR',
    interval:     'yearly',
    isPro:        true,
    expiresInDays: 366,
  },
  resume_builder: {
    id:           'resume_builder',
    name:         'Resume Builder (1 use)',
    amount:       19900,         // ₹199 ≈ $1.99
    currency:     'INR',
    interval:     'one_time',
    isPro:        false,
    toolSlug:     'resume-builder',
    expiresInDays: 1,
  },
  content_writer: {
    id:           'content_writer',
    name:         'AI Content Writer (1 use)',
    amount:       9900,          // ₹99 ≈ $0.99
    currency:     'INR',
    interval:     'one_time',
    isPro:        false,
    toolSlug:     'ai-content-writer',
    expiresInDays: 1,
  },
};

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function createOrder(planId, userId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount:   plan.amount,
    currency: plan.currency,
    receipt:  `rcpt_${planId}_${userId}_${Date.now()}`.slice(0, 40),
    notes: {
      user_id: userId,
      plan_id: planId,
    },
  });
  return { order, plan };
}

function verifySignature(orderId, paymentId, signature) {
  const body     = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
}

function verifyWebhookSignature(rawBody, signature) {
  const secret   = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

function getPlan(planId) {
  return PLANS[planId] || null;
}

function getAllPlans() {
  return Object.values(PLANS);
}

module.exports = { createOrder, verifySignature, verifyWebhookSignature, getPlan, getAllPlans, PLANS };
