-- ── Autonomous Agent Logs ─────────────────────────────────────
-- Tracks every action (and non-action) the autonomous loop takes.
-- Safety design: kill decisions are NEVER auto-executed (logged only).

CREATE TABLE IF NOT EXISTS autonomous_logs (
  id                UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id           UUID      REFERENCES tools(id) ON DELETE SET NULL,
  tool_name         TEXT,
  action            TEXT      NOT NULL,
  -- Actions: plan_generated | decision_evaluated | status_updated |
  --          improvement_suggested | kill_flagged | observation_logged |
  --          skipped | error | already_planned
  decision          TEXT,
  -- Decisions: scale | kill | improve | observe | null
  status_before     TEXT,
  status_after      TEXT,
  notes             TEXT,
  -- Human-readable explanation of what happened and why
  is_auto_executed  BOOLEAN   DEFAULT false,
  -- true = system acted automatically, false = logged for human review
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ── Run tracking ──────────────────────────────────────────────
-- Tracks each invocation of runAutonomousLoop (cron or manual).
-- Used to enforce the 10-runs-per-day daily limit.

CREATE TABLE IF NOT EXISTS autonomous_runs (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  triggered_by    TEXT      NOT NULL DEFAULT 'cron',
  -- Values: cron | manual
  tools_processed INTEGER   DEFAULT 0,
  tools_skipped   INTEGER   DEFAULT 0,
  plans_generated INTEGER   DEFAULT 0,
  scaled          INTEGER   DEFAULT 0,
  improve_suggested INTEGER DEFAULT 0,
  kill_flagged    INTEGER   DEFAULT 0,
  observed        INTEGER   DEFAULT 0,
  errors          INTEGER   DEFAULT 0,
  duration_ms     INTEGER,
  started_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_autonomous_logs_tool_id
  ON autonomous_logs(tool_id);

CREATE INDEX IF NOT EXISTS idx_autonomous_logs_created_at
  ON autonomous_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomous_runs_started_at
  ON autonomous_runs(started_at DESC);

-- ── Recent activity view (last 50 actions) ────────────────────
CREATE OR REPLACE VIEW recent_autonomous_activity AS
SELECT
  al.*,
  t.name   AS tool_name_live,
  t.status AS tool_current_status
FROM autonomous_logs al
LEFT JOIN tools t ON al.tool_id = t.id
ORDER BY al.created_at DESC
LIMIT 50;
