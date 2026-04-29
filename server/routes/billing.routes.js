const express   = require('express');
const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const supabase  = require('../db/supabase');
const { requireAuth } = require('../middleware/admin.middleware');

const router = express.Router();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/billing/order
router.post('/order', requireAuth, async (req, res) => {
  const { toolSlug, amount } = req.body;
  if (!toolSlug || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'toolSlug and amount required' });
  }
  try {
    const order = await razorpay.orders.create({
      amount:   Math.round(Number(amount) * 100),
      currency: 'INR',
      notes:    { toolSlug, userId: req.user.userId },
    });
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/billing/verify
router.post('/verify', requireAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, toolSlug } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !toolSlug) {
    return res.status(400).json({ success: false, error: 'Missing payment verification fields' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Invalid payment signature' });
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('permissions')
      .eq('id', req.user.userId)
      .maybeSingle();

    const current    = Array.isArray(user?.permissions) ? user.permissions : [];
    const permission = `tool:${toolSlug}`;

    if (!current.includes(permission)) {
      const { error } = await supabase
        .from('users')
        .update({ permissions: [...current, permission] })
        .eq('id', req.user.userId);
      if (error) throw error;
    }

    res.json({ success: true, message: 'Tool unlocked' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
