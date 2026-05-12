-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 014 — Tool Intelligence Layer (Phase 6A)
--
-- New tables:
--   generated_tool_ideas         — AI-analyzed tool ideas with scores + blueprints
--   tool_intelligence_history    — event log: analyzed|approved|rejected|built|launched
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. Generated Tool Ideas ───────────────────────────────────────────────────
-- Stores every idea that passes through the intelligence pipeline.
-- Scores and blueprint are written by the intelligence engine.
-- `approved` is set to TRUE when an admin builds the tool.

CREATE TABLE IF NOT EXISTS generated_tool_ideas (
  id                    UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  title                 TEXT         NOT NULL,
  prompt                TEXT,
  category              TEXT         NOT NULL,
  seo_score             INTEGER      NOT NULL DEFAULT 0 CHECK (seo_score          BETWEEN 0 AND 100),
  monetization_score    INTEGER      NOT NULL DEFAULT 0 CHECK (monetization_score BETWEEN 0 AND 100),
  complexity_score      INTEGER      NOT NULL DEFAULT 0 CHECK (complexity_score   BETWEEN 0 AND 100),
  overall_score         INTEGER      NOT NULL DEFAULT 0 CHECK (overall_score      BETWEEN 0 AND 100),
  blueprint_json        JSONB,
  analysis_json         JSONB,
  launch_recommendation BOOLEAN      NOT NULL DEFAULT FALSE,
  approved              BOOLEAN      NOT NULL DEFAULT FALSE,
  factory_job_id        UUID,
  created_by            UUID,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE generated_tool_ideas IS
  'Intelligence-analyzed tool ideas. Each row records scores, blueprint, and admin approval state.';

-- Browse by category + quality
CREATE INDEX IF NOT EXISTS idx_generated_ideas_category_score
  ON generated_tool_ideas (category, overall_score DESC);

-- Admin review queue: approved = false, newest first
CREATE INDEX IF NOT EXISTS idx_generated_ideas_pending
  ON generated_tool_ideas (approved, created_at DESC)
  WHERE approved = FALSE;

-- Historical learning: best approved ideas
CREATE INDEX IF NOT EXISTS idx_generated_ideas_approved_score
  ON generated_tool_ideas (overall_score DESC)
  WHERE approved = TRUE;


-- ── 2. Tool Intelligence History ──────────────────────────────────────────────
-- Append-only event log tracking the lifecycle of every idea and tool.
-- Used by HistoricalIntelligenceEngine to learn from outcomes.
--
-- event_type values:
--   analyzed   — idea ran through intelligence pipeline
--   approved   — admin approved the idea
--   rejected   — admin rejected the idea
--   built      — tool was generated from the idea
--   launched   — tool was published
--   high_traffic  — tool crossed usage threshold
--   high_revenue  — tool crossed revenue threshold

CREATE TABLE IF NOT EXISTS tool_intelligence_history (
  id                 UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id            UUID,
  idea_id            UUID         REFERENCES generated_tool_ideas(id) ON DELETE SET NULL,
  event_type         TEXT         NOT NULL,
  category           TEXT,
  complexity         TEXT,
  seo_score          INTEGER,
  monetization_score INTEGER,
  outcome            TEXT         NOT NULL DEFAULT 'pending',
  metadata           JSONB        NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tool_intelligence_history IS
  'Append-only lifecycle event log for intelligence-generated ideas and tools. Used for ML pattern learning.';

-- Query patterns: category performance over time
CREATE INDEX IF NOT EXISTS idx_intelligence_history_category_time
  ON tool_intelligence_history (category, created_at DESC);

-- Outcome analysis per event type
CREATE INDEX IF NOT EXISTS idx_intelligence_history_event_outcome
  ON tool_intelligence_history (event_type, outcome, created_at DESC);

-- Backtrack from idea to full history
CREATE INDEX IF NOT EXISTS idx_intelligence_history_idea_id
  ON tool_intelligence_history (idea_id)
  WHERE idea_id IS NOT NULL;

-- ── Trigger: keep updated_at current on generated_tool_ideas ────────────────

CREATE OR REPLACE FUNCTION update_generated_tool_ideas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generated_tool_ideas_updated_at ON generated_tool_ideas;
CREATE TRIGGER trg_generated_tool_ideas_updated_at
  BEFORE UPDATE ON generated_tool_ideas
  FOR EACH ROW EXECUTE FUNCTION update_generated_tool_ideas_updated_at();
