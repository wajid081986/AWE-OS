# Batch 88 — Marketplace cleanup + Razorpay checkout fix

Branch: `batch-88-marketplace-cleanup-razorpay`.

## Why

`/dashboard/marketplace` (`MarketplacePage.jsx`, 3 tabs: AI Tools / Digital
Products / Calculators) lists 7 cards that duplicate or shadow real product
surfaces, plus Resume Template Pack (the one product meant to stay) has no
working checkout path today. User asked to confirm the duplication, clean it
up, and wire Razorpay for Resume Template Pack.

## Research — confirmed via code read + one read-only DB query (user-approved)

`DynamicToolPage` (`client/src/app/routes.jsx:178-181`) resolves `/tools/:slug`
by trying a hand-built component first; only on a miss does it fall back to
the API-driven `ToolDetailPage`, fed by the `tools` table gated on
`approved=true`. This splits the 7 named cards into two different situations:

**Group A — pure duplicates (`has_dedicated_component=true` in DB, confirmed):**
Capital Gains Calculator, HRA Calculator, NPS Calculator, Online Text Editor
(slug `text-editor`). All `approved=true`, `is_free=true`, `price=0`. Their
`tools` row is vestigial for the public site — the hand-built component always
wins — but Dashboard Marketplace's AI Tools tab (`StorePage.jsx` →
`GET /api/tools`) queries every `approved=true` row unconditionally, so they
still show up as free duplicate cards pointing at the inferior internal
AI-prompt-runner (`/dashboard/tools/:slug`) instead of the real free tool.
**Safe to hide from Marketplace — cannot affect the real `/tools/...` pages.**

**Group B — no dedicated component (`has_dedicated_component=false`, confirmed):**
Final Price Calculator, Simple Word Counter, Second Brain PKM System. All
`approved=true`, `is_free=true`, `price=0`, `status='idea'`. These have **no**
hand-built component — their public `/tools/final-price-calculator` etc. page
is powered by the exact same `approved` flag the Marketplace listing reads.
There is no separate "real" page here. Per user decision: decouple public
visibility from Marketplace listing with a new flag rather than removing the
public page.

**Extra findings from the read-only query:**
- Second Brain PKM System is double-listed: a `tools` row (AI Tools tab) *and*
  a separate `digital_products` row (Digital Products tab, `is_published=true`,
  `price=0`). Both need to come down.
- Resume Template Pack has **two duplicate `digital_products` rows** created
  7 seconds apart today (2026-08-17, likely an accidental double-submit),
  both `is_published=false`, both `price=0` (not ₹149), both pointing at the
  same `file_key`: `factory-bundles/resume-template-pack/index.html`
  (`text/html`) — looks like an auto-generated single-page artifact, not a
  real downloadable template pack. **User will verify the actual content in
  Admin Panel before publishing — this batch does not set `is_published=true`
  for this product.**
- A stray unapproved duplicate row (`simple-word-counter-1786782455907`,
  garbled timestamp slug) exists — already invisible (`approved=false`),
  out of scope, logged in `docs/backlog.md` instead of touched here.
- Razorpay backend (`server/routes/products.routes.js`) is already fully
  built for `digital_products`: order creation, signature verification,
  purchase recording, gated S3 download. Nothing new needed there.
