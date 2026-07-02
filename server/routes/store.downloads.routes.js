'use strict';

const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');
const { generatePresignedUrl } = require('../services/s3.service');
const { mintToken, redeemToken } = require('../services/downloadToken.service');

const router = express.Router();

// ── POST /api/store/downloads/:purchaseId/token ────────────────────────────
// Ownership-checked. Mints a short-lived, download-count-limited token that can
// then be redeemed without an auth header (safe for a plain <a href>).
router.post('/downloads/:purchaseId/token', requireAuth, async (req, res) => {
  try {
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select('id, user_id, status, product_id, digital_products ( file_key )')
      .eq('id', req.params.purchaseId)
      .eq('type', 'product')
      .maybeSingle();
    if (error) throw error;
    if (!purchase || purchase.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Purchase required' });
    }
    if (purchase.status !== 'completed') {
      return res.status(400).json({ error: 'Purchase not completed' });
    }
    if (!purchase.digital_products?.file_key) {
      return res.status(404).json({ error: 'File not available' });
    }

    const row = await mintToken({
      purchaseId: purchase.id,
      productId:  purchase.product_id,
      userId:     req.user.userId,
    });

    res.json({ token: row.token, expiresAt: row.expires_at });
  } catch (err) {
    console.error('POST /store/downloads/:purchaseId/token error:', err.message);
    res.status(500).json({ error: 'Failed to create download link' });
  }
});

// ── GET /api/store/downloads/:token ─────────────────────────────────────────
// Token-only (no auth header) — the token itself is the credential.
router.get('/downloads/:token', async (req, res) => {
  try {
    const row = await redeemToken(req.params.token);
    if (!row) return res.status(410).json({ error: 'Download link expired or exhausted' });

    const { data: product, error } = await supabase
      .from('digital_products')
      .select('file_key, title')
      .eq('id', row.product_id)
      .maybeSingle();
    if (error) throw error;
    if (!product?.file_key) return res.status(404).json({ error: 'File not available' });

    const url = await generatePresignedUrl(product.file_key, 300, product.title);
    res.json({ url });
  } catch (err) {
    console.error('GET /store/downloads/:token error:', err.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

module.exports = router;
