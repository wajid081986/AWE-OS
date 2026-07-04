-- Migration 028: social_post_queue — durable retry queue for social amplification
--
-- The weekly-content marketing cron auto-tweets each newly published blog post.
-- Twitter/X failures (e.g. CreditsDepleted — an account billing/tier issue, not
-- a code bug) were previously logged as a warning and dropped. This table lets
-- a failed post be retried later instead of being silently lost.

CREATE TABLE IF NOT EXISTS social_post_queue (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT        NOT NULL DEFAULT 'twitter',
  payload       JSONB       NOT NULL,
  blog_post_id  UUID        REFERENCES blog_posts(id) ON DELETE SET NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'posted', 'failed_permanent')),
  error_code    TEXT        DEFAULT NULL,
  attempts      INTEGER     NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at     TIMESTAMPTZ DEFAULT NULL
);

-- Fast lookup for the retry cron: pending items whose backoff has elapsed
CREATE INDEX IF NOT EXISTS idx_social_post_queue_pending
  ON social_post_queue (status, next_retry_at)
  WHERE status = 'pending';

ALTER TABLE social_post_queue ENABLE ROW LEVEL SECURITY;

-- Pre-seed the new cron so cron_health / overdue-alerting picks it up immediately
INSERT INTO cron_health (cron_name) VALUES ('marketing-social-queue')
ON CONFLICT (cron_name) DO NOTHING;
