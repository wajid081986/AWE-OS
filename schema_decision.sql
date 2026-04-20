-- ============================================================
-- AWE-OS v2 — Decision Engine Schema Additions
-- Run AFTER schema.sql in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── Add manual_override column to existing tools table ───────
-- Allows ops team to freeze a tool from being auto-decided.
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;

-- ── TABLE: decision_logs ─────────────────────────────────────
-- Append-only audit log of every decision evaluation.
-- Never delete rows — this is the history of the engine.
CREATE TABLE IF NOT EXISTS decision_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id            UUID REFERENCES tools(id) ON DELETE CASCADE,
  decision           TEXT CHECK (decision IN ('scale','kill','improve','observe')),
  reason             TEXT,
  recommended_action TEXT,
  metrics_snapshot   JSONB DEFAULT '{}',  -- point-in-time copy of metrics
  dry_run            BOOLEAN DEFAULT false,
  evaluated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_logs_tool_id      ON decision_logs(tool_id);
CREATE INDEX IF NOT EXISTS idx_decision_logs_evaluated_at ON decision_logs(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_logs_decision      ON decision_logs(decision);
