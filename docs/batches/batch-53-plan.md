# Batch 53 — CTR Optimizer

## Context

Two proven pieces already live:
1. Google Search Console integration — `fetchSearchPerformance()` in
   `server/routes/admin-growth-os.js`, reading cached `gsc_daily_stats`
   (clicks, impressions, ctr, position per `page_url`, 7d/28d windows).
2. Bulk SEO Audit + "Fix This" (batch-51/52) — proven preview-before-commit
   pattern in `server/routes/admin-blog-bulk-audit.js` /
   `client/src/modules/admin/seo/BulkSeoAudit.jsx`, plus a reusable
   `generatePostContent()` in `admin-blog.js`.

Goal: a "CTR Optimizer" — find published posts with real search impressions
but very low/zero clicks (a title/meta problem, not a ranking problem),
suggest better `meta_title`/`meta_description` via AI, apply exactly one
chosen option on explicit confirmation. **Never touches `slug`, `content`,
or the post's `title`** — only `meta_title`/`meta_description`.

## Investigation findings

1. Confirmed columns (migration 020): `meta_title TEXT DEFAULT ''`,
   `meta_description TEXT DEFAULT ''` on `blog_posts`. (A separate,
   unrelated `meta_description_humanized` exists from migration 038 —
   not used here.)
2. `fetchSearchPerformance()` (`admin-growth-os.js:172-196`) is standalone
   but unexported (`module.exports = router` only, like `admin-blog.js`
   before batch-52). Reused via one additive export line, no restructuring.
3. Join confirmed with a real live-data sample (read-only, user-approved):
   `gsc_daily_stats.page_url = 'https://www.awe-os.com/blog/' || blog_posts.slug`
   — e.g. slug `word-counter-online-writers-students` matched
   `https://www.awe-os.com/blog/word-counter-online-writers-students`
   exactly. All sampled rows used the `https://www.awe-os.com` prefix
   consistently.
4. Module placement: everything lives in the existing
   `admin-blog-bulk-audit.js` / `BulkSeoAudit.jsx` (same precedent as
   batch-52) — zero new route registrations, zero new nav entries,
   `SeoAuditor.jsx`/`BlogAssistant.jsx` untouched.

## Decisions (user-confirmed)

- Live read-only DB sample query run with explicit permission, no writes,
  no env values printed.
- CTR Optimizer ships as a second section in `BulkSeoAudit.jsx`, not a new
  module.
- `meta-confirm` UPDATE touches only `meta_title`, `meta_description`,
  `updated_at` — reviewed before implementation, same as batch-52's Fix
  This UPDATE.

## Plan

**Step 1 — `admin-growth-os.js` additive export**
`router.fetchSearchPerformance = fetchSearchPerformance` next to
`module.exports = router`. No other change.

**Step 2 — `admin-blog-bulk-audit.js` additive endpoints**
- Import `fetchSearchPerformance` from `./admin-growth-os`.
- Extend `fetchSearchPerformance()`'s `aggregateWindow()` return with an
  additive, unsliced `allPages` field (existing `topPages` — sliced top-10
  by clicks — stays unchanged for its current consumers) so zero-click
  pages aren't hidden from the opportunity query.
- `GET /ctr-opportunities` — published posts joined in JS to GSC
  `last28.allPages` by the confirmed slug/page_url join; filters to
  `impressions > 20 AND (clicks === 0 OR ctr < 0.01)`; sorted by
  impressions descending. Posts with no GSC match are excluded (no data
  isn't evidence of a CTR problem).
- `POST /meta-suggest/:id` — one `gpt-4o-mini` call, explicit timeout
  (matching this codebase's established AI-call-timeout pattern), given
  current title/meta_title/meta_description + top 2-3 GSC queries for that
  page. Returns 2-3 `{ meta_title, meta_description }` options. Preview
  only, no DB write.
- `POST /meta-confirm/:id` — commits exactly one chosen pair:
  ```js
  supabase.from('blog_posts').update({
    meta_title:       chosen.meta_title,
    meta_description: chosen.meta_description,
    updated_at:       new Date().toISOString(),
  }).eq('id', req.params.id)
  ```
  Nothing else — `slug`, `content`, `title` never appear in this UPDATE.

**Step 3 — `BulkSeoAudit.jsx` additive UI**
New "CTR Optimizer" section below the existing audit table: opportunity
posts with impressions/clicks/ctr + current meta fields. "Suggest →" opens
a panel with 2-3 side-by-side options, each with its own "Apply" button
(only the clicked one calls `/meta-confirm/:id`); section refetches after
apply.

**Step 4** — build check; one commit per step (`batch-53: ...`); summary +
verification checklist; stop.
