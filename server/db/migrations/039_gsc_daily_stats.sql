-- Migration 039: Search Console daily stats cache
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gsc_daily_stats (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  page_url    TEXT NOT NULL,
  query       TEXT NOT NULL,
  clicks      INT NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  ctr         NUMERIC(6,4) NOT NULL DEFAULT 0,
  position    NUMERIC(6,2) NOT NULL DEFAULT 0,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, page_url, query)
);

CREATE INDEX IF NOT EXISTS idx_gsc_daily_stats_date ON gsc_daily_stats (date);

-- Force PostgREST to reload the schema cache so the new table is visible immediately
NOTIFY pgrst, 'reload schema';
