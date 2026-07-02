'use strict';

const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── GET /api/store/wishlist ──────────────────────────────────────────────────
router.get('/wishlist', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('store_wishlists')
      .select('id, created_at, digital_products ( id, title, slug, price, thumbnail_url, category )')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ wishlist: data });
  } catch (err) {
    console.error('GET /store/wishlist error:', err.message);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

// ── POST /api/store/wishlist/:productId ──────────────────────────────────────
router.post('/wishlist/:productId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('store_wishlists')
      .upsert(
        { user_id: req.user.userId, product_id: req.params.productId },
        { onConflict: 'user_id,product_id', ignoreDuplicates: true }
      );
    if (error) throw error;

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('POST /store/wishlist/:productId error:', err.message);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// ── DELETE /api/store/wishlist/:productId ────────────────────────────────────
router.delete('/wishlist/:productId', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('store_wishlists')
      .delete()
      .eq('user_id', req.user.userId)
      .eq('product_id', req.params.productId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /store/wishlist/:productId error:', err.message);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
