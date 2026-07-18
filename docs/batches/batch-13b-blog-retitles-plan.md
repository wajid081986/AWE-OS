# Batch 13b — Blog Retitles + Outdated Tax Posts Removal

Branch: `batch-13b-blog-retitles`, from `origin/main` (confirmed PR #15
merge commit `bbf9057` present).

Owner-approved, all content verified against official sources by
owner. Plan saved verbatim as given.

## PART 1: Remove 2 outdated tax posts (35 → 33)

Delete from `blogPosts.js`:
- `income-tax-calculator-india-2026-old-vs-new-regime`
- `income-tax-calculator-india-2025-old-vs-new-regime`

Reason: both use FY 2020-23 era slabs (2.5L/5L/7.5L/10L/12.5L/15L
structure, three years stale) AND their worked examples apply flat
rates instead of slab-wise calculation (e.g. "₹6,00,000 at 10% =
₹60,000" — mathematically wrong even for those slabs). Owner ruling:
delete rather than fix; the correct post
(`new-vs-old-tax-regime-fy-2025-26`) covers the topic accurately.

Add 2 permanent redirects in `vercel.json`: both slugs →
`/blog/new-vs-old-tax-regime-fy-2025-26`. Remove any sitemap entries.

## PART 2: Six title replacements (verbatim, slugs UNCHANGED)

1. `qr-code-generator-10-practical-uses` →
   "10 Practical Uses for QR Codes in India (Free Generator)"
2. `ppf-calculator-india-maturity-80c-tax-benefits` →
   "PPF Calculator: Maturity Value & Section 80C Tax Benefits"
3. `sip-calculator-mutual-fund-returns-india` →
   "SIP Calculator: Plan Your Mutual Fund Returns in India"
4. `word-counter-online-writers-students` →
   "Word Counter Online: A Guide for Writers & Students"
5. `unit-converter-online-length-weight-temperature` →
   "Unit Converter: Length, Weight & Temperature Made Simple"
6. `free-gst-invoice-generator-for-indian-freelancers` →
   "GST Invoices for Freelancers: Free Generator Guide"

Update `title` field + any `<title>`/meta/OG derived from it. Do NOT
touch body content or slugs.

## PART 3: Two one-line content edits (owner-approved verbatim)

**A) PPF post** (`ppf-calculator-india-maturity-80c-tax-benefits`):
replace

> "The interest rate on PPF is revised quarterly by the government, and
> as of now, it stands at 7.1% per annum."

WITH:

> "The PPF interest rate is revised quarterly by the government. As of
> the July–September 2026 quarter, it stands at 7.1% per annum — check
> the latest rate on the National Savings Institute website before
> investing."

**B) SIP-vs-FD post** (`sip-vs-fd-india-2025`): after the sentence about
senior citizen FDs offering 8–9%, append this sentence verbatim:

> "FD rates change frequently — always verify current rates directly
> with the bank before booking."

## NOT IN SCOPE

- `new-vs-old-tax-regime-fy-2025-26`: NO changes (owner-verified correct
  for FY 2025-26; do not add any FY 2026-27 claims).
- No other posts touched.

## Verification

- Build: **126 routes** (128 - 2).
- Both removed slugs absent from `dist/`.
- `grep dist/` for all 6 new titles present + all 6 old title strings
  absent.
- Both content edits present verbatim in built HTML.
- Hydration sweep clean (127 routes = 126 + `/login`) at
  concurrency=2 and =1.
- Push, **NO merge** — owner reviews PR.
- Production 308-redirect check post-merge, as usual (Vercel serves
  308 for `permanent: true`, SEO-equivalent to 301 — established in
  Batch 13's production verification).

## Implementation log (2026-07-18)

1. Removed the 2 outdated tax-regime posts (script-driven line-range
   deletion, same method as Batch 13; verified via `import()` — 35 →
   33 posts, both slugs confirmed gone, no double-blank-line seams).
2. Added 2 redirect entries to `vercel.json` (both → the FY 2025-26
   post). Checked `public/sitemap.xml` — neither slug was listed there
   (part of the June 2026 post batch, never added to the sitemap,
   consistent with Batch 13's finding), so no sitemap edit needed.
3. Retitled the 6 posts — only the `title:` field. Traced
   `BlogPostPage.jsx`'s `<Helmet>` first: `<title>`/`og:title` read
   from a *separate* `metaTitle` field (already independent,
   non-templated, untouched by this batch); `<h1>`, the JSON-LD
   `headline`, and the breadcrumb name all read `post.title` directly
   in the render code, so they pick up the new titles with no separate
   edit needed. Confirmed all 6 diffs are exactly one line each — slug,
   date, category, body all untouched.
4. Applied the 2 owner-approved content edits verbatim — confirmed via
   diff that only the intended sentence changed in each post, nothing
   else in either paragraph/list item.

### Verification — all clean

- `npm run build`: **126 routes** (was 128) — exact predicted drop.
- Both removed slugs confirmed absent from `dist/blog/`.
- All 6 new titles present in their route's built HTML; all 6 old
  title strings return 0 matches anywhere in `dist/`.
- Both content edits confirmed present verbatim in built HTML
  (`dist/blog/ppf-calculator-india-maturity-80c-tax-benefits/index.html`,
  `dist/blog/sip-vs-fd-india-2025/index.html`).
- `hydration-sweep.js`: **127/127 clean** at both
  `HYDRATION_SWEEP_CONCURRENCY=2` and `=1` (126 SSG routes + `/login`).

**Status**: implementation complete, locally verified. Pushed, PR
opened, **not merged** — awaiting owner review. Production
308-redirect check to follow after merge+deploy.
