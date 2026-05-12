-- AWE-OS Migration 017: Agent Economy
-- Phase 6D — AI Agent Economy Layer

-- Agent reputation dimensions (per-agent per-dimension scores)
CREATE TABLE IF NOT EXISTS agent_reputation (
  id            BIGSERIAL PRIMARY KEY,
  agent_id      TEXT        NOT NULL,
  dimension     TEXT        NOT NULL,  -- execution|learning|optimization|coordination|recovery
  score         NUMERIC(6,3) NOT NULL DEFAULT 0.65,
  event_count   INTEGER     NOT NULL DEFAULT 0,
  volatility    NUMERIC(6,4) NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_reputation_score_range CHECK (score >= 0 AND score <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_reputation_agent_dim
  ON agent_reputation (agent_id, dimension);

CREATE INDEX IF NOT EXISTS idx_agent_reputation_agent
  ON agent_reputation (agent_id);

-- Agent credit ledger (balance + transaction log)
CREATE TABLE IF NOT EXISTS agent_credits (
  id            BIGSERIAL PRIMARY KEY,
  agent_id      TEXT        NOT NULL,
  tx_type       TEXT        NOT NULL,  -- CREDIT | DEBIT
  amount        NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reason        TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_credits_agent
  ON agent_credits (agent_id, recorded_at DESC);

-- Agent specializations (per-agent per-category affinity)
CREATE TABLE IF NOT EXISTS agent_specializations (
  id              BIGSERIAL PRIMARY KEY,
  agent_id        TEXT        NOT NULL,
  category        TEXT        NOT NULL,
  affinity_score  NUMERIC(6,3) NOT NULL DEFAULT 0,
  task_count      INTEGER     NOT NULL DEFAULT 0,
  success_count   INTEGER     NOT NULL DEFAULT 0,
  avg_quality     NUMERIC(6,3) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_specializations_agent_cat
  ON agent_specializations (agent_id, category);

CREATE INDEX IF NOT EXISTS idx_agent_specializations_category
  ON agent_specializations (category, affinity_score DESC);

-- Agent contributions log
CREATE TABLE IF NOT EXISTS agent_contributions (
  id              BIGSERIAL PRIMARY KEY,
  agent_id        TEXT        NOT NULL,
  contribution_type TEXT      NOT NULL,
  points          NUMERIC(8,2) NOT NULL DEFAULT 0,
  quality_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  description     TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_contributions_agent
  ON agent_contributions (agent_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_contributions_type
  ON agent_contributions (contribution_type, recorded_at DESC);

-- Agent marketplace routing log
CREATE TABLE IF NOT EXISTS agent_marketplace (
  id             BIGSERIAL PRIMARY KEY,
  category       TEXT        NOT NULL,
  capability     TEXT,
  priority       TEXT        NOT NULL DEFAULT 'normal',
  agent_id       TEXT        NOT NULL,
  routing_score  NUMERIC(6,2) NOT NULL DEFAULT 0,
  routed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agent_marketplace_category
  ON agent_marketplace (category, routed_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_marketplace_agent
  ON agent_marketplace (agent_id, routed_at DESC);

-- Agent capabilities index
CREATE TABLE IF NOT EXISTS agent_capabilities (
  id           BIGSERIAL PRIMARY KEY,
  agent_id     TEXT        NOT NULL,
  capabilities TEXT[]      NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_capabilities_agent
  ON agent_capabilities (agent_id);

-- Agent economy events (snapshots + economy events)
CREATE TABLE IF NOT EXISTS agent_economy_events (
  id             BIGSERIAL PRIMARY KEY,
  event_type     TEXT        NOT NULL,  -- economy_snapshot | score_update | elite_awarded
  agent_id       TEXT,
  score          NUMERIC(6,2),
  grade          TEXT,
  elite_count    INTEGER,
  failing_count  INTEGER,
  agent_count    INTEGER,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_economy_events_type
  ON agent_economy_events (event_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_economy_events_agent
  ON agent_economy_events (agent_id, recorded_at DESC)
  WHERE agent_id IS NOT NULL;
