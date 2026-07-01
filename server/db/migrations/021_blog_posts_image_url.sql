-- Migration 021: Add featured image columns to blog_posts
-- Run in Supabase SQL Editor

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS image_url        TEXT DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS image_credit     TEXT DEFAULT NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS image_credit_url TEXT DEFAULT NULL;

-- Force PostgREST to reload the schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
