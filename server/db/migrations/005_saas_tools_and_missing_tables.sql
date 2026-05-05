-- ============================================================
-- Migration 005: Create missing tables
--   · saas_tools        — published product catalog (referenced everywhere)
--   · users             — custom user accounts with auth + billing fields
--   · factory_jobs      — AI factory job log (autonomous agent)
--   · tool_usage_events — per-slug usage events (decision engine metrics)
--
-- Safe to run multiple times: all statements use IF NOT EXISTS.
-- Run AFTER schema.sql and BEFORE migrations 003 / 006.
-- ============================================================

-- Extension: required by schema_autonomous.sql and schema_revenue_agent.sql
-- gen_random_uuid() is used elsewhere; uuid_generate_v4() is used in older
-- schema files — enable both to keep them consistent.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. TABLE: saas_tools ─────────────────────────────────────────────────────
-- The published product catalog. Autonomous agent reads/writes this table.
-- Linked to the learning-pipeline `tools` table via tools.saas_tool_id FK.
--
-- Columns derived from all files that SELECT/UPDATE saas_tools:
--   autonomous-agent.js, tools.routes.js, admin.routes.js, schema_testing.sql

CREATE TABLE IF NOT EXISTS public.saas_tools (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT         NOT NULL,
  slug             TEXT         UNIQUE,
  description      TEXT,
  category         TEXT,
  ai_prompt        TEXT,
  input_fields     JSONB        NOT NULL DEFAULT '[]',
  is_free          BOOLEAN      NOT NULL DEFAULT true,
  price            DECIMAL(10,2)         DEFAULT 0.00,
  is_published     BOOLEAN      NOT NULL DEFAULT false,
  -- Quality / approval (added by schema_testing.sql via ALTER TABLE)
  quality_score    INTEGER               DEFAULT 0,
  approval_status  TEXT
    CHECK (approval_status IN ('pending', 'auto_live', 'review', 'rejected'))
    DEFAULT 'pending',
  -- Timestamps
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_saas_tools_slug
  ON public.saas_tools (slug);

CREATE INDEX IF NOT EXISTS idx_saas_tools_is_published
  ON public.saas_tools (is_published);

CREATE INDEX IF NOT EXISTS idx_saas_tools_category
  ON public.saas_tools (category);

CREATE INDEX IF NOT EXISTS idx_saas_tools_created_at
  ON public.saas_tools (created_at DESC);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_saas_tools_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saas_tools_updated_at ON public.saas_tools;
CREATE TRIGGER saas_tools_updated_at
  BEFORE UPDATE ON public.saas_tools
  FOR EACH ROW EXECUTE FUNCTION update_saas_tools_updated_at();

-- ── 2. TABLE: users ──────────────────────────────────────────────────────────
-- Custom public users table (separate from Supabase auth.users).
-- Columns derived from: server/routes/auth.js, server/routes/admin.routes.js,
--   server/middleware/admin.middleware.js

CREATE TABLE IF NOT EXISTS public.users (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  TEXT         UNIQUE NOT NULL,
  password_hash          TEXT         NOT NULL,
  role                   TEXT         NOT NULL DEFAULT 'user'
                           CHECK (role IN ('user', 'admin')),
  permissions            JSONB        NOT NULL DEFAULT '[]',
  is_premium             BOOLEAN      NOT NULL DEFAULT false,
  subscription_status    TEXT         NOT NULL DEFAULT 'free'
                           CHECK (subscription_status IN ('free', 'active', 'cancelled', 'expired')),
  password_reset_token   TEXT,
  password_reset_expires TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users (role);

CREATE INDEX IF NOT EXISTS idx_users_subscription_status
  ON public.users (subscription_status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ── 3. TABLE: factory_jobs ───────────────────────────────────────────────────
-- Tracks each AI factory job attempt (config generation).
-- Columns derived from: server/agents/autonomous-agent.js logFactoryJob()
--   and server/routes/factory.routes.js

CREATE TABLE IF NOT EXISTS public.factory_jobs (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  status             TEXT         NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  category           TEXT,
  input_prompt       TEXT,
  generated_tool_id  UUID,  -- soft reference to saas_tools; nullable, no FK (avoids cascade issues)
  error_message      TEXT,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factory_jobs_status
  ON public.factory_jobs (status);

CREATE INDEX IF NOT EXISTS idx_factory_jobs_generated_tool_id
  ON public.factory_jobs (generated_tool_id)
  WHERE generated_tool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_factory_jobs_created_at
  ON public.factory_jobs (created_at DESC);

-- ── 4. TABLE: tool_usage_events ──────────────────────────────────────────────
-- Per-slug usage tracking for published saas_tools.
-- Queried by autonomous-agent.js and decision-engine.js by tool_slug.
-- Note: tool_events (schema.sql) tracks pipeline-table tools by UUID;
--       tool_usage_events tracks saas_tools by slug (the public product).

CREATE TABLE IF NOT EXISTS public.tool_usage_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug   TEXT         NOT NULL,
  user_id     UUID,
  session_id  TEXT,
  event_type  TEXT         NOT NULL DEFAULT 'view'
                CHECK (event_type IN ('view', 'use', 'share', 'convert')),
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_events_tool_slug
  ON public.tool_usage_events (tool_slug);

CREATE INDEX IF NOT EXISTS idx_tool_usage_events_created_at
  ON public.tool_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_usage_events_slug_created
  ON public.tool_usage_events (tool_slug, created_at DESC);

-- ── 5. Add tool_slug to revenue_logs ─────────────────────────────────────────
-- autonomous-agent.js queries revenue_logs by tool_slug (from saas_tools),
-- but the column currently only has tool_id (FK to tools pipeline table).
-- Adding tool_slug enables slug-based lookups without breaking the existing FK.

ALTER TABLE public.revenue_logs
  ADD COLUMN IF NOT EXISTS tool_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_revenue_logs_tool_slug
  ON public.revenue_logs (tool_slug)
  WHERE tool_slug IS NOT NULL;
