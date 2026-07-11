-- Migration 034: Re-assert cron_health.last_status CHECK constraint
--
-- Bug hunt (2026-07-05): marketing-opportunity-scan's cron_health row held
-- last_status = 'unknown' with run_count = 0 — a value that could only exist
-- if the CHECK (last_status IN ('success','error','skipped')) constraint from
-- migration 004 was missing on the live table. Confirmed live: an UPDATE
-- writing an arbitrary string to last_status succeeded with no constraint
-- violation. record_cron_run() itself was verified working correctly (it
-- always increments run_count), so the invalid value was written by some
-- direct/manual edit bypassing the app entirely — this migration just closes
-- the hole so that can't silently happen again.

-- Null out any existing values that aren't one of the three valid statuses,
-- otherwise re-adding the CHECK constraint below would fail on this table.
UPDATE cron_health
SET last_status = NULL
WHERE last_status IS NOT NULL
  AND last_status NOT IN ('success', 'error', 'skipped');

ALTER TABLE cron_health
  DROP CONSTRAINT IF EXISTS cron_health_last_status_check;

ALTER TABLE cron_health
  ADD CONSTRAINT cron_health_last_status_check
  CHECK (last_status IN ('success', 'error', 'skipped'));
