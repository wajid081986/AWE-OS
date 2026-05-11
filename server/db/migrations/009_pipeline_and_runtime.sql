-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 009 — Pipeline Engine + Runtime Infrastructure
-- Phase 4A (Agent Runtime) + Phase 4B (Pipeline Orchestration)
--
-- New tables:
--   runtime_events           — event audit trail for EventBus persistence
--   pipeline_definitions     — DAG definitions (managed in code, seeded here)
--   pipeline_executions      — one row per pipeline run instance
--   pipeline_step_executions — one row per step within a run
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS / CREATE OR REPLACE
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 1. Runtime Events ──────────────────────────────────────────────────────────
-- Stores all emitted runtime events for audit/replay. Best-effort insert —
-- rows older than 30 days can be purged without affecting system correctness.
CREATE TABLE IF NOT EXISTS runtime_events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_type_ts
  ON runtime_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_events_ts
  ON runtime_events (created_at DESC);

COMMENT ON TABLE runtime_events IS
  'Event audit trail emitted by EventBus. Rows older than 30 days are safe to purge.';


-- ── 2. Pipeline Definitions ────────────────────────────────────────────────────
-- Stores DAG metadata. Actual step functions live in PipelineDefinitions.js —
-- this table is the authoritative record of which pipelines exist and are enabled.
CREATE TABLE IF NOT EXISTS pipeline_definitions (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  version     INTEGER     NOT NULL DEFAULT 1,
  steps       JSONB       NOT NULL DEFAULT '[]',  -- JSON snapshot of step metadata (no fns)
  is_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pipeline_definitions IS
  'Pipeline DAG definitions. Step functions are authoritative in PipelineDefinitions.js.';


-- ── 3. Pipeline Executions ─────────────────────────────────────────────────────
-- One row per pipeline run instance. Status transitions:
--   queued → running → completed | failed | cancelled
--   running → paused (approval gate) → running (after approve) → ...
CREATE TABLE IF NOT EXISTS pipeline_executions (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id    TEXT        NOT NULL,
  triggered_by   TEXT        NOT NULL DEFAULT 'api',   -- 'admin'|'cron'|'api'|userId
  status         TEXT        NOT NULL DEFAULT 'queued',
  input_context  JSONB       NOT NULL DEFAULT '{}',   -- initial input to first step
  output_context JSONB       NOT NULL DEFAULT '{}',   -- accumulated outputs on completion
  current_step   TEXT,                                -- name of currently executing step
  error_message  TEXT,
  paused_at      TIMESTAMPTZ,                         -- set when status = 'paused'
  paused_step    TEXT,                                -- step waiting for approval
  resumed_at     TIMESTAMPTZ,
  approved_by    TEXT,                                -- userId who approved the gate
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_pipeline_exec_status CHECK (
    status IN ('queued','running','paused','completed','failed','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_pipeline_exec_status
  ON pipeline_executions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_exec_pipeline_id
  ON pipeline_executions (pipeline_id, created_at DESC);

COMMENT ON TABLE pipeline_executions IS
  'Tracks every pipeline run instance. Poll status here for async execution results.';


-- ── 4. Pipeline Step Executions ────────────────────────────────────────────────
-- One row per step within a pipeline run. Enables per-step retry tracking,
-- heartbeat monitoring, and granular observability.
CREATE TABLE IF NOT EXISTS pipeline_step_executions (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id   UUID        NOT NULL REFERENCES pipeline_executions(id) ON DELETE CASCADE,
  step_name      TEXT        NOT NULL,
  step_index     INTEGER     NOT NULL DEFAULT 0,
  agent_name     TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending',
  attempts       INTEGER     NOT NULL DEFAULT 0,
  input_context  JSONB       NOT NULL DEFAULT '{}',
  output_context JSONB       NOT NULL DEFAULT '{}',
  error_message  TEXT,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  heartbeat_at   TIMESTAMPTZ,   -- keep-alive: updated every 15s by AgentExecutor
  duration_ms    INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_step_exec_status CHECK (
    status IN ('pending','running','completed','failed','skipped',
               'waiting_approval','approved','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_step_exec_execution_id
  ON pipeline_step_executions (execution_id, step_index ASC);

-- Used by stalled-step detection query (heartbeat_at < threshold WHERE status=running)
CREATE INDEX IF NOT EXISTS idx_step_exec_running_heartbeat
  ON pipeline_step_executions (status, heartbeat_at)
  WHERE status = 'running';

COMMENT ON TABLE pipeline_step_executions IS
  'Per-step execution records. heartbeat_at is updated every 15s by the running worker.';


-- ── 5. updated_at auto-trigger ─────────────────────────────────────────────────
-- Safe to re-run: CREATE OR REPLACE
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- pipeline_definitions
DROP TRIGGER IF EXISTS trg_pipeline_def_updated_at ON pipeline_definitions;
CREATE TRIGGER trg_pipeline_def_updated_at
  BEFORE UPDATE ON pipeline_definitions
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- pipeline_executions
DROP TRIGGER IF EXISTS trg_pipeline_exec_updated_at ON pipeline_executions;
CREATE TRIGGER trg_pipeline_exec_updated_at
  BEFORE UPDATE ON pipeline_executions
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();


-- ── 6. Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE runtime_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_definitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_executions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_step_executions ENABLE ROW LEVEL SECURITY;

-- Service-role (backend server) gets full access to all runtime tables
DO $$
BEGIN
  -- runtime_events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='runtime_events' AND policyname='service_role_runtime_events') THEN
    CREATE POLICY "service_role_runtime_events"
      ON runtime_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- pipeline_definitions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pipeline_definitions' AND policyname='service_role_pipeline_definitions') THEN
    CREATE POLICY "service_role_pipeline_definitions"
      ON pipeline_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- pipeline_executions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pipeline_executions' AND policyname='service_role_pipeline_executions') THEN
    CREATE POLICY "service_role_pipeline_executions"
      ON pipeline_executions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- pipeline_step_executions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pipeline_step_executions' AND policyname='service_role_pipeline_step_executions') THEN
    CREATE POLICY "service_role_pipeline_step_executions"
      ON pipeline_step_executions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ── 7. Seed: pipeline_definitions metadata snapshot ────────────────────────────
-- Stores JSON-serializable metadata only (no function references).
-- Authoritative execution behaviour lives in PipelineDefinitions.js.
INSERT INTO pipeline_definitions (id, name, description, version, steps, is_enabled)
VALUES
  (
    'tool-creation-v1',
    'Tool Creation Pipeline',
    'Generates, quality-tests, and conditionally publishes a new SaaS tool. Requires human approval unless quality >= 80.',
    1,
    '[
      {"name":"generate_config",   "agentName":"ai-factory",    "dependencies":[]},
      {"name":"test_quality",      "agentName":"testing",       "dependencies":["generate_config"]},
      {"name":"evaluate_approval", "agentName":"auto-approval", "dependencies":["test_quality"]},
      {"name":"human_approval",    "type":"approval",           "dependencies":["evaluate_approval"]},
      {"name":"publish_tool",      "agentName":"publisher",     "dependencies":["human_approval"]}
    ]'::JSONB,
    TRUE
  ),
  (
    'tool-recovery-v1',
    'Tool Recovery Pipeline',
    'Diagnoses failed tools, runs recovery tests, and requires human approval before re-publishing.',
    1,
    '[
      {"name":"debug_tool",          "agentName":"auto-debug", "dependencies":[]},
      {"name":"retest_tool",         "agentName":"testing",    "dependencies":["debug_tool"]},
      {"name":"recovery_approval",   "type":"approval",        "dependencies":["retest_tool"]},
      {"name":"republish_tool",      "agentName":"publisher",  "dependencies":["recovery_approval"]}
    ]'::JSONB,
    TRUE
  ),
  (
    'daily-analysis-v1',
    'Daily Analysis Pipeline',
    'Runs daily revenue snapshot and optimization analysis. Fully autonomous — no approval gate.',
    1,
    '[
      {"name":"revenue_snapshot",      "agentName":"revenue",      "dependencies":[]},
      {"name":"optimization_analysis", "agentName":"optimization", "dependencies":["revenue_snapshot"]}
    ]'::JSONB,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  version     = EXCLUDED.version,
  steps       = EXCLUDED.steps,
  updated_at  = NOW();
