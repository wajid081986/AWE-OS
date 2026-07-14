# Batch 5.5 Plan — Performance & Accessibility Remediation

Branch: `batch-5.5-perf-a11y`. Scope: remediate the homepage's clean-Incognito
Lighthouse results after Batch 5 (extensions ruled out — a11y was 69
contaminated, 96 clean).

**Baseline (2026-07-14, clean Incognito, `www.awe-os.com/`):**

| | Perf | A11y | BP | SEO | FCP | LCP | TBT | SI | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Desktop | 74 | 96 | 96 | 92 | 0.9s | 1.9s | 0ms | 1.2s | 0.679 |
| Mobile | 56 | 96 | 96 | 92 | 2.4s | 4.3s | 210ms | 4.1s | 0.648 |

Shared findings: unused JS ~3.7MB (~2.9MB one vendor chunk), main-thread 4.4s
mobile, JS execution 1.9s mobile, image explicit dimensions missing, render-
blocking ~150ms, a11y remainder = contrast + heading order, SEO gap likely
alt attributes.

## Findings and fixes

### CRITICAL

**C1 — CLS (font-swap reflow), root cause confirmed two ways:**
- `client/src/App.css:4-5` — legacy global `body { font-family: 'Inter', sans-serif; }`.
- 8 exact spots in Batch 5 sections never set `font-body`, so they inherit
  Inter instead of Instrument Sans: `Categories.jsx:48`, `ClosingGrid.jsx:32`,
  `ClosingGrid.jsx:35`, `ClosingGrid.jsx:58`, `Faq.jsx:100`, `Guides.jsx:39`,
  `PrivacyPromise.jsx:45` (the `[&_p]:` prose wrapper), `PrivacyPromise.jsx:79`.
- `design-system/globals.css:22` loads fonts via a render-blocking CSS
  `@import` instead of a `<link>`.
