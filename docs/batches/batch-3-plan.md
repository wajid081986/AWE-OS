# Batch 3 — Header, Footer, Mobile Navigation

**Branch:** `batch-3-header-footer`
**Scope:** Header, Footer, mobile menu restyle per Blueprint §15/§18, matching
`docs/reference/awe-os-homepage.html`. First visually-live batch — all 129
routes change appearance (every route renders through `PublicLayout`, except
`/login` and the authenticated `AppShell` routes, which are untouched).

---

## 0. Frozen-doc notes (reported, not resolved, per CLAUDE.md §2)

- `docs/reference/architecture.md` §2's canonical route table lists
  `/privacy` (not `/privacy-policy`). The live router already has both —
  `/privacy-policy` is the real route, and a legacy shim at
  `client/src/app/routes.jsx:181` renders the same `PrivacyPolicy` component
  at `/privacy`. **Resolution, not a question:** footer/header links will
  point at `/privacy` to match the frozen route table exactly (the shim
  makes this free — no routing change needed). Noting it here so it's not
  mistaken for an oversight.
- `docs/reference/claude-code-execution-playbook.md`'s Batch 3 prompt says
  "nav config from `content/site.ts`" — that file doesn't exist in this
  stack (no `content/` directory at all; nav items are hardcoded arrays in
  `Header.jsx`/`Footer.jsx`, same pattern as today). Same category of
  Next.js-flavored leftover language CLAUDE.md's changelog already flagged
  for architecture.md §5. Not fixing the doc (frozen); nav content stays
  hardcoded in the two components, consistent with current code.
- The reference HTML's header (`awe-os-homepage.html`) shows no Login link
  at all — it's a static demo with no auth concept. Not treated as a
  conflict: Blueprint §15 and architecture.md §2 both explicitly and
  textually specify Login (ghost, rightmost, smallest), so that text spec
  governs; the reference HTML's `.btn`/nav-link visual patterns are used
  for styling it.
- **Store nav item** — decided (user, 2026-07-13): kept in the restyled
  nav (desktop + mobile) even though it's absent from both frozen
  documents' exhaustive nav lists. Logged in `docs/backlog.md` as a
  product decision to revisit after Batch 5 (homepage) shows the fuller
  IA.

---

## 1. Login — regression-safe restyle only

- `Header.jsx`'s Login `<Link to="/login">` and the mobile-menu equivalent
  keep their exact `to="/login"` destination and the existing
  `isAdmin ? '/dashboard' : '/login'` conditional (this is pre-existing
  auth-state branching, not new auth logic — preserved as-is).
- Restyle only: becomes the rightmost, smallest, ghost-text link (no
  button chrome) in the desktop nav, per Blueprint §15 — currently it's a
  filled blue button; that treatment moves to the "Browse 49 Tools"
  primary CTA instead (see §3 below).
- Add `rel="nofollow"` to the Login link (architecture.md §2 nav-content
  section specifies this explicitly; currently missing).
- Zero changes to `client/src/modules/auth/**`, `AuthContext`, or the
  `/login` route registration in `routes.jsx`.
- **Regression check (part of verification):** after the change, load
  `/login` directly and confirm it still resolves to `LoginPage` (not 404,
  not redirected) — a static route-table check, not a manual click-through,
  since `/login` is a standalone route outside `PublicLayout` and this
  batch never touches `routes.jsx`.

## 2. Footer links — only ship routes that exist today

Blueprint §18 / architecture.md §2 call for 8 policy pages; only 3 exist
(`/privacy-policy` aliased at `/privacy`, `/terms`, `/disclaimer`). Footer
ships with exactly those 3 under "Legal & Trust," restyled to match the
reference's `foot-grid` 4-column structure (Brand / Tools / Resources /
Legal & Trust) instead of the current 3-column (Quick Links / Categories /
Legal) layout:

