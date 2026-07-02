'use strict';

const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/store/products/:id/reviews ────────────────────────────────────
// Requires a completed purchase of the product. Upserts (one review per user/product).
router.post('/products/:id/reviews', requireAuth, async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, title = '', body = '' } = req.body;
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('product_id', productId)
      .eq('type', 'product')
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false })
      .maybeSingle();
    if (purchaseErr) throw purchaseErr;
    if (!purchase) return res.status(403).json({ error: 'Purchase required before reviewing' });

    const { data, error } = await supabase
      .from('store_reviews')
      .upsert(
        {
          product_id:  productId,
          user_id:     req.user.userId,
          purchase_id: purchase.id,
          rating:      ratingNum,
          title,
          body,
        },
        { onConflict: 'product_id,user_id' }
      )
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ review: data });
  } catch (err) {
    console.error('POST /store/products/:id/reviews error:', err.message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
