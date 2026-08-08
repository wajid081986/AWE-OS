# Batch 60 — Content Decay Detection (SDD Phase 3)

## Goal

Detect week-over-week ranking decay per published post — position getting
*worse* over time — and surface it inside the existing Priority Queue
(Batch 59), so problems on individual posts surface before traffic fully
disappears. Must degrade gracefully while `gsc_daily_stats` history is
still short: no error, no misleading partial trend, a clear "accumulating
data" state instead — matching the pattern already used for GSC's "not
synced yet" state in `GrowTab.jsx`.

Read-only, no AI calls, no migration. Additive only.

## Investigation findings

- Read-only query against `gsc_daily_stats` (ran with explicit approval):
  min date `2026-07-30`, max date `2026-08-05`, 332 rows, **7 distinct
  days** of real history. More than the ~2-3 days assumed at the start of
  this conversation, but still short of a meaningful trend window.
- `fetchSearchPerformance()` (`admin-growth-os.js:212`) is the existing
  precedent: rolling (not calendar) windows, returns `null` when GSC
  isn't configured, exported via `router.fetchSearchPerformance` and
  reused as-is by `admin-blog-bulk-audit.js`'s Priority Queue.
- Priority Queue's `/priority-queue` handler (`admin-blog-bulk-audit.js:246`)
  already calls `fetchSearchPerformance()` in a try/catch and merges
  `perf.last28.allPages` by `page_url` — the same shape of merge is used
  here for decay data, added independently so a decay-fetch failure can't
  break the existing GSC merge or vice versa.
- `GrowTab.jsx`'s `SearchPerformanceSection` "Not synced yet" empty state
  (dashed-border gray card, centered text, one line + optional action) is
  the reference pattern for the new "accumulating data" banner.
- No week-bucketing utility exists anywhere in the codebase — writing a
  small local one in `admin-growth-os.js` next to `aggregateWindow()`.

## Week-over-week logic (confirmed with user)

- **Bucket definition**: rolling 7-day buckets anchored to `MAX(date)` in
  the table (not calendar Mon–Sun, not wall-clock "today"). Bucket 0 =
  `[maxDate-6, maxDate]` (most recent week), bucket 1 =
  `[maxDate-13, maxDate-7]` (previous week), etc.
- **Sufficient-data gate**: needs `MAX(date) - MIN(date) + 1 >= 14` days
  of *overall* history before attempting any trend. Below that, return
  `{ sufficientData: false, daysCollected }` — no per-page computation at
  all.
- **Per-page decay**: only for pages with data in *both* bucket 0 and
  bucket 1 (true week-over-week: most recent full week vs. the week
  immediately before it — stays meaningful indefinitely, not just while
  history is short), each with `>= 10` impressions (noise filter, scaled
  down from the existing 28-day `CTR_MIN_IMPRESSIONS = 20` convention
  since a single week has less volume).
- **Decay flag**: `recentAvgPosition - previousAvgPosition >= 3.0`
  (position number went up by 3+ → ranking got worse). Impression-weighted
  average position per bucket, same weighting `aggregateWindow()` already
  uses for `avgPosition`.
- Server-side lookback capped at 60 days (8 weekly buckets) — bounds
  query size; decay only ever compares buckets 0 and 1 regardless of how
  much more history exists.

## Implementation

### 1. `server/routes/admin-growth-os.js` — additive only

- New constants: `DECAY_LOOKBACK_DAYS = 60`, `DECAY_BUCKET_DAYS = 7`,
  `DECAY_MIN_TOTAL_DAYS = 14`, `DECAY_MIN_BUCKET_IMPRESSIONS = 10`,
  `DECAY_THRESHOLD = 3.0`.