- No fallback-font metric matching for Bricolage Grotesque (used by the
  Hero's likely-LCP `<h1>`) — the Inter→Bricolage swap reflows the whole
  hero grid.

Fix: add `font-body` to the 8 spots; move font loading from `globals.css`'s
`@import` into a `<link>` in `client/index.html` (matching the existing Inter
pattern); eliminate the swap-induced reflow via `font-display: optional`
(chosen over hand-computed `size-adjust`/`ascent-override` metric overrides —
this sandbox can't reliably extract exact font metrics from the actual font
files, and fabricated override numbers would be worse than the current
behavior; `optional` is the standard, zero-guesswork CLS fix per web.dev
guidance, trading "may show fallback font on a very first visit" for
"guaranteed no reflow").

**C2 — Unused JS, ~3.7MB total:**
- `routes.jsx` imports `PublicLayout`/`AppShell`/`AdminShell`/`ProtectedRoute`
  statically (not `lazy()`, unlike every actual page component). `AdminShell.jsx:3`
  eagerly imports `api.service.js` → axios. Confirmed via `dist/index.html`'s
  `<link rel="modulepreload">` list: `vendor-axios` (38.48 KB / 15.36 KB gzip)
  ships on every public page including the homepage, despite being admin-only.
- `Guides.jsx` statically imports the full `BLOG_POSTS` array (376.70 KB /
  111.86 KB gzip — the largest chunk touched by the homepage) to render 3
  cards.
- `vendor-jspdf` (390.72 KB / 128.96 KB gzip) also appears eagerly
  modulepreloaded; traced every static `jspdf` import and all 4 eager shell
  components — root cause not isolated. Flagged, not guessed at.

Fix (quick wins only — full route-level code splitting is out of scope,
backlog entry below): `lazy()`-wrap `AppShell`/`AdminShell`/`ProtectedRoute`
in `routes.jsx`; `lazy()`-wrap `Guides` in `Home.jsx` (below-fold, not
needed for LCP).

Backlog entry (to add once this plan is approved): split `data/blogPosts.js`
into a lightweight metadata index + per-post lazy content, since any
card-list consumer currently pays the full-article-body cost. Real
data-layer work, separate future batch.

**C3 — Security headers (architecture §17):** current `vercel.json` has
`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` (legacy),
`Referrer-Policy`. Missing: `Strict-Transport-Security`, `Permissions-Policy`,
`Content-Security-Policy` entirely.

### HIGH

**H1 — Contrast, 2 confirmed failures (measured ratios):**
- `client/src/components/primitives/Chip.jsx:6` — `text-mint` icon on
  card/white = **3.39:1**, fails AA (needs 4.5:1). Same known-bad pattern
  Batch 2/4 already fixed elsewhere via `*-text-strong` tokens; Chip just
  wasn't rendered on any page until Batch 5's Hero.
- `ClosingGrid.jsx` policy-link arrow — `text-marigold` on paper =
  **2.52:1**, fails badly.

Fix: swap both to the existing `--mint-text-strong` (8.0:1) / 
`--marigold-text-strong` (7.5:1) tokens — same fix, same tokens as Batch 2/4.

**H2 — Heading order:** confirmed via the actual production DOM sequence —
`...→ H2 (ClosingGrid) → H4 → H4 → H4 (Footer's 3 column headers)`, a
confirmed H2→H4 skip (WCAG 1.3.1). `Footer.jsx:76` renders column titles as
`<h4>`. Fix: demote to `<h3>` (visual size comes from the token-driven
class, not the tag). Caveat: Footer renders on every page — verify no other
page type's heading sequence newly skips a level with H3 instead of H4
before shipping.

### MEDIUM

**M1 — CLS, tab hash-sync post-hydration swap:** `PopularTools.jsx` reads
`window.location.hash` in a `useEffect` and swaps the active tab/grid after
the SSG-painted "Popular" content is visible — a real but narrow-blast-radius
CLS source (only affects `/#category`-style direct links). Fix: remove the
hash-read `useEffect` entirely and always render "Popular" as the true
static state — simpler than duplicating the grid per hash variant, and
removes the CLS source outright. The homepage's hash-tab feature is a
nice-to-have, not core to the page's job.

**M2 — Image/SEO alt-attribute findings:** zero `<img>` elements exist on
the homepage (Hero is CSS/emoji, cards carry no images) — confirmed via the
actual production HTML. Title/meta/canonical/OG/JSON-LD/`robots.txt`/viewport
all verified present and valid by hand. No fix proposed — blocked on the
exact failing SEO audit names from your Lighthouse report's Audits panel.

## Rulings (approved 2026-07-14)

1. **CSP rollout safety:** ship `Content-Security-Policy-Report-Only` in
   this batch; the enforcing flip is its own follow-up after watching
   preview + production console for violations. HSTS, `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy` enforce immediately.
2. **Tool regression gate:** any lazy-load/chunk change (C2) must be
   followed by a functional check that merge-pdf and the image compressor
   still work end-to-end on the preview before that stage is considered done.
3. **Measurement protocol:** Claude cannot run Lighthouse in this sandbox.
   After each push, the user runs clean-Incognito Lighthouse (desktop +
   mobile) on the preview URL and pastes results back. Batch targets: CLS
   <0.05, A11y 100, SEO 100, BP ≥96, Perf desktop ~90. Mobile perf is
   expected to land ~65-75 — full code-splitting is next batch's job, no
   scope creep chasing mobile 80+ here.
4. **Staging:** single branch, staged commits — CLS fixes → a11y/SEO →
   headers → lazy quick-wins — single merge, each stage pushed for an
   incremental preview.

## CLS resolution — moved to Batch 5.6 (ruling 2026-07-14)

C1's original diagnosis (font-swap reflow) was wrong. Deep investigation this
session (Vercel-toolbar contamination → stale-bundle console capture →
render-blocking Inter CSS → the real mechanism) converged on hard evidence:
`client/src/main.jsx` calls `ReactDOM.createRoot(rootEl).render(...)`, not
`hydrateRoot`. The client never hydrates the SSG-rendered HTML — it discards
it and does a fresh client-side render on every load, unmounting and
remounting the entire tree. A live CDP `PerformanceObserver` probe confirmed
this directly: the `<footer>` element's rect collapses to exactly
`{x:0,y:0,width:0,height:0}` (the signature of a full unmount, not a resize)
at ~1.1-1.4s into every load, both before and after removing the `isLoading`
auth-gate and the legacy Inter font link — neither fix moved the CLS score
(0.357, byte-identical, both before and after).

Ruling: this is the true root cause, but the blast radius is all 129 SSG
routes and every component's hydration-safety assumptions (anything reading
`window`/`document` outside effects would behave differently once real
hydration reconciles against server markup instead of a clean client
render). That's its own batch — **Batch 5.6, SSG hydration fix** — not a
5.5 stage. Batch 5.5 closes without hitting its CLS target; the two fixes
that were implemented (Inter link removal, redundant auth-gate removal)
ship as real, verified wins on their own merits (render-blocking requests
1→0 for the legacy font, FCP/LCP unaffected, no regressions) but are not
represented as the CLS fix.

