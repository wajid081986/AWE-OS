# Batch 15 — City Pages Noindex (approved plan)

Date: 2026-07-19
Owner ruling: MIXED — noindex buckets (b) and (c) from
`docs/reports/city-pages-audit-2026-07.md`, keep bucket (a) indexed.

**Gap surfaced before implementation:** the audit's bucket (a) came out
empty (0/24 — BMI and GST both landed in bucket (b), SIP in bucket (c);
no city page combined real city-level data, substantial unique prose,
and city-specific tool behavior). Owner confirmed: noindex all 24
(bucket (b)+(c) = all 24), drop the bucket-(a) title-fix step entirely
since there is no target page for it.

## Scope

Noindex all 24 city pages. No title changes, no content changes, no
calculator changes. Sitemap must stop listing the newly-noindexed
routes.

## Files to modify

1. **`client/src/data/cityPages.js`** — add `"noindex": true,`
   immediately after the `"metaDescription"` field on all 24 page
   objects (confirmed exactly 24 occurrences of `"metaDescription"`,
   one per page object, consistent field name — safe mechanical
   insertion). Mirrors the existing `post.noindex` field already used
   on blog post entries in `blogPosts.js`.

2. **`client/src/entry-server.jsx`** — the `CITY_PAGES` route-push loop
   gets one line added: `noindex: !!page.noindex,` — identical
   mechanism to the existing blog-post loop's `noindex: !!post.noindex,`.
   No new plumbing: `ssg-build.js`'s `injectHelmet()` already adds
   `<meta name="robots" content="noindex, follow">` when `route.noindex`
   is true, and `generateSitemap()` already filters
   `.filter(route => !route.noindex)` — both confirmed by reading the
   code, both already generic across route types.

3. **`docs/backlog.md`** — two new dated entries (2026-07-19):
   - City pages differentiation (post-AdSense): revival bar for
     re-indexing is embedding the actual calculator on the page,
     city-level (not state-level) verified data with named sources,
     fixing/removing the unsourced Delhi "41.6%" figure, and unique
     prose per city — only then selective re-indexing.
   - `cityPages.js` carries dead `metaTitle`/`metaDescription` fields,
     never read by any component — fold into a future cleanup batch.

**Not touched:** `CityToolPage.jsx` (no Helmet/title work this batch —
dropped per owner ruling since bucket (a) is empty), the 3 pages
missing `cityName`/`toolSlug` (unrelated pre-existing data-integrity
gap, already logged in the audit, out of this batch's scope).

## Exact 24 routes going to noindex

```
/bmi-calculator/ahmedabad, /bmi-calculator/bengaluru, /bmi-calculator/chennai,
/bmi-calculator/delhi, /bmi-calculator/hyderabad, /bmi-calculator/kolkata,
/bmi-calculator/mumbai, /bmi-calculator/pune,
/sip-calculator/ahmedabad, /sip-calculator/bengaluru, /sip-calculator/chennai,
/sip-calculator/delhi, /sip-calculator/hyderabad, /sip-calculator/kolkata,
/sip-calculator/mumbai, /sip-calculator/pune,
/gst-calculator/ahmedabad, /gst-calculator/bengaluru, /gst-calculator/chennai,
/gst-calculator/delhi, /gst-calculator/hyderabad, /gst-calculator/kolkata,
/gst-calculator/mumbai, /gst-calculator/pune
```

## Sitemap impact

Current build (verified via `npm run build` during the audit): 126
routes total, 122 in sitemap (4 already noindex — existing blog posts).
After this batch: still 126 routes total, 28 noindex (4 existing + 24
new) → **sitemap count 126 − 28 = 98 URLs**.

## Verification

- `npm run build` succeeds
- Exactly 24 occurrences of `noindex, follow` across
  `dist/{bmi,sip,gst}-calculator/*/index.html`, zero elsewhere (no
  accidental leakage to other routes)
- `dist/sitemap.xml` URL count = 98
- `npm run hydration-sweep` clean (pre-existing intermittent city-page
  race from batch-8b/12 is a known issue, not caused by this batch —
  will note explicitly if it reproduces, not treated as a new defect)

## Commits

One per logical unit per CLAUDE.md §6: this plan file first, then the
`cityPages.js` data change, then the `entry-server.jsx` change, then
the backlog entries, then verification/closure.

---

## STATUS: CLOSED (2026-07-19)

PR #18 merged, production-verified. Full results in
`docs/reports/batch-15-production-verification.md`.

- ✅ `main` tip = PR #18 merge commit (`0db2e2a`)
- ✅ Sitemap: 98 URLs, 0 city URLs — exact match
- ✅ Tool page / homepage: no noindex leakage
- ⚠️→✅ **Known issue fixed in [batch-15b](batch-15b-plan.md)** (not yet
  deployed at time of writing): all 24 city pages shipped a
  **conflicting** pair of robots meta tags (`index, follow` +
  `noindex, follow`); 4 noindexed blog posts shipped a duplicate pair.
  Fixed at the source in `ssg-build.js`'s
  `stripDefaultSeoTags()`/`injectHelmet()` — robots meta is now single-
  sourced from `route.noindex`, exactly one tag per route. Verified
  locally (build + grep across `dist/` + hydration sweep, all clean);
  production verification pending deploy — see batch-15b's own report
  once closed.
