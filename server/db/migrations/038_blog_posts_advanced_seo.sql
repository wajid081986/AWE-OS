-- Migration 038: Advanced humanizer/SEO columns on blog_posts
-- Run in Supabase SQL Editor
-- Batch 48 — Title Humanizer, SEO + Humanize combined, keyword tracking

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS humanized_title             TEXT        DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS title_ai_score              INT         DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description_humanized  TEXT        DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS readability_score           INT         DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS keyword_density             NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS target_keyword              TEXT        DEFAULT NULL;

-- Force PostgREST to reload the schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
