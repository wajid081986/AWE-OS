# Batch 101 — fix /tools/invoice bug, About page Team honesty

## Background

Prior session's AdSense readiness assessment flagged `/tools/invoice` as
a live, broken bug reachable from the homepage's Popular Tools section
(`isFeatured: true` in `toolRegistry.js`), plus an About-page E-E-A-T
concern (AI Team/Community listed as human team members).

## Investigation — corrected diagnosis

Initial assumption (prior session) was that `/tools/invoice` is a dead
stub with no component. Re-investigation this session found that's
wrong: `/tools/invoice*` is a real, fully-built, **authenticated**
invoice-management app (`InvoiceDashboard`/`CreateInvoice`/
`InvoiceDetails`/`InvoiceSettings`, `client/src/modules/tools/invoice/`),
nested under `<ProtectedRoute>` in `routes.jsx` (same protection class
as `/dashboard/*`), backed by a real API (`awe-os.onrender.com`).

The actual bug: this authenticated app feature was **also** registered
as a public marketing tool in `toolRegistry.js` (slug `invoice`,
`isFeatured: true`, fabricated "GST invoice with live preview" copy)
and linked from the global header nav (`toolCatalogue.js`). Since
`/tools/invoice` was never in the SSG route list (`entry-server.jsx`'s
`TOOL_PAGE_COMPONENTS`, which mirrors the curated public-tool set) and
requires login, anonymous visitors/crawlers hitting that URL get the
SPA-fallback shell (effectively duplicate homepage content) — exactly
what the prior session's curl-based check found. A 301 redirect (the
original plan) would have been wrong: it would have permanently broken
the real feature for every logged-in user.

## Fixes applied

1. `client/src/data/toolRegistry.js` — removed the public `invoice`
   entry entirely. Renamed `invoice-generator` from "Invoice Generator
   (Quick)" to plain "Invoice Generator" (no longer needs to
   disambiguate from a second public entry), added `invoice` as a
   search tag. Repointed the 3 `relatedSlugs` arrays that referenced
   `invoice` (`invoice-generator` itself, `contract-generator`,
   `text-editor`) to `invoice-generator` instead. Left `isFeatured`
   untouched (`false`) — Productivity already has 2 other featured
   tools (`contract-generator`, `text-editor`), so removing `invoice`
   doesn't leave a homepage-rotation gap.
2. `client/src/data/toolCatalogue.js` — removed the header mega-menu's
   "Invoice Generator" entry pointing at `/tools/invoice`; renamed the
   remaining "Invoice Generator (Quick)" entry to plain "Invoice
   Generator".
3. `client/public/robots.txt` — added `Disallow: /tools/invoice$` and
   `Disallow: /tools/invoice/`, matching the existing `/dashboard/`
   pattern, since `Allow: /tools/*` was otherwise inviting crawlers
   into an authenticated route with no real public content. Used the
   `$` end-anchor specifically so this doesn't also match
   `/tools/invoice-generator` (verified before applying).
4. No `vercel.json` redirect added — would break the real authenticated
   feature for real users.
5. `docs/backlog.md` — logged the one remaining stale reference,
   `server/routes/admin-blog.js`'s internal Blog-Assistant tool-linking
   catalogue (~line 999, still lists `slug: 'invoice'` and "(Quick)"
   naming). Left untouched: that file is protected under CLAUDE.md §3/
   §3b (only the named Humanizer integration may touch it).
6. `client/src/pages/AboutPage.jsx` — reframed the "Team" section.
   The site's own Editorial Policy (`content/policies/editorialPolicy.js`)
   already discloses, in first person, that AWE-OS is built by one
   independent creator (Wajid) using AI-assisted tools with personal
   human review — directly contradicting the About page's "small team
   of developers" framing and its "AI Team"/"Community" person-cards.
   Replaced with: real founder card (Wajid) unchanged in substance,
   plus two non-person cards ("AI-Assisted Development", "Community
   Feedback") describing practices, not colleagues — wording matches
   facts already disclosed in the Editorial Policy rather than inventing
   new claims. Heading changed from "The Team" to "Who's Behind
   AWE-OS", subtext corrected to "one independent creator" and links to
   the Editorial Policy.

## Verification

Full rebuild (`npm run build`) — clean, 124 SSG routes, 0 title/H1
count anomalies. Confirmed `dist/tools/invoice/` does not exist,
`dist/tools/invoice-generator/` does, sitemap.xml has no `/tools/invoice`
entry. Confirmed `dist/about/index.html` has no "AI Team" / person-card
"Community" strings and does have the new "Who's Behind AWE-OS" /
"AI-Assisted Development" / "Community Feedback" content.

## Next (not yet started)

Exhaustive tool-by-tool comparison across the full `toolRegistry.js`
tool set for other duplicate-purpose pairs beyond invoice/
invoice-generator, per the user's original request — investigation
only, findings to be shown before any further edits.
