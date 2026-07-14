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

## Verification per stage

- **Stage 1 (CLS):** build + SSG succeeds; grep built output confirms
  `font-body` present at all 8 spots; confirm no `@import` remains in
  `globals.css`; confirm the `<link>` font tag in `index.html`; confirm
  `PopularTools.jsx` no longer reads `window.location.hash`.
- **Stage 2 (a11y/SEO):** confirm `Chip.jsx`/`ClosingGrid.jsx` use
  `*-text-strong` tokens; confirm `Footer.jsx` renders `<h3>`; re-check the
  full heading sequence on `/` and at least one other page type for skips.
- **Stage 3 (headers):** confirm `vercel.json`'s new headers, CSP in
  Report-Only mode; manually inspect header response on preview.
- **Stage 4 (lazy quick-wins):** build succeeds; confirm `AppShell`/
  `AdminShell`/`ProtectedRoute`/`Guides` are `lazy()`-wrapped; **manually
  verify merge-pdf and the image compressor complete their core task
  end-to-end on the preview** (ruling 2).
- **All stages:** Lighthouse re-run is the user's step (ruling 3) — Claude
  reports what changed and why, not invented scores.
