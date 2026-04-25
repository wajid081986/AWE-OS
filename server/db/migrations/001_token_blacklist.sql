-- Migration 001: JWT token blacklist for logout revocation
-- Run once in the Supabase SQL editor (Database > SQL Editor)

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti        UUID        PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for the cleanup job (delete expired rows efficiently)
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires
  ON token_blacklist (expires_at);

-- Optional: auto-delete expired rows every hour via pg_cron.
-- Uncomment and run separately after enabling the pg_cron extension:
--
-- SELECT cron.schedule(
--   'cleanup-blacklist',
--   '0 * * * *',
--   $$DELETE FROM token_blacklist WHERE expires_at < NOW()$$
-- );
