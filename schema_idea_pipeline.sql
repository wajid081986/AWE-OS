-- ═══════════════════════════════════════════════════════════
-- AWE-OS v2 — Idea Pipeline Schema Migration
-- Run in Supabase SQL editor BEFORE deploying code changes.
-- All statements are idempotent (IF NOT EXISTS / safe defaults).
-- ═══════════════════════════════════════════════════════════

-- Add source column: 'manual' (human-entered) or 'ai' (pipeline-generated)
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS source TEXT
  DEFAULT 'manual'
  CHECK (source IN ('manual', 'ai'));

-- AI viability score 0-100 (mapped from idea-agent viability_score, NOT random)
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS idea_score INTEGER
  DEFAULT 0
  CHECK (idea_score >= 0 AND idea_score <= 100);

-- Human approval gate — AI ideas sit here until a human clicks Approve
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS approved BOOLEAN
  DEFAULT false;

ALTER TABLE tools
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Structured metadata from the AI idea generation step
-- Keys: problem_solved, monetization, target_audience, complexity, generated_at
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS idea_metadata JSONB
  DEFAULT '{}';

-- ── Indexes for fast idea-pipeline queries ──────────────────
CREATE INDEX IF NOT EXISTS idx_tools_source
  ON tools(source);

CREATE INDEX IF NOT EXISTS idx_tools_approved
  ON tools(approved);

-- Composite index: the pending-ideas query filters on all three
CREATE INDEX IF NOT EXISTS idx_tools_pending_ideas
  ON tools(source, approved, status)
  WHERE source = 'ai' AND approved = false AND status = 'idea';

-- ── Verify (run manually after migration) ───────────────────
-- SELECT id, name, source, idea_score, approved, status
-- FROM tools
-- LIMIT 5;
