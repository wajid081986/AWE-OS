'use strict';

const crypto   = require('crypto');
const supabase = require('../db/supabase');

const TOKEN_TTL_MS   = 15 * 60 * 1000; // 15 minutes
const MAX_DOWNLOADS   = 5;

/**
 * Mints a single-use-window download token for a completed purchase.
 * Caller is responsible for verifying purchase ownership beforehand.
 */
async function mintToken({ purchaseId, productId, userId }) {
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('store_downloads')
    .insert({
      token,
      purchase_id:    purchaseId,
      product_id:     productId,
      user_id:        userId,
      expires_at:     expiresAt,
      max_downloads:  MAX_DOWNLOADS,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atomically validates + consumes one download from a token.
 * Returns the store_downloads row on success, or null if invalid/expired/exhausted.
 */
async function redeemToken(token) {
  const { data, error } = await supabase.rpc('fn_redeem_store_download_token', { p_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data || null;
}

module.exports = { mintToken, redeemToken, TOKEN_TTL_MS, MAX_DOWNLOADS };
