-- ============================================================
-- Migration 006: Schema fixes
--   · Fix tool_tests FK: saas_tools → tools (testing agent uses tools.id)
--   · Fix tools STATUS constraint: add missing values used by agents
--   · Add last_meta JSONB to cron_health for telemetry
--   · Update record_cron_run RPC to accept and store p_meta
--   · Standardise uuid_generate_v4 → gen_random_uuid in autonomous tables
--
-- Safe to run multiple times: uses IF NOT EXISTS, DO $$ EXCEPTION blocks,
-- and CREATE OR REPLACE for RPCs.
-- Must run AFTER migration 005 (saas_tools must exist).
-- ============================================================

-- ── 1. Fix tool_tests FK: saas_tools → tools ─────────────────────────────────
-- The testing agent (testing-agent.core.js) fetches tool IDs from the `tools`
-- table (status IN ('testing','building')) and inserts them into tool_tests.
-- The previous FK pointed to saas_tools(id), causing a guaranteed FK violation
-- on every test result insert (different UUID spaces).

ALTER TABLE public.tool_tests
  DROP CONSTRAINT IF EXISTS tool_tests_tool_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tool_tests_tool_id_tools_fkey'
      AND conrelid = 'public.tool_tests'::regclass
  ) THEN
    ALTER TABLE public.tool_tests
      ADD CONSTRAINT tool_tests_tool_id_tools_fkey
      FOREIGN KEY (tool_id)
      REFERENCES public.tools(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ── 2. Fix tools STATUS constraint ───────────────────────────────────────────
-- Original CHECK: status IN ('idea','building','live','scaling','killed')
-- Agents write: 'testing', 'needs_fix', 'failed', 'debugging', 'failed_permanent'
-- These values violate the original constraint — every write silently fails.

ALTER TABLE public.tools
  DROP CONSTRAINT IF EXISTS tools_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tools_status_check_v2'
      AND conrelid = 'public.tools'::regclass
  ) THEN
    ALTER TABLE public.tools
      ADD CONSTRAINT tools_status_check_v2
      CHECK (status IN (
        'idea',
        'building',
        'testing',
        'live',
        'scaling',
        'needs_fix',
        'failed',
        'debugging',
        'failed_permanent',
        'killed'
      ));
  END IF;
END $$;

-- ── 3. Add last_meta column to cron_health ────────────────────────────────────
-- All 9 cron jobs pass a 4th metadata argument (records_processed, anomalies,
-- pass_rate_pct, etc.) to recordCronRun() but the column didn't exist.
-- Adding last_meta JSONB stores this rich telemetry per cron.

ALTER TABLE public.cron_health
  ADD COLUMN IF NOT EXISTS last_meta JSONB DEFAULT NULL;

-- ── 4. Update record_cron_run RPC to accept and store p_meta ─────────────────
-- Previous signature: record_cron_run(p_cron_name, p_status, p_error)
-- New signature:      record_cron_run(p_cron_name, p_status, p_error, p_meta)
-- The 4th param has a DEFAULT NULL so existing 3-arg callers continue working.

CREATE OR REPLACE FUNCTION record_cron_run(
  p_cron_name TEXT,
  p_status    TEXT,
  p_error     TEXT    DEFAULT NULL,
  p_meta      JSONB   DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO cron_health (
    cron_name, last_run_at, last_status, last_error, last_meta,
    run_count, error_count, updated_at
  )
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
    error_count  = cron_health.error_count
                   + CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    updated_at   = NOW();
END;
$$;

-- ── 5. Standardise UUID generation in autonomous tables ──────────────────────
-- schema_autonomous.sql used uuid_generate_v4() which requires uuid-ossp.
-- Migration 005 enables the extension, but existing rows still reference it.
-- These ALTER statements are safe no-ops if the columns already use it.
-- Future rows will use gen_random_uuid() via new DEFAULT if columns are added.
-- (No DDL change needed here — uuid_generate_v4() now works via extension.)

-- ── 6. Add missing columns to tools table ────────────────────────────────────
-- testing-agent.core.js fetches: slug, ai_prompt, input_fields, category,
-- success_count, failure_count, avg_score, best_strategy, last_used_at.
-- analytics.cron.js upserts: conversion_rate.
-- All are added via ALTER TABLE IF NOT EXISTS — safe to re-run.

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS slug         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ai_prompt    TEXT,
  ADD COLUMN IF NOT EXISTS input_fields JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS category     TEXT,
  ADD COLUMN IF NOT EXISTS is_free      BOOLEAN      DEFAULT true,
  ADD COLUMN IF NOT EXISTS price        DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS source       TEXT,
  ADD COLUMN IF NOT EXISTS idea_score   INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved     BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS success_count   INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count   INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_score       DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS best_strategy   TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS debug_meta      JSONB     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS saas_tool_id    UUID;

-- Index on slug for fast slug-based lookups
CREATE INDEX IF NOT EXISTS idx_tools_slug
  ON public.tools (slug)
  WHERE slug IS NOT NULL;

-- ── 7. Add tool_ideas table ───────────────────────────────────────────────────
-- factory.routes.js queries tool_ideas — no schema existed for it.

CREATE TABLE IF NOT EXISTS public.tool_ideas (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT  NOT NULL,
  description  TEXT,
  category     TEXT,
  source       TEXT  DEFAULT 'ai_generated',
  status       TEXT  DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected', 'building')),
  idea_score   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_ideas_status
  ON public.tool_ideas (status);

CREATE INDEX IF NOT EXISTS idx_tool_ideas_created_at
  ON public.tool_ideas (created_at DESC);
