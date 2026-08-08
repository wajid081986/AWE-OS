# Batch 59 — Unified Priority Queue (SDD Phase 2)

## Goal

Merge the existing structural audit flags (Bulk SEO Audit) with real GSC
performance (28d impressions, avg position) into a single ranked list —
"work on these posts next, in this order, for these reasons" — so manual
cross-referencing between the audit table and the Analytics tab isn't
needed.

Read-only, no AI calls, no migration. Additive only: reuses existing
functions/queries instead of duplicating them; does not modify the
existing structural audit, Fix This, or CTR Optimizer logic.

## Investigation findings

- `server/routes/admin-blog-bulk-audit.js` has three independent pieces,
  all reusable as-is: the structural audit (`auditPost()` → `flags`,
  `issuesCount`), Fix This (`/fix/:id`, `/fix/:id/confirm`), and CTR
  Optimizer (`/ctr-opportunities`, `/meta-suggest/:id`,
  `/meta-confirm/:id`, using `CTR_MIN_IMPRESSIONS` /
  `CTR_LOW_THRESHOLD`).
- `fetchSearchPerformance()` (admin-growth-os.js) aggregates GSC rows
  into `allPages` — but per-page **average position** is not currently
  computed there (only site-wide and per-query). Needed for the scoring
  formula, so `aggregateWindow()` gains one additive field.
- No new blog_posts columns needed — priority queue is computed on the
  fly from existing columns (`content, faqs, human_score, ai_score,
  humanized_at, meta_title, meta_description`) plus GSC data. No
  migration in this batch.

## Scoring formula (no AI, transparent, tunable constants)

```
gscPortion = min(impressions28d, 1000)/10 + min(avgPosition, 100)
score = issuesCount * 25 + gscPortion * (issuesCount === 0 ? 0.3 : 1)
```

- `issuesCount * 25` — structural weight, 0–100 (4 possible flags).
- `min(impressions, 1000)/10` — capped at 100 so one high-traffic post
  can't dominate the queue.
- `min(avgPosition, 100)` — worse (higher) position number already
  means worse ranking, so it's used directly as a positive contributor,
  capped at 100.
- `0.3` damping on the GSC portion when `issuesCount === 0` — a post
  with no structural flags has nothing for "Fix This" to act on, so it
  shouldn't outrank posts that are actually actionable, even with a
  strong GSC signal.

Posts with no GSC match get `impressions = 0, avgPosition = 0` — score
reduces to pure structural weight, so they still surface for
content-only reasons.

Sanity check:

| Post | issues | impressions | avgPos | score |
|---|---|---|---|---|
| A | 3 | 500 | 45 | 75 + (50+45) = **170** |
| B | 1 | 5000 | 8 | 25 + (100+8) = **133** |
| C | 4 | 0 | 0 | 100 + 0 = **100** |
| D | 0 | 2000 | 60 | 0 + (100+60)*0.3 = **48** |

## Implementation

### 1. `server/routes/admin-growth-os.js` — additive only

Inside `aggregateWindow()`: track a separate `pagePositionMap`
(`page_url` → `{ weighted, impressions }`), built in the same loop,
independent of the existing `pageMap` objects — so `topPages`'s
existing object shape/references stay byte-identical (no risk of a
stray field leaking into what `/recommendations` already serializes
into its AI prompt). In the `.map()` that builds `allPages`, add
`avgPosition` (rounded to 1 decimal, or `0` if no impressions)
alongside the existing `ctr`/`topQueries` fields.

### 2. `server/routes/admin-blog-bulk-audit.js` — additive only

New `GET /priority-queue`:

- Reuses `auditPost()` for structural flags, `fetchSearchPerformance()`
  for GSC data (already imported), and the existing
  `CTR_MIN_IMPRESSIONS`/`CTR_LOW_THRESHOLD` constants to compute a
  `needsMetaFix` boolean per post (same test as CTR Optimizer, so
  "Suggest" only shows where it would actually apply there too).
- Joins on the same confirmed `BLOG_URL_PREFIX + slug` pattern already
  used by `/ctr-opportunities`.
- Computes `score` per the formula above.
- Builds `reasons: string[]` — flag labels in plain English, then a GSC
  line (`"1,200 impressions (28d) at avg position 45.2"`) when
  impressions > 0, then `"Low CTR despite impressions"` when
  `needsMetaFix`.
- Returns:
  ```
  {
    success: true,
    configured: boolean,
    posts: [{
      id, title, slug, category, wordCount,
      issuesCount, flags,
      impressions, clicks, avgPosition,
      needsMetaFix, score, reasons
    }],
    summary: { totalPosts, avgScore }
  }
  ```
  sorted by `score` desc. No AI call, no writes.

### 3. `client/src/modules/admin/seo/BulkSeoAudit.jsx` — additive only

New `PriorityQueueSection` function component, rendered **above** the
existing Structural Audit table (existing two sections unchanged,
unmoved). Own local state/handlers (`fetchQueue`, `handleFixThis`,
`handleSuggest`) calling `/priority-queue`, `/fix/:id`,
`/meta-suggest/:id` directly — reuses the already-generic
`FixPreviewModal` and `MetaOptionsModal` components as-is, no changes
to those or to the existing two sections' state.

Table columns: Title, Score, Reasons (chips), Impressions, Avg
Position, then "Fix This →" (shown when `issuesCount > 0`) and
"Suggest →" (shown when `needsMetaFix`) per row, reusing the same
confirm/apply flow already wired for those two modals.

## Out of scope

- No migration, no new persisted columns.
- No changes to existing structural audit, Fix This, or CTR Optimizer
  behavior/output.
- No tab component — this page has never used tabs, stacking sections
  vertically matches its existing pattern.

## Verification

- `npm run build` (or project's equivalent) passes.
- Manual check: priority queue score ordering matches the sanity table
  above once real data loads.
- Existing Structural Audit and CTR Optimizer sections still work
  unchanged.
