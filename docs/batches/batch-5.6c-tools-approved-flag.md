# Batch 5.6c — `/tools` "All" filter fix + 16-vs-49 open question

Branch: `batch-5.6c-tools-approved-flag`, created from `origin/main` @
`2bf6396` (merge of PR #9 / batch-5.6-ssg-hydration). Independent of batch
5.6's hydration work — no shared files.

## Symptom (resolved)

Production `/tools` (All Tools tab) showed "0 tools available" / "No tools
found". `/tools?cat=pdf`, `?cat=calculators`, `?cat=converters`,
`?cat=ai_tools` all rendered correctly throughout.

## Root cause

The "All" tab and the category tabs read from two unrelated sources:

- Category tabs render `TOOL_CATALOGUE` (`client/src/data/toolCatalogue.js`)
  — a static, hardcoded file. Never touches the database.
- The "All" tab uses `useInfiniteTools` (`client/src/hooks/useInfiniteTools.js`)
  → `GET /api/tools/public` → `tools.controller.js:getPublicTools()`, which
  filters `.eq('approved', true)`.

`approved` is the platform's real "publicly listed" flag — used consistently
everywhere a tool is exposed publicly (`getPublicTools`, `GET /api/tools` in
`tools.routes.js`, and the admin `isPublished`/`is_published` toggle in the
same file's `toRow()`). It defaults to `false` (migration
`006_schema_fixes.sql` line 141) and is otherwise only set to `true` by the
AI build-pipeline's own approval step (`auto-approval-agent.js`,
`idea-pipeline.js`, `PipelineDefinitions.js`, `PipelineOrchestrator.js`).

On 2026-07-03 (commit `18a42e7`), `server/scripts/sync-tool-registry.js`
inserted real hand-shipped tools from `client/src/data/toolRegistry.js` into
the `tools` table with `status: 'live'` — but its `toRow()` never set
`approved`, so every synced row kept the column's default, `false`. That
script bypasses the AI pipeline entirely (hand-built tools, not pipeline
output), so nothing else in the codebase ever flipped `approved` to `true`
for them. Net effect: every row that should be publicly listed had
`approved = false`, so `getPublicTools()`'s filter returned zero rows.

## Pre-existing or introduced by batch 5.6?

Confirmed pre-existing, unrelated to batch 5.6:

- `client/src/pages/ToolsPage.jsx` / `client/src/hooks/useInfiniteTools.js`
  — not touched by batch 5.6.
- `server/controllers/tools.controller.js`'s `approved` filter has existed
  since Phase 5F (`0977d10`), well before batch 5.6.
- The trigger (`sync-tool-registry.js` running without setting `approved`)
  happened 2026-07-03, 9+ days before batch 5.6 started. Bug was live in
  production for 12 days, independent of the hydration fix.
- No revert of batch 5.6 needed — its commits stay as-is.

## Fix applied

### 1. Data fix (owner-run, 2026-07-15) — DONE

Read-only verification, run before any write:

```sql
SELECT status, approved, count(*) AS n
FROM tools
GROUP BY status, approved
ORDER BY status, approved;

SELECT id, slug, status, approved
FROM tools
WHERE status = 'live' AND approved = false
ORDER BY slug;
```

Result: **16 rows** with `status='live', approved=false` (my pre-check
estimate said "≥17" based on the 2026-07-03 sync memory — actual was 16;
recorded here as the corrected figure). Owner saved the 16-id list from the
second query as the rollback set.

UPDATE executed:

```sql
UPDATE tools
SET approved = true
WHERE status = 'live' AND approved = false;
```

Verified via re-run of the `GROUP BY` query: `live/true = 16`,
`live/false` group gone, all other `status` groups unchanged.

Rollback (kept for reference, not needed):

```sql
UPDATE tools
SET approved = false
WHERE id IN ( /* the 16 saved ids */ );
```

Production confirmation: `/tools` "All" tab now shows "16 tools available"
with the full grid — confirmed by owner via screenshot.

### 2. Code fix (this batch) — DONE

`server/scripts/sync-tool-registry.js`, `toRow()`: added `approved: true`
alongside `status: 'live'`, with a comment explaining why (see diff in this
batch's commit).

## Open question (NEW, found 2026-07-15 after the fix): only 16 live tools, registry has 49

The site's own copy claims "49+ Free Online Tools" (`ToolsPage.jsx`'s SEO
intro block), and counting `getAllTools()` from
`client/src/data/toolRegistry.js` directly (excluding `comingSoon` and the
`test-ai-tool` dev fixture that `sync-tool-registry.js` deliberately skips)
gives exactly **49** real tools across 5 categories (pdf: 21, calculators:
13, converters: 10, productivity: 3, ai: 2, `test-ai-tool` excluded). But
only **16** rows in the `tools` table have `status='live'` — a gap of 33.

