# Batch 16 — GA4 → Umami Analytics Swap

**Decision:** Umami Cloud (`cloud.umami.is`) — approved and set up by owner
before this plan was finalized (originally scoped as self-hosted Vercel +
Supabase; owner chose Cloud's free tier instead, so no separate Vercel
project or Postgres DB is needed for this batch). Website `www.awe-os.com`
is already registered in the Umami Cloud dashboard.

**Scope note:** the original batch prompt split this into "batch 16 = plan
only" / "batch 17 = integration." The owner approved the plan and
authorized implementation in the same turn, supplying the live script tag
below — so this batch now covers plan + implementation together. No
separate batch 17.

## 1. Umami Cloud setup (owner-completed)

1. Umami Cloud account created, `www.awe-os.com` registered as a website.
2. Tracking script tag issued:
   ```html
   <script defer src="https://cloud.umami.is/script.js" data-website-id="a2f17bdc-08eb-49a3-832b-79f611d9766d"></script>
   ```
3. No infra created in this repo or on Vercel for Umami itself — it's a third-party hosted service, same trust model as the current GA4 script tag.

## 2. Verified GA4 footprint (what gets removed)

1. **`client/index.html:46-56`** — the only GA4 bootstrap: async `gtag/js?id=G-G44WCZFZSE` script tag + inline `<script>` calling `gtag('js', ...)` / `gtag('config', 'G-G44WCZFZSE', {send_page_view:true})`. Single insertion point — `ssg-build.js` uses this file as the shell for every SSG route.
2. **`client/src/hooks/useAnalytics.js`** — `trackEvent()` calls `window.gtag?.('event', ga4Event, properties)` via a 12-key `GA4_EVENT_MAP`. Only `tool_viewed` is both mapped and actually called anywhere. `blog_viewed` is called (`BlogPostPage.jsx`) but isn't in the map, so it never reached GA4 — dead path.
3. **`client/src/utils/performance/webVitals.js:24-27`** — calls `window.gtag?.('event', name, {...})` directly (bypasses `useAnalytics`) for LCP/FID/CLS/FCP/TTFB on every pageload.
4. **`client/.env`** — `VITE_GA_MEASUREMENT_ID=G-G44WCZFZSE`, confirmed dead (nothing reads it; `index.html` hardcodes the ID as a literal). Gitignored, local-only, no commit involved in removing it.
5. **`vercel.json:79`** — `Content-Security-Policy-Report-Only` allowlists `https://www.googletagmanager.com` (script-src, connect-src) and `https://www.google-analytics.com` (connect-src).

Non-obvious behavior: this is a client-routed SPA with no `history.pushState` listener calling `gtag('config', ...)` again, so GA4 pageviews today are effectively load-once, not per-route-change. Umami's `data-auto-track` (default-on) is documented to auto-track pageviews; SPA route-change coverage must be verified empirically post-deploy (see §7), not assumed from docs alone.

## 3. Cookies / consent — verified

Umami's own docs (`docs.umami.is/docs/faq`): *"Umami does not use any cookies in the tracking code"*; *"does not collect any personally identifiable information and anonymizes all data collected... Users cannot be identified and are never tracked across websites."* No consent banner required. Stronger than GA4's current cookie-setting behavior.

## 4. Event parity

| GA4 today | Umami |
|---|---|
| Auto pageview (load-only) | `data-auto-track` default — verify SPA route-change coverage post-deploy |
| `tool_viewed` (only real custom event reaching GA4) | `window.umami?.track('tool_viewed', { tool_id })` — same call site in `useTrackToolView.js` |
| `blog_viewed` (dead path, never reached GA4) | Dropped — no regression |
| 5 web-vitals events | Dropped — redundant with the CI-enforced Lighthouse gate (architecture §11) |
| 10 unused `GA4_EVENT_MAP` keys | Deleted as dead code |

Server-side `/api/events/track` POST logic (internal marketing pipeline) is untouched — separate system from GA4.

## 5. CSP

`vercel.json` drops `googletagmanager.com` / `google-analytics.com`, adds `https://cloud.umami.is` to `script-src` and `connect-src`.

**Correction to `docs/backlog.md:27`:** removing GA4's inline bootstrap does *not* fully unblock the CSP enforce-flip. 22 files render `<script type="application/ld+json">` JSON-LD schema blocks (`client/src/utils/schema/*`), which also require `script-src 'unsafe-inline'` (or a nonce scheme) independent of GA4. `style-src 'unsafe-inline'` still stands on React inline `style={{}}` usage. Backlog item updated to reflect the narrower, accurate blocker list rather than claiming GA4 removal fixes it outright.

## 6. Privacy Policy — flagged, not changed

`client/src/content/policies/privacyPolicy.js:42` (Cookies section): *"We use only the cookies necessary for the site to function and for the anonymous analytics described above."* Becomes inaccurate once analytics sets zero cookies. Per CLAUDE.md §7 (no content generation), this needs owner-supplied replacement wording — flagged, left untouched in this batch.

## 7. Verification

- `npm run build` clean.
- Zero `googletagmanager`/`gtag`/`google-analytics` strings in `client/dist`.
- Umami script tag present in every generated HTML file's `<head>`, not just `index.html`.
- Lighthouse Desktop Perf stays at 100 (CI gate).
- Hydration sweep clean (`hydration-stress.js`).
- Manual (owner, post-deploy): navigate 2 routes client-side, confirm 2 pageviews land in the Umami Cloud dashboard.

## 8. Scope guard

- Branch `batch-16-analytics-swap` off `origin/main`.
- No `server/` changes — server-side event tracking is a separate system.
- Files touched: `client/index.html`, `client/src/hooks/useAnalytics.js`, `client/src/utils/performance/webVitals.js`, `client/.env` (untracked/local), `vercel.json`, `docs/backlog.md`, this plan doc. 6 tracked files — well under the 25-file threshold.
- No ads, no new npm dependencies, no protected-zone files touched.

## Batch CLOSED (2026-07-19) — production verification

PR #20 merged to `main` (merge commit `93967dc`). Production verified
by `curl`ing the live site directly:
- `https://www.awe-os.com/` — zero `gtag`/`googletagmanager`/`google-analytics`
  strings; `<script defer src="https://cloud.umami.is/script.js"
  data-website-id="a2f17bdc-08eb-49a3-832b-79f611d9766d">` present.
- `https://www.awe-os.com/privacy-policy` — Cookies section confirmed
  live with the updated sentence ("Our analytics (Umami) are
  cookie-free — no analytics cookies are set on your device."); old
  wording confirmed absent.

Not re-verified in this pass (unchanged from the pre-merge checks
already run in this batch): Lighthouse Desktop Perf, and the
SPA-route-change pageview behavior in the Umami dashboard (§7, item 6)
— still an owner action item, not blocking closure.

No further action on this batch.
