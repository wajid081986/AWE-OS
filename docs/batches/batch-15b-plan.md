# Batch 15b — Robots Meta Dedupe (fast-follow)

Date: 2026-07-19
Origin: known issue found during Batch 15 production verification
(`docs/reports/batch-15-production-verification.md` §5) — logged there
for a scoped fix, not fixed inline.

## Root cause

`client/scripts/ssg-build.js` sources robots directives from two
uncoordinated places that can both fire on the same page:

1. `stripDefaultSeoTags()` only strips the shell's baked-in
   `<meta name="robots" content="index, follow">` when the route's
   Helmet output has *some* meta tag (`helmetHasMeta`) — it doesn't
   check for a robots tag specifically.
2. `injectHelmet()` unconditionally appends
   `<meta name="robots" content="noindex, follow">` when
   `route.noindex` is true, regardless of what's already there.

Two distinct bugs fall out of this:

- **City pages** (`CityToolPage.jsx` has zero `<Helmet>` usage) →
  `helmetHasMeta` is always false → default `index, follow` never
  stripped → ships alongside the appended `noindex, follow` →
  **conflicting pair**.
- **Blog posts** (`BlogPostPage.jsx` sets its own
  `<meta name="robots" content="noindex, follow">` when
  `post.noindex`) → default gets stripped correctly, but Helmet's own
  tag *and* `injectHelmet`'s appended override both survive →
  **duplicate pair** (identical, still wrong).

## Confirmed safe blast radius

Traced every route in `buildRoutes()` (`entry-server.jsx`) and every
component that touches `robots` meta:

- Only city pages and blog posts ever get `route.noindex: true` pushed
  onto the route object — no other route type sets it.
- Only `CityToolPage.jsx` (no Helmet at all) and `BlogPostPage.jsx`
  (own noindex tag) supply the divergent behavior. `LandingPage.jsx`,
  `NotFoundPage.jsx`, `PaymentSuccess.jsx` all set their own robots
  meta but are **not** part of `buildRoutes()` at all (explicitly
  excluded per `entry-server.jsx`'s own header comment) — untouched by
  this fix. `useToolSEO.js` defines a `robots` field but is dead code
  (zero call sites) — irrelevant.
- Every other SSG'd route (49 tools, categories, static pages,
  compare, FAQ) has Helmet meta of some kind (og:, description) but
  never its own robots tag, so `helmetHasMeta` is already true and the
  default is already stripped today — this fix changes nothing for
  them.

## Fix

Both functions in `ssg-build.js`. Per owner ruling, drop the shell's
default `index, follow` fallback entirely rather than re-emitting it
explicitly — matches existing tool-page/homepage behavior (zero robots
tag = implicit index,follow):

1. In `stripDefaultSeoTags()`, always strip the shell's default
   `<meta name="robots">` regardless of `helmetHasMeta` — robots
   becomes solely owned by `injectHelmet`'s `noindex` param.
2. In `injectHelmet()`, strip any `name="robots"` tag out of
   `helmet.meta` before assembling `headTags` (kills BlogPostPage's
   own tag), so the only possible robots tag left is the explicit
   `noindex, follow` append when `route.noindex` is true. When
   `route.noindex` is false, no robots tag ships at all.

## Files

1. `client/scripts/ssg-build.js` — the two function edits above.
2. `docs/batches/batch-15b-plan.md` — this plan, first commit.
3. `docs/reports/batch-15b-production-verification.md` — closure
   report after deploy.
4. `docs/batches/batch-15-plan.md` — flip the known-issue line from
   open to resolved, pointing at this batch.

**Not touched:** `BlogPostPage.jsx`, `CityToolPage.jsx`, any
component — fix is entirely in the shared build-time head-injection
logic.

## Verification (local, pre-deploy)

- `npm run build` succeeds.
- `grep` across `dist/`: exactly one
  `<meta name="robots" content="noindex, follow">` on all 24 city + 4
  blog routes; zero or one `robots` meta (never two) on every other
  route.
- `dist/sitemap.xml` still 98 URLs.
- `npm run hydration-sweep` clean.

## Branch

`batch-15b-robots-dedupe` off `origin/main`.

## Commits

Plan doc (this file) → `ssg-build.js` fix → batch-15 plan-doc status
update → verification/closure report (production, after deploy +
approval).
