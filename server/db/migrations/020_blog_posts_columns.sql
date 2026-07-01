-- Migration 020: Add all missing columns to blog_posts table
-- Run in Supabase SQL Editor

-- Add each column only if it doesn't already exist
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author           TEXT         DEFAULT 'AWE-OS Team';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS read_time        TEXT         DEFAULT '5 min read';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS excerpt          TEXT         DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title       TEXT         DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT         DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content          JSONB        DEFAULT '[]';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS faqs             JSONB        DEFAULT '[]';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS related_tools    JSONB        DEFAULT '[]';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags             TEXT[]       DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status           TEXT         DEFAULT 'published';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ  DEFAULT NOW();
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  DEFAULT NOW();

-- If blog_posts table doesn't exist at all, create it from scratch:
-- (comment out the ALTER TABLE lines above and uncomment this block)
-- CREATE TABLE IF NOT EXISTS blog_posts (
--   id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
--   slug             TEXT         UNIQUE NOT NULL,
--   title            TEXT         NOT NULL,
--   date             DATE         NOT NULL DEFAULT CURRENT_DATE,
--   category         TEXT         DEFAULT 'General',
--   author           TEXT         DEFAULT 'AWE-OS Team',
--   read_time        TEXT         DEFAULT '5 min read',
--   excerpt          TEXT         DEFAULT '',
--   meta_title       TEXT         DEFAULT '',
--   meta_description TEXT         DEFAULT '',
--   content          JSONB        DEFAULT '[]',
--   faqs             JSONB        DEFAULT '[]',
--   related_tools    JSONB        DEFAULT '[]',
--   tags             TEXT[]       DEFAULT '{}',
--   status           TEXT         DEFAULT 'published',
--   created_at       TIMESTAMPTZ  DEFAULT NOW(),
--   updated_at       TIMESTAMPTZ  DEFAULT NOW()
-- );

-- Force PostgREST to reload the schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
