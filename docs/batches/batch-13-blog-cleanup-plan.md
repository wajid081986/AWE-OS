# Batch 13 Plan — Blog Cleanup (Removals + Link-Renderer Fix)

Branch: `batch-13-blog-cleanup`, from `origin/main`.

Source: `docs/reports/blog-content-audit-2026-07.md` (Content Sprint
Hissa C — analysis only, no changes). This batch acts on the audit's
clear-cut items only.

## 1. Removals — exact slugs, redirect targets, sitemap impact

All 6 have a same-topic surviving twin already in the corpus — **301
redirect for every one of them**, not 410 (410 is for content with
nothing replacing it; every removal here folds into a specific
survivor).

| # | Slug to remove | Why | Redirect target (301) | In `public/sitemap.xml`? |
|---|---|---|---|---|
| 1 | `how-to-create-a-personal-budget-in-india` | Fabricated tool reference ("personal-budget-tool" doesn't exist); already `noindex` | `/blog/how-to-create-a-budget-that-works-for-you-in-india` | No |
| 2 | `image-compression-guide-2025` | Weaker twin of live duplicate cluster F | `/blog/how-to-compress-images-without-losing-quality` | **Yes — 1 line to remove** |
| 3 | `word-to-pdf-complete-guide-2025` | Weaker twin of live duplicate cluster G | `/blog/how-to-convert-word-to-pdf-free` | **Yes — 1 line to remove** |
| 4 | `emi-calculator-home-car-personal-loan-guide` | Already-`noindex` weaker twin (cluster B) | `/blog/emi-calculator-home-car-personal-loan` | No |
| 5 | `gst-calculator-india-add-or-remove-gst` | Already-`noindex` weaker twin (cluster A) | `/blog/gst-calculator-india-add-remove-gst` | No |
| 6 | `ppf-calculator-2026-maturity-amount-withdrawal-rules-tax-benefits` | Already-`noindex` weaker twin (cluster E) | `/blog/ppf-calculator-india-maturity-80c-tax-benefits` | No |

### Cluster F pick (owner-confirmed)

- **Keep**: `how-to-compress-images-without-losing-quality` — "How to
  Compress Image Online Free Without Losing Quality" — 1087 words.
- **Remove**: `image-compression-guide-2025` — "Image Compression Guide
  2025: Reduce File Size Without Losing Quality" — 695 words.
- Reason: keep is newer, longer, evergreen-titled; remove is shorter
  and dated ("2025" in title).

### Cluster G pick (owner-confirmed)

- **Keep**: `how-to-convert-word-to-pdf-free` — "How to Convert Word to
  PDF for Free" — 601 words.
- **Remove**: `word-to-pdf-complete-guide-2025` — "Word to PDF:
  Complete Conversion Guide 2025" — 734 words.
- Reason: keep has an evergreen title; remove is dated ("2025" in
  title) despite being ~130 words longer.

**Route count**: each `BLOG_POSTS` entry is the single source for its
`/blog/:slug` route (`generate-ssg-routes.js:32` and
`entry-server.jsx`'s blog loop both read `BLOG_POSTS` directly — no
separate registry). Current build: **134 routes**. After removal:
**128 routes**. Verified: no other file references any of the 6 slugs
except `blogPosts.js` itself, the auto-generated
`ssgRoutes.generated.js` (regenerates on build), and the 2 sitemap
lines noted above.

**Sitemap**: `client/public/sitemap.xml` is static/hand-maintained, no
build script touches it. Remove the 2 lines for slugs #2 and #3 (the
only two of the six currently listed there).

**Redirect mechanism**: `vercel.json`'s existing `redirects` array
(`permanent: true` = real HTTP 301 at the edge) — add 6 more entries,
same shape as the existing `/tools/pdf-merger` → `/tools/merge-pdf`
precedent.

## 2. Link-renderer fix

`BlogPostPage.jsx`'s `renderInline()` converts `<a href="...">label</a>`
and `**bold**` to real elements, but not Markdown `[text](url)` — the
reason `qr-code-generator-10-practical-uses` renders one Markdown link
as literal visible text today.

**Smallest safe change**: add a Markdown-link alternative to the
existing split regex and one more branch in the map callback, reusing
the exact same `Link`/`<a>` output + styling the `<a href>` case
already produces. No new components, no dependency, no content edits.

