-- Migration 041: Add per-tool content columns for the Content Quality module (batch-83)
-- Run in Supabase SQL Editor
-- Additive only — no existing column altered or dropped.

ALTER TABLE tools ADD COLUMN IF NOT EXISTS about_content        TEXT        DEFAULT NULL;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS faq                  JSONB       DEFAULT '[]';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS content_generated_at TIMESTAMPTZ DEFAULT NULL;

-- Force PostgREST to reload the schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