- New `fetchContentDecay()`: independent read of `gsc_daily_stats`
  (`date, page_url, impressions, position`) over the last
  `DECAY_LOOKBACK_DAYS` days. Returns:
  - `null` if GSC not configured (same convention as
    `fetchSearchPerformance`).
  - `{ sufficientData: false, daysCollected }` if overall range < 14 days
    or no rows.
  - `{ sufficientData: true, daysCollected, pages: [{ page_url,
    recentAvgPosition, previousAvgPosition, positionDelta, decaying,
    recentImpressions, previousImpressions }] }` otherwise — `pages` only
    includes rows meeting the bucket-population + impressions filter
    above.
- New `GET /search-performance/decay` route (mirrors `/search-performance`
  exactly: `{ success: true, configured: false }` when unconfigured,
  otherwise `{ success: true, configured: true, ...decayResult }`).
- Export `router.fetchContentDecay = fetchContentDecay` alongside the
  existing `router.fetchSearchPerformance` export.
- `aggregateWindow()`, `fetchSearchPerformance()`, and all existing
  routes in this file are untouched.

### 2. `server/routes/admin-blog-bulk-audit.js` — additive only

- Import `fetchContentDecay` alongside the existing
  `fetchSearchPerformance` import.
- In `/priority-queue`: call `fetchContentDecay()` in its own try/catch
  (independent of the existing `perf` try/catch — one failing must not
  affect the other), build `decayByUrl` map from `decay.pages` only when
  `decay?.sufficientData`.
- Per post: look up `decayByUrl.get(BLOG_URL_PREFIX + post.slug)`; if
  found and `.decaying`, push a reason string (`"Ranking worsening:
  position 12.3 → 16.1 vs. last week"`) and attach `decaying: true,
  positionDelta` to the post object. Posts with no decay match get
  `decaying: false, positionDelta: null` — same "absent data isn't a
  problem" convention as the rest of this endpoint.
- Response gains one new top-level field, `decayStatus: { sufficientData,
  daysCollected }` (computed once, not per post) so the client can render
  the "accumulating data" banner without inspecting every row.
- Existing `priorityScore()` formula, `needsMetaFix` logic, and every
  other route in this file are untouched — decay only adds a reason line
  and two fields, it does not change sort order.

### 3. `client/src/modules/admin/seo/BulkSeoAudit.jsx` — additive only, `PriorityQueueSection`/`PriorityQueueRow` only

- `fetchQueue()` also stores `res.data.decayStatus`.
- When `decayStatus && !decayStatus.sufficientData`, render a dashed
  border note above the table, styled like `GrowTab.jsx`'s "Not synced
  yet" card: *"Accumulating data — content decay trend available after 14
  days (currently {daysCollected} day(s) collected)."*
- No new table column: the decay reason already appears in the existing
  Reasons cell (server-generated string). `PriorityQueueRow` additionally
  bolds/colors that one row's Reasons cell red-ish when
  `post.decaying` is true, reusing the cell that already exists — no new
  component.
- No other tab, section, or component in this file is touched.

## Out of scope

- No migration, no new `blog_posts` columns — decay is computed on the
  fly from `gsc_daily_stats`, same as GSC performance.
- No changes to `priorityScore()`, CTR Optimizer, Fix This, or any other
  existing route/behavior.
- No separate Analytics-tab section — folded into Priority Queue per
  user's explicit choice (less new UI code, and it's already the
  "what needs attention" surface).

## Verification

- `npm run build` (or project's equivalent) passes.
- Real data can't yet exercise the `sufficientData: true` path (only 7
  days collected). A throwaway local Node script in the scratchpad
  directory (not committed, not writing to the real table) feeds
  synthetic `gsc_daily_stats`-shaped rows through the bucketing/decay
  logic to confirm the math — bucket boundaries, the 14-day gate, the
  10-impression filter, and the 3.0 threshold — before wiring it to the
  real table.
- Manual check: `/priority-queue` still returns correctly or gracefully
  when GSC is unconfigured, when GSC is configured but has < 14 days of
  data (current real state — should show `decayStatus.sufficientData ===
  false`), and existing Structural Audit / CTR Optimizer sections
  unaffected.
