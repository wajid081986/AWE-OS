const supabase = require('../db/supabase');
const {
  createOrder: svcCreateOrder,
  verifySignature,
  verifyWebhookSignature,
  getPlan,
  getAllPlans,
} = require('../services/payment.service');

// ── GET /api/payment/plans ───────────────────────────────────
async function getPlans(req, res) {
  try {
    const plans = getAllPlans().map(p => ({
      id:       p.id,
      name:     p.name,
      amount:   p.amount,
      currency: p.currency,
      interval: p.interval,
      isPro:    p.isPro,
      toolSlug: p.toolSlug || null,
    }));
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /api/payment/create-order ───────────────────────────
async function createOrder(req, res) {
  const { plan: planId } = req.body;
  if (!planId) return res.status(400).json({ success: false, error: 'plan is required' });

  try {
    const { order, plan } = await svcCreateOrder(planId, req.user.userId);
    res.json({
      success:  true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      process.env.RAZORPAY_KEY_ID,
      plan:     plan.id,
      planName: plan.name,
    });
  } catch (err) {
    console.error('[PAYMENT] createOrder:', err.message);
    res.status(500).json({ success: false, error: 'Could not create payment order' });
  }
}

// ── POST /api/payment/verify ─────────────────────────────────
async function verifyPayment(req, res) {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    plan: planId,
  } = req.body;

  if (!orderId || !paymentId || !signature || !planId) {
    return res.status(400).json({ success: false, error: 'Missing required payment fields' });
  }

  if (!verifySignature(orderId, paymentId, signature)) {
    console.error('[PAYMENT] Invalid signature for user:', req.user.userId);
    return res.status(400).json({ success: false, error: 'Payment verification failed' });
  }

  const plan = getPlan(planId);
  if (!plan) return res.status(400).json({ success: false, error: 'Unknown plan' });

  const userId    = req.user.userId;
  const expiresAt = new Date(Date.now() + plan.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  const amountINR = plan.amount / 100

  try {
    // Record in payment_history
    await supabase.from('payment_history').insert({
      user_id:             userId,
      amount:              amountINR,
      currency:            plan.currency,
      plan:                planId,
      tool_slug:           plan.toolSlug || null,
      razorpay_order_id:   orderId,
      razorpay_payment_id: paymentId,
      status:              'paid',
    });

    // Upsert subscription
    await supabase.from('subscriptions').upsert({
      user_id:                userId,
      plan:                   planId,
      status:                 'active',
      razorpay_payment_id:    paymentId,
      amount_paid:            amountINR,
      currency:               plan.currency,
      started_at:             new Date().toISOString(),
      expires_at:             expiresAt,
    }, { onConflict: 'user_id' });

    // Update users table — set subscription_plan for pro plans
    const userUpdate = {
      razorpay_payment_id: paymentId,
      is_premium:          plan.isPro,
      subscription_plan:   planId,
      subscription_expires_at: expiresAt,
    };
    await supabase.from('users').update(userUpdate).eq('id', userId);

    // Fetch updated user for response
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, email, is_premium, role, permissions, subscription_status, subscription_plan')
      .eq('id', userId)
      .maybeSingle();

    const userPayload = updatedUser ? {
      id:               updatedUser.id,
      email:            updatedUser.email,
      role:             updatedUser.role             ?? 'user',
      permissions:      updatedUser.permissions       ?? [],
      isPremium:        updatedUser.is_premium        ?? false,
      subscriptionStatus: updatedUser.subscription_status ?? 'active',
      subscriptionPlan: updatedUser.subscription_plan ?? planId,
    } : null;

    console.log(`[PAYMENT] Plan "${planId}" activated for ${req.user.email}`);
    res.json({ success: true, plan: planId, expiresAt, user: userPayload });
  } catch (err) {
    console.error('[PAYMENT] verifyPayment error:', err.message);
    res.status(500).json({ success: false, error: 'Payment recording failed' });
  }
}

// ── POST /api/payment/webhook ────────────────────────────────
async function handleWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody   = req.rawBody || JSON.stringify(req.body);

  if (signature && !verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event   = req.body?.event;
  const payload = req.body?.payload;

  try {
    if (event === 'payment.captured') {
      const payment = payload?.payment?.entity;
      if (payment?.notes?.user_id) {
        await supabase.from('payment_history')
          .update({ status: 'confirmed' })
          .eq('razorpay_payment_id', payment.id);
      }
    }

    if (event === 'subscription.charged' || event === 'subscription.activated') {
      const sub = payload?.subscription?.entity;
      if (sub?.notes?.user_id) {
        await supabase.from('subscriptions')
          .update({ status: 'active' })
          .eq('razorpay_subscription_id', sub.id);
      }
    }

    if (event === 'subscription.cancelled') {
      const sub = payload?.subscription?.entity;
      if (sub?.notes?.user_id) {
        await supabase.from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('razorpay_subscription_id', sub.id);
        await supabase.from('users')
          .update({ subscription_plan: 'free', is_premium: false })
          .eq('id', sub.notes.user_id);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[WEBHOOK] Error processing webhook:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ── POST /api/payment/check-credit ──────────────────────────
// Check if user has a valid pay-per-use credit for a tool
async function checkCredit(req, res) {
  const { toolSlug } = req.query;
  if (!toolSlug) return res.status(400).json({ success: false, error: 'toolSlug required' });

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('payment_history')
      .select('id, status, created_at')
      .eq('user_id', req.user.userId)
      .eq('tool_slug', toolSlug)
      .eq('status', 'paid')
      .gte('created_at', since)
      .limit(1)
      .maybeSingle();

    res.json({ success: true, hasCredit: !!data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getPlans, createOrder, verifyPayment, handleWebhook, checkCredit };
