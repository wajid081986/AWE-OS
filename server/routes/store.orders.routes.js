'use strict';

const express     = require('express');
const crypto      = require('crypto');
const rateLimit   = require('express-rate-limit');
const Razorpay    = require('razorpay');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');
const { resolveCommissionPct, splitAmount } = require('../services/storeCommission.service');

const router = express.Router();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Scoped to order create/verify only — GET /orders/my stays unlimited like the
// rest of the app's read endpoints.
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many payment attempts.' },
});

// ── POST /api/store/orders — create Razorpay order ────────────────────────────
router.post('/orders', requireAuth, orderLimiter, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required' });

    const { data: product, error: productErr } = await supabase
      .from('digital_products')
      .select('id, title, price, status, is_published, seller_id, commission_pct')
      .eq('id', productId)
      .maybeSingle();
    if (productErr) throw productErr;
    if (!product || product.status !== 'approved' || !product.is_published) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('product_id', productId)
      .eq('type', 'digital_product')
      .eq('status', 'completed')
      .maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already purchased' });

    let seller = null;
    if (product.seller_id) {
      const { data } = await supabase
        .from('store_sellers')
        .select('id, commission_pct')
        .eq('id', product.seller_id)
        .maybeSingle();
      seller = data;
    }

    const commissionPct = resolveCommissionPct(product, seller);
    const { platformFeeAmount, sellerEarningsAmount } = splitAmount(product.price, commissionPct);

    const amountPaise = Math.round(product.price * 100);
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      notes:    { userId: req.user.userId, productId },
    });

    const { error: insertErr } = await supabase.from('purchases').insert({
      user_id:                req.user.userId,
      product_id:             productId,
      seller_id:               product.seller_id,
      type:                    'digital_product',
      ref_id:                  order.id,
      amount:                  product.price,
      status:                  'created',
      platform_fee_amount:     platformFeeAmount,
      seller_earnings_amount:  sellerEarningsAmount,
    });
    if (insertErr) throw insertErr;

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, productName: product.title });
  } catch (err) {
    console.error('POST /store/orders error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── POST /api/store/orders/verify — verify signature, complete order ──────────
router.post('/orders/verify', requireAuth, orderLimiter, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .select('id, status')
      .eq('ref_id', razorpay_order_id)
      .eq('user_id', req.user.userId)
      .eq('type', 'digital_product')
      .maybeSingle();
    if (purchaseErr) throw purchaseErr;
    if (!purchase) return res.status(404).json({ error: 'Order not found' });
    if (purchase.status === 'completed') return res.json({ success: true });

    const { error: updateErr } = await supabase
      .from('purchases')
      .update({ status: 'completed' })
      .eq('id', purchase.id);
    if (updateErr) throw updateErr;

    res.json({ success: true });
  } catch (err) {
    console.error('POST /store/orders/verify error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── GET /api/store/orders/my ────────────────────────────────────────────────
router.get('/orders/my', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('id, amount, status, purchased_at, digital_products ( id, title, slug, thumbnail_url, category )')
      .eq('user_id', req.user.userId)
      .eq('type', 'digital_product')
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false });
    if (error) throw error;

    res.json({ orders: data });
  } catch (err) {
    console.error('GET /store/orders/my error:', err.message);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

module.exports = router;
