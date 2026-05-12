-- ════════════════════════════════════════════════════════════════════════════════
-- AWE-OS Migration 016 — Revenue Intelligence Engine (Phase 6C)
--
-- New tables:
--   tool_revenue_metrics         — per-tool revenue signals, RPM, CTR, conversion
--   revenue_predictions          — AI revenue forecasts with confidence + drift tracking
--   revenue_health_snapshots     — ecosystem revenue health captures
--
-- Run against: Supabase service-role connection
-- Safe to re-run: all DDL uses IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════════════════════


-- ── 1. Tool Revenue Metrics ───────────────────────────────────────────────────
-- Per-tool revenue performance signals. Supports both estimated and actual values.
-- `actual_revenue` is null until real billing data is wired in.
-- `monetization_type` aligns with MonetizationIntelligence model keys.

CREATE TABLE IF NOT EXISTS tool_revenue_metrics (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id           UUID,
  tool_slug         TEXT,
  category          TEXT        NOT NULL DEFAULT 'other',
  estimated_revenue NUMERIC(12,4) NOT NULL DEFAULT 0,
  actual_revenue    NUMERIC(12,4),
  rpm               NUMERIC(10,4) NOT NULL DEFAULT 0,   -- revenue per 1000 page views
  ctr               NUMERIC(6,4)  NOT NULL DEFAULT 0,   -- click-through rate (0–1)
  conversion_rate   NUMERIC(6,4)  NOT NULL DEFAULT 0,   -- conversion rate (0–1)
  engagement_score  INTEGER       NOT NULL DEFAULT 50 CHECK (engagement_score  BETWEEN 0 AND 100),
  quality_score     INTEGER       NOT NULL DEFAULT 50 CHECK (quality_score     BETWEEN 0 AND 100),
  usage_count       INTEGER       NOT NULL DEFAULT 0,
  monetization_type TEXT          NOT NULL DEFAULT 'adsense',
  ltv_estimate      NUMERIC(12,4) NOT NULL DEFAULT 0,
  confidence_score  INTEGER       NOT NULL DEFAULT 50 CHECK (confidence_score  BETWEEN 0 AND 100),
  metadata          JSONB         NOT NULL DEFAULT '{}',
  recorded_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tool_revenue_metrics IS
  'Per-tool revenue performance signals. Estimated values from intelligence engine; actual from billing layer.';

CREATE INDEX IF NOT EXISTS idx_tool_rev_tool_id
  ON tool_revenue_metrics (tool_id, recorded_at DESC)
  WHERE tool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tool_rev_category_time
  ON tool_revenue_metrics (category, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_rev_estimated_desc
  ON tool_revenue_metrics (estimated_revenue DESC, recorded_at DESC);


-- ── 2. Revenue Predictions ────────────────────────────────────────────────────
-- Forecast records with confidence tracking and drift detection.
-- `prediction_error` is populated retroactively when actual data arrives.
-- `drift_pct` measures how far prediction drifted from actual over time.

CREATE TABLE IF NOT EXISTS revenue_predictions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id           UUID,
  tool_slug         TEXT,
  category          TEXT        NOT NULL DEFAULT 'other',
  horizon_days      INTEGER     NOT NULL DEFAULT 30,        -- forecast window
  predicted_revenue NUMERIC(12,4) NOT NULL DEFAULT 0,
  predicted_rpm     NUMERIC(10,4) NOT NULL DEFAULT 0,
  predicted_ctr     NUMERIC(6,4)  NOT NULL DEFAULT 0,
  predicted_ltv     NUMERIC(12,4) NOT NULL DEFAULT 0,
  confidence_score  INTEGER       NOT NULL DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  actual_revenue    NUMERIC(12,4),                          -- backfilled when known
  prediction_error  NUMERIC(8,4),                          -- |actual - predicted| / predicted × 100
  drift_pct         NUMERIC(8,4),
  model_version     TEXT        NOT NULL DEFAULT '6C-v1',
  inputs_snapshot   JSONB       NOT NULL DEFAULT '{}',      -- input signals at prediction time
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at      TIMESTAMPTZ                             -- when actual was compared
);

COMMENT ON TABLE revenue_predictions IS
  'Revenue forecast records. Drift tracking enables prediction accuracy improvement over time.';

CREATE INDEX IF NOT EXISTS idx_rev_pred_tool_time
  ON revenue_predictions (tool_id, created_at DESC)
  WHERE tool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rev_pred_category
  ON revenue_predictions (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rev_pred_unevaluated
  ON revenue_predictions (created_at DESC)
  WHERE evaluated_at IS NULL;


-- ── 3. Revenue Health Snapshots ───────────────────────────────────────────────
-- Periodic ecosystem-level revenue health captures.
-- Used for trend charting and rebalancing decisions.

CREATE TABLE IF NOT EXISTS revenue_health_snapshots (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ecosystem_revenue_score  INTEGER     NOT NULL DEFAULT 0 CHECK (ecosystem_revenue_score BETWEEN 0 AND 100),
  revenue_diversification  NUMERIC(6,4) NOT NULL DEFAULT 0, -- Gini-based (0=even, 1=concentrated)
  concentration_risk_score INTEGER     NOT NULL DEFAULT 0,
  monetization_efficiency  NUMERIC(6,4) NOT NULL DEFAULT 0, -- avg_revenue / avg_usage
  total_estimated_mrr      NUMERIC(12,4) NOT NULL DEFAULT 0,
  top_category_share       NUMERIC(6,4) NOT NULL DEFAULT 0, -- % of revenue in top category
  category_breakdown       JSONB       NOT NULL DEFAULT '{}',
  top_tools                JSONB       NOT NULL DEFAULT '[]',
  underperforming_tools    JSONB       NOT NULL DEFAULT '[]',
  risk_flags               JSONB       NOT NULL DEFAULT '[]',
  recommendations          JSONB       NOT NULL DEFAULT '[]',
  snapshot_metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE revenue_health_snapshots IS
  'Ecosystem revenue health time-series. Used for revenue diversification and concentration risk tracking.';

CREATE INDEX IF NOT EXISTS idx_rev_health_created
  ON revenue_health_snapshots (created_at DESC);


-- ── 4. Unique constraints required for upsert operations ──────────────────────

-- tool_revenue_metrics: one row per tool (upsert on tool_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tool_rev_metrics_tool_id
  ON tool_revenue_metrics (tool_id)
  WHERE tool_id IS NOT NULL;

-- revenue_predictions: one forecast row per tool × horizon
CREATE UNIQUE INDEX IF NOT EXISTS uq_rev_pred_tool_horizon
  ON revenue_predictions (tool_id, horizon_days)
  WHERE tool_id IS NOT NULL;
