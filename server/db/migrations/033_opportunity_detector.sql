-- Migration 033: recommendations + blog_view_snapshots — Opportunity Detector (shadow mode)
--
-- Phase 3 Step 1 (server/services/opportunity-detector.service.js) runs a
-- daily cron that reads existing signals (social_post_queue, newsletters,
-- tool_events, blog_posts.views, strategy_decisions, cron_health) and writes
-- recommendations here. It EXECUTES NOTHING — recommendations.suggested_action
-- is machine-readable for a FUTURE executor step, nothing consumes it yet.
-- Entire feature is behind the MARKETING_INTELLIGENCE_ENABLED env flag.

CREATE TABLE IF NOT EXISTS recommendations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detector         TEXT        NOT NULL,
  risk             TEXT        NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  title            TEXT        NOT NULL,
  detail           TEXT        NOT NULL,
  evidence         JSONB       NOT NULL DEFAULT '{}',
  suggested_action JSONB       NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'dismissed')),
  dedupe_key       TEXT,
  expires_at       TIMESTAMPTZ
);

-- Same opportunity must not pile up daily duplicates while still open.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_dedupe_open
  ON recommendations (dedupe_key)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_recommendations_status_created
  ON recommendations (status, created_at DESC);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Daily views snapshot per published post — gives POST_DECAY (and future
-- trend analysis) a time series to compare against, since blog_posts.views
-- is only ever a running total, not a history.
CREATE TABLE IF NOT EXISTS blog_view_snapshots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id  UUID        NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  views         INTEGER     NOT NULL DEFAULT 0,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_view_snapshots_post_captured
  ON blog_view_snapshots (blog_post_id, captured_at DESC);

ALTER TABLE blog_view_snapshots ENABLE ROW LEVEL SECURITY;

-- Pre-seed the new cron so cron_health / overdue-alerting picks it up immediately
INSERT INTO cron_health (cron_name) VALUES ('marketing-opportunity-scan')
ON CONFLICT (cron_name) DO NOTHING;
