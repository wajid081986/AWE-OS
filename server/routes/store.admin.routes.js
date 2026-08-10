'use strict';

const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');

const router = express.Router();

// ── GET /api/store/admin/products/pending ────────────────────────────────────
router.get('/admin/products/pending', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select('*, store_sellers ( display_name, slug )')
      .eq('status', 'pending')
      .order('updated_at', { ascending: true });
    if (error) throw error;

    res.json({ products: data });
  } catch (err) {
    console.error('GET /store/admin/products/pending error:', err.message);
    res.status(500).json({ error: 'Failed to load pending products' });
  }
});

// ── POST /api/store/admin/products/:id/approve ───────────────────────────────
router.post('/admin/products/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .update({ status: 'approved', rejection_reason: null })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    res.json({ product: data });
  } catch (err) {
    console.error('POST /store/admin/products/:id/approve error:', err.message);
    res.status(500).json({ error: 'Approval failed' });
  }
});

// ── POST /api/store/admin/products/:id/reject ────────────────────────────────
router.post('/admin/products/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const { data, error } = await supabase
      .from('digital_products')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    res.json({ product: data });
  } catch (err) {
    console.error('POST /store/admin/products/:id/reject error:', err.message);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// ── PUT /api/store/admin/products/:id/price ──────────────────────────────────
// Admin-only price/currency correction for a pending listing before
// Approve/Reject — no ownership check, unlike the seller-side price edit,
// since this covers Platform (seller_id: null) rows too. Currency is
// display-only; it does not change how payment is actually collected.
router.put('/admin/products/:id/price', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { price, currency } = req.body;
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    if (currency !== 'INR' && currency !== 'USD') {
      return res.status(400).json({ error: "currency must be 'INR' or 'USD'" });
    }

    const { data, error } = await supabase
      .from('digital_products')
      .update({ price: parsedPrice, currency })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    res.json({ product: data });
  } catch (err) {
    console.error('PUT /store/admin/products/:id/price error:', err.message);
    res.status(500).json({ error: 'Price update failed' });
  }
});

// ── GET /api/store/admin/sellers ─────────────────────────────────────────────
router.get('/admin/sellers', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('store_sellers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ sellers: data });
  } catch (err) {
    console.error('GET /store/admin/sellers error:', err.message);
    res.status(500).json({ error: 'Failed to load sellers' });
  }
});

// ── PUT /api/store/admin/sellers/:id ─────────────────────────────────────────
router.put('/admin/sellers/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or suspended' });
    }

    const { data, error } = await supabase
      .from('store_sellers')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    res.json({ seller: data });
  } catch (err) {
    console.error('PUT /store/admin/sellers/:id error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── GET /api/store/admin/payouts/pending ──────────────────────────────────────
router.get('/admin/payouts/pending', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('store_payouts')
      .select('*, store_sellers ( display_name, slug )')
      .eq('status', 'requested')
      .order('requested_at', { ascending: true });
    if (error) throw error;

    res.json({ payouts: data });
  } catch (err) {
    console.error('GET /store/admin/payouts/pending error:', err.message);
    res.status(500).json({ error: 'Failed to load pending payouts' });
  }
});

// ── POST /api/store/admin/payouts/:id/mark-paid ───────────────────────────────
router.post('/admin/payouts/:id/mark-paid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reference_note = '' } = req.body;

    const { data: payout, error: fetchErr } = await supabase
      .from('store_payouts')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    if (payout.status !== 'requested') return res.status(400).json({ error: 'Payout already processed' });

    const { error: updateErr } = await supabase
      .from('store_payouts')
      .update({
        status: 'paid', reference_note,
        processed_at: new Date().toISOString(), processed_by: req.user.userId,
      })
      .eq('id', payout.id);
    if (updateErr) throw updateErr;

    const { error: purchasesErr } = await supabase
      .from('purchases')
      .update({ payout_status: 'paid' })
      .eq('payout_id', payout.id);
    if (purchasesErr) throw purchasesErr;

    const { data: seller } = await supabase
      .from('store_sellers')
      .select('total_paid_out')
      .eq('id', payout.seller_id)
      .maybeSingle();
    await supabase
      .from('store_sellers')
      .update({ total_paid_out: Number(seller?.total_paid_out || 0) + Number(payout.amount) })
      .eq('id', payout.seller_id);

    res.json({ success: true });
  } catch (err) {
    console.error('POST /store/admin/payouts/:id/mark-paid error:', err.message);
    res.status(500).json({ error: 'Failed to mark payout as paid' });
  }
});

// ── POST /api/store/admin/payouts/:id/reject ──────────────────────────────────
router.post('/admin/payouts/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason = '' } = req.body;

    const { data: payout, error: fetchErr } = await supabase
      .from('store_payouts')
      .select('id, status')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    if (payout.status !== 'requested') return res.status(400).json({ error: 'Payout already processed' });

    const { error: updateErr } = await supabase
      .from('store_payouts')
      .update({ status: 'rejected', admin_note: reason, processed_at: new Date().toISOString(), processed_by: req.user.userId })
      .eq('id', payout.id);
    if (updateErr) throw updateErr;

    const { error: releaseErr } = await supabase
      .from('purchases')
      .update({ payout_status: 'unpaid', payout_id: null })
      .eq('payout_id', payout.id);
    if (releaseErr) throw releaseErr;

    res.json({ success: true });
  } catch (err) {
    console.error('POST /store/admin/payouts/:id/reject error:', err.message);
    res.status(500).json({ error: 'Failed to reject payout' });
  }
});

// ── GET /api/store/admin/analytics ────────────────────────────────────────────
router.get('/admin/analytics', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('purchases')
      .select('amount, platform_fee_amount, seller_earnings_amount, seller_id, product_id, purchased_at')
      .eq('type', 'product')
      .eq('status', 'completed');
    if (error) throw error;

    const gmv               = orders.reduce((s, o) => s + Number(o.amount || 0), 0);
    const platformRevenue   = orders.reduce((s, o) => s + Number(o.platform_fee_amount || 0), 0);
    const orderCount        = orders.length;

    const bySeller = {};
    const byProduct = {};
    for (const o of orders) {
      if (o.seller_id) bySeller[o.seller_id] = (bySeller[o.seller_id] || 0) + Number(o.seller_earnings_amount || 0);
      byProduct[o.product_id] = (byProduct[o.product_id] || 0) + Number(o.amount || 0);
    }
    const topSellerIds  = Object.entries(bySeller).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topProductIds = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const [{ data: sellers }, { data: products }] = await Promise.all([
      topSellerIds.length
        ? supabase.from('store_sellers').select('id, display_name').in('id', topSellerIds.map(([id]) => id))
        : Promise.resolve({ data: [] }),
      topProductIds.length
        ? supabase.from('digital_products').select('id, title').in('id', topProductIds.map(([id]) => id))
        : Promise.resolve({ data: [] }),
    ]);

    const topSellers = topSellerIds.map(([id, revenue]) => ({
      id, revenue, name: sellers.find(s => s.id === id)?.display_name || 'Unknown',
    }));
    const topProducts = topProductIds.map(([id, revenue]) => ({
      id, revenue, name: products.find(p => p.id === id)?.title || 'Unknown',
    }));

    res.json({ gmv, platformRevenue, orderCount, topSellers, topProducts });
  } catch (err) {
    console.error('GET /store/admin/analytics error:', err.message);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;
