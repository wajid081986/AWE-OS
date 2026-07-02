'use strict';

const express      = require('express');
const multer       = require('multer');
const crypto       = require('crypto');
const supabase     = require('../db/supabase');
const requireAuth  = require('../middleware/auth');
const { requireSeller } = require('../middleware/seller.middleware');
const { uploadFile, deleteFile } = require('../services/s3.service');

const router = express.Router();

const ALLOWED_PRODUCT_MIMES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PRODUCT_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
  },
});

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 60);
}

async function uniqueSlug(table, base) {
  let candidate = base || 'item';
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.from(table).select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
}

// ── POST /api/store/seller/register ──────────────────────────────────────────
router.post('/seller/register', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('store_sellers')
      .select('id')
      .eq('user_id', req.user.userId)
      .maybeSingle();
    if (existing) return res.status(400).json({ error: 'Already registered as a seller' });

    const {
      display_name, bio = '', avatar_url = null,
      payout_method = 'upi', upi_id = null,
      bank_account_name = null, bank_account_number = null, bank_ifsc = null,
      pan_number = null, gstin = null,
    } = req.body;
    if (!display_name) return res.status(400).json({ error: 'display_name is required' });

    const slug = await uniqueSlug('store_sellers', slugify(display_name));

    const { data, error } = await supabase
      .from('store_sellers')
      .insert({
        user_id: req.user.userId, display_name, slug, bio, avatar_url,
        payout_method, upi_id, bank_account_name, bank_account_number, bank_ifsc,
        pan_number, gstin,
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ seller: data });
  } catch (err) {
    console.error('POST /store/seller/register error:', err.message);
    res.status(500).json({ error: 'Seller registration failed' });
  }
});

// ── GET /api/store/seller/me ─────────────────────────────────────────────────
router.get('/seller/me', requireAuth, requireSeller, (req, res) => {
  res.json({ seller: req.seller });
});

