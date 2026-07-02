-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 025 — Multi-Vendor Store Marketplace
--
-- Extends the existing single-vendor digital_products/purchases store (baselined
-- in migration 024) into a multi-vendor marketplace: sellers, commission split,
-- payouts, reviews, wishlists, secure download tokens.
--
-- Naming note: uses the `store_` prefix and is served at `/api/store/*` by design
-- — `marketplace_*` (migration 015) and `/api/marketplace/*` already belong to an
-- unrelated autonomous AI tool-expansion engine and are not touched here.
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS / IF EXISTS guards; backfill UPDATEs
-- are idempotent (re-deriving the same values from existing columns).
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. store_sellers ────────────────────────────────────────────────────────
-- Membership in this table (row exists) IS the "is a seller" signal — no role
-- column added to `users`. status='suspended' revokes selling ability without
-- deleting the seller's history/products.

CREATE TABLE IF NOT EXISTS store_sellers (
  id                   UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name         TEXT          NOT NULL,
  slug                 TEXT          NOT NULL UNIQUE,
  bio                  TEXT          NOT NULL DEFAULT '',
  avatar_url           TEXT,
  status               TEXT          NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'suspended')),
  payout_method        TEXT          NOT NULL DEFAULT 'upi' CHECK (payout_method IN ('upi', 'bank_transfer')),
  upi_id               TEXT,
  bank_account_name    TEXT,
  bank_account_number  TEXT,
  bank_ifsc            TEXT,
  pan_number           TEXT,
  gstin                TEXT,
  commission_pct       NUMERIC(5,2),
  total_earnings       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid_out       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE store_sellers IS
  'Marketplace seller profiles. Row existence = seller status; status=suspended blocks selling without deleting history.';

CREATE INDEX IF NOT EXISTS idx_store_sellers_status
  ON store_sellers (status);


-- ── 2. digital_products — extend for multi-vendor ──────────────────────────

ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS seller_id      UUID REFERENCES store_sellers(id) ON DELETE SET NULL;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS slug           TEXT;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS is_published   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2);
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS rating_avg     NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS rating_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS sales_count    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS tags           TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill status from the legacy `is_published` boolean (idempotent: re-derives
-- the same value if re-run). Public visibility becomes status='approved' AND is_published=true.
UPDATE digital_products
SET status = CASE WHEN is_published THEN 'approved' ELSE 'draft' END
WHERE status = 'draft';