- Gap found: `ProductsStorePage.jsx` (Marketplace's Digital Products tab)
  checks `window.Razorpay` but never loads
  `https://checkout.razorpay.com/v1/checkout.js`. `PaymentModal.jsx` and
  `ResumePage.jsx` already do this correctly elsewhere in the codebase — same
  pattern gets reused here, not reinvented.

## Scope

1. **New migration** `server/db/migrations/043_tools_marketplace_visible.sql`
   — additive only: `ALTER TABLE tools ADD COLUMN IF NOT EXISTS
   marketplace_visible BOOLEAN NOT NULL DEFAULT true;` + PostgREST schema
   reload notify. Run manually in Supabase SQL Editor per this repo's existing
   migration convention (no automated runner exists).
2. **`server/routes/tools.routes.js`** — `GET /` (the query
   `StorePage.jsx`/Marketplace AI Tools tab hits) gets
   `.eq('marketplace_visible', true)` added alongside the existing
   `.eq('approved', true)`. `tools.controller.js`'s `getPublicTools`/
   `getPublicTool` (which feed `/tools/:slug`) are **not touched** — public
   pages keep rendering exactly as today regardless of this flag.
3. **`client/src/modules/products/pages/ProductsStorePage.jsx`** — add a
   `useEffect` that dynamically injects the Razorpay `checkout.js` script on
   mount, mirroring `PaymentModal.jsx`'s existing pattern. Additive only, no
   existing logic changed.
4. **Data changes**, applied via a one-off script
   (`server/scripts/batch-88-apply-marketplace-visibility.js`, dry-run by
   default, `--apply` to execute — mirrors the `sync-tool-registry.js
   --apply` precedent referenced in migration 042), run only after migration
   043 has been applied in Supabase:
   - `tools.marketplace_visible = false` for the 7 named rows (4 Group A +
     3 Group B). `approved` untouched on all.
   - `digital_products.is_published = false` for the Second Brain PKM System
     row.
   - Delete one of the two duplicate Resume Template Pack rows; on the
     remaining row set `price = 149`. `is_published` stays `false` pending
     user's content verification.

## Explicitly NOT in this batch

- `approved`/`status` values on any `tools` row — untouched.
- The orphaned unapproved `simple-word-counter-1786782455907` row — logged
  to `docs/backlog.md`, not deleted.
- Resume Template Pack's `is_published` flip — blocked on user verifying the
  actual template content in Admin Panel first.
- The `VITE_RAZORPAY_KEY_ID=rzp_live_xxx` placeholder mismatch in
  `client/.env.example` (server side already correctly shows `rzp_test_...`)
  — pre-existing inconsistency, flagged in `docs/backlog.md`, not fixed here.
- Any BlogAssistant, CrawlEngine, or other protected-zone file.

## Files touched

1. `server/db/migrations/043_tools_marketplace_visible.sql` (new)
2. `server/routes/tools.routes.js` (1 line)
3. `client/src/modules/products/pages/ProductsStorePage.jsx` (additive
   `useEffect`)
4. `server/scripts/batch-88-apply-marketplace-visibility.js` (new, dry-run
   default)
5. `docs/backlog.md` (2 lines: stray duplicate row, env placeholder mismatch)

## Verification plan

- `node -c` syntax check on all touched/new `.js` files.
- Dry-run the apply script and show its planned changes before running
  `--apply`.
- After migration 043 is run manually in Supabase SQL Editor by the user,
  run the apply script in dry-run, confirm output matches this plan, then
  `--apply`.
- Manual QA: load `/dashboard/marketplace`, confirm the 7 duplicate cards are
  gone from AI Tools tab, Second Brain PKM gone from Digital Products tab,
  Resume Template Pack still not visible (unpublished), and that
  `/tools/capital-gains-calculator`, `/tools/hra-calculator`,
  `/tools/nps-calculator`, `/tools/text-editor`,
  `/tools/final-price-calculator`, `/tools/simple-word-counter`,
  `/tools/second-brain-pkm-system` all still resolve normally.
- Razorpay test-mode setup (for user to do once ready to test the checkout
  flow, not part of this batch's automated verification):
  1. Create/open a test-mode account at the Razorpay dashboard.
  2. Grab the test Key ID + Secret (`rzp_test_...`).
  3. Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `server/.env` and
     `VITE_RAZORPAY_KEY_ID` in `client/.env` to the test values (not the
     `rzp_live_xxx` placeholder currently in `client/.env.example`).
  4. No real charges happen in test mode; Razorpay publishes dummy test
     card numbers for full checkout-flow testing.
  5. Once Resume Template Pack's content is verified and `is_published=true`,
     the existing `/api/products/purchase` + `/api/products/verify` flow
     (already built, this batch didn't touch it) should work end-to-end.
