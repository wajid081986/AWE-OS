-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 012 — Multi-Agent Intelligence + Self-Optimization Engine
-- Phase 5C (Multi-Agent Collaboration) + Phase 5D (Self-Optimization Engine)
--
-- New tables:
--   agent_profiles            — agent specialization profiles + runtime metrics
--   agent_capabilities        — capability catalog per agent
--   agent_messages            — agent communication bus message log
--   collaboration_sessions    — multi-agent collaborative session records
--   collaboration_participants — session-agent membership
--   optimization_events       — runtime bottleneck and anomaly events
--   optimization_recommendations — unified recommendation store
--   decision_history          — AI decision coordination audit trail
--   runtime_tuning            — autonomous tuning records with rollback support
--   consensus_votes           — agent consensus voting records
--   intelligence_sharing      — cross-agent intelligence contributions
--   orchestration_metrics     — collaboration performance and outcome tracking
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. Agent Profiles (Phase 5C — Agent Specialization) ───────────────────────
-- Central registry of agent identity, specialization, and runtime metrics.
-- One row per agent type — upserted as runtime metrics evolve.
--
-- confidence_score: composite of base_confidence and observed success rate
-- workload_score:   normalized active task load (0 = idle, 1 = saturated)
CREATE TABLE IF NOT EXISTS agent_profiles (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          TEXT        NOT NULL UNIQUE,
  role              TEXT        NOT NULL,
  specialization    TEXT        NOT NULL,
  description       TEXT,
  base_confidence   NUMERIC(4,3) NOT NULL DEFAULT 0.700 CHECK (base_confidence BETWEEN 0 AND 1),
  confidence_score  NUMERIC(4,3) NOT NULL DEFAULT 0.700 CHECK (confidence_score BETWEEN 0 AND 1),
  workload_score    NUMERIC(4,3) NOT NULL DEFAULT 0.000 CHECK (workload_score BETWEEN 0 AND 1),
  total_tasks       INTEGER     NOT NULL DEFAULT 0,
  success_count     INTEGER     NOT NULL DEFAULT 0,
  failure_count     INTEGER     NOT NULL DEFAULT 0,
  avg_latency_ms    INTEGER,
  last_active_at    TIMESTAMPTZ,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_agent_id
  ON agent_profiles (agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_confidence
  ON agent_profiles (confidence_score DESC) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_agent_profiles_specialization
  ON agent_profiles (specialization, confidence_score DESC);

COMMENT ON TABLE agent_profiles IS
  'Agent specialization profiles with runtime performance metrics. Updated after each execution.';


-- ── 2. Agent Capabilities (Phase 5C — Capability Catalog) ─────────────────────
-- Per-agent capability entries. One row per (agent_id, capability) pair.
-- capability_score: how well this agent performs for this specific capability
CREATE TABLE IF NOT EXISTS agent_capabilities (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id         TEXT        NOT NULL,
  capability       TEXT        NOT NULL,
  capability_score NUMERIC(4,3) NOT NULL DEFAULT 0.700 CHECK (capability_score BETWEEN 0 AND 1),
  usage_count      INTEGER     NOT NULL DEFAULT 0,
  success_count    INTEGER     NOT NULL DEFAULT 0,
  is_primary       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (agent_id, capability),
  FOREIGN KEY (agent_id) REFERENCES agent_profiles(agent_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_capability
  ON agent_capabilities (capability, capability_score DESC);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_agent
  ON agent_capabilities (agent_id, is_primary);

COMMENT ON TABLE agent_capabilities IS
  'Per-agent capability definitions with performance scoring. Drives capability-based routing.';


-- ── 3. Agent Messages (Phase 5C — Communication Bus) ──────────────────────────
-- Persisted message log from the AgentCommunicationBus.
-- Supports observability, audit, dead-letter replay.
--
-- message_type: request | response | broadcast | delegate | escalate | share | consensus
CREATE TABLE IF NOT EXISTS agent_messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id      UUID        NOT NULL UNIQUE,
  correlation_id  UUID        NOT NULL,
  from_agent      TEXT        NOT NULL,
  to_agent        TEXT        NOT NULL,   -- '__broadcast__' for broadcasts
  message_type    TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  is_broadcast    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_delivered    BOOLEAN     NOT NULL DEFAULT FALSE,
  delivery_error  TEXT,
  reply_to        TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_correlation
  ON agent_messages (correlation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_from_to
  ON agent_messages (from_agent, to_agent, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_type
  ON agent_messages (message_type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_messages_undelivered
  ON agent_messages (is_delivered, sent_at DESC)
  WHERE is_delivered = FALSE;

COMMENT ON TABLE agent_messages IS
  'Agent communication bus message log. Supports replay of dead-letter messages.';


-- ── 4. Collaboration Sessions (Phase 5C — Orchestration) ──────────────────────
-- Records of multi-agent collaborative execution sessions.
-- A session has a goal, coordinator, participants, and aggregated results.
--
-- status: initializing | active | completed | failed | cancelled
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          TEXT        NOT NULL UNIQUE,
  goal                TEXT        NOT NULL,
  coordinator_agent   TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'initializing',
  requested_capabilities TEXT[]   NOT NULL DEFAULT '{}',
  participant_count   INTEGER     NOT NULL DEFAULT 0,
  task_count          INTEGER     NOT NULL DEFAULT 0,
  completed_tasks     INTEGER     NOT NULL DEFAULT 0,
  failed_tasks        INTEGER     NOT NULL DEFAULT 0,
  results             JSONB       NOT NULL DEFAULT '{}',
  intelligence_shared INTEGER     NOT NULL DEFAULT 0,
  consensus_reached   BOOLEAN,
  context             JSONB       NOT NULL DEFAULT '{}',
  error               TEXT,
  duration_ms         INTEGER,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_status
  ON collaboration_sessions (status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_coordinator
  ON collaboration_sessions (coordinator_agent, started_at DESC);

COMMENT ON TABLE collaboration_sessions IS
  'Multi-agent collaboration session records. Tracks goal, participants, and outcomes.';


-- ── 5. Collaboration Participants (Phase 5C — Session Membership) ──────────────
-- Which agents joined which collaboration session and their contribution.
CREATE TABLE IF NOT EXISTS collaboration_participants (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      TEXT        NOT NULL,
  agent_id        TEXT        NOT NULL,
  assigned_capability TEXT    NOT NULL,
  task_assigned   TEXT,
  status          TEXT        NOT NULL DEFAULT 'assigned',  -- assigned|working|completed|failed
  result          JSONB       NOT NULL DEFAULT '{}',
  contribution_score NUMERIC(4,3),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (session_id, agent_id),
  FOREIGN KEY (session_id) REFERENCES collaboration_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collab_participants_session
  ON collaboration_participants (session_id, status);

CREATE INDEX IF NOT EXISTS idx_collab_participants_agent
  ON collaboration_participants (agent_id, created_at DESC);

COMMENT ON TABLE collaboration_participants IS
  'Agent participation records for collaboration sessions. Tracks individual contributions.';


-- ── 6. Optimization Events (Phase 5D — Runtime Analysis) ──────────────────────
-- Raw bottleneck and anomaly events detected by the RuntimeOptimizer.
-- event_type: slow_api | slow_pipeline | memory_growth | queue_congestion |
--             execution_bottleneck | retry_spike | error_burst | latency_spike
CREATE TABLE IF NOT EXISTS optimization_events (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type       TEXT        NOT NULL,
  target_type      TEXT        NOT NULL,   -- 'api', 'pipeline', 'step', 'queue', 'agent', 'system'
  target_id        TEXT,
  severity         TEXT        NOT NULL DEFAULT 'warning',  -- info | warning | critical
  value            NUMERIC,
  threshold        NUMERIC,
  context          JSONB       NOT NULL DEFAULT '{}',
  resolved         BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  resolution       TEXT,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optim_events_type_severity
  ON optimization_events (event_type, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_optim_events_unresolved
  ON optimization_events (event_type, detected_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_optim_events_target
  ON optimization_events (target_type, target_id, detected_at DESC)
  WHERE target_id IS NOT NULL;

COMMENT ON TABLE optimization_events IS
  'Raw bottleneck and anomaly events detected by the RuntimeOptimizer. Feeds recommendation engine.';


-- ── 7. Optimization Recommendations (Phase 5D — Recommendation Engine) ────────
-- Unified, ranked optimization recommendations from all analysis sources.
-- Source can be: runtime_optimizer | pipeline_optimizer | prompt_optimizer |
--               autonomous_tuner | optimization_advisor | decision_coordinator
--
-- status: pending | applied | rejected | expired | auto_applied
-- priority: critical | high | medium | low
CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source               TEXT        NOT NULL,
  target_type          TEXT        NOT NULL,
  target_id            TEXT,
  recommendation_type  TEXT        NOT NULL,
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  impact_description   TEXT,
  confidence           NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence BETWEEN 0 AND 1),
  priority             TEXT        NOT NULL DEFAULT 'medium',
  estimated_impact_pct NUMERIC(6,2),
  before_state         JSONB       NOT NULL DEFAULT '{}',
  after_state          JSONB       NOT NULL DEFAULT '{}',
  auto_applicable      BOOLEAN     NOT NULL DEFAULT FALSE,  -- safe to auto-apply?
  status               TEXT        NOT NULL DEFAULT 'pending',
  applied_at           TIMESTAMPTZ,
  applied_by           TEXT,
  rejected_at          TIMESTAMPTZ,
  rejected_reason      TEXT,
  actual_impact_pct    NUMERIC(6,2),
  expires_at           TIMESTAMPTZ,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optim_recs_status_confidence
  ON optimization_recommendations (status, confidence DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_optim_recs_priority
  ON optimization_recommendations (priority, confidence DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_optim_recs_target
  ON optimization_recommendations (target_type, target_id, created_at DESC)
  WHERE target_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_optim_recs_auto_applicable
  ON optimization_recommendations (auto_applicable, confidence DESC)
  WHERE auto_applicable = TRUE AND status = 'pending';

COMMENT ON TABLE optimization_recommendations IS
  'Unified optimization recommendations from all Phase 5D analysis engines. Ranked by confidence + priority.';


-- ── 8. Decision History (Phase 5D — Decision Intelligence) ────────────────────
-- Audit trail for all coordinated AI decisions.
-- decision_type: tool_lifecycle | pipeline_config | optimization | agent_delegation |
--               system_tuning | consensus_outcome
CREATE TABLE IF NOT EXISTS decision_history (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id       TEXT        NOT NULL UNIQUE,
  decision_type     TEXT        NOT NULL,
  question          TEXT        NOT NULL,
  options           JSONB       NOT NULL DEFAULT '[]',
  outcome           TEXT        NOT NULL,
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  participating_agents TEXT[]   NOT NULL DEFAULT '{}',
  vote_summary      JSONB       NOT NULL DEFAULT '{}',
  context           JSONB       NOT NULL DEFAULT '{}',
  applied           BOOLEAN     NOT NULL DEFAULT FALSE,
  applied_at        TIMESTAMPTZ,
  applied_by        TEXT,
  overridden        BOOLEAN     NOT NULL DEFAULT FALSE,
  override_reason   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_history_type
  ON decision_history (decision_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_history_confidence
  ON decision_history (confidence DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_history_applied
  ON decision_history (applied, created_at DESC);

COMMENT ON TABLE decision_history IS
  'AI decision coordination audit trail. All autonomous decisions are logged with confidence and vote summaries.';


-- ── 9. Runtime Tuning (Phase 5D — Autonomous Tuning) ──────────────────────────
-- Records of autonomous configuration tunings with full rollback support.
-- EVERY autonomous change must have a corresponding rollback plan.
-- tuning_type: retry_policy | concurrency | queue_depth | timeout | circuit_breaker |
--              prompt_strategy | optimization_threshold
--
-- status: pending | applied | verified | rolled_back | failed
CREATE TABLE IF NOT EXISTS runtime_tuning (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tuning_id         TEXT        NOT NULL UNIQUE,
  tuning_type       TEXT        NOT NULL,
  target            TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  before_config     JSONB       NOT NULL DEFAULT '{}',
  after_config      JSONB       NOT NULL DEFAULT '{}',
  rollback_config   JSONB       NOT NULL DEFAULT '{}',
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  status            TEXT        NOT NULL DEFAULT 'pending',
  applied_by        TEXT        NOT NULL DEFAULT 'auto',
  recommendation_id TEXT,
  verification_metric TEXT,
  verified_improvement_pct NUMERIC(6,2),
  applied_at        TIMESTAMPTZ,
  verified_at       TIMESTAMPTZ,
  rolled_back_at    TIMESTAMPTZ,
  rollback_reason   TEXT,
  expires_at        TIMESTAMPTZ,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_tuning_status
  ON runtime_tuning (status, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_tuning_type
  ON runtime_tuning (tuning_type, status, created_at DESC);

COMMENT ON TABLE runtime_tuning IS
  'Autonomous tuning records with full rollback support. Every change is auditable and reversible.';


-- ── 10. Consensus Votes (Phase 5C — Agent Consensus) ──────────────────────────
-- Individual vote records within an agent consensus session.
-- vote_value: the option/candidate the agent voted for
-- weight: derived from agent confidence_score at vote time
CREATE TABLE IF NOT EXISTS consensus_votes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id         TEXT        NOT NULL,
  agent_id        TEXT        NOT NULL,
  question        TEXT        NOT NULL,
  vote_value      TEXT        NOT NULL,
  weight          NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  reasoning       TEXT,
  confidence      NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  context         JSONB       NOT NULL DEFAULT '{}',
  voted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (vote_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_consensus_votes_vote_id
  ON consensus_votes (vote_id, voted_at DESC);

CREATE INDEX IF NOT EXISTS idx_consensus_votes_agent
  ON consensus_votes (agent_id, voted_at DESC);

COMMENT ON TABLE consensus_votes IS
  'Individual agent votes in consensus decisions. Weighted by agent confidence at vote time.';


-- ── 11. Intelligence Sharing (Phase 5C — Knowledge Pool) ──────────────────────
-- Cross-agent intelligence contributions to the shared intelligence pool.
-- Agents contribute learnings; all agents can query and benefit.
CREATE TABLE IF NOT EXISTS intelligence_sharing (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contributor_agent TEXT       NOT NULL,
  subject          TEXT        NOT NULL,
  intelligence     JSONB       NOT NULL DEFAULT '{}',
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  confidence       NUMERIC(4,3) NOT NULL DEFAULT 0.600,
  query_count      INTEGER     NOT NULL DEFAULT 0,
  helpful_votes    INTEGER     NOT NULL DEFAULT 0,
  unhelpful_votes  INTEGER     NOT NULL DEFAULT 0,
  memory_id        UUID        REFERENCES ai_memories(id) ON DELETE SET NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at       TIMESTAMPTZ,
  contributed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_sharing_tags
  ON intelligence_sharing USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_intelligence_sharing_contributor
  ON intelligence_sharing (contributor_agent, contributed_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_sharing_active
  ON intelligence_sharing (confidence DESC, contributed_at DESC)
  WHERE is_active = TRUE;

COMMENT ON TABLE intelligence_sharing IS
  'Cross-agent shared intelligence pool. Agents contribute; all agents benefit from accumulated wisdom.';


-- ── 12. Orchestration Metrics (Phase 5C — Collaboration Telemetry) ─────────────
-- Aggregated performance metrics for the multi-agent orchestration layer.
-- One row per metric snapshot (collected periodically or on session end).
CREATE TABLE IF NOT EXISTS orchestration_metrics (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_period        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sessions_started     INTEGER     NOT NULL DEFAULT 0,
  sessions_completed   INTEGER     NOT NULL DEFAULT 0,
  sessions_failed      INTEGER     NOT NULL DEFAULT 0,
  total_delegations    INTEGER     NOT NULL DEFAULT 0,
  successful_delegations INTEGER   NOT NULL DEFAULT 0,
  consensus_votes_run  INTEGER     NOT NULL DEFAULT 0,
  consensus_reached    INTEGER     NOT NULL DEFAULT 0,
  avg_session_ms       INTEGER,
  avg_participants     NUMERIC(4,1),
  messages_sent        INTEGER     NOT NULL DEFAULT 0,
  intelligence_shared  INTEGER     NOT NULL DEFAULT 0,
  top_agents           JSONB       NOT NULL DEFAULT '[]',
  snapshot             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orchestration_metrics_period
  ON orchestration_metrics (metric_period DESC);

COMMENT ON TABLE orchestration_metrics IS
  'Aggregated multi-agent orchestration performance metrics. Drives collaboration health dashboard.';


-- ── 13. auto-updated_at triggers ──────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_profiles', 'agent_capabilities',
    'collaboration_sessions',
    'optimization_recommendations', 'runtime_tuning',
    'intelligence_sharing'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at()',
      t, t
    );
  END LOOP;
END $$;


-- ── 14. Row-Level Security (service_role full access) ──────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_profiles', 'agent_capabilities', 'agent_messages',
    'collaboration_sessions', 'collaboration_participants',
    'optimization_events', 'optimization_recommendations',
    'decision_history', 'runtime_tuning',
    'consensus_votes', 'intelligence_sharing', 'orchestration_metrics'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Service-role bypass (admin access)
    BEGIN
      EXECUTE format(
        'CREATE POLICY "service_role_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t, t
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ── 15. Utility RPCs ───────────────────────────────────────────────────────────

-- Get top N performing agents by composite score
CREATE OR REPLACE FUNCTION get_top_agents(p_limit INT DEFAULT 10)
RETURNS TABLE(
  agent_id TEXT, role TEXT, specialization TEXT,
  confidence_score NUMERIC, total_tasks INT, success_rate NUMERIC
) LANGUAGE sql AS $$
  SELECT
    agent_id, role, specialization, confidence_score, total_tasks,
    CASE WHEN total_tasks > 0
      THEN ROUND((success_count::NUMERIC / total_tasks) * 100, 1)
      ELSE NULL
    END AS success_rate
  FROM agent_profiles
  WHERE is_active = TRUE
  ORDER BY confidence_score DESC, total_tasks DESC
  LIMIT p_limit;
$$;

-- Get collaboration success rate for a period
CREATE OR REPLACE FUNCTION get_collaboration_stats(p_days INT DEFAULT 7)
RETURNS TABLE(
  sessions_total BIGINT, sessions_completed BIGINT, sessions_failed BIGINT,
  success_rate NUMERIC, avg_participants NUMERIC
) LANGUAGE sql AS $$
  SELECT
    COUNT(*)                                          AS sessions_total,
    COUNT(*) FILTER (WHERE status = 'completed')      AS sessions_completed,
    COUNT(*) FILTER (WHERE status = 'failed')         AS sessions_failed,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC
      / NULLIF(COUNT(*), 0) * 100, 1
    )                                                 AS success_rate,
    ROUND(AVG(participant_count), 1)                  AS avg_participants
  FROM collaboration_sessions
  WHERE started_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

-- Get pending high-confidence recommendations
CREATE OR REPLACE FUNCTION get_priority_recommendations(p_min_confidence NUMERIC DEFAULT 0.70, p_limit INT DEFAULT 20)
RETURNS TABLE(
  id UUID, source TEXT, title TEXT, description TEXT,
  confidence NUMERIC, priority TEXT, auto_applicable BOOLEAN, created_at TIMESTAMPTZ
) LANGUAGE sql AS $$
  SELECT id, source, title, description, confidence, priority, auto_applicable, created_at
  FROM optimization_recommendations
  WHERE status = 'pending'
    AND confidence >= p_min_confidence
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY
    CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    confidence DESC,
    created_at DESC
  LIMIT p_limit;
$$;

-- Purge old resolved optimization events
CREATE OR REPLACE FUNCTION purge_old_optimization_events(p_days INT DEFAULT 30)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE rows_deleted INT;
BEGIN
  DELETE FROM optimization_events
  WHERE resolved = TRUE AND detected_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$;

-- Purge old agent messages (keep undelivered)
CREATE OR REPLACE FUNCTION purge_old_agent_messages(p_days INT DEFAULT 14)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE rows_deleted INT;
BEGIN
  DELETE FROM agent_messages
  WHERE is_delivered = TRUE AND sent_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$;
