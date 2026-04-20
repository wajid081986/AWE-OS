-- =====================================================
-- AWE-OS v2 — Optimization Agent Schema
-- Run in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS optimization_suggestions (
  id                UUID PRIMARY KEY
                    DEFAULT uuid_generate_v4(),
  tool_id           UUID REFERENCES tools(id)
                    ON DELETE CASCADE,
  tool_name         TEXT NOT NULL,

  optimization_type TEXT CHECK (optimization_type IN (
                    'landing_page',
                    'seo',
                    'copy',
                    'ux_flow',
                    'cta',
                    'onboarding'
                    )) NOT NULL,

  current_state     TEXT,

  suggestions       JSONB NOT NULL DEFAULT '[]',

  priority          TEXT CHECK (priority IN (
                    'high', 'medium', 'low'
                    )) DEFAULT 'medium',

  estimated_impact  TEXT,

  status            TEXT CHECK (status IN (
                    'pending',
                    'applied',
                    'dismissed'
                    )) DEFAULT 'pending',

  applied_at        TIMESTAMP,
  dismissed_at      TIMESTAMP,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_opt_tool_id
ON optimization_suggestions(tool_id);

CREATE INDEX IF NOT EXISTS idx_opt_status
ON optimization_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_opt_type
ON optimization_suggestions(optimization_type);

CREATE INDEX IF NOT EXISTS idx_opt_created_at
ON optimization_suggestions(created_at DESC);

-- =====================================================
-- VERIFY (run after table creation)
-- =====================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'optimization_suggestions'
-- ORDER BY ordinal_position;