Backlog entry already added: see `docs/backlog.md` (`createRoot` vs
`hydrateRoot`, and internal-surfaces-lose-Inter accepted tradeoff).

## Verification per stage

- **Stage 1 (CLS):** build + SSG succeeds; grep built output confirms
  `font-body` present at all 8 spots; confirm no `@import` remains in
  `globals.css`; confirm the `<link>` font tag in `index.html`; confirm
  `PopularTools.jsx` no longer reads `window.location.hash`.
- **Stage 2 (a11y/SEO):** confirm `Chip.jsx`/`ClosingGrid.jsx` use
  `*-text-strong` tokens; confirm `Footer.jsx` renders `<h3>`; re-check the
  full heading sequence on `/` and at least one other page type for skips.

  **Stage 2 — actual findings (live axe/Lighthouse a11y scan, 2026-07-14),
  supersedes the plan-time guesses above:**
  - Contrast: `ClosingGrid.jsx`'s marigold arrow is `aria-hidden="true"` —
    axe correctly excludes it from AT, not a real violation, not touched.
    The 2 real failures were both in `Ledger.jsx` (`text-mint` on the
    highlighted rows, 3.38:1) — fixed with `text-mint-text-strong`.
    `Chip.jsx`'s icon uses the identical unfixed pattern (plan's original
    H1 target) — fixed the same way even though it didn't independently
    surface in this scan. `Badge.jsx` has the same pattern but isn't
    rendered on the homepage — out of scope, logged to backlog instead.
  - Heading order: confirmed, `Footer.jsx`'s 3 column `<h4>`s → `<h3>`.
    Caveat check done: h3→h4-or-deeper is never an a11y violation (only
    skipping to a *deeper* level is), so no other page type can newly
    break from this change.
  - New finding (not in original plan): `identical-links-same-purpose` —
    `ClosingGrid.jsx`'s "Privacy policy" link (`/privacy-policy`) and
    `Footer.jsx`'s "Privacy Policy" link (`/privacy`, the legacy redirect
    shim noted in `routes.jsx`) have the same purpose but different hrefs.
    Fixed by pointing `Footer.jsx` at the canonical `/privacy-policy`
    route; the `/privacy` route itself stays for old external backlinks.
  - New finding (not in original plan): touch-target sizing, flagged by
    the user's own DevTools session. Lighthouse's `target-size` audit
    scores 1/1 (zero failing elements) on the homepage in this session's
    scan — not reproduced. Not fixed; needs the specific page/URL where
    it was observed before guessing at a target.
