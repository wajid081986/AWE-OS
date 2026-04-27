-- ═══════════════════════════════════════════════════════════════
-- AWE-OS v2 — Generated Code Schema
-- Run in Supabase SQL editor BEFORE deploying code changes.
-- All statements are idempotent.
-- ═══════════════════════════════════════════════════════════════

-- Enable uuid extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS generated_code (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id         UUID REFERENCES tools(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES builder_plans(id) ON DELETE SET NULL,
  tool_name       TEXT NOT NULL,

  -- Generated files stored as JSONB arrays
  -- Structure: [{ path, content, type, language }]
  frontend_files  JSONB    DEFAULT '[]',
  backend_files   JSONB    DEFAULT '[]',
  db_sql          TEXT,

  -- Metadata
  total_files     INTEGER  DEFAULT 0,
  generation_ms   INTEGER,
  ai_model        TEXT     DEFAULT 'gpt-4o-mini',

  -- Status lifecycle:
  --   generating → ready_for_review → approved (tool goes live)
  --            ↘ partial_ready      ↘ rejected  (can regenerate)
  --   generating → failed           (AI error, can retry)
  status          TEXT     CHECK (status IN (
                    'generating',
                    'partial_ready',
                    'ready_for_review',
                    'approved',
                    'rejected',
                    'failed'
                  )) DEFAULT 'generating',

  -- Quality report from the self-healing validator
  quality_report  JSONB,
  avg_score       NUMERIC(5,2),

  reviewed_at     TIMESTAMP,
  reviewer_notes  TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Add quality columns to existing tables (idempotent)
ALTER TABLE generated_code ADD COLUMN IF NOT EXISTS quality_report JSONB;
ALTER TABLE generated_code ADD COLUMN IF NOT EXISTS avg_score NUMERIC(5,2);

-- Fast lookup by tool
CREATE INDEX IF NOT EXISTS idx_generated_code_tool_id
  ON generated_code(tool_id);

-- Fast status filtering
CREATE INDEX IF NOT EXISTS idx_generated_code_status
  ON generated_code(status);

-- Prevent generating duplicate active code for the same approved plan
-- (rejected rows are excluded so regeneration is always possible)
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_code_plan_id
  ON generated_code(plan_id)
  WHERE status NOT IN ('rejected', 'failed');

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_generated_code_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generated_code_updated_at ON generated_code;
CREATE TRIGGER trg_generated_code_updated_at
  BEFORE UPDATE ON generated_code
  FOR EACH ROW EXECUTE FUNCTION update_generated_code_updated_at();

-- ── Verify (run manually after migration) ─────────────────────
-- SELECT id, tool_name, status, total_files, generation_ms
-- FROM generated_code LIMIT 5;
