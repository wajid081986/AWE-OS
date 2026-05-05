-- ============================================================
-- Migration 007: Enterprise Hardening
--   · pipeline_metrics — per-cron time-series telemetry
--   · failed_jobs       — BullMQ dead-letter persistence
--   · pipeline_audit_log columns on saas_tools / tools
--   · Composite indexes  — high-frequency query patterns
--   · State machine trigger — enforce valid status transitions on tools
--   · Data retention policies — 90 / 30 / 14 day cleanup functions
--
-- Safe to run multiple times: IF NOT EXISTS + CREATE OR REPLACE throughout.
-- Must run AFTER migration 006.
-- ============================================================

-- ── 1. pipeline_metrics — time-series telemetry for observability dashboard ────
CREATE TABLE IF NOT EXISTS public.pipeline_metrics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name       TEXT        NOT NULL,
  run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT        NOT NULL CHECK (status IN ('success','error','skipped')),
  duration_ms     INTEGER,
  records_processed INTEGER   DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_cron_name
  ON public.pipeline_metrics (cron_name, run_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_run_at
  ON public.pipeline_metrics (run_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_status
  ON public.pipeline_metrics (status, run_at DESC);

-- ── 2. failed_jobs — BullMQ dead-letter / permanent failure storage ───────────
CREATE TABLE IF NOT EXISTS public.failed_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name    TEXT        NOT NULL,
  job_name      TEXT        NOT NULL,
  job_data      JSONB       NOT NULL DEFAULT '{}',
  attempts      INTEGER     NOT NULL DEFAULT 0,
  last_error    TEXT,
  failed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_jobs_queue
  ON public.failed_jobs (queue_name, failed_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_jobs_unresolved
  ON public.failed_jobs (resolved_at)
  WHERE resolved_at IS NULL;

-- ── 3. Audit columns on saas_tools ───────────────────────────────────────────
ALTER TABLE public.saas_tools
  ADD COLUMN IF NOT EXISTS last_status_change_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by       TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_trigger_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_triggered_at       TIMESTAMPTZ;

-- ── 4. Audit columns on tools ─────────────────────────────────────────────────
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS previous_status  TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversion_rate   DECIMAL(5,2) DEFAULT 0.00;

-- ── 5. Composite indexes — covers the highest-frequency query patterns ────────

-- saas_tools: active tools by category ordered by quality
CREATE INDEX IF NOT EXISTS idx_saas_tools_published_category_quality
  ON public.saas_tools (is_published, category, quality_score DESC)
  WHERE is_published = true;

-- tools: pipeline query — tools needing attention (testing + building)
CREATE INDEX IF NOT EXISTS idx_tools_active_status_created
  ON public.tools (status, created_at DESC)
  WHERE status IN ('building','testing','needs_fix','debugging');

-- tool_usage_events: slug + event window queries (decision engine)
CREATE INDEX IF NOT EXISTS idx_tool_usage_slug_event_created
  ON public.tool_usage_events (tool_slug, event_type, created_at DESC);

-- revenue_logs: slug-based revenue aggregation (autonomous agent)
CREATE INDEX IF NOT EXISTS idx_revenue_logs_slug_created
  ON public.revenue_logs (tool_slug, created_at DESC)
  WHERE tool_slug IS NOT NULL;

-- autonomous_logs: recent activity feed
CREATE INDEX IF NOT EXISTS idx_autonomous_logs_created
  ON public.autonomous_logs (created_at DESC);

-- factory_jobs: pending job queue drain
CREATE INDEX IF NOT EXISTS idx_factory_jobs_status_created
  ON public.factory_jobs (status, created_at DESC)
  WHERE status IN ('pending','running');

-- ── 6. State machine trigger — enforce valid status transitions on tools ──────

CREATE OR REPLACE FUNCTION validate_tool_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  old_status TEXT := OLD.status;
  new_status TEXT := NEW.status;
  allowed    TEXT[];
BEGIN
  -- Same-status update is always allowed (idempotent writes)
  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  -- Allowed transitions per source state
  allowed := CASE old_status
    WHEN 'idea'             THEN ARRAY['building','killed']
    WHEN 'building'         THEN ARRAY['testing','failed','killed']
    WHEN 'testing'          THEN ARRAY['live','needs_fix','failed','killed']
    WHEN 'live'             THEN ARRAY['scaling','needs_fix','failed','killed']
    WHEN 'scaling'          THEN ARRAY['live','needs_fix','killed']
    WHEN 'needs_fix'        THEN ARRAY['testing','debugging','failed','killed']
    WHEN 'debugging'        THEN ARRAY['testing','needs_fix','failed_permanent','killed']
    WHEN 'failed'           THEN ARRAY['debugging','needs_fix','killed']
    WHEN 'failed_permanent' THEN ARRAY['killed']
    WHEN 'killed'           THEN ARRAY[]::TEXT[]  -- terminal
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (new_status = ANY(allowed)) THEN
    RAISE EXCEPTION
      'Invalid tool status transition: % → % (tool_id: %)',
      old_status, new_status, NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Record the transition metadata
  NEW.previous_status   := old_status;
  NEW.status_changed_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tool_status ON public.tools;
CREATE TRIGGER trg_validate_tool_status
  BEFORE UPDATE OF status
  ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION validate_tool_status_transition();

-- ── 7. record_pipeline_metric — helper RPC for cron jobs ─────────────────────
CREATE OR REPLACE FUNCTION record_pipeline_metric(
  p_cron_name         TEXT,
  p_status            TEXT,
  p_duration_ms       INTEGER  DEFAULT NULL,
  p_records_processed INTEGER  DEFAULT 0,
  p_error_message     TEXT     DEFAULT NULL,
  p_metadata          JSONB    DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.pipeline_metrics
    (cron_name, status, duration_ms, records_processed, error_message, metadata)
  VALUES
    (p_cron_name, p_status, p_duration_ms, p_records_processed, p_error_message, COALESCE(p_metadata, '{}'));
END;
$$;

-- ── 8. Data retention functions — scheduled from retention.cron.js ────────────

-- Purge old pipeline metrics (keep 30 days)
CREATE OR REPLACE FUNCTION purge_old_pipeline_metrics(p_days INTEGER DEFAULT 30)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE deleted INTEGER;
BEGIN
  DELETE FROM public.pipeline_metrics
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Purge old autonomous logs (keep 90 days)
CREATE OR REPLACE FUNCTION purge_old_autonomous_logs(p_days INTEGER DEFAULT 90)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE deleted INTEGER;
BEGIN
  DELETE FROM public.autonomous_logs
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Purge resolved failed jobs (keep 14 days after resolution)
CREATE OR REPLACE FUNCTION purge_resolved_failed_jobs(p_days INTEGER DEFAULT 14)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE deleted INTEGER;
BEGIN
  DELETE FROM public.failed_jobs
  WHERE resolved_at IS NOT NULL
    AND resolved_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Purge old tool_usage_events (keep 90 days)
CREATE OR REPLACE FUNCTION purge_old_usage_events(p_days INTEGER DEFAULT 90)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE deleted INTEGER;
BEGIN
  DELETE FROM public.tool_usage_events
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
