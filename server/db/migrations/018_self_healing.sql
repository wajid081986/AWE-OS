-- AWE-OS Migration 018: Self-Healing Infrastructure
-- Phase 6E — Self-Healing + Runtime Recovery

-- Healing events audit log (all repair/recovery actions)
CREATE TABLE IF NOT EXISTS healing_events (
  id            BIGSERIAL PRIMARY KEY,
  event_type    TEXT        NOT NULL,  -- auto_repair | healing_cycle | recovery_scan
  domain        TEXT,                  -- cache|state|orphans|queue|dependencies|indexes|system
  target_table  TEXT,
  target_id     TEXT,
  action        TEXT        NOT NULL,
  status        TEXT        NOT NULL,
  reason        TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  healed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_healing_events_type
  ON healing_events (event_type, healed_at DESC);

CREATE INDEX IF NOT EXISTS idx_healing_events_domain
  ON healing_events (domain, healed_at DESC)
  WHERE domain IS NOT NULL;

-- Recovery attempts per execution
CREATE TABLE IF NOT EXISTS recovery_attempts (
  id             BIGSERIAL PRIMARY KEY,
  execution_id   TEXT,
  worker_id      TEXT,
  action_type    TEXT        NOT NULL,  -- restart|reroute|replay|reconcile|rebuild|cleanup|replace|dlq_fallback
  status         TEXT        NOT NULL,  -- recovery_applied|recovery_failed|cooldown|max_attempts_exceeded|exhausted
  attempt_num    INTEGER     NOT NULL DEFAULT 1,
  reason         TEXT,
  error_message  TEXT,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  recovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_attempts_execution
  ON recovery_attempts (execution_id, recovered_at DESC)
  WHERE execution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recovery_attempts_worker
  ON recovery_attempts (worker_id, recovered_at DESC)
  WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recovery_attempts_action
  ON recovery_attempts (action_type, status, recovered_at DESC);

-- Runtime failure log
CREATE TABLE IF NOT EXISTS runtime_failures (
  id            BIGSERIAL PRIMARY KEY,
  component_id  TEXT        NOT NULL,
  component_type TEXT       NOT NULL,  -- worker|execution|agent|pipeline
  failure_type  TEXT        NOT NULL,
  error_message TEXT,
  severity      TEXT        NOT NULL DEFAULT 'medium',  -- low|medium|high|critical
  resolved      BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_failures_component
  ON runtime_failures (component_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_failures_unresolved
  ON runtime_failures (severity, occurred_at DESC)
  WHERE resolved = FALSE;

-- Isolated faults (quarantine + circuit events)
CREATE TABLE IF NOT EXISTS isolated_faults (
  id                BIGSERIAL PRIMARY KEY,
  module_id         TEXT        NOT NULL,
  event_type        TEXT        NOT NULL,  -- failure|quarantine|release|circuit_closed
  reason            TEXT,
  degradation_level INTEGER     NOT NULL DEFAULT 0,
  circuit_state     TEXT        NOT NULL DEFAULT 'CLOSED',
  error_message     TEXT,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isolated_faults_module
  ON isolated_faults (module_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_isolated_faults_type
  ON isolated_faults (event_type, recorded_at DESC);

-- Predictive failure alerts
CREATE TABLE IF NOT EXISTS predictive_failures (
  id              BIGSERIAL PRIMARY KEY,
  component_id    TEXT        NOT NULL,
  component_type  TEXT        NOT NULL,
  probability     NUMERIC(5,3) NOT NULL,
  risk_tier       TEXT        NOT NULL,  -- NOMINAL|LOW|MEDIUM|HIGH|CRITICAL
  ttf_estimate    TEXT,                  -- '< 5 min', '5-15 min', etc.
  signals         JSONB       NOT NULL DEFAULT '[]',
  predicted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictive_failures_risk
  ON predictive_failures (risk_tier, predicted_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictive_failures_component
  ON predictive_failures (component_id, predicted_at DESC);

-- System resilience score history
CREATE TABLE IF NOT EXISTS resilience_scores (
  id                   BIGSERIAL PRIMARY KEY,
  survivability_score  NUMERIC(6,2) NOT NULL,
  grade                TEXT        NOT NULL,
  worker_health        NUMERIC(6,2) NOT NULL DEFAULT 0,
  execution_stability  NUMERIC(6,2) NOT NULL DEFAULT 0,
  recovery_velocity    NUMERIC(6,2) NOT NULL DEFAULT 0,
  isolation_health     NUMERIC(6,2) NOT NULL DEFAULT 0,
  queue_health         NUMERIC(6,2) NOT NULL DEFAULT 0,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resilience_scores_recorded_at
  ON resilience_scores (recorded_at DESC);

-- Emergency routing events
CREATE TABLE IF NOT EXISTS emergency_routing_events (
  id           BIGSERIAL PRIMARY KEY,
  event_type   TEXT        NOT NULL,  -- emergency_declared|emergency_resolved|reroute
  scope        TEXT,                  -- workerId | pipeline | system
  reason       TEXT,
  strategy     TEXT,
  emergency_id TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_routing_events_type
  ON emergency_routing_events (event_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_routing_events_scope
  ON emergency_routing_events (scope, recorded_at DESC)
  WHERE scope IS NOT NULL;
