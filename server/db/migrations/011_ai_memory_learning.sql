-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 011 — AI Memory Layer + Autonomous Learning Engine
-- Phase 5A (Memory Layer) + Phase 5B (Learning Engine)
--
-- New tables:
--   ai_memories               — long-term persistent intelligence store
--   learning_events           — raw event log for all learning triggers
--   prompt_versions           — prompt lineage + scoring + retirement
--   generation_scores         — per-generation quality feedback
--   runtime_patterns          — cross-execution behavioral patterns
--   repair_history            — fix history with effectiveness scoring
--   tool_performance_history  — per-tool performance timeline
--   optimization_history      — optimization trials and outcomes
--   learning_feedback         — closed-loop strategy feedback
--   semantic_tags             — tag index for memory retrieval (embedding-ready)
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. AI Memories (Phase 5A — Long-Term Memory) ──────────────────────────────
-- Central persistent intelligence store.
-- Each row represents a "learned insight" that the system can retrieve and apply.
--
-- memory_type values:
--   pattern     — recognized execution/failure pattern
--   strategy    — proven strategy for a tool category
--   repair      — successful repair approach
--   prompt      — effective prompt structure/style
--   seo         — SEO structure that ranked well
--   performance — performance bottleneck and its resolution
--   insight     — general learned insight
CREATE TABLE IF NOT EXISTS ai_memories (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_type    TEXT        NOT NULL,
  subject        TEXT        NOT NULL,     -- human-readable label, e.g. 'pdf-tool-timeout-fix'
  content        JSONB       NOT NULL DEFAULT '{}',  -- the actual knowledge payload
  confidence     NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence BETWEEN 0 AND 1),
  usage_count    INTEGER     NOT NULL DEFAULT 0,
  last_used_at   TIMESTAMPTZ,
  tags           TEXT[]      NOT NULL DEFAULT '{}',  -- searchable tag array
  source_type    TEXT,                    -- 'pipeline', 'tool', 'agent', 'cron', 'manual'
  source_id      TEXT,                    -- id of the source entity
  parent_id      UUID        REFERENCES ai_memories(id) ON DELETE SET NULL,  -- lineage chain
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at     TIMESTAMPTZ,             -- optional TTL for time-bounded insights
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_memories_type_active
  ON ai_memories (memory_type, is_active, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_ai_memories_tags
  ON ai_memories USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_ai_memories_source
  ON ai_memories (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_memories_confidence
  ON ai_memories (confidence DESC) WHERE is_active = TRUE;

COMMENT ON TABLE ai_memories IS
  'Long-term persistent intelligence store. Each row is a learned insight the system can recall and apply.';


-- ── 2. Learning Events (Phase 5B — Event Log) ─────────────────────────────────
-- Raw event log for every learning trigger.
-- Normalized into ai_memories by the learning pipelines.
-- event_type values: 'tool_success', 'tool_failure', 'pipeline_completed',
--   'pipeline_failed', 'repair_applied', 'prompt_scored', 'optimization_ran'
CREATE TABLE IF NOT EXISTS learning_events (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type     TEXT        NOT NULL,
  source_type    TEXT        NOT NULL,     -- 'pipeline', 'tool', 'step', 'agent'
  source_id      TEXT,
  outcome        TEXT        NOT NULL,     -- 'success', 'failure', 'partial', 'unknown'
  confidence     NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (confidence BETWEEN 0 AND 1),
  score          NUMERIC(5,2),             -- 0.00–100.00
  pattern_signature TEXT,                  -- from pattern-detector.js
  pipeline_id    TEXT,
  execution_id   TEXT,
  tool_id        TEXT,
  agent_name     TEXT,
  duration_ms    INTEGER,
  error_category TEXT,                     -- from errorClassifier.js
  metadata       JSONB       NOT NULL DEFAULT '{}',
  learned_at     TIMESTAMPTZ DEFAULT NOW(),
  processed      BOOLEAN     NOT NULL DEFAULT FALSE,  -- has this been distilled to ai_memories?
  processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_learning_events_type_outcome
  ON learning_events (event_type, outcome, learned_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_unprocessed
  ON learning_events (processed, learned_at DESC)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_learning_events_source
  ON learning_events (source_type, source_id, learned_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_pipeline
  ON learning_events (pipeline_id, learned_at DESC)
  WHERE pipeline_id IS NOT NULL;

COMMENT ON TABLE learning_events IS
  'Raw learning event log. processed=FALSE rows are pending distillation into ai_memories.';


-- ── 3. Prompt Versions (Phase 5B — Prompt Evolution) ──────────────────────────
-- Tracks every version of every prompt used in generation.
-- Enables lineage tracking, scoring, and auto-retirement of weak prompts.
-- status values: 'active', 'retired', 'experimental', 'promoted'
CREATE TABLE IF NOT EXISTS prompt_versions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_name     TEXT        NOT NULL,    -- human label: 'tool-gen-pdf', 'idea-scoring'
  version         INTEGER     NOT NULL DEFAULT 1,
  prompt_hash     TEXT        NOT NULL UNIQUE,  -- SHA-256 from prompt-builder.js
  content         TEXT        NOT NULL,    -- full prompt text
  role            TEXT,                   -- AI role/persona
  category        TEXT,                   -- tool category context
  strategy        TEXT,                   -- strategy hint injected
  output_format   TEXT,
  score           NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (score BETWEEN 0 AND 1),
  usage_count     INTEGER     NOT NULL DEFAULT 0,
  success_count   INTEGER     NOT NULL DEFAULT 0,
  failure_count   INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'active',
  parent_id       UUID        REFERENCES prompt_versions(id) ON DELETE SET NULL,
  evolved_from_hash TEXT,                 -- hash of the prompt this was evolved from
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (prompt_name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_name_status
  ON prompt_versions (prompt_name, status, score DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_hash
  ON prompt_versions (prompt_hash);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_score
  ON prompt_versions (score DESC) WHERE status = 'active';

COMMENT ON TABLE prompt_versions IS
  'Prompt lineage and scoring. Auto-retire weak prompts; evolve high performers.';


-- ── 4. Generation Scores (Phase 5B — Quality Feedback) ────────────────────────
-- Per-generation quality scores linking executions to prompt versions.
-- Feeds confidence drift detection and prompt retirement logic.
CREATE TABLE IF NOT EXISTS generation_scores (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_version_id UUID        REFERENCES prompt_versions(id) ON DELETE SET NULL,
  prompt_hash       TEXT,                  -- denormalized for fast queries without JOIN
  tool_id           TEXT,
  execution_id      TEXT,
  pipeline_id       TEXT,
  score             NUMERIC(5,2) NOT NULL, -- 0–100
  quality_indicators JSONB      NOT NULL DEFAULT '{}',  -- breakdown: syntax, semantics, perf
  outcome           TEXT        NOT NULL,  -- 'success', 'failure', 'partial'
  generation_time_ms INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gen_scores_prompt_version
  ON generation_scores (prompt_version_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gen_scores_outcome
  ON generation_scores (outcome, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gen_scores_tool
  ON generation_scores (tool_id, created_at DESC)
  WHERE tool_id IS NOT NULL;

COMMENT ON TABLE generation_scores IS
  'Per-generation quality scores. Drives prompt evolution confidence calculations.';


-- ── 5. Runtime Patterns (Phase 5B — Pattern Library) ─────────────────────────
-- Accumulated cross-execution behavioral patterns.
-- Built by FailureLearner and SuccessLearner from pattern signatures.
CREATE TABLE IF NOT EXISTS runtime_patterns (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type    TEXT        NOT NULL,    -- 'failure', 'success', 'retry', 'timeout', 'approval_block'
  signature       TEXT        NOT NULL UNIQUE,  -- from pattern-detector.buildPatternSignature()
  occurrences     INTEGER     NOT NULL DEFAULT 1,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence      NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  resolution      TEXT,                   -- if pattern was resolved: what fixed it
  is_resolved     BOOLEAN     NOT NULL DEFAULT FALSE,
  action_taken    TEXT,                   -- 'auto_fixed', 'manual_fix', 'retired', 'monitored'
  affected_tools  TEXT[]      NOT NULL DEFAULT '{}',
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_patterns_type_confidence
  ON runtime_patterns (pattern_type, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_patterns_signature
  ON runtime_patterns (signature);

CREATE INDEX IF NOT EXISTS idx_runtime_patterns_unresolved
  ON runtime_patterns (pattern_type, occurrences DESC)
  WHERE is_resolved = FALSE;

COMMENT ON TABLE runtime_patterns IS
  'Cross-execution behavioral patterns. High-occurrence unresolved patterns drive alerts.';


-- ── 6. Repair History (Phase 5B — Fix Intelligence) ──────────────────────────
-- Every applied fix with effectiveness tracking.
-- Enables repair confidence scoring and prevents re-applying failed fixes.
CREATE TABLE IF NOT EXISTS repair_history (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id          TEXT,
  execution_id     TEXT,
  error_pattern    TEXT        NOT NULL,   -- pattern signature that triggered repair
  error_category   TEXT,                   -- from errorClassifier.js
  error_message    TEXT,
  fix_type         TEXT        NOT NULL,   -- 'code_patch', 'config_change', 'retry', 'rollback', 'manual'
  fix_applied      JSONB       NOT NULL DEFAULT '{}',  -- the actual fix payload
  success          BOOLEAN     NOT NULL DEFAULT FALSE,
  confidence_before NUMERIC(4,3),
  confidence_after  NUMERIC(4,3),
  duration_ms      INTEGER,
  attempts         INTEGER     NOT NULL DEFAULT 1,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_repair_history_pattern
  ON repair_history (error_pattern, success, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_history_tool
  ON repair_history (tool_id, created_at DESC)
  WHERE tool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repair_history_success
  ON repair_history (fix_type, success, created_at DESC);

COMMENT ON TABLE repair_history IS
  'Repair history with effectiveness tracking. Drives repair confidence scoring.';


-- ── 7. Tool Performance History (Phase 5A — Performance Timeline) ─────────────
-- Per-tool performance snapshots over time.
-- Enables trend analysis and regression detection.
CREATE TABLE IF NOT EXISTS tool_performance_history (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id          TEXT        NOT NULL,
  tool_slug        TEXT,
  pipeline_run_id  TEXT,
  execution_id     TEXT,
  score            NUMERIC(5,2),
  quality_score    NUMERIC(5,2),
  duration_ms      INTEGER,
  outcome          TEXT        NOT NULL,   -- 'success', 'failure', 'partial'
  step_count       INTEGER,
  retry_count      INTEGER     NOT NULL DEFAULT 0,
  error_category   TEXT,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  recorded_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_perf_tool_id
  ON tool_performance_history (tool_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_perf_outcome
  ON tool_performance_history (outcome, recorded_at DESC);

-- Supports sliding-window trend queries
CREATE INDEX IF NOT EXISTS idx_tool_perf_recent
  ON tool_performance_history (recorded_at DESC);

COMMENT ON TABLE tool_performance_history IS
  'Per-tool performance timeline. Enables trend analysis and regression alerts.';


-- ── 8. Optimization History (Phase 5B — Optimization Advisor) ─────────────────
-- Record of every optimization suggestion tried and its outcome.
CREATE TABLE IF NOT EXISTS optimization_history (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type      TEXT        NOT NULL,   -- 'pipeline', 'tool', 'step', 'agent', 'system'
  target_id        TEXT,
  optimization_type TEXT       NOT NULL,   -- 'retry_policy', 'timeout', 'prompt', 'queue', 'concurrency'
  suggestion       TEXT        NOT NULL,   -- human-readable suggestion text
  before_state     JSONB       NOT NULL DEFAULT '{}',
  after_state      JSONB       NOT NULL DEFAULT '{}',
  improvement_pct  NUMERIC(6,2),          -- % improvement observed (negative = regression)
  confidence       NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  status           TEXT        NOT NULL DEFAULT 'suggested',  -- suggested|applied|rejected|pending
  applied_at       TIMESTAMPTZ,
  applied_by       TEXT,                  -- 'auto' or admin userId
  verified_at      TIMESTAMPTZ,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optim_history_target
  ON optimization_history (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_optim_history_status
  ON optimization_history (status, confidence DESC);

COMMENT ON TABLE optimization_history IS
  'Optimization suggestion log. Tracks what was tried, when, and whether it worked.';


-- ── 9. Learning Feedback (Phase 5B — Closed-Loop) ─────────────────────────────
-- Records strategy decision outcomes to close the learning loop.
-- The loop: strategy selected → execution ran → outcome recorded → confidence updated
CREATE TABLE IF NOT EXISTS learning_feedback (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_type      TEXT        NOT NULL,  -- 'retry', 'skip', 'degrade', 'default', 'pattern_based'
  strategy_config    JSONB       NOT NULL DEFAULT '{}',
  execution_id       TEXT,
  tool_id            TEXT,
  pattern_signature  TEXT,
  outcome            TEXT        NOT NULL,  -- 'success', 'failure', 'timeout'
  confidence_before  NUMERIC(4,3),
  confidence_after   NUMERIC(4,3),
  score              NUMERIC(5,2),
  duration_ms        INTEGER,
  applied_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_feedback_strategy
  ON learning_feedback (strategy_type, outcome, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_feedback_pattern
  ON learning_feedback (pattern_signature, applied_at DESC)
  WHERE pattern_signature IS NOT NULL;

COMMENT ON TABLE learning_feedback IS
  'Closed-loop strategy feedback. Links decision made → outcome observed → confidence drift.';


-- ── 10. Semantic Tags (Phase 5A — Tag Index + Vector Migration Path) ──────────
-- Tag-weighted index for memory retrieval.
-- Architecture designed for future pgvector migration:
--   current:  tag matching + weight sum scoring
--   future:   replace tag_weights with embedding_vector column
CREATE TABLE IF NOT EXISTS semantic_tags (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id    UUID        NOT NULL REFERENCES ai_memories(id) ON DELETE CASCADE,
  tag          TEXT        NOT NULL,
  weight       NUMERIC(4,3) NOT NULL DEFAULT 1.000 CHECK (weight BETWEEN 0 AND 1),
  -- Vector migration hook: uncomment when pgvector extension is enabled
  -- embedding_fragment VECTOR(1536),
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (memory_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_semantic_tags_tag
  ON semantic_tags (tag, weight DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_tags_memory_id
  ON semantic_tags (memory_id);

COMMENT ON TABLE semantic_tags IS
  'Tag-weighted index for ai_memories. Designed for pgvector migration: replace tag matching with embedding similarity.';


-- ── 11. auto-updated_at triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_memories','prompt_versions','runtime_patterns','optimization_history'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at()',
      t, t
    );
  END LOOP;
END $$;


-- ── 12. Row-Level Security ─────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_memories','learning_events','prompt_versions','generation_scores',
    'runtime_patterns','repair_history','tool_performance_history',
    'optimization_history','learning_feedback','semantic_tags'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      $policy$
      DO $inner$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename=%L AND policyname=%L
        ) THEN
          EXECUTE $p$CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)$p$;
        END IF;
      END $inner$
      $policy$,
      t,
      'service_role_' || t,
      'service_role_' || t,
      t
    );
  END LOOP;
END $$;


-- ── 13. Cleanup helper RPCs ────────────────────────────────────────────────────

-- Prune processed learning events older than N days
CREATE OR REPLACE FUNCTION purge_old_learning_events(p_days INT DEFAULT 30)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE rows_deleted INT;
BEGIN
  DELETE FROM learning_events
  WHERE processed = TRUE
    AND learned_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$;

-- Prune tool_performance_history older than N days
CREATE OR REPLACE FUNCTION purge_old_tool_performance(p_days INT DEFAULT 90)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE rows_deleted INT;
BEGIN
  DELETE FROM tool_performance_history WHERE recorded_at < NOW() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$;

-- Get top N performing prompt versions by name
CREATE OR REPLACE FUNCTION get_top_prompts(p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID, prompt_name TEXT, version INT, score NUMERIC,
  usage_count INT, success_count INT, failure_count INT, status TEXT
) LANGUAGE sql AS $$
  SELECT id, prompt_name, version, score, usage_count, success_count, failure_count, status
  FROM prompt_versions
  WHERE status = 'active'
  ORDER BY score DESC, usage_count DESC
  LIMIT p_limit;
$$;

-- Get learning velocity: events per day over last N days
CREATE OR REPLACE FUNCTION get_learning_velocity(p_days INT DEFAULT 7)
RETURNS TABLE(day DATE, event_count BIGINT, success_count BIGINT, failure_count BIGINT) LANGUAGE sql AS $$
  SELECT
    DATE(learned_at) AS day,
    COUNT(*)                                    AS event_count,
    COUNT(*) FILTER (WHERE outcome = 'success') AS success_count,
    COUNT(*) FILTER (WHERE outcome = 'failure') AS failure_count
  FROM learning_events
  WHERE learned_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(learned_at)
  ORDER BY day DESC;
$$;