### Evidence gathered (code-level, no DB access used)

- `sync-tool-registry.js`'s dedup logic (`fetchExistingSlugs()`) fetches
  **every** non-null slug in `tools` regardless of `status`, and skips
  inserting any registry tool whose slug already appears anywhere in the
  table:
  ```js
  const { data, error } = await supabase.from('tools').select('slug').not('slug', 'is', null);
  ...
  const toInsert = registryTools.filter((tool) => !existingSlugs.has(tool.slug));
  ```
- The prior sync-session memory (2026-07-03) recorded "New rows to insert:
  15" out of the registry's tools — meaning ~34 of the 49 registry slugs
  already existed as *some* row in `tools` before the sync ran, and were
  silently skipped rather than inserted as `status='live'`.
- `tools` is also the AI build-pipeline's own working table (ideas,
  in-progress builds, tests, failures — see `idea-pipeline.js`,
  `builder-agent.js`, `testing-agent.core.js`). It is plausible that some of
  those pre-existing rows share a slug with a real registry tool (e.g. the
  pipeline independently generated or tested something coincidentally named
  `bmi-calculator`) but sit at a non-live status (`idea`, `building`,
  `testing`, `needs_fix`, `failed`, etc.) — which would make them invisible
  to `getPublicTools()` even after this batch's fix, since they aren't
  `status='live'` at all, and explains why the 16 that made it to `live`
  don't line up with the full registry.

### Not yet confirmed — needs the following read-only query (owner to run)

```sql
SELECT slug, status, approved, source, created_at
FROM tools
WHERE slug IN (
  'merge-pdf','split-pdf','remove-pages-pdf','extract-pages-pdf','organize-pdf',
  'compress-pdf','jpg-to-pdf','word-to-pdf','excel-to-pdf','powerpoint-to-pdf',
  'pdf-to-jpg','pdf-to-word','pdf-to-text','pdf-to-ppt','pdf-to-excel',
  'rotate-pdf','watermark-pdf','page-numbers-pdf','pdf-editor','protect-pdf',
  'unlock-pdf','fd-calculator','ppf-calculator','sip-calculator','roi-calculator',
  'tax-calculator','bmi-calculator','age-calculator','loan-calculator',
  'percentage-calculator','gst-calculator','tip-calculator','discount-calculator',
  'gpa-calculator','unit-converter','word-counter','password-generator',
  'color-picker','qr-code-generator','image-compressor','currency-converter',
  'base-converter','json-formatter','csv-to-json','invoice','invoice-generator',
  'contract-generator','resume-builder','ai-content-writer'
)
ORDER BY slug;

-- Which registry slugs have NO row in tools at all (never synced, would insert cleanly)
-- — compare the 49-slug list above against this query's `slug` column manually,
-- or count: expect 49 rows back if every slug exists in some form.
```

This will show, per registry tool: does a `tools` row exist, and if so what
`status`/`approved`/`source` it currently has. That tells us definitively
whether the gap is "pre-existing non-live pipeline rows blocking the slug"
(as hypothesized above) vs. something else (e.g. a `source` CHECK constraint
rejection during the original sync, silently producing fewer inserts than
expected).

**No fix proposed yet — evidence-first per instruction.** Once the query
result is in, next steps depend on what it shows:

- If most of the 33 missing slugs have **no row at all**: re-running
  `sync-tool-registry.js --apply` (now with the `approved: true` fix) would
  insert them cleanly — but confirm the 33 didn't fail for some other reason
  (env/CHECK constraint) before assuming a plain re-run is safe.
- If most of the 33 have a row with a **non-live status**: the fix needs a
  decision — do those stale pipeline rows get overwritten/relabeled as the
  real registry tool (risky, could stomp pipeline history/test data), or does
  `sync-tool-registry.js` need slug-collision handling that's aware of
  `status` (e.g. only treat a slug as "already synced" if `status='live'`,
  otherwise still insert/update it)? This is a data-model decision, not a
  one-line fix — needs its own plan once the evidence is in.

## Files touched (this commit)

- `server/scripts/sync-tool-registry.js` — one-line fix (`approved: true`)
  plus explanatory comment. Nothing else in `server/` touched.
- `docs/batches/batch-5.6c-tools-approved-flag.md` — this file (plan +
  actuals + open question).
- `docs/backlog.md` — one dated line for the 16-vs-49 open question
  (separate from the resolved-bug line already logged 2026-07-15).

## Verification

1. Data fix already verified live in production (owner screenshot,
   "16 tools available" on `/tools` All tab) — see above.
2. Code fix: `sync-tool-registry.js` unchanged in behavior for this run
   (already applied via raw SQL, not by re-running the script) — the code
   change only affects *future* runs of this script. No re-run performed as
   part of this batch; re-running is explicitly deferred pending the open
   question above.
