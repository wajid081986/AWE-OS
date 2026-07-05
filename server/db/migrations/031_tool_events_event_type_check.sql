-- Migration 031: Widen tool_events.event_type CHECK to allow blog_viewed
--
-- BUG: POST /api/events/track returned 500 in production for every
-- blog_viewed event. Root cause (confirmed via local repro + server logs):
-- tool_events has a CHECK constraint on event_type that predates
-- 'blog_viewed' being added to VALID_EVENT_TYPES (event.service.js) — the
-- INSERT itself violates the constraint, before the code ever reaches the
-- increment_blog_post_views RPC call.
--
-- Same situation as migration 029 (newsletters.status): tool_events was not
-- created by any tracked migration in this repo, so its exact CHECK
-- definition is unknown ahead of time. Find and replace it at execution
-- time, widened to match VALID_EVENT_TYPES exactly.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.tool_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE tool_events DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE tool_events
  ADD CONSTRAINT tool_events_event_type_check
  CHECK (event_type IN (
    'tool_viewed', 'tool_used', 'resume_generated', 'payment_success',
    'user_signup', 'tool_shared', 'feature_clicked', 'blog_viewed'
  ));
