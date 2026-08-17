-- Migration 043: Decouple Dashboard Marketplace listing from public-site
-- visibility for the `tools` table.
-- Run in Supabase SQL Editor
-- Additive only — no existing column altered or dropped.
--
-- `approved` continues to gate whether a tool's /tools/:slug page (and
-- /api/tools/public) is reachable. `marketplace_visible` separately gates
-- whether the row appears as a card in Dashboard Marketplace's AI Tools tab
-- (GET /api/tools, server/routes/tools.routes.js). A tool can now be
-- approved=true (public page live) while marketplace_visible=false (hidden
-- from the paid/unlock store) — see docs/batches/batch-88-plan.md.
--
-- Data backfill (setting marketplace_visible=false for specific rows) is
-- done by server/scripts/batch-88-apply-marketplace-visibility.js --apply,
-- not by this migration — same convention as migration 042.

ALTER TABLE tools ADD COLUMN IF NOT EXISTS marketplace_visible BOOLEAN NOT NULL DEFAULT true;

-- Force PostgREST to reload the schema cache so the new column is visible immediately
NOTIFY pgrst, 'reload schema';