| Column | Links (routes that exist today) |
|---|---|
| Brand | logo, one-paragraph mission line (already exists, restyled), social icons (unchanged) |
| Tools | `/tools#pdf`, `/tools#calculators`, `/tools#converters`, `/tools#ai` (hash-anchored, matches reference — same `/tools` route, no new routes), **no** "Request a Tool" link (`/request-tool` doesn't exist yet — omitted, not stubbed) |
| Resources | `/blog`, `/about`, `/contact` (reference's `/blog/category/pdf`, `/blog/category/finance` omitted — routes don't exist) |
| Legal & Trust | `/privacy`, `/terms`, `/disclaimer` only |

`docs/backlog.md` gets one line: the 5 missing policy routes
(`editorial-policy`, `corrections-policy`, `ai-content-policy`,
`advertising-policy`, `tool-testing-policy`) plus `/request-tool` and the
two blog-category routes, all deferred to **Batch 8** (per your message —
noting the batch number as given).

Bottom bar keeps the reference's mono signature line — "Files uploaded to
our servers since launch: 0" — replacing the current plain copyright-only
bar (this is copy already implied verbatim by the frozen reference HTML,
not new generated content, so it doesn't trip the no-content-generation
rule).

## 3. Store nav item

Kept, restyled to sit as a regular nav link (same visual treatment as All
Tools/Blog/About/Contact) rather than its current dropdown-adjacent
position — desktop nav order becomes: All Tools, Store, Guides & Blog,
About, Contact, **Browse 49 Tools** (primary button, compact size, new —
currently missing entirely), Login (ghost, rightmost). Mobile sheet: same
order, Store keeps its existing row treatment, Login forced last per
Blueprint. One-line entry added to `docs/backlog.md`: "Store nav item
kept in Batch 3 restyle despite absence from Blueprint §15/architecture.md
§2's nav lists — revisit after Batch 5."

## 4. Mobile menu — full-screen sheet, focus-trapped, Esc to close

Current implementation (`Header.jsx:332-416`) already has the full-screen
overlay, `role="dialog"`/`aria-modal`/`aria-label`, and body-scroll lock.
Missing, added this batch:

- **Focus trap:** on open, move focus to the sheet's close button; a
  `keydown` handler cycles Tab/Shift+Tab between the first and last
  focusable element inside `#mobile-nav` (vanilla implementation —
  query `[href],button:not([disabled])` etc. inside a ref, no new
  dependency).
- **Esc to close:** `keydown` handler on the sheet closes it and returns
  focus to the hamburger toggle button (a11y best practice — currently
  focus is dropped on close).
- **Login listed last:** already true in current code
  (`Header.jsx:399-413`) — preserved, not re-ordered.
- Visual restyle: paper background instead of white, token-driven spacing/
  type, active-state uses weight change alongside color (Blueprint §21 —
  "color is never the sole state indicator"), matching desktop nav's
  updated active-state treatment.

## 5. App.css collision check

Confirmed by reading `client/src/App.css` in full:

- `*, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }`
  — global reset, harmless, Header/Footer already work within it today.
- `body { font-family:'Inter'; background:#0a0a0f; color:#f1f5f9; }` —
  this **is** a live collision risk, but not a new one: `PublicLayout.jsx`
  already wraps Header/Footer/main in a `bg-white` div that fully covers
  the viewport (`min-h-screen flex flex-col`), so App.css's dark body
  never shows through today. The restyle needs that wrapper's background
  changed from `bg-white` to the paper token (`var(--paper)`,
  `#F6F7FB`) so the header's reference-spec translucent-blur treatment
  (`rgba(paper,.85)` + `backdrop-filter:blur(12px)`) blurs over the
  correct color instead of white. This is a **one-line change to
  `PublicLayout.jsx`** (not App.css itself — App.css stays untouched,
  per the existing additive-only pattern from Batches 1–2). Flagging it
  explicitly since it's adjacent to but technically outside "Header/
  Footer" — it's the shared layout wrapper, not either component, but
  the header's visual spec doesn't work without it, so it's in scope.
- No existing bare-selector rules in App.css target `header`, `footer`,
  `nav`, or any class name this batch introduces — no naming collision
  found (checked full file, confirmed no `header{}`/`footer{}`/`nav{}`
  selectors exist; App.css's own header/footer styling uses distinct
  class names `.site-header`/`.site-footer`, unused by the public
  Header/Footer components).

## 6. Verification for a visible batch

Byte-diff doesn't apply (this batch is intentionally visible everywhere).
Proposed instead:

**(a) Structural checks, scripted:**
- `npm run build` succeeds, all 129 routes still render (reuses the
  existing SSG build's own per-route title/h1 counters — already
  produces the "routes with title-tag count !== 1" / "zero `<h1>`"
  report seen in Batch 2's build output).
- Grep-based check: every route's rendered HTML contains exactly one
  `<header>` and one `<footer>`, the nav's 6 links (`/tools`, `/store`,
  `/blog`, `/about`, `/contact`, `/login`) resolve to non-404 entries in
  `routes.jsx`, footer's 3 policy links resolve likewise.
- `/login` regression check per §1.

**(b) Preview URL for visual QA:** push the branch, get a Vercel preview
deployment URL (via `vercel deploy` or the existing GitHub-integration
auto-preview on push), share it for side-by-side comparison against
`docs/reference/awe-os-homepage.html` opened locally.

**(c) Lighthouse spot-check, 2 routes:** homepage (`/`) and one deep tool
page (`/tools/merge-pdf`, since it shares the header/footer and is the
architecture doc's own reference tool). Run Lighthouse (Chrome DevTools
or `npx lighthouse <preview-url> --only-categories=accessibility`) against
the preview URL, confirm no accessibility regression vs. a baseline run
against the current production URL for the same 2 routes — specifically
watching focus-trap behavior and mobile-menu ARIA (manual keyboard
walkthrough: Tab into the sheet, confirm it doesn't escape, Esc closes
and returns focus).

## 7. Batch 2 primitive adoption

First real adoption, two primitives:

- **`Button`** (`primitives/Button.jsx`) — the new "Browse 49 Tools"
  header CTA (`variant="primary" size="compact" as={Link} to="/tools"`,
  matching the reference's inline `padding:9px 18px` override that the
  `compact` size already encodes).
- **`Container`** (`primitives/Container.jsx`) — replaces the current
  `max-w-7xl mx-auto px-4 sm:px-6` ad hoc wrapper in both Header and
  Footer with `<Container>` (`size="default"`, 1120px, matching the
  reference's `.wrap`).

**`ui/` versions confirmed untouched:** `client/src/components/ui/Button.jsx`
and `.../ui/Container.jsx` (the pre-redesign duplicates) are not imported,
modified, or referenced by this batch — Header/Footer switch their imports
from ad hoc Tailwind classes straight to `primitives/`, never touching
`ui/`. This is exactly the "future adoption batch" naming-overlap situation
`docs/component-library.md` already flags, now starting for these two
primitives only; `Badge`/`Chip`/`Ledger`/`Callout`/`Breadcrumb`/`Section`
remain unused until later batches (Breadcrumb adoption is page-level, not
Header/Footer — stays out of scope here per Blueprint §15's "on every page
except homepage," which is a per-page concern, not a Header/Footer one).

---

## Files to create/modify

- `client/src/components/Header.jsx` — restyle, focus trap, Esc handler,
  Button/Container adoption, Store repositioned, Login ghost + nofollow.
- `client/src/components/Footer.jsx` — restyle to 4-column `foot-grid`,
  Container adoption, mono signature line, link list per §2 above.
- `client/src/components/PublicLayout.jsx` — one-line: `bg-white` →
  paper token, per §5.
- `design-system/tokens.css` — new tokens (additive only, same pattern as
  Batch 2): `--header-height: 64px`, `--header-bg: rgba(246,247,251,.85)`,
  `--blur-header: 12px`, `--text-footer-mono: .75rem` (all copied
  directly from reference CSS values, not invented).
- `client/tailwind.config.js` — matching `theme.extend` entries for the
  new tokens (same mechanism as Batch 2).
- `docs/backlog.md` — Store nav-item note, 7 missing footer-route lines
  (deferred to Batch 8), Breadcrumb-adoption note (already implicitly
  covered, will make explicit).
- `docs/batches/batch-3-plan.md` — this plan, saved verbatim as the first
  commit on `batch-3-header-footer` once approved.

No other files touched — well under the ~25-file mass-change threshold.

## Risks

- Focus-trap/Esc implementation is new interactive logic (not just
  restyle) — highest-risk part of this batch. Kept deliberately minimal
  (vanilla DOM queries, no new dependency) and covered by the manual
  keyboard walkthrough in §6c.
- This is the first batch where every route's rendered markup changes —
  no byte-diff safety net. Structural checks (§6a) are the substitute
  guardrail; flagging that they're weaker than Batch 2's guarantee.
- `PublicLayout.jsx` background change is technically outside "Header/
  Footer" — calling it out explicitly (§5) rather than letting it slide
  in silently, since CLAUDE.md's out-of-scope rule cuts both ways: it
  belongs in this batch because the header design depends on it, but it's
  worth your explicit sign-off since it's not a file you named.

## Not in scope

- No homepage, no cards (ToolCard/CategoryRow/etc. — Batch 4/5).
- No Breadcrumb adoption (page-level, not Header/Footer).
- No new footer policy pages/content (Batch 8, per your message).
- No `/request-tool` route or page.
- No changes to `ui/Button.jsx` / `ui/Container.jsx` or any page currently
  importing them.