- **Stage 3 (headers):** confirm `vercel.json`'s new headers, CSP in
  Report-Only mode; manually inspect header response on preview.

  **Stage 3 — actual implementation:** added `Strict-Transport-Security`
  (`max-age=63072000; includeSubDomains; preload`), `Permissions-Policy`
  (`camera=(), microphone=(), geolocation=()`) per architecture.md §17's
  exact values. Added `Cross-Origin-Opener-Policy: same-origin-allow-popups`
  (requested this session, not in architecture.md §17) — checked the
  codebase for `window.open`/popup usage first (PDF editor new-tab,
  invoice print preview, Razorpay checkout) — all same-origin or in-page
  modal (`new window.Razorpay(...)`, not a popup window), so COOP doesn't
  break any of them; `allow-popups` chosen over strict `same-origin` as
  the safer default given those same-origin popups exist. Added
  `Content-Security-Policy-Report-Only` (ruling 1: Report-Only this batch,
  enforcing flip is separate) scoped to the actual external origins the
  client code calls: `fonts.googleapis.com`/`fonts.gstatic.com` (fonts),
  `www.googletagmanager.com`/`www.google-analytics.com` (GA4),
  `checkout.razorpay.com`/`api.razorpay.com` (payments),
  `awe-os.onrender.com` (API) — grepped for every external URL in
  `client/src` and `index.html` rather than guessing. `script-src`/
  `style-src` include `'unsafe-inline'` (GA4's inline bootstrap script,
  and the app's extensive use of React inline `style={{}}`) — logged to
  backlog as the known gap to close before the enforcing flip.
  No AdSense domains included (architecture.md §17: "post-approval only";
  CLAUDE.md §7: no ads yet). `vercel.json` validated as syntactically
  correct JSON; header *behavior* itself can't be verified locally (it's
  Vercel-platform config, not consumed by `vite preview`) — needs your
  inspection on the deployed preview.

- **Stage 4 (lazy quick-wins):** build succeeds; confirm `AppShell`/
  `AdminShell`/`ProtectedRoute`/`Guides` are `lazy()`-wrapped; **manually
  verify merge-pdf and the image compressor complete their core task
  end-to-end on the preview** (ruling 2).

  **Stage 4 — actual implementation, one item reverted:**
  `AppShell`/`AdminShell`/`ProtectedRoute` are now `lazy()`-wrapped in
  `routes.jsx`. Verified safe: `/dashboard` and `/admin` have no
  `dist/dashboard/` or `dist/admin/` output at all — they're not part of
  the 129 SSG routes (internal, SPA-only, consistent with CLAUDE.md §1's
  "everything behind Login" scoping), so lazy-loading them can't affect
  any crawler-visible HTML. Confirmed win: `vendor-axios` no longer
  appears anywhere in the shipped `dist/index.html` (was previously
  eagerly modulepreloaded on every public page via `AdminShell.jsx`'s
  static `api.service.js` import).

  `Guides` lazy-loading was **implemented, tested, and reverted**: wrapping
  it in `<Suspense>` inside `Home.jsx` (a route already lazy-loaded at the
  router level) causes `ssg-build.js` to bake the Suspense *fallback*
  into the static HTML instead of Guides' real content — confirmed by
  grepping the built `dist/index.html` for the "Guides & explainers"
  heading and the 3 `/blog/:slug` card links: both absent with the lazy
  wrap in place, both present after reverting to the static import. This
  is a nested-Suspense-boundary limit in the SSG pipeline (route-level
  lazy boundaries resolve correctly — proven by `Home` itself already
  being `lazy()`-wrapped in `routes.jsx` — but a *second*, nested
  boundary inside an already-lazy page apparently doesn't), same family
  of issue as Batch 5.6's hydration finding. Reverted rather than ship
  content invisible to crawlers with JS disabled (Blueprint's core
  requirement). Logged to backlog — the `blogPosts.js` bundle-size win
  needs either a data-layer split (already backlogged separately) or
  Batch 5.6 fixing the SSG pipeline's Suspense handling first.
- **All stages:** Lighthouse re-run is the user's step (ruling 3) — Claude
  reports what changed and why, not invented scores.
