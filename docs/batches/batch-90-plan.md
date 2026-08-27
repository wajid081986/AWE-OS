# Batch 90 — Google Search Console Indexing Fixes (soft-404, canonical, robots, redirects, noindex)

## Context

User asked for a full GSC indexing-issues audit (soft 404s, duplicate/canonical,
robots.txt blocks, redirect chains, noindex tags). A codebase scan (this
conversation, pre-plan) found four concrete, evidence-backed root causes and the
user approved fixing all four as this batch:

1. **Legacy `/calculators/:slug` module is a duplicate-content + soft-404 source.**
   `CalculatorPage.jsx` / `CalculatorsListPage.jsx` render a Supabase-backed
   `calculators` table client-side only — not in SSG (`entry-server.jsx`
   explicitly excludes `/calculators/*`), no `<link rel="canonical">` at all, and
   render literal "Calculator not found" text at HTTP 200 when a slug doesn't
   resolve. Content overlaps with the canonical, SSG'd `/tools/*-calculator`
   pages built from `TOOL_REGISTRY`. Decision: deprecate the public-facing pages
   entirely (the `/admin/calculators` `CalculatorBuilder` and the
   `server/routes/calculators.routes.js` API stay — out of scope, still used
   internally).

2. **`/tools/resume` is an orphaned route.** `ResumePage.jsx` (standalone, no
   `PublicLayout`) has zero internal links anywhere in `client/src` — only the
   real, distinct tool `/tools/resume-builder` is linked. Not in SSG. Decision:
   301 to `/tools/resume-builder` and remove the dead route.

3. **`/pricing` is dead-code-via-client-redirect.** `routes.jsx` has
   `<Route path="/pricing" element={<Navigate to="/" replace />} />` —
   `PricingPage.jsx` is unreachable. Not in SSG, not in `vercel.json`. A crawler
   gets HTTP 200 + generic shell, then a client-side JS redirect: classic soft-404
   signature. Decision: real 301 at the edge.

4. **`robots.txt` trailing-slash gap.** `Disallow: /dashboard/` and
   `Disallow: /admin/` only block sub-paths, not the bare `/dashboard` and
   `/admin` routes that actually exist in `routes.jsx`. Decision: add explicit
   bare-path disallow lines alongside the existing trailing-slash ones.

## Scope

### 1. `vercel.json`

Add three redirect rules (all `permanent: true`, alongside the existing
`/calculators` → `/tools/calculators` rule which stays as-is):

- `/calculators/:slug` → `https://www.awe-os.com/tools/calculators`
- `/tools/resume` → `https://www.awe-os.com/tools/resume-builder`
- `/pricing` → `https://www.awe-os.com/`

Placed before the existing apex→www host-redirect catch-all rule (order matters
for Vercel's first-match routing), same section as the other legacy-slug
redirects already there.

### 2. `client/src/app/routes.jsx`

- Remove `CalculatorsListPage`, `CalculatorPage` lazy imports and their two
  `<Route>` entries (`/calculators`, `/calculators/:slug`) — the vercel.json
  redirects now own these paths at the edge, so the SPA never needs to render
  them.
- Remove `ResumePage` lazy import and its `<Route path="/tools/resume">` entry.
- `/pricing`'s existing `<Route>` (`Navigate to="/"`) is left as a harmless
  client-side fallback — the new vercel.json redirect intercepts first in
  production, so this line becomes unreachable dead weight but removing it is
  not requested and it costs nothing to leave (single line, already a
  known-inert redirect-shim, same pattern as the existing `/privacy` shim two
  lines below it).

### 3. Delete now-unreferenced files

- `client/src/modules/calculators/pages/CalculatorsListPage.jsx`
- `client/src/modules/calculators/pages/CalculatorPage.jsx`
- `client/src/modules/tools/resume/pages/ResumePage.jsx`
- `client/src/components/ResumeForm.jsx` (only ever imported by `ResumePage.jsx`
  — confirmed via grep, not used by the real `resume-builder` tool)

Confirm via grep before deleting each that no other file imports them.

### 4. `client/public/robots.txt`

Add bare-path disallow lines next to the existing trailing-slash ones:

```
Disallow: /dashboard/
Disallow: /dashboard
Disallow: /admin/
Disallow: /admin
Disallow: /api/
Disallow: /login
Disallow: /tools/test-ai-tool
```

### 5. `client/src/entry-server.jsx` header comment (line ~23-26)

Update the "Explicitly excluded" comment — `/tools/resume` and `/calculators/*`
are no longer routes that exist to be excluded from SSG; they're gone. Keep
`/tools/pdf-editor/editor` (never was a real route), `/payment/success`,
`/dashboard/*`, `/admin/*`, `/login`, `/404` as still accurate.

## Out of scope (do not touch)

- `server/routes/calculators.routes.js` and `/admin/calculators`
  (`CalculatorBuilder.jsx`) — the admin builder and its API stay; only the
  *public*-facing list/detail pages are being removed.
- Any other `docs/backlog.md`-worthy item surfaced during the scan
  (city-page noindex breadth, blog noindex entries, `/tools/pdf-editor/editor`
  possible stray backlink) — these were flagged as "intentional" or "needs
  GSC export to confirm" in the audit, not concrete bugs to fix here.

## Verification

- `npm --prefix client run build` (runs `generate-ssg-routes.js` → `vite build`
  → `ssg-build.js`) must complete clean.
- Inspect `client/dist/sitemap.xml` after build: confirm no `/calculators*` or
  `/tools/resume` URLs present (they never were, since SSG excluded them
  already — this just confirms no regression).
- Grep `client/dist` build output for zero remaining references to the deleted
  components (build would fail first if any import were still live).
