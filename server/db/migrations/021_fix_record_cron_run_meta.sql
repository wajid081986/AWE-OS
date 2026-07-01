-- ============================================================
-- Migration 021: Fix record_cron_run() signature mismatch
-- ============================================================
-- server/services/cron-health.js always calls the RPC with 4 args
-- (p_cron_name, p_status, p_error, p_meta), but migration 004 only
-- defined 3 params. Every call has been failing with "function
-- record_cron_run(...) does not exist" — silently swallowed because
-- recordCronRun() only logs the error to console and never throws.
-- This has meant cron_health has not been updated by ANY cron
-- (marketing, support, idea, decision, revenue) since it was added.

-- Store the metadata that was always being discarded.
ALTER TABLE cron_health
  ADD COLUMN IF NOT EXISTS last_meta JSONB DEFAULT NULL;

-- Adding a parameter changes the function's identity in Postgres, so
-- CREATE OR REPLACE would create a second overload instead of replacing
-- the old one (causing "could not choose the best candidate function"
-- ambiguity errors). Drop the old 3-arg version first.
DROP FUNCTION IF EXISTS record_cron_run(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION record_cron_run(
  p_cron_name TEXT,
  p_status    TEXT,
  p_error     TEXT  DEFAULT NULL,
  p_meta      JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO cron_health (cron_name, last_run_at, last_status, last_error, last_meta, run_count, error_count, updated_at)
  VALUES (
    p_cron_name,
    NOW(),
    p_status,
    p_error,
    p_meta,
    1,
    CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (cron_name) DO UPDATE SET
    last_run_at  = NOW(),
    last_status  = EXCLUDED.last_status,
    last_error   = EXCLUDED.last_error,
    last_meta    = EXCLUDED.last_meta,
    run_count    = cron_health.run_count + 1,
    error_count  = cron_health.error_count + CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    updated_at   = NOW();
END;
$$;
