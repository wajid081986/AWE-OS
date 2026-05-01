const Razorpay = require('razorpay');
const crypto   = require('crypto');
const supabase = require('../db/supabase');

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function createOrder(req, res) {
  try {
    const razorpay = getRazorpay();
    const options  = {
      amount:   4900, // ₹49 in paise
      currency: 'INR',
      receipt:  `rcpt_${req.user.userId}_${Date.now()}`,
      notes: {
        user_id: req.user.userId,
        email:   req.user.email,
        purpose: 'AWE-OS Premium Upgrade',
      },
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (err) {
    console.error('[PAYMENT] createOrder error:', err.message);
    res.status(500).json({ success: false, error: 'Could not create payment order' });
  }
}

async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment fields' });
    }

    const body              = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[PAYMENT] Invalid signature for user:', req.user.userId);
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        isPremium:           true,
        premium_since:       new Date().toISOString(),
        razorpay_payment_id: razorpay_payment_id,
      })
      .eq('id', req.user.userId);

    if (updateError) throw updateError;

    await supabase.from('revenue_logs').insert({
      user_id:             req.user.userId,
      amount:              49,
      type:                'subscription',
      currency:            'INR',
      status:              'paid',
      payment_id:          razorpay_payment_id,
      razorpay_payment_id: razorpay_payment_id,
      order_id:            razorpay_order_id,
    });

    console.log('[PAYMENT] Premium activated for:', req.user.email);
    res.json({ success: true, message: 'Premium activated!' });
  } catch (err) {
    console.error('[PAYMENT] verifyPayment error:', err.message);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
}

module.exports = { createOrder, verifyPayment };