-- Backfill slug from title + short id suffix for existing rows.
UPDATE digital_products
SET slug = lower(regexp_replace(regexp_replace(COALESCE(title, 'product'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
           || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE digital_products ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_products_slug ON digital_products (slug);
CREATE INDEX IF NOT EXISTS idx_digital_products_seller       ON digital_products (seller_id);
CREATE INDEX IF NOT EXISTS idx_digital_products_status_pub   ON digital_products (status, is_published);
CREATE INDEX IF NOT EXISTS idx_digital_products_category     ON digital_products (category);
CREATE INDEX IF NOT EXISTS idx_digital_products_tags         ON digital_products USING GIN (tags);

-- ── 3. store_payouts ────────────────────────────────────────────────────────
-- Admin-mediated manual payout queue (no RazorpayX/Payouts API access today).
-- razorpay_payout_id is an unused extension point for future automation.

CREATE TABLE IF NOT EXISTS store_payouts (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id           UUID          NOT NULL REFERENCES store_sellers(id) ON DELETE CASCADE,
  amount              NUMERIC(12,2) NOT NULL,
  status              TEXT          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'rejected')),
  payout_method       TEXT,
  payout_destination  JSONB         NOT NULL DEFAULT '{}',
  admin_note          TEXT,
  reference_note      TEXT,
  razorpay_payout_id  TEXT,
  requested_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  processed_by        UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE store_payouts IS
  'Seller payout requests, settled manually by admin outside the app (no RazorpayX access). razorpay_payout_id reserved for future automation.';

CREATE INDEX IF NOT EXISTS idx_store_payouts_seller ON store_payouts (seller_id);
CREATE INDEX IF NOT EXISTS idx_store_payouts_status  ON store_payouts (status, requested_at DESC);


-- ── 4. purchases — extend for commission split, order lifecycle, payouts ────

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS seller_id               UUID REFERENCES store_sellers(id) ON DELETE SET NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status                  TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('created', 'completed', 'failed', 'refunded'));
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS platform_fee_amount     NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS seller_earnings_amount  NUMERIC(10,2) NOT NULL DEFAULT 0;
-- NOTE for user: existing pre-marketplace rows backfill payout_status='unpaid' below.
-- All of them have seller_id=NULL (platform-owned sales), so they will never appear
-- in a seller payout queue regardless — this only matters if you later attribute
-- historical products to a seller retroactively. Flip to 'paid' manually if that
-- revenue was already settled outside the system.
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payout_status           TEXT NOT NULL DEFAULT 'unpaid' CHECK (payout_status IN ('unpaid', 'pending_payout', 'paid'));
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payout_id               UUID REFERENCES store_payouts(id) ON DELETE SET NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_purchases_seller        ON purchases (seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payout_status  ON purchases (payout_status) WHERE payout_status != 'paid';
CREATE INDEX IF NOT EXISTS idx_purchases_status         ON purchases (status);


-- ── 5. store_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_reviews (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID        NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_id  UUID        REFERENCES purchases(id) ON DELETE SET NULL,
  rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  status       TEXT        NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'removed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_product ON store_reviews (product_id, status);


-- ── 6. store_wishlists ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_wishlists (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_wishlists_user ON store_wishlists (user_id);


-- ── 7. store_downloads — secure, revocable, rate-limited download tokens ────

CREATE TABLE IF NOT EXISTS store_downloads (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token               TEXT        NOT NULL UNIQUE,
  purchase_id         UUID        NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id          UUID        NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at          TIMESTAMPTZ NOT NULL,
  max_downloads       INTEGER     NOT NULL DEFAULT 5,
  download_count      INTEGER     NOT NULL DEFAULT 0,
  last_downloaded_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_downloads_token     ON store_downloads (token);
CREATE INDEX IF NOT EXISTS idx_store_downloads_purchase  ON store_downloads (purchase_id);

-- Atomic token redemption: single-statement guard against concurrent double-spend
-- on the same token (two tabs clicking "download" at once). Returns 0 rows if the
-- token is unknown, expired, or already exhausted.
CREATE OR REPLACE FUNCTION fn_redeem_store_download_token(p_token TEXT)
RETURNS SETOF store_downloads LANGUAGE sql AS $$
  UPDATE store_downloads
  SET download_count = download_count + 1,
      last_downloaded_at = NOW()
  WHERE token = p_token
    AND expires_at > NOW()
    AND download_count < max_downloads
  RETURNING *;
$$;


-- ── 8. auto-updated_at triggers ──────────────────────────────────────────────
-- Reuses the shared fn_update_updated_at() function already defined in
-- migrations 009/011 (CREATE OR REPLACE is idempotent/safe to redeclare here).

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['digital_products', 'purchases', 'store_sellers', 'store_reviews', 'store_payouts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at()',
      t, t
    );
  END LOOP;
END $$;


-- ── 9. Rating aggregation ─────────────────────────────────────────────────────
-- Recomputes digital_products.rating_avg/rating_count whenever store_reviews changes.

CREATE OR REPLACE FUNCTION fn_recalc_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_product UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE digital_products SET
    rating_avg   = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM store_reviews WHERE product_id = target_product AND status = 'published'), 0),
    rating_count = (SELECT COUNT(*) FROM store_reviews WHERE product_id = target_product AND status = 'published')
  WHERE id = target_product;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_reviews_recalc_rating ON store_reviews;
CREATE TRIGGER trg_store_reviews_recalc_rating
  AFTER INSERT OR UPDATE OR DELETE ON store_reviews
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_product_rating();


-- ── 10. Purchase-completion side effects ─────────────────────────────────────
-- Bumps digital_products.sales_count and store_sellers.total_earnings the moment
-- a purchase reaches status='completed' (covers both the legacy insert-only flow
-- and the new create→verify upsert flow).

CREATE OR REPLACE FUNCTION fn_purchase_completed_effects()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed') THEN

    UPDATE digital_products
    SET sales_count = sales_count + 1
    WHERE id = NEW.product_id;

    IF NEW.seller_id IS NOT NULL THEN
      UPDATE store_sellers
      SET total_earnings = total_earnings + COALESCE(NEW.seller_earnings_amount, 0)
      WHERE id = NEW.seller_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchases_completed_effects ON purchases;
CREATE TRIGGER trg_purchases_completed_effects
  AFTER INSERT OR UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION fn_purchase_completed_effects();

-- One-time backfill: ADD COLUMN ... DEFAULT does not fire row triggers, so
-- existing purchases never incremented sales_count via the trigger above.
UPDATE digital_products dp
SET sales_count = sub.cnt
FROM (SELECT product_id, COUNT(*) AS cnt FROM purchases GROUP BY product_id) sub
WHERE dp.id = sub.product_id;


-- ── 11. Row-Level Security ────────────────────────────────────────────────────
-- All application access goes through the backend's service-role Supabase
-- client (never a client-side anon key), so RLS here is defense-in-depth: it
-- blocks any accidental anon/authenticated-key access while leaving the
-- service role (used by every route file) unrestricted.

ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sellers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_wishlists  ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_downloads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_payouts    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['digital_products', 'purchases', 'store_sellers', 'store_reviews', 'store_wishlists', 'store_downloads', 'store_payouts'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'service_role_' || t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'service_role_' || t, t
      );
    END IF;
  END LOOP;
END $$;
