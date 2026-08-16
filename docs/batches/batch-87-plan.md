# Batch 87 — Noindex /store (GSC Soft 404 + Duplicate-canonical cleanup, part 2)

## Context

Follow-up to batch-86. User supplied the actual GSC-flagged URL lists for
"Soft 404" (12 URLs) and "Duplicate without user-selected canonical" (2
URLs). Live `curl` verification against production (`www.awe-os.com`)
against each URL found:

- 11 of the 12 Soft-404 URLs, and both of the 2 duplicate-canonical URLs,
  already resolve correctly in production (301/308 redirects from prior
  batch-13-era `vercel.json` entries, or real 404s from the existing
  `middleware.js` phantom-path list added in `01c5c747`). No code change
  needed for these 13 — the GSC report reflects a pre-fix crawl snapshot;
  they should clear once Search Console recrawls (user will click
  "Validate Fix" in GSC directly, out of scope for this repo).
- **`/store`** is the one open item. It's a real route
  (`client/src/app/routes.jsx:214` → `StoreListingPage.jsx`), linked in
  the public header nav on every page (`Header.jsx:306`), but
  `entry-server.jsx` explicitly excludes `/store/*` from the SSG build
  (not in architecture.md's frozen route table). Live curl confirmed
  production serves `/store` as HTTP 200 with the generic SPA-fallback
  shell — homepage's own `<title>`/`<meta description>`/`og:url` verbatim,
  no Store-specific content in the raw response. This is what GSC
  classified as Soft 404.

User decided (given Store isn't scoped as part of this redesign's public
SEO surface per CLAUDE.md §1): noindex `/store` rather than build out
SSG/SSR content for it.

## Fix

1. `vercel.json` — add an `X-Robots-Tag: noindex` header for the exact
   `/store` path in the existing `headers` array. This is the primary
   fix: it applies at the raw HTTP-response level, independent of
   whether/when client JS hydrates, which matters here specifically
   because `/store` has no SSR/SSG content for Google to render.
2. `client/src/modules/store/pages/StoreListingPage.jsx` — add
   `<meta name="robots" content="noindex, follow" />` inside the
   existing `<Helmet>` block (line 185-188), matching the pattern already
   used elsewhere in the codebase (e.g. `BlogPostPage.jsx`,
   `NotFoundPage.jsx`). Belt-and-suspenders / keeps this page consistent
   with how every other page in the app self-declares its own robots
   meta, in case this route is ever brought into SSG later.

## Files touched

- `vercel.json` — additive `headers` entry only, `redirects`/`rewrites`
  untouched.
- `client/src/modules/store/pages/StoreListingPage.jsx` — one additive
  `<meta>` line inside the existing `<Helmet>`.

## Out of scope

- Building real SSR/SSG content for `/store` (not chosen).
- The other 13 URLs from the GSC report — no code change, user will
  trigger "Validate Fix" in Search Console directly.

## Risk

Low. Header addition and one meta tag; no routing/behavior change for
logged-in Store functionality.
