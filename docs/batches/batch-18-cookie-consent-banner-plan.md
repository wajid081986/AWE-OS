# Batch 18 — Cookie Consent Banner

## Context

`audit-awe-os-v2.js` flags `NO_COOKIE_NOTICE` on nearly every public page — investigated
earlier and confirmed it's not a false positive like the button/date checks were: there is
genuinely no cookie-consent mechanism anywhere on the site. Umami analytics
(`client/index.html:48`) loads unconditionally on every page load with zero consent gate,
which is a real GDPR gap and a blocker for Google AdSense's EU User Consent Policy once ads
are activated (Blueprint §24, currently zero ad units per project rules).

This is a new UI component, which Blueprint §10's frozen component list doesn't define —
per CLAUDE.md §4 that requires logging to `docs/backlog.md` and asking before building,
which is what this planning step is. Blueprint/architecture.md stay untouched.

User decision: **block analytics until Accept** (not a notice-only banner) — real consent
gating, not just satisfying the audit's regex.

## Approach

**New files:**
- `client/src/hooks/useCookieConsent.js` — small hook, owns all logic:
  - Reads `localStorage.getItem('awe_cookie_consent')` (`'accepted' | 'rejected' | null`)
    only inside `useEffect`, never at module scope — same SSG-safe pattern as
    `client/src/modules/auth/context/AuthContext.jsx:13` (`typeof window !== 'undefined'`
    guard) and `client/src/hooks/useTrackToolView.js:35-48` (effect-scoped storage reads).
  - Exposes `{ consent, accept, reject }`. `accept()` stores `'accepted'` and dynamically
    injects the Umami `<script>` tag (`document.createElement('script')`, same src/
    `data-website-id` currently hardcoded in `index.html:48`) if not already present.
    `reject()` stores `'rejected'`, no script ever loads.
  - On mount, if consent is already `'accepted'` from a prior visit, injects the Umami
    script immediately (so returning visitors keep being tracked without re-prompting).
  - No CSP change needed — `cloud.umami.is` is already in `script-src`
    (`vercel.json` CSP header); a dynamically created `<script src="...">` pointing at an
    allow-listed domain is permitted without `'unsafe-inline'`.

- `client/src/components/CookieConsentBanner.jsx` — presentational, uses the hook:
  - Fixed bottom bar (`position: fixed; bottom: 0`), full width, renders nothing once
    `consent` is non-null.
  - Copy: short sentence on analytics/cookie use + link to `/privacy-policy`, two buttons.
  - Buttons reuse the existing `Button` primitive (`client/src/components/primitives/
    Button.jsx`) — `variant="primary"` for Accept, `variant="ghost"` for Reject — no new
    button styles, matching CLAUDE.md §4's two-variant rule.
  - Styling from `design-system/tokens.css` only, no raw hex/px: `--z-toast` (150,
    tokens.css:79) for stacking, `--space-*` scale for padding, `--radius-m`/`--shadow-float`
    for the bar, `--duration-structural` + `--ease` for the entrance transition, respecting
    `prefers-reduced-motion` (existing sitewide rule).
  - `role="region" aria-label="Cookie consent"`, keyboard-reachable buttons — CI
    accessibility gates must pass.

**Modified files:**
- `client/src/components/PublicLayout.jsx` — mount `<CookieConsentBanner />` as the last
  child (after `<Footer />`), so it's present on every public route without touching
  individual pages.
- `client/index.html` — remove the unconditional Umami `<script>` tag (line 48); loading
  moves entirely into `useCookieConsent`.
- `docs/backlog.md` — mark the "No sitewide cookie-consent/GDPR banner exists" entry
  (2026-07-28) resolved once shipped and verified live.

**Copy draft** (needs your sign-off before I write it, per CLAUDE.md's no-content-generation
rule — this is user-facing text, not something I finalize unilaterally):
> "We use cookies for analytics to understand how visitors use AWE-OS. No personal data is
> sold. See our [Privacy Policy](/privacy-policy)." — **[Accept]** **[Reject]**

## Known risks / trade-offs

1. **Real analytics drop expected.** Blocking Umami until explicit Accept means tracked
   pageviews/sessions will measurably decrease vs. today's unconditional load. This is the
   correct compliant behavior, but it's a real behavior change to existing dashboards —
   flagging so it's not a surprise.
2. **Toast overlap risk.** `ToastContext.jsx:19` renders `fixed bottom-6 right-6 z-50` —
   a full-width bottom banner could visually collide with a toast on mobile widths if both
   are visible at once. Will check this specifically during verification; low risk since the
   banner is dismissed on first interaction and toasts are transient.
3. **Future AdSense consent mode.** This only gates Umami. When ads are actually activated
   (Blueprint §24), Google's Consent Mode / Restricted Data Processing will need its own
   wiring — out of scope for this batch, noting so it isn't forgotten.

## Verification

1. `cd client && npm run build` — SSG build must succeed, 126 routes, no new
   hydration-mismatch or SSR `window`-access errors.
2. Grep built `dist/*/index.html` for the Umami `<script src="https://cloud.umami.is...">`
   tag — confirm it's **absent** from the static HTML (it must only appear via client-side
   injection after consent, never baked into SSG output).
3. Manual check in a real browser (dev server): banner appears on first visit, Accept
   injects the Umami script (Network tab) and hides the banner, Reject hides the banner with
   no script request, reload after Accept loads Umami immediately with no re-prompt, reload
   after Reject shows no script request and no re-prompt.
4. Re-run `node audit-awe-os-v2.js --html` against the deployed site — confirm
   `NO_COOKIE_NOTICE` is gone sitewide and the AdSense checklist's "Cookie/consent notice
   present" stays passing.
5. Keyboard-only pass: Tab to both buttons, Enter/Space activates them, focus-visible ring
   shows (matches sitewide `:focus-visible` pattern).