// ── PUT /api/store/seller/me ─────────────────────────────────────────────────
router.put('/seller/me', requireAuth, requireSeller, async (req, res) => {
  try {
    const allowed = [
      'display_name', 'bio', 'avatar_url', 'payout_method', 'upi_id',
      'bank_account_name', 'bank_account_number', 'bank_ifsc', 'pan_number', 'gstin',
    ];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    const { data, error } = await supabase
      .from('store_sellers')
      .update(updates)
      .eq('id', req.seller.id)
      .select()
      .single();
    if (error) throw error;

    res.json({ seller: data });
  } catch (err) {
    console.error('PUT /store/seller/me error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── GET /api/store/seller/dashboard ──────────────────────────────────────────
router.get('/seller/dashboard', requireAuth, requireSeller, async (req, res) => {
  try {
    const sellerId = req.seller.id;

    const [{ count: productCount }, { data: recentOrders, error: ordersErr }] = await Promise.all([
      supabase.from('digital_products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId),
      supabase
        .from('purchases')
        .select('amount, seller_earnings_amount, purchased_at')
        .eq('seller_id', sellerId)
        .eq('type', 'product')
        .eq('status', 'completed')
        .gte('purchased_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    if (ordersErr) throw ordersErr;

    const byDay = {};
    for (const o of recentOrders) {
      const day = o.purchased_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + Number(o.seller_earnings_amount || 0);
    }
    const revenueSeries = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    res.json({
      productCount: productCount || 0,
      orderCount:   recentOrders.length,
      unpaidBalance: (req.seller.total_earnings || 0) - (req.seller.total_paid_out || 0),
      totalEarnings: req.seller.total_earnings || 0,
      totalPaidOut:  req.seller.total_paid_out || 0,
      revenueSeries,
    });
  } catch (err) {
    console.error('GET /store/seller/dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ── GET /api/store/seller/products ───────────────────────────────────────────
router.get('/seller/products', requireAuth, requireSeller, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select('*')
      .eq('seller_id', req.seller.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ products: data });
  } catch (err) {
    console.error('GET /store/seller/products error:', err.message);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// ── POST /api/store/seller/products ──────────────────────────────────────────
router.post('/seller/products', requireAuth, requireSeller, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, price, thumbnail_url, tags } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'title and price are required' });
    if (!req.file)        return res.status(400).json({ error: 'file is required' });

    const ext     = req.file.originalname.split('.').pop();
    const fileKey = `products/${crypto.randomBytes(16).toString('hex')}.${ext}`;
    await uploadFile(req.file.buffer, fileKey, req.file.mimetype);

    const slug = await uniqueSlug('digital_products', slugify(title));
    const tagList = tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : [];

    const { data, error } = await supabase
      .from('digital_products')
      .insert({
        title, description: description || '', category: category || 'General',
        price: parseFloat(price), file_key: fileKey,
        file_type: req.file.mimetype, file_size: req.file.size,
        thumbnail_url: thumbnail_url || null,
        seller_id: req.seller.id, slug, tags: tagList,
        status: 'pending', is_published: false,
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ product: data });
  } catch (err) {
    console.error('POST /store/seller/products error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── PUT /api/store/seller/products/:id ───────────────────────────────────────
router.put('/seller/products/:id', requireAuth, requireSeller, upload.single('file'), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('digital_products')
      .select('id, seller_id, file_key')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing || existing.seller_id !== req.seller.id) {
      return res.status(403).json({ error: 'You do not own this product' });
    }

    const { title, description, category, price, thumbnail_url, tags, is_published } = req.body;
    const updates = {};
    if (title          !== undefined) updates.title         = title;
    if (description   !== undefined) updates.description   = description;
    if (category       !== undefined) updates.category      = category;
    if (thumbnail_url  !== undefined) updates.thumbnail_url = thumbnail_url;
    if (tags           !== undefined) updates.tags          = String(tags).split(',').map(t => t.trim()).filter(Boolean);
    if (is_published    !== undefined) updates.is_published = is_published === true || is_published === 'true';

    // Price or file changes require re-approval before the listing goes live again.
    let needsReapproval = false;
    if (price !== undefined) {
      updates.price = parseFloat(price);
      needsReapproval = true;
    }
    if (req.file) {
      const ext     = req.file.originalname.split('.').pop();
      const fileKey = `products/${crypto.randomBytes(16).toString('hex')}.${ext}`;
      await uploadFile(req.file.buffer, fileKey, req.file.mimetype);
      updates.file_key  = fileKey;
      updates.file_type = req.file.mimetype;
      updates.file_size = req.file.size;
      needsReapproval = true;
      if (existing.file_key) await deleteFile(existing.file_key).catch(() => {});
    }
    if (needsReapproval) {
      updates.status = 'pending';
      updates.is_published = false;
    }

    const { data, error } = await supabase
      .from('digital_products')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    res.json({ product: data });
  } catch (err) {
    console.error('PUT /store/seller/products/:id error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── DELETE /api/store/seller/products/:id ────────────────────────────────────
router.delete('/seller/products/:id', requireAuth, requireSeller, async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('digital_products')
      .select('id, seller_id, file_key, sales_count')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing || existing.seller_id !== req.seller.id) {
      return res.status(403).json({ error: 'You do not own this product' });
    }
    if (existing.sales_count > 0) {
      return res.status(400).json({ error: 'Cannot delete a product that has sales. Unpublish it instead.' });
    }

    if (existing.file_key) await deleteFile(existing.file_key).catch(e => console.warn('S3 delete failed:', e.message));

    const { error } = await supabase.from('digital_products').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /store/seller/products/:id error:', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── GET /api/store/seller/orders ─────────────────────────────────────────────
router.get('/seller/orders', requireAuth, requireSeller, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('id, amount, seller_earnings_amount, payout_status, purchased_at, digital_products ( id, title, slug )')
      .eq('seller_id', req.seller.id)
      .eq('type', 'product')
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false });
    if (error) throw error;

    res.json({ orders: data });
  } catch (err) {
    console.error('GET /store/seller/orders error:', err.message);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// ── GET /api/store/seller/earnings ───────────────────────────────────────────
router.get('/seller/earnings', requireAuth, requireSeller, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('seller_earnings_amount, payout_status')
      .eq('seller_id', req.seller.id)
      .eq('type', 'product')
      .eq('status', 'completed');
    if (error) throw error;

    let unpaid = 0, pendingPayout = 0, paid = 0;
    for (const row of data) {
      const amt = Number(row.seller_earnings_amount || 0);
      if (row.payout_status === 'unpaid') unpaid += amt;
      else if (row.payout_status === 'pending_payout') pendingPayout += amt;
      else if (row.payout_status === 'paid') paid += amt;
    }

    res.json({ unpaid, pendingPayout, paid, total: unpaid + pendingPayout + paid });
  } catch (err) {
    console.error('GET /store/seller/earnings error:', err.message);
    res.status(500).json({ error: 'Failed to load earnings' });
  }
});

// ── POST /api/store/seller/payouts — request a payout ────────────────────────
router.post('/seller/payouts', requireAuth, requireSeller, async (req, res) => {
  try {
    const { data: unpaidOrders, error: fetchErr } = await supabase
      .from('purchases')
      .select('id, seller_earnings_amount')
      .eq('seller_id', req.seller.id)
      .eq('type', 'product')
      .eq('status', 'completed')
      .eq('payout_status', 'unpaid');
    if (fetchErr) throw fetchErr;
    if (!unpaidOrders.length) return res.status(400).json({ error: 'No unpaid earnings to request' });

    const amount = unpaidOrders.reduce((sum, o) => sum + Number(o.seller_earnings_amount || 0), 0);
    const payoutDestination = req.seller.payout_method === 'upi'
      ? { method: 'upi', upi_id: req.seller.upi_id }
      : {
          method: 'bank_transfer',
          bank_account_name:   req.seller.bank_account_name,
          bank_account_number: req.seller.bank_account_number,
          bank_ifsc:            req.seller.bank_ifsc,
        };

    const { data: payout, error: payoutErr } = await supabase
      .from('store_payouts')
      .insert({
        seller_id: req.seller.id, amount, payout_method: req.seller.payout_method,
        payout_destination: payoutDestination,
      })
      .select()
      .single();
    if (payoutErr) throw payoutErr;

    const { error: reserveErr } = await supabase
      .from('purchases')
      .update({ payout_status: 'pending_payout', payout_id: payout.id })
      .in('id', unpaidOrders.map(o => o.id))
      .eq('payout_status', 'unpaid');
    if (reserveErr) throw reserveErr;

    res.status(201).json({ payout });
  } catch (err) {
    console.error('POST /store/seller/payouts error:', err.message);
    res.status(500).json({ error: 'Payout request failed' });
  }
});

// ── GET /api/store/seller/payouts ────────────────────────────────────────────
router.get('/seller/payouts', requireAuth, requireSeller, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('store_payouts')
      .select('*')
      .eq('seller_id', req.seller.id)
      .order('requested_at', { ascending: false });
    if (error) throw error;

    res.json({ payouts: data });
  } catch (err) {
    console.error('GET /store/seller/payouts error:', err.message);
    res.status(500).json({ error: 'Failed to load payouts' });
  }
});

module.exports = router;
