-- ============================================================
-- Migration 004: Learning engine RPCs + cron health table
-- ============================================================

-- ── 1. Add next_retry_at column to tools (debug backoff scheduling) ──────────
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ DEFAULT NULL;

-- Index so the debug agent can efficiently filter tools ready for retry
CREATE INDEX IF NOT EXISTS idx_tools_next_retry_at
  ON tools (next_retry_at)
  WHERE status IN ('failed', 'needs_fix');

-- ── 2. RPC: increment_tool_success ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_tool_success(
  p_tool_id    UUID,
  p_score      NUMERIC,
  p_last_used_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tools
  SET
    success_count = COALESCE(success_count, 0) + 1,
    avg_score     = CASE
                      WHEN COALESCE(success_count, 0) + COALESCE(failure_count, 0) = 0
                        THEN p_score
                      ELSE ROUND(
                        (COALESCE(avg_score, 0) * (COALESCE(success_count, 0) + COALESCE(failure_count, 0)) + p_score)
                        / (COALESCE(success_count, 0) + COALESCE(failure_count, 0) + 1)
                      , 2)
                    END,
    last_used_at  = p_last_used_at,
    updated_at    = NOW()
  WHERE id = p_tool_id;
END;
$$;

-- ── 3. RPC: increment_tool_failure ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_tool_failure(
  p_tool_id    UUID,
  p_score      NUMERIC,
  p_last_used_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tools
  SET
    failure_count = COALESCE(failure_count, 0) + 1,
    avg_score     = CASE
                      WHEN COALESCE(success_count, 0) + COALESCE(failure_count, 0) = 0
                        THEN p_score
                      ELSE ROUND(
                        (COALESCE(avg_score, 0) * (COALESCE(success_count, 0) + COALESCE(failure_count, 0)) + p_score)
                        / (COALESCE(success_count, 0) + COALESCE(failure_count, 0) + 1)
                      , 2)
                    END,
    last_used_at  = p_last_used_at,
    updated_at    = NOW()
  WHERE id = p_tool_id;
END;
$$;

-- ── 4. Ensure tools table has learning columns ────────────────────────────────
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS success_count  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_strategy  JSONB        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_used_at   TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quality_score  NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tool_type      TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tool_category  TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS debug_attempts INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debug_meta     JSONB        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saas_tool_id   UUID         REFERENCES saas_tools(id) ON DELETE SET NULL;

-- ── 5. Cron health monitoring table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cron_health (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name      TEXT         NOT NULL UNIQUE,
  last_run_at    TIMESTAMPTZ  DEFAULT NULL,
  last_status    TEXT         CHECK (last_status IN ('success', 'error', 'skipped')) DEFAULT NULL,
  last_error     TEXT         DEFAULT NULL,
  run_count      INTEGER      NOT NULL DEFAULT 0,
  error_count    INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Pre-seed all known cron jobs so alerts can detect "never ran" state
INSERT INTO cron_health (cron_name) VALUES
  ('analytics-cron'),
  ('autonomous-cron'),
  ('idea-cron'),
  ('marketing-weekly-content'),
  ('marketing-monthly-calendar'),
  ('marketing-weekly-report'),
  ('testing-cron'),
  ('decision-cron'),
  ('health-cron'),
  ('revenue-cron'),
  ('support-sla-monitor'),
  ('support-auto-close'),
  ('support-weekly-kb')
ON CONFLICT (cron_name) DO NOTHING;

-- ── 6. RPC: record_cron_run (called by each cron after completion) ────────────
CREATE OR REPLACE FUNCTION record_cron_run(
  p_cron_name TEXT,
  p_status    TEXT,
  p_error     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO cron_health (cron_name, last_run_at, last_status, last_error, run_count, error_count, updated_at)
  VALUES (
    p_cron_name,
    NOW(),
    p_status,
    p_error,
    1,
    CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (cron_name) DO UPDATE SET
    last_run_at  = NOW(),
    last_status  = EXCLUDED.last_status,
    last_error   = EXCLUDED.last_error,
    run_count    = cron_health.run_count + 1,
    error_count  = cron_health.error_count + CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    updated_at   = NOW();
END;
$$;

-- ── 7. Index for cron health alerts ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cron_health_last_run
  ON cron_health (cron_name, last_run_at);
