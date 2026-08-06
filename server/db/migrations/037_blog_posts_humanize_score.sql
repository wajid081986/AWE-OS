-- Migration 037: Add AI-likelihood / humanize score columns to blog_posts
-- Run in Supabase SQL Editor

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS ai_score      INT         DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS human_score   INT         DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS humanized_at  TIMESTAMPTZ DEFAULT NULL;

-- Force PostgREST to reload the schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
