-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 027 — Fix digital_products status/is_published sync trigger
--
-- trg_digital_products_sync_status (fn_sync_digital_products_status_published)
-- currently keeps `status` and `is_published` fully mirrored in both directions:
--   - status changed        -> is_published = (status = 'approved')
--   - is_published changed  -> status = 'approved' if true, else 'draft'
--
-- Two problems with the is_published-driven branch:
--
-- 1. Seller unpublish bug: `PUT /api/store/seller/products/:id` lets a seller
--    toggle is_published directly (store.seller.routes.js:234) without going
--    through admin review. Unpublishing an already-approved product reverts
--    status to 'draft', which is wrong — it silently discards the product's
--    approval and (per admin queue query, status='pending' only) removes any
--    trace that it was ever reviewed, forcing a full re-approval to relist.
--
-- 2. Self-approval hole: the same seller-settable is_published field, when set
--    to true on a 'pending' or 'rejected' product, currently causes the trigger
--    to set status='approved' — letting a seller bypass admin approval entirely
--    by flipping a boolean instead of going through
--    POST /api/store/admin/products/:id/approve.
--
-- Fix: decouple the two fields once a product has been approved.
--   - status changes (admin approve/reject, or seller edit that forces
--     status='pending' for re-review) still drive is_published, unchanged.
--   - is_published changes on their own no longer touch status:
--       - unpublishing an approved product leaves status='approved' (hidden via
--         is_published=false alone; public queries already require
--         status='approved' AND is_published=true, see store.public.routes.js).
--       - republishing (is_published=true) is only honored if status is already
--         'approved' — otherwise the toggle is ignored (is_published forced
--         back to false), closing the self-approval hole.
--
-- No new `status` value or CHECK constraint change needed — 'approved' now just
-- means "has passed review", independent of current visibility.
--
-- Safe to re-run: CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER are idempotent.
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_sync_digital_products_status_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_published := (NEW.status = 'approved');
    RETURN NEW;
  END IF;

  -- status changed (admin approve/reject, or a seller edit that resets it to
  -- 'pending' for re-review): is_published follows status, as before.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.is_published := (NEW.status = 'approved');
    RETURN NEW;
  END IF;

  -- is_published changed on its own (seller publish/unpublish toggle):
  -- status is left untouched. A product can only be (re)published if it has
  -- already been approved; otherwise the toggle is ignored.
  IF NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    IF NEW.is_published AND OLD.status IS DISTINCT FROM 'approved' THEN
      NEW.is_published := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_digital_products_sync_status ON digital_products;
CREATE TRIGGER trg_digital_products_sync_status
  BEFORE INSERT OR UPDATE ON digital_products
  FOR EACH ROW EXECUTE FUNCTION fn_sync_digital_products_status_published();
