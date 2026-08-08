-- Migration 040: AI Factory product_type foundation (Phase 1)
-- Run in Supabase SQL Editor

ALTER TABLE tools ADD COLUMN IF NOT EXISTS product_type        TEXT  NOT NULL DEFAULT 'prompt-tool';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS asset_url            TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS packaging_metadata   JSONB;

NOTIFY pgrst, 'reload schema';
