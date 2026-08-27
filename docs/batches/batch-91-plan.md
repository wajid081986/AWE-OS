# Batch 91 — GSC re-audit fixes (post batch-90)

## Context

User supplied the actual GSC export after batch-90 shipped. Six items were
checked one by one — against both the codebase and live production
(`curl` against `https://www.awe-os.com`, safe read-only requests) — before
writing this plan. Five of the six items turned out to already be fixed in
production (batch-56's `middleware.js` DEAD_PATHS 404s, batch-86/87/90's
redirects and noindex headers); GSC's report was stale, not describing
current behavior. Those are called out below as "no code change" with the
live verification that proves it, so the user has the evidence instead of
just a claim.

Three real issues survived verification:

1. **`/tools/budget-calculator` returns HTTP 200** (`curl` confirmed) — never
   a real tool (absent from `TOOL_REGISTRY`/`entry-server.jsx`), not in
   `middleware.js`'s `DEAD_PATHS` (unlike its 8 sibling phantom URLs added in
   the Aug-4 fix), so it falls through to the generic SPA shell instead of a
   real 404.

2. **Root cause of the `/gst-calculator/kolkata` vs `/tools/gst-calculator/kolkata`
   duplicate pattern**: `client/src/pages/CityToolPage.jsx:145`, the "Other
   Cities" cross-link section, builds its href as
   `` `/tools/${toolSlug}/${cityPath}` `` — an extra, wrong `/tools/` prefix.
   The real city-page route is `/:toolSlug/:city` (2 segments, no `/tools/`
   prefix — confirmed in `client/src/app/routes.jsx` and `entry-server.jsx`).
   `curl` confirmed the fallout: `/gst-calculator/kolkata` serves the real
   SSG'd page (own title, canonical, noindex); `/tools/gst-calculator/kolkata`
   serves the generic homepage shell at HTTP 200 with **no robots directive
   at all** in the raw HTML — worse than a plain soft-404, and it's actively
   generated on every one of the 24 city pages' "other cities" links, so it
   keeps producing fresh bad URLs for Google to find.

3. Fallout of #2: 24 already-crawled/indexed bad URLs
   (`/tools/<tool>/<city>` for all 3 tools × 8 cities in `cityPages.js`) need
   cleanup redirects to the correct 2-segment form, since the href fix alone
   only stops *new* ones — Google may still have the old ones indexed.

## Scope

### 1. `client/src/pages/CityToolPage.jsx`

Line 145 — fix the "Other Cities" link href:

```diff
- to={`/tools/${toolSlug}/${cityPath}`}
+ to={`/${toolSlug}/${cityPath}`}
```

### 2. `vercel.json`

Add 24 explicit redirects, `/tools/<tool>/<city>` → `https://www.awe-os.com/<tool>/<city>`
(`permanent: true`), one per real `CITY_PAGES` entry (bmi-calculator,
sip-calculator, gst-calculator × ahmedabad, kolkata, pune, chennai,
hyderabad, bengaluru, delhi, mumbai). Placed in the same grouped style as
the existing city redirects, above the apex→www host catch-all (per
batch-86's single-hop rule).

Not a wildcard/regex rule — matches this file's existing convention of
listing every retired URL explicitly (see batch-86/90), and avoids a
`/tools/:a/:b` pattern that could later shadow a real, currently-unbuilt
3-segment `/tools/*` path (e.g. `/tools/pdf-editor/editor` if that ever
becomes real).

### 3. `middleware.js`

Add `/tools/budget-calculator` to both `DEAD_PATHS` and `config.matcher`,
same treatment as its 8 siblings added in the Aug-4 fix. Note in the file's
existing comment block that this 9th entry has no internal referrer either
(the one blog-post link to it was already dropped in batch-55) — it's a
pure phantom URL, same profile as the rest.

## No code change (verified already correct in production)

- `/store` — `curl -I` shows `X-Robots-Tag: noindex` present.
- `/tools/character-counter`, `/image-resizer`, `/loan-emi-calculator`,
  `/income-tax-calculator`, `/investment-calculator` — all return `308`.
- `/tools/investment-growth-calculator`, `/file-converter`,
  `/grammar-checker`, `/retirement-planner` — all return `404`
  (`middleware.js`).
- `/tools/time-zone-converter`, `/tools/retirement-calculator` — both
  return `404` already.
- `/tools/barcode-generator` — returns `404`; zero internal links found
  anywhere in `client/src` (grepped) — likely an external backlink or a
  stale Google-discovered URL, not fixable from our side.
- `/bmi-calculator/bhopa` — returns `404`; zero occurrences of the string
  "bhopa" (without the trailing "l") anywhere in the codebase — confirmed
  not our typo, external origin, already correctly dead-ended.

All of the above need a GSC re-indexing / "Validate Fix" request from the
user, not another code change — Search Console's data predates the fixes
that already shipped (batch-56, batch-86, batch-87, batch-90).

## Verification

- `npm --prefix client run build` — full SSG build must stay clean (title/h1
  counts, sitemap generation).
- Re-run the same live `curl` checks against production-equivalent behavior
  is not possible pre-deploy (no local prod-parity server for `vercel.json`
  redirects/`middleware.js`) — verification here is static: confirm the new
  `vercel.json` entries are syntactically valid and follow the existing
  destination format, confirm `CityToolPage.jsx`'s href now matches the
  route pattern other working links on the same page already use, and
  confirm `middleware.js`'s two lists stay in sync (same 9→10 entries in
  both `DEAD_PATHS` and `config.matcher`).
- Grep `cityPages.js` slugs against the new redirect list to confirm all 24
  are covered, no typos.
