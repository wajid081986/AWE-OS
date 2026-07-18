# Batch 14 — Sitemap Auto-Generation Plan

**Verified numbers:** 126 total SSG routes (3 top-level + 5 category + 48 tools + `/blog` + 33 posts + 10 policy/about pages + 24 city pages + 1 comparison + 1 FAQ = 126). Of these, **4 blog posts carry `noindex: true`** in `blogPosts.js` (`what-is-gst-calculator-complete-guide-indians-2026`, `how-to-use-gst-calculator-online`, `top-10-free-online-calculators-for-students`, `free-calculator-tools-for-students`) → **sitemap target = 122 URLs.**

## 1. Generation
- Hook into `client/scripts/ssg-build.js`, right after its existing `const routes = buildRoutes()` loop finishes rendering. `routes` already has `.path` and `.noindex` per entry — exactly what's needed, zero new data source.
- Add a small `generateSitemap(routes, buildDate)` function in `ssg-build.js` that filters `!route.noindex`, maps to `{ loc, lastmod }`, writes `${OUT_DIR}/sitemap.xml`. XML-escape `loc` values defensively (cheap, no real special chars expected in current slugs).
- Delete `client/public/sitemap.xml` (hand-maintained file) so there's exactly one source going forward — Vite's public-dir copy would otherwise leave a stale file in `dist/` for a split second before `ssg-build.js` overwrites it, which is confusing to future editors even though harmless today.

## 2. Exclusions
- **4 noindex blog posts** (above) — filtered by the existing `route.noindex` flag, no new logic needed.
- **`/login`, `/pricing`, `/admin/*`, `/dashboard/*`, `/api/*`** — never appear because `buildRoutes()` never emits them (confirmed: `/login` and admin/dashboard are explicitly excluded per entry-server.jsx's own header comment; `/pricing` is a client-only SPA route, not in `buildRoutes()` at all — flagging this as a pre-existing gap for `docs/backlog.md`, not fixing it here).
- **Removed/redirected URLs** — checked `vercel.json`'s 8 blog redirects (batch-13 cleanup) against current `BLOG_POSTS`: none of the old slugs exist in the data file anymore, so they can't leak into a generated sitemap. Confirmed clean.

## 3. Fields
- **lastmod**: per-route where cheaply derivable — blog posts already have `post.date`, the 1 FAQ page has `publishedAt`. Thread these through `buildRoutes()` as an optional `date` field on those two route types. Everything else (static, category, tool, city, comparison pages — none of which have per-item dates in their data files) falls back to a single build-date computed once (`new Date().toISOString().slice(0,10)`).
- **changefreq/priority**: recommend **dropping both entirely**. Google documented-ignores them, the old file's values were hand-guessed and unmaintainable at 122 routes, and CLAUDE.md's "no premature complexity" ethos favors the minimal valid sitemap (`loc` + `lastmod` only).

## 4. robots.txt
- Already correct: `Sitemap: https://www.awe-os.com/sitemap.xml` — no change needed, just verified.

## 5. Verification
- Build log prints exact counts: `✅ Sitemap: 122 routes written (4 noindex excluded of 126 total)`.
- Parse `dist/sitemap.xml` (regex or a tiny XML check) → confirm `<url>` count == 122 and it's well-formed XML.
- Diff generated `<loc>` list against `buildRoutes().filter(r => !r.noindex).map(r => r.path)` — must match exactly.
- Confirm none of the 4 noindex slugs and none of the 8 redirected old slugs appear.
- `git status` shows `client/public/sitemap.xml` deleted, not duplicated.

## 6. Scope guard
- Branch `batch-14-sitemap` off `origin/main`.
- Files touched: `client/scripts/ssg-build.js`, `client/src/entry-server.jsx` (add `date` field to 2 route types), delete `client/public/sitemap.xml`, `docs/batches/batch-14-sitemap-plan.md`. That's 4 files — well under the 25-file mass-change threshold.
- No content changes, no `server/` changes (confirmed `server/core/automation-hub/sitemap-generator.js` only fetches the *served* `/sitemap.xml` over HTTP — doesn't touch the repo file, so it's unaffected either way).
