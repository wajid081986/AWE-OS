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

### CONFIRMED 2026-07-15 — read-only diagnostic query result

The read-only query (listing `status`/`approved`/`source`/`created_at` for
all 49 registry slugs) was run. Result:

- **Hypothesis confirmed**: the gap is exactly "pre-existing non-live
  pipeline rows blocking the slug," not a CHECK-constraint rejection or
  anything else. `sync-tool-registry.js`'s `fetchExistingSlugs()` dedup
  matches on slug alone (any status), so a stale AI-pipeline row
  permanently prevents that slug from ever getting a real `status='live'`
  row inserted.
- **`resume-builder` has two rows for one slug** — a stale `killed`/`ai`
  row (2026-05-05) and a `live`/`manual` row. Its `live` row's
  `created_at` is **2026-04-20**, *before* the 2026-07-03 sync run — so
  this one tool's `live` status didn't come from `sync-tool-registry.js`
  at all; it was already `live` via some earlier/separate path, and the
  sync's dedup left the stale `killed`/`ai` row sitting alongside it,
  untouched.
- **`pdf-editor`** is `needs_fix` (source `manual`, same 2026-07-03
  timestamp as the general sync).
- **`roi-calculator`** is `idea` (source `manual`, 2026-05-16).
- **Exact count** (49 unique slugs, 50 rows including `resume-builder`'s
  duplicate): **15** unique slugs `live`/`approved` (14 from the
  2026-07-03 sync + `resume-builder`'s pre-existing 2026-04-20 row), **32**
  unique slugs permanently dedup-blocked by a stale `source=ai` row
  (`killed` or `building`, all timestamped 2026-04-30 through
  2026-05-07), plus `pdf-editor` and `roi-calculator` = 15 + 32 + 1 + 1 =
  **49 ✓**. (This session's earlier estimate — "16 live / ~34 missing" —
  was off by a small margin; `resume-builder`'s dual-row case is the
  reason the naive "count of `status='live'` rows" doesn't equal "count
  of registry slugs with a resolved live path.")

Raw query output:

```csv
slug,status,approved,source,created_at
age-calculator,building,false,ai,2026-05-05 15:10:33.824708
ai-content-writer,killed,false,ai,2026-05-05 15:10:33.824708
base-converter,live,true,manual,2026-07-03 06:50:24.008875
bmi-calculator,killed,false,ai,2026-05-05 15:10:33.824708
color-picker,killed,false,ai,2026-05-05 15:10:33.824708
compress-pdf,killed,false,ai,2026-05-07 12:35:40.579152
contract-generator,live,true,manual,2026-07-03 06:50:24.008875
csv-to-json,killed,false,ai,2026-05-05 15:10:33.824708
currency-converter,live,true,manual,2026-07-03 06:50:24.008875
discount-calculator,live,true,manual,2026-07-03 06:50:24.008875
excel-to-pdf,killed,false,ai,2026-05-07 16:32:40.346101
extract-pages-pdf,killed,false,ai,2026-05-07 12:35:40.579152
fd-calculator,live,true,manual,2026-07-03 06:50:24.008875
gpa-calculator,killed,false,ai,2026-05-05 15:10:33.824708
gst-calculator,live,true,manual,2026-07-03 06:50:24.008875
image-compressor,killed,false,ai,2026-05-05 15:10:33.824708
invoice,live,true,manual,2026-07-03 06:50:24.008875
invoice-generator,killed,false,ai,2026-04-30 14:42:05.873848
jpg-to-pdf,killed,false,ai,2026-05-07 12:35:40.579152
json-formatter,live,true,manual,2026-07-03 06:50:24.008875
loan-calculator,killed,false,ai,2026-05-05 15:10:33.824708
merge-pdf,killed,false,ai,2026-05-07 12:35:40.579152
organize-pdf,killed,false,ai,2026-05-07 12:35:40.579152
page-numbers-pdf,killed,false,ai,2026-05-07 12:35:40.579152
password-generator,killed,false,ai,2026-05-05 15:10:33.824708
pdf-editor,needs_fix,false,manual,2026-07-03 06:50:24.008875
pdf-to-excel,killed,false,ai,2026-05-07 16:32:40.346101
pdf-to-jpg,killed,false,ai,2026-05-07 12:35:40.579152
pdf-to-ppt,live,true,manual,2026-07-03 06:50:24.008875
pdf-to-text,live,true,manual,2026-07-03 06:50:24.008875
pdf-to-word,killed,false,ai,2026-05-07 16:32:40.346101
percentage-calculator,killed,false,ai,2026-05-05 15:10:33.824708
powerpoint-to-pdf,killed,false,ai,2026-05-07 16:32:40.346101
ppf-calculator,live,true,manual,2026-07-03 06:50:24.008875
protect-pdf,killed,false,ai,2026-05-07 12:35:40.579152
qr-code-generator,killed,false,ai,2026-05-05 15:10:33.824708
remove-pages-pdf,killed,false,ai,2026-05-07 12:35:40.579152
resume-builder,killed,false,ai,2026-05-05 15:10:33.824708
resume-builder,live,true,manual,2026-04-20 14:37:07.267931
roi-calculator,idea,false,manual,2026-05-16 18:59:05.084663
rotate-pdf,killed,false,ai,2026-05-07 12:35:40.579152
sip-calculator,live,true,manual,2026-07-03 06:50:24.008875
split-pdf,killed,false,ai,2026-05-07 12:35:40.579152
tax-calculator,live,true,manual,2026-07-03 06:50:24.008875
tip-calculator,live,true,manual,2026-07-03 06:50:24.008875
unit-converter,killed,false,ai,2026-05-05 15:10:33.824708
unlock-pdf,killed,false,ai,2026-05-07 12:35:40.579152
watermark-pdf,killed,false,ai,2026-05-07 12:35:40.579152
word-counter,building,false,ai,2026-05-05 15:10:33.824708
word-to-pdf,killed,false,ai,2026-05-07 16:32:40.346101
```

**Confirmed root cause**: the AI pipeline and the real tool registry share
one table and one slug namespace, and the sync's dedup is slug-only —
stale pipeline rows permanently block real tools from ever getting synced.

Candidate fix directions for a **future** batch (not designed or
implemented here — needs its own scoped plan and an owner ruling on
direction first, since it touches `server/` and the pipeline tables):

(a) sync upserts by `slug + source` or otherwise scopes its dedup instead
    of matching on slug alone;
(b) a slug-uniqueness/namespacing decision for the `tools` table (the
    `resume-builder` duplicate shows slug is not currently unique);
(c) possibly making the "All" tab read the same static
    `toolCatalogue.js` that the category tabs already use — single
    source of truth, removes the DB dependency for public listing
    entirely.

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
