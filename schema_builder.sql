-- ============================================================
-- AWE-OS v2 — Builder Agent Schema
-- Run in Supabase SQL Editor AFTER schema.sql + schema_decision.sql
-- Safe to re-run: uses IF NOT EXISTS
-- ============================================================

-- ── TABLE: builder_plans ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS builder_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id       UUID REFERENCES tools(id) ON DELETE CASCADE,
  tool_name     TEXT NOT NULL,
  category      TEXT,

  -- AI-generated build plan (structured JSONB for easy querying)
  ui_plan       JSONB NOT NULL,
  api_plan      JSONB NOT NULL,
  db_schema     JSONB NOT NULL,
  tech_stack    JSONB NOT NULL,

  -- Effort estimation produced by AI
  estimated_hours   INTEGER CHECK (estimated_hours > 0),
  complexity_level  TEXT CHECK (complexity_level IN ('low','medium','high')),

  -- Plan lifecycle
  status        TEXT CHECK (status IN (
                  'pending_review',
                  'approved',
                  'rejected',
                  'in_progress',
                  'completed'
                )) DEFAULT 'pending_review',

  -- Human review fields
  reviewer_notes TEXT,
  reviewed_at    TIMESTAMP,

  -- Versioning — increments on plan regeneration for the same tool
  version        INTEGER DEFAULT 1,

  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_builder_plans_tool_id
  ON builder_plans(tool_id);

CREATE INDEX IF NOT EXISTS idx_builder_plans_status
  ON builder_plans(status);

CREATE INDEX IF NOT EXISTS idx_builder_plans_created_at
  ON builder_plans(created_at DESC);

-- ── AUTO-UPDATE TRIGGER: builder_plans.updated_at ────────────
-- Reuses the same trigger function from schema.sql
DROP TRIGGER IF EXISTS builder_plans_updated_at ON builder_plans;
CREATE TRIGGER builder_plans_updated_at
  BEFORE UPDATE ON builder_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── UNIQUE CONSTRAINT: one active plan per tool ───────────────
-- Prevents duplicate plans. Only one plan per tool in a non-rejected state.
-- Rejected plans do not block a new plan from being created.
CREATE UNIQUE INDEX IF NOT EXISTS idx_builder_plans_tool_active
  ON builder_plans(tool_id)
  WHERE status != 'rejected';
