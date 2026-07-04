-- Migration 029: Newsletter send wiring
--
-- Newsletters were generated weekly by the marketing cron but never actually
-- sent (no code path called sendEmail() for them) — they piled up as
-- permanent 'draft' rows. This migration adds what's needed to send them
-- for real, admin-triggered, with an opt-out honored.

-- ── 1. Opt-out flag on users (did not exist before this migration) ──────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Send bookkeeping on newsletters ───────────────────────────────────────
ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS failed_count    INTEGER DEFAULT NULL;

-- ── 3. Widen any existing CHECK on newsletters.status to allow 'archived' ───
-- The `newsletters` table was not created by any tracked migration in this
-- repo (created directly in Supabase), so whether a CHECK constraint
-- restricts `status` to a fixed set of values is unknown ahead of time.
-- This finds and replaces any such constraint at execution time — safe
-- whether or not one currently exists — using the full set of values seen
-- in production data (draft, scheduled, sent) plus the new 'archived' value.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.newsletters'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE newsletters DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE newsletters DROP CONSTRAINT IF EXISTS newsletters_status_check;
ALTER TABLE newsletters
  ADD CONSTRAINT newsletters_status_check
  CHECK (status IN ('draft', 'scheduled', 'sent', 'archived'));

-- ── 4. One-time cleanup: archive the stale drafts that predate send wiring ──
-- These 10 drafts were generated week over week with no send path and are
-- now outdated content — never send them, just get them out of the "draft"
-- queue an admin would otherwise see and consider sending.
UPDATE newsletters SET status = 'archived' WHERE status = 'draft';
