-- Migration 042: Flag tools that render via their own dedicated component
-- (TOOL_COMPONENTS map) instead of ToolDetailPage.jsx's generic fallback.
-- Run in Supabase SQL Editor
-- Additive only — no existing column altered or dropped.
--
-- Set for existing rows by server/scripts/sync-tool-registry.js --apply,
-- not by this migration (see docs/batches/batch-84-plan.md) — the correct
-- value is per-slug (from client/src/pages/tools/toolComponentMap.js), not
-- a blanket true/false, so a SQL-only backfill here would be wrong.

ALTER TABLE tools ADD COLUMN IF NOT EXISTS has_dedicated_component BOOLEAN NOT NULL DEFAULT false;

-- Force PostgREST to reload the schema cache so the new column is visible immediately
NOTIFY pgrst, 'reload schema';
