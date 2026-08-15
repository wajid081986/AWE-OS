# Batch 84 — Fix Content Quality backlog scope bug (3 root causes)

Branch: `batch-84-content-quality-backlog-fix`. Built directly on batch-83's work
(migration 041, `server/routes/admin-content-quality.js`, `ContentQualityPage.jsx`).

## Why

Batch-83's live Content Quality dashboard showed "726" tools needing content
generation (expected ~3), included hand-built tools like "Age Calculator" that
already have real content, and listed "Lead Tracker Pro" duplicated 7+ times.
Read-only investigation (this conversation) found three independent causes in
`GET /api/admin/content-quality/tools`:

1. **No `approved`/`status` filter at all** — the query only checked
   `about_content IS NULL`, so all ~640 unapproved AI-pipeline `status='idea'`
   rows (`server/agents/idea-pipeline.js:174-191`) passed through.
2. **No way to exclude hand-built tools** — the ~54-60 tools synced into the
   `tools` table by `server/scripts/sync-tool-registry.js` (for the Marketing
   Agent's blog cron) share `source='manual'`, `approved=true`, `status='live'`
   with the genuinely-in-scope tools, so no existing column can tell "renders
   via its own `TOOL_COMPONENTS` entry" (skip it) apart from "renders via
   `ToolDetailPage.jsx`'s generic fallback" (needs content) — that distinction
   only exists in a client-side JS map today.
3. **No de-duplication** — `duplicate-detector.service.js`'s dedup check only
   looks at rows still at `status='idea'` within a 30-day window
   (`fetchRecentIdeas()`, lines 43-49), so the idea pipeline can and did
   re-insert the same tool name multiple times with different auto-generated
   slugs once the original row moved past `status='idea'` or aged out.

## Scope — exactly what this batch does

1. **New migration**, next free number after `041_tools_content_quality.sql`:
   `server/db/migrations/042_tools_has_dedicated_component.sql`
   - `tools.has_dedicated_component BOOLEAN NOT NULL DEFAULT false` (additive).

2. **`server/scripts/sync-tool-registry.js`** — the only code path that ever
   inserts `source='manual'` rows into `tools`:
   - Import `TOOL_COMPONENTS` from `client/src/pages/tools/toolComponentMap.js`
     and `SLUG_ALIASES` from `client/src/data/toolRegistry.js` (already
     imported), the same way `DynamicToolPage.jsx:66-67` resolves a slug to a
     component.
   - `toRow()`: set `has_dedicated_component` from whether the tool's
     alias-resolved slug exists in `TOOL_COMPONENTS`.
   - `main()`: currently skips any slug already present in `tools` entirely.
     Add an idempotent `UPDATE` pass over already-existing registry slugs too,
     setting `has_dedicated_component` from the same lookup — so the flag
     self-heals on every future run instead of only being set at first-insert
     time. This also backfills the ~54-60 rows synced by batch-83's
     predecessor runs.
   - Re-run once with `--apply` after the migration lands, to backfill
     existing rows (the column's `DEFAULT false` alone is not sufficient or
     correct — most of these existing rows need `true`, but a blanket
     "`source='manual'` → true" backfill would be wrong too, since
     `toolRegistry.js` has ~60 entries against `TOOL_COMPONENTS`'s 54; a few
     registry tools genuinely have no dedicated component and must stay
     `false`, including the 3 real targets of batch-83: Second Brain PKM
     System, Simple Word Counter, Final Price Calculator).

3. **`server/routes/admin-content-quality.js`** — `GET /tools`:
   - Add `.eq('approved', true)` and `.eq('status', 'live')` (stricter than
     the public endpoints, which gate on `approved=true` alone — intentional,
     since `approved` can be `true` while a tool is still `building`/`testing`
     per `idea-pipeline.js:259-262`, and drafting content for a tool that may
     never ship is wasted work).
   - Add `.eq('has_dedicated_component', false)`.
   - After fetching (still ordered `created_at desc`), de-dupe in the route
     handler with a `Set` keyed on `name.trim().toLowerCase()`, keeping the
     first (= newest) occurrence per name.

## Explicitly NOT in this batch

- Fixing `duplicate-detector.service.js`'s root gap (only checks
  `status='idea'` rows within a 30-day window) — that still lets duplicate
  rows land in the `tools` table in the first place; this batch only hides
  duplicates from this one dashboard's display. Logged to `docs/backlog.md`
  instead, per your explicit call.
- Any change to `ContentQualityPage.jsx` — it just renders whatever the
  backend returns, no client change needed.
- Any change to the public endpoints' own `approved`-only gate
  (`tools.controller.js`) — separate, pre-existing scope.

## Files touched

1. `server/db/migrations/042_tools_has_dedicated_component.sql` (new)
2. `server/scripts/sync-tool-registry.js`
3. `server/routes/admin-content-quality.js`
4. `docs/backlog.md` — one line for the dedup-detector gap.

4 files, well under the ~25-file threshold.

## Verification plan

- Build + lint clean.
- No live DB writes as part of automated verification — the `--apply` backfill
  run happens manually, after your review, per standing instruction.
- Confirm the updated `GET /tools` query reads correctly against the current
  schema (columns exist, no typos) — static review, not a live query, until
  you run it yourself.
