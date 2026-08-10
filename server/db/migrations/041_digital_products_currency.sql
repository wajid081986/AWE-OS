-- Batch 73: display-only currency label alongside price on digital_products.
-- Additive only — does not change payment collection (still whatever the
-- existing Razorpay checkout flow does today).

ALTER TABLE digital_products
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR'
  CHECK (currency IN ('INR', 'USD'));
