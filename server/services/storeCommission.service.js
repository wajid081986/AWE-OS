'use strict';

const DEFAULT_COMMISSION_PCT = Number(process.env.STORE_PLATFORM_COMMISSION_PCT) || 20;

/**
 * Resolution order: product-level override -> seller-level override -> global default.
 */
function resolveCommissionPct(product, seller) {
  if (product?.commission_pct != null) return Number(product.commission_pct);
  if (seller?.commission_pct != null) return Number(seller.commission_pct);
  return DEFAULT_COMMISSION_PCT;
}

/**
 * Splits an order amount into platform fee and seller earnings, rounded to paise.
 */
function splitAmount(amount, commissionPct) {
  const platformFeeAmount = Math.round(amount * (commissionPct / 100) * 100) / 100;
  const sellerEarningsAmount = Math.round((amount - platformFeeAmount) * 100) / 100;
  return { platformFeeAmount, sellerEarningsAmount };
}

module.exports = { resolveCommissionPct, splitAmount, DEFAULT_COMMISSION_PCT };