```js
const MD_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/
```
- Extend the early-return guard to also check for `[...](...)`.
- Extend the split regex with `|\[[^\]]+\]\([^)]+\)`.
- Same internal-vs-external branching as today (`href.startsWith('/')`
  → `<Link>`, else `<a target="_blank">`).

Known nuance, not fixed: the one existing broken instance uses an
*absolute* same-site URL, which — under the unchanged
`startsWith('/')` heuristic — renders as an external-style link
(new tab) rather than client-side routed. Matches existing `<a href>`
behavior for absolute same-site URLs already; not a new inconsistency.
Not rewriting the content to a relative path (content edit, out of
scope).

## 3. Verification

- `npm run build`: route count report reads **128**, not 134.
- Remaining 35 posts spot-checked: content intact, no orphaned
  references.
- `hydration-sweep.js`: full clean run (concurrency=2 and =1).
- Fixed Markdown link renders as a real link in
  `qr-code-generator-10-practical-uses`'s built HTML (the literal
  `[QR Code Generator](` string absent from `dist/`, replaced by a
  real `<a href="...">`).
- **301 redirects — local limitation**: `static-preview-server.js`
  does not implement `vercel.json`'s `redirects` array. Verify via
  production `curl -I` on each of the 6 removed URLs post-deploy
  (same pattern as Batch 5.6b's production-verification report).

## 4. Files touched

- `client/src/data/blogPosts.js` — remove 6 post objects.
- `vercel.json` — add 6 redirect entries.
- `client/public/sitemap.xml` — remove 2 lines.
- `client/src/pages/BlogPostPage.jsx` — extend `renderInline()`.
- (auto) `client/src/ssgRoutes.generated.js` — regenerates on build.

## 5. Backlog (logged, not fixed)

- `sitemap.xml` is stale/incomplete (12 of 41 blog posts listed, 2 of
  those already `noindex`), entirely hand-maintained with no
  build-time generation — pre-existing gap, unrelated to this batch's
  removals, worth its own scoped batch.

## Out of scope (owner instruction)

Retitling the 5 template-titled posts and updating the 5
rate-sensitive posts — owner + advising AI supply verbatim text
separately (no-AI-prose rule).

## Approval

Approved by owner. Cluster F/G picks confirmed as listed above.

## Implementation log (2026-07-18)

1. Removed all 6 posts from `blogPosts.js` (script-driven line-range
   deletion to avoid hand-editing a 6000-line file; verified via
   `import()` afterward — 41 → 35 posts, all 6 slugs confirmed gone,
   module still loads cleanly). Fixed 2 blank-line formatting seams
   left by the deletions (one trailing, one mid-file) for consistency
   with the rest of the file.
2. Added 6 `permanent: true` redirect entries to `vercel.json`, each
   removed slug → its surviving twin, matching the file's existing
   redirect pattern.
3. Removed the 2 `<url>` blocks from `client/public/sitemap.xml` for
   the two previously-live removed posts; validated `<url>`/`</url>`
   tag counts stay balanced (101/101) and both slugs are gone from the
   file.
4. Extended `BlogPostPage.jsx`'s `renderInline()` with a Markdown
   `[text](url)` alternative, reusing the existing `<a href>` case's
   output/styling/internal-vs-external branching exactly.

### Verification — all clean

- `npm run build`: **128 routes** (was 134) — exact predicted drop.
- All 6 removed slugs confirmed absent from `dist/blog/`.
- `dist/blog/qr-code-generator-10-practical-uses/index.html`: the
  literal `[QR Code Generator](` string is gone; a real
  `<a href="https://www.awe-os.com/tools/qr-code-generator" ...>` tag
  is present instead.
- `hydration-sweep.js`: **129/129 clean** at both
  `HYDRATION_SWEEP_CONCURRENCY=2` and `=1` (128 SSG routes + `/login`).
- **Not yet verified**: the 6 production 301 redirects themselves —
  `static-preview-server.js` doesn't implement `vercel.json`'s
  `redirects`, so this needs a post-deploy production check (`curl -I`
  each removed URL), same pattern as the Batch 5.6b production-
  verification report.

**Status**: implementation complete, locally verified. Ready to push
and open a PR; production redirect verification to follow after
merge+deploy.
