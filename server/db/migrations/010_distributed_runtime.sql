-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 010 — Distributed Runtime + Observability Infrastructure
-- Phase 4C (State Hardening) + 4D (Audit Trail) + 4E (Distributed) + 4F (Reliability)
--
-- New tables:
--   runtime_audit_logs        — persistent audit trail for all execution events
--   runtime_workers           — worker registry for distributed execution
--   runtime_distributed_locks — cross-process lock table
--   runtime_dlq               — dead-letter queue for permanently-failed executions
--
-- Altered tables:
--   pipeline_executions       — add heartbeat_at, claimed_by_worker_id columns
--                               + extend status check constraint for new states
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS / DO $$ / ADD COLUMN IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. Runtime Audit Logs (Phase 4D) ──────────────────────────────────────────
-- Persistent audit trail subscribed to all EventBus pipeline lifecycle events.
-- Falls back to in-memory if this table is absent — so it's safe to run lazily.
CREATE TABLE IF NOT EXISTS runtime_audit_logs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id  TEXT,
  pipeline_id   TEXT,
  step_name     TEXT,
  action        TEXT        NOT NULL,   -- EXECUTION_STARTED, STEP_RETRIED, etc.
  actor_id      TEXT,
  details       JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_id
  ON runtime_audit_logs (execution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_ts
  ON runtime_audit_logs (action, created_at DESC);

-- Partition-safe: prune entries older than 90 days periodically
COMMENT ON TABLE runtime_audit_logs IS
  'Persistent audit trail for all pipeline/agent lifecycle events. Safe to prune rows older than 90 days.';


-- ── 2. Runtime Workers (Phase 4E) ─────────────────────────────────────────────
-- Worker registry for distributed multi-process deployments.
-- Each Node.js process registers here on startup and heartbeats every 30 s.
CREATE TABLE IF NOT EXISTS runtime_workers (
  id                TEXT        PRIMARY KEY,    -- randomUUID() per process
  hostname          TEXT        NOT NULL,
  pid               INTEGER     NOT NULL,
  version           TEXT,
  status            TEXT        NOT NULL DEFAULT 'active',  -- active|offline|dead|cleaned
  capabilities      JSONB       NOT NULL DEFAULT '["pipeline","agent"]',
  active_jobs       INTEGER     NOT NULL DEFAULT 0,
  memory_mb         NUMERIC,
  registered_at     TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  metadata          JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_runtime_workers_status
  ON runtime_workers (status, last_heartbeat_at DESC);

COMMENT ON TABLE runtime_workers IS
  'Distributed worker registry. Workers heartbeat every 30 s; missed 3 heartbeats = dead.';


-- ── 3. Distributed Locks (Phase 4E) ───────────────────────────────────────────
-- Cross-process mutex table. Used by DistributedLock.js as the DB-backed layer.
-- Primary key on "key" enforces uniqueness (conflicts = lock contention).
CREATE TABLE IF NOT EXISTS runtime_distributed_locks (
  key          TEXT        PRIMARY KEY,
  owner_id     TEXT        NOT NULL,
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dist_locks_expires
  ON runtime_distributed_locks (expires_at);

COMMENT ON TABLE runtime_distributed_locks IS
  'Cross-process distributed lock table. Expired rows are safe to delete at any time.';


-- ── 4. Dead-Letter Queue (Phase 4F) ───────────────────────────────────────────
-- Stores permanently-failed executions for forensics and replay.
CREATE TABLE IF NOT EXISTS runtime_dlq (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id         TEXT        NOT NULL,
  pipeline_id          TEXT        NOT NULL,
  failure_reason       TEXT        NOT NULL,
  error_message        TEXT,
  input                JSONB,
  context              JSONB,
  attempts             INTEGER     NOT NULL DEFAULT 0,
  status               TEXT        NOT NULL DEFAULT 'dead',  -- dead|replayed
  failed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replayed_at          TIMESTAMPTZ,
  replay_execution_id  TEXT
);

CREATE INDEX IF NOT EXISTS idx_dlq_status_ts
  ON runtime_dlq (status, failed_at DESC);

CREATE INDEX IF NOT EXISTS idx_dlq_pipeline_id
  ON runtime_dlq (pipeline_id, failed_at DESC);

COMMENT ON TABLE runtime_dlq IS
  'Dead-letter queue for permanently-failed executions. Supports forensics and replay.';


-- ── 5. Extend pipeline_executions (Phase 4C/4E) ───────────────────────────────

-- heartbeat_at: updated by HeartbeatManager every 20 s for running executions.
-- StallDetector reads this to detect frozen executions.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pipeline_executions' AND column_name='heartbeat_at'
  ) THEN
    ALTER TABLE pipeline_executions ADD COLUMN heartbeat_at TIMESTAMPTZ;
  END IF;
END $$;

-- claimed_by_worker_id: atomic claim column.
-- ExecutionClaimer does: UPDATE ... WHERE claimed_by_worker_id IS NULL
-- to prevent two workers running the same execution.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pipeline_executions' AND column_name='claimed_by_worker_id'
  ) THEN
    ALTER TABLE pipeline_executions ADD COLUMN claimed_by_worker_id TEXT;
  END IF;
END $$;

-- Index for ExecutionClaimer.getClaimedBy() query
CREATE INDEX IF NOT EXISTS idx_pipeline_exec_claimed_by
  ON pipeline_executions (claimed_by_worker_id)
  WHERE claimed_by_worker_id IS NOT NULL;

-- Index for HeartbeatManager's stall detection query
CREATE INDEX IF NOT EXISTS idx_pipeline_exec_heartbeat
  ON pipeline_executions (heartbeat_at)
  WHERE status IN ('running', 'retrying');

-- Widen the status CHECK constraint to include Phase 4C states.
-- Supabase: we drop and recreate the constraint.
-- If the column already accepts these values (no check), this is a no-op.
DO $$ BEGIN
  ALTER TABLE pipeline_executions DROP CONSTRAINT IF EXISTS chk_pipeline_exec_status;
  ALTER TABLE pipeline_executions ADD CONSTRAINT chk_pipeline_exec_status CHECK (
    status IN (
      'queued','running','paused','completed','failed','cancelled',
      -- Phase 4C additions:
      'retrying','timed_out','stalled','pending'
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Constraint may not be alterable on Supabase managed tables — skip silently
  NULL;
END $$;


-- ── 6. Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE runtime_audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_workers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_distributed_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_dlq               ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- runtime_audit_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='runtime_audit_logs' AND policyname='service_role_audit_logs') THEN
    CREATE POLICY "service_role_audit_logs"
      ON runtime_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- runtime_workers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='runtime_workers' AND policyname='service_role_workers') THEN
    CREATE POLICY "service_role_workers"
      ON runtime_workers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- runtime_distributed_locks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='runtime_distributed_locks' AND policyname='service_role_dist_locks') THEN
    CREATE POLICY "service_role_dist_locks"
      ON runtime_distributed_locks FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- runtime_dlq
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='runtime_dlq' AND policyname='service_role_dlq') THEN
    CREATE POLICY "service_role_dlq"
      ON runtime_dlq FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
