-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 024 — Baseline: digital_products & purchases
--
-- `digital_products` and `purchases` have existed live in Supabase since the
-- single-vendor digital-product store shipped, but were never captured in a
-- tracked migration. This file records their current live shape so migration
-- history is honest before 025 layers marketplace columns on top.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS is a no-op against the live DB
-- (tables already exist there) — this only matters for fresh/staging DBs.
--
-- `purchases` is a generic ledger shared across purchase kinds in AWE-OS
-- (digital products, subscriptions, credits, etc.) — `type` identifies the
-- kind and `ref_id` is a free-form external reference (e.g. a Razorpay order
-- ID). `product_id` is the digital-product-specific FK used by the store.
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. digital_products ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS digital_products (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  category      TEXT        NOT NULL DEFAULT 'General',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  file_key      TEXT,
  thumbnail_url TEXT,
  file_type     TEXT,
  file_size     BIGINT,
  is_published  BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE digital_products IS
  'Digital products store catalog. Originally single-vendor (admin-only uploads); extended to multi-vendor in migration 025.';


-- ── 2. purchases ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchases (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL,
  product_id   UUID        REFERENCES digital_products(id) ON DELETE CASCADE,
  type         TEXT,
  ref_id       TEXT,
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE purchases IS
  'Generic purchase ledger (digital products, subscriptions, credits, etc.). Extended with commission/payout tracking for the digital-product store in migration 025.';

CREATE INDEX IF NOT EXISTS idx_purchases_user
  ON purchases (user_id);

CREATE INDEX IF NOT EXISTS idx_purchases_product
  ON purchases (product_id);

CREATE INDEX IF NOT EXISTS idx_purchases_ref_id
  ON purchases (ref_id);
