-- Migration 002: Postgres RPC functions for event aggregation
-- Run once in the Supabase SQL editor (Database > SQL Editor)
-- Replaces in-memory GROUP BY in server/services/event.service.js

-- Aggregate event counts for a tool over the last 90 days.
-- Returns one row per event_type — max 7 rows regardless of event volume.
CREATE OR REPLACE FUNCTION get_event_summary(p_tool_id UUID)
RETURNS TABLE(event_type TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT event_type, COUNT(*) AS count
  FROM tool_events
  WHERE tool_id = p_tool_id
    AND created_at >= NOW() - INTERVAL '90 days'
  GROUP BY event_type;
$$;

-- Daily event counts for a tool over the last 7 days.
-- Returns one row per day that had at least one event (zero days omitted —
-- the Node.js caller fills in zeros for the full 7-day window).
CREATE OR REPLACE FUNCTION get_event_trend(p_tool_id UUID)
RETURNS TABLE(day DATE, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DATE(created_at) AS day, COUNT(*) AS count
  FROM tool_events
  WHERE tool_id = p_tool_id
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY day;
$$;
