# Batch 5.6 Plan — SSG Hydration Fix

Branch: `batch-5.6-ssg-hydration`, created from `origin/main` @ `867f25f`
(merge of PR #8 / batch-5.5-perf-a11y). Explicitly NOT branched from
`batch-5.5b-csp-delivery` — that branch diverged from `main` before PR #8
merged and does not contain it; batch 5.5b itself shipped zero code changes
(see `docs/batches/batch-5.5b-plan.md`), so there is nothing on it this
batch needs.

## Origin

Backlog items #23 and #28 (`docs/backlog.md`), both traced during Batch 5.5:

- **#23**: `client/src/main.jsx` uses `ReactDOM.createRoot(...).render()`,
  never `hydrateRoot`. Confirmed via live CDP probe as the actual cause of
  Batch 5.5's CLS finding (`<footer>` collapsing to `{0,0,0,0}` on every
  load) — the client never hydrates the SSG-rendered HTML; it discards it
  and does a fresh client-side render every time. Assigned its own batch
  per user ruling 2026-07-14: blast radius is all 129 routes and every
  component's hydration-safety assumptions.
- **#28**: `ssg-build.js` doesn't resolve nested `<Suspense>`/`lazy()`
  boundaries (found attempting to lazy-wrap `Guides` in 5.5 stage 4,
  reverted). Same family of issue, "likely belongs in Batch 5.6."

## Root cause

`main.jsx` calls `ReactDOM.createRoot(rootEl).render(...)` unconditionally
for every route. `createRoot` discards whatever is already in `#root` and
performs a fresh client-side render — it never reconciles against the
SSG'd static HTML already sitting in the DOM. This is the confirmed CLS
cause: SSG output paints, then gets wiped and rebuilt from scratch on
every single page load, across all 129 SSG'd routes.

### Compounding finding (not previously logged)

`vercel.json`'s catch-all rewrite (`"/(.*)" → "/index.html"`) only fires
when no static file matches the request path. `ssg-build.js` overwrites
`dist/index.html` itself with the **homepage's** real rendered output (and
strips the FOUC-hiding `#root:not(.mounted){visibility:hidden}` rule from
it, per the script's own header comment — that rule exists to hide
`prerender.js`'s templated content pre-mount, and real SSG content has
"nothing to hide"). Consequence: every non-SSG'd route that falls through
to this rewrite — `/login`, `/dashboard`, `/store`, `/calculators`, and
everything else `entry-server.jsx` explicitly excludes — now serves the
**homepage's** fully-rendered HTML inside `#root`, unhidden, until React
clears it client-side. Today (createRoot-only) this is a real, currently-
shipping flash of homepage content on a fresh load of any non-SSG route.
Switching blindly to `hydrateRoot` without accounting for this would make
it worse: React would try to hydrate the wrong page's markup instead of
just flashing it.

## Fix

1. **New `client/src/ssgRoutes.js`** — pure, JSX-free function
   `isSsgRoute(pathname)`. Extracts the flat path-list logic already
   inline in `entry-server.jsx`'s `buildRoutes()` (itself sourced from
   `data/blogPosts.js`, `data/cityPages.js`, `data/comparisonPages.js`,
   `data/faqPages.js`, and the tool-registry slug list) into a shared
   single source of truth importable by both the Node SSR bundle and the
   browser bundle.
2. **`main.jsx`**: branch on `isSsgRoute(window.location.pathname)`.
   - True → `hydrateRoot(rootEl, app)`.
   - False → `rootEl.replaceChildren()` (clear stale homepage markup from
     the rewrite fallback) then `createRoot(rootEl).render(app)`.
3. **`entry-server.jsx`**: consume the same shared helper instead of its
   own inline path assembly, so the two can't drift apart later.
4. No changes to `AppProviders` / `App.jsx` / `routes.jsx` needed — Batch
   5.5 stage 1b already removed the top-level `isLoading` auth gate, so
   the client's very first render (before `AuthProvider`'s effect fires)
   already structurally matches `entry-server.jsx`'s tree: same
   `PublicLayout` → `Header`/`Footer`, same default `user:null,
   isLoading:true` on both sides.

## Explicitly out of scope

- Backlog #28's *nested*-Suspense limitation in `ssg-build.js` (blocks the
  `Guides` lazy-wrap specifically) — different mechanism (Node
  `renderToString`, not client hydration). No live route currently depends
  on it since that attempt was reverted. Stays in `docs/backlog.md`.
- `AppShell`/`AdminShell` (protected zone) — never in `entry-server.jsx`'s
  route list, always `createRoot`, unaffected by this change.

## Files touched

- New: `client/src/ssgRoutes.js`
- New: `client/scripts/hydration-sweep.js` (verification tooling)
- Modify: `client/src/main.jsx`
- Modify: `client/src/entry-server.jsx`
- Modify: `docs/backlog.md` (one dated line, see below — unrelated finding
  noticed while reading `vercel.json`/build config for this batch)

Uncommitted local changes present in the working tree before this batch
started (`CLAUDE.md` stray leading `"1"`, both `.env.example` files'
blanked `VITE_ADSENSE_PUBLISHER_ID` line) are **not** part of this batch
and are left untouched/unstaged per explicit instruction.

## Verification

1. `cd client && npm run build` — full `vite build && node
   scripts/ssg-build.js` pipeline. Confirm all 129 routes still emit,
   title/h1 counts unchanged from the Batch 0B baseline (script's own
   report table).
2. `npm run preview` (or equivalent static server on the built `dist/`),
   then run `node scripts/hydration-sweep.js` against it — headless
   sweep of all 129 SSG routes plus `/login` (one representative non-SSG
   route). For each route:
   - Navigate, capture browser console output.
   - Fail the route if any console error fires, or any message matches
     React's hydration-mismatch patterns (`Hydration failed`, `did not
     match`, `server rendered HTML`, `A tree hydrated but some
     attributes...`, etc.).
   - Print a per-route PASS/FAIL table; nonzero exit code if any route
     fails.
3. Manual spot-check in a real browser on a handful of route types (home,
   a tool page, a blog post, a city page, a compare page, an FAQ page,
   `/login`) for the actual CLS repro: confirm the footer's bounding rect
   no longer momentarily collapses to `{0,0,0,0}` on load, and `/login` no
   longer flashes homepage content before showing the login page.

## Rollback plan

`main` is never touched until the very end (single merge), so `main` stays
deployable throughout this batch regardless of outcome.

- **If the sweep or manual verification finds mismatches that are fixable
  within this batch's scope** (e.g. one page's component reads a
  browser-only API outside an effect): fix forward with an additional
  commit on `batch-5.6-ssg-hydration`, re-run the full sweep from step 2.
- **If mismatches are found that are NOT fixable within scope** (e.g. a
  systemic issue touching far more than the 3 files above, or requiring
  changes to `AppProviders`/route structure that would blow past the
  ~25-file soft cap in CLAUDE.md §7): add a single revert commit on this
  branch (`git revert` the implementation commit(s), keep the plan-doc
  commit), report the finding, and stop — do not merge. The branch itself
  can simply be abandoned/left unmerged; no PR gets opened until
  verification passes clean.
- Either path: nothing is force-pushed, nothing is merged to `main` until
  the sweep script and manual spot-check both pass.

## Backlog addition (unrelated finding, logged not fixed)

While reading `vercel.json`/build config for this batch, found
`client/node_modules` appears partially committed to git (~9400 files,
visible in Vercel clone logs) — needs a `.gitignore` fix + `git rm
--cached` in a cleanup batch. Out of scope here; added to
`docs/backlog.md` folded into batch 0C per instruction.

## Dependency approval

`hydration-sweep.js` needs a real browser to observe hydration-mismatch
console output (only fires during actual client JS execution — a plain
HTTP fetch of the static HTML can't see it). No browser-automation tool
existed in this repo before this batch. Per CLAUDE.md §5, asked the user
directly; approved 2026-07-15: **`playwright`, devDependency, chromium
browser only** (not all 3 engines) to control size — installed via `npm
install` (package.json) + `npx playwright install chromium --with-deps`
(browser binary, ~185MB, cached under
`%LOCALAPPDATA%\ms-playwright`, not part of the repo or the shipped
client bundle).

## Implementation log (findings during the plan's own verification step)

The plan's step 5 ("empirically verify... this is the crux of every
component's hydration-safety assumptions") surfaced real, non-obvious
findings the plan itself couldn't have predicted. Recorded here as they
happened, in order:

1. **First full build + sweep, plan as originally approved**: 129/130
   FAILED (only `/login` passed). Every SSG route — including the
   simplest static pages — threw React error #418 escalating to #423
   ("error while hydrating this Suspense boundary").
2. **Root cause A, confirmed**: `routes.jsx`'s `lazy$()` helper wraps
   *every* route element in a client-side `<Suspense>` for route-level
   code-splitting (Batch 5.5 stage 4). `entry-server.jsx` rendered route
   elements directly via `renderToString`, which never emits Suspense
   boundary comment markers even when a boundary is present — so the
   client's post-hydration tree shape structurally never matched the
   server's, on every route uniformly. Fixed by switching
   `entry-server.jsx` to `renderToPipeableStream` (buffered to a string
   for `ssg-build.js`, which now `await`s `renderRoute()`), which does
   emit those markers, plus wrapping each route element in a matching
   `<Suspense>` — and, for `/tools/:slug` routes specifically, a second
   nested `<Suspense>` matching `DynamicToolPage.jsx`'s own internal
   boundary (which `entry-server.jsx` otherwise bypasses by importing
   tool components directly).
3. **Rebuilt + re-swept**: still 129/130 failed, unchanged. Confirmed via
   a hybrid diagnostic (real SSG'd HTML spliced into a live Vite dev-mode
   page, so React's unminified messages are readable) that the actual
   first failure was unrelated to Suspense: **`ToastProvider`**
   (`AppProviders.jsx`, wraps every client page) unconditionally renders a
   toast-container `<div>` as a trailing sibling — `entry-server.jsx`
   never included `ToastProvider` at all, so that div had zero server
   counterpart. React's exact warning: "Expected server HTML to contain a
   matching `<div>` in `<div>`." Because `ToastProvider` sits above
   `PublicLayout` in the tree, this broke hydration for the entire page on
   every route identically. Fixed by adding `<ToastProvider>` to
   `entry-server.jsx`, matching `AppProviders.jsx`'s structure.
4. **Rebuilt + re-swept again**: `/` now passes (proof both fixes above
   are real and necessary), but only 2/130 pass overall — 128 routes still
   fail, now with a different error family (#421/#422 instead of
   #418/#423, so something did change). The one concrete lead so far — a
   `NavLink`/`aria-current` prop mismatch React reports during hydration
   of `/about` — does not hold up: the actual generated
   `dist/about/index.html` has the *correct* `aria-current="page"` value
   verified byte-for-byte, so that warning is most likely a downstream
   symptom of a still-unidentified earlier mismatch, not the root cause
   itself.
5. **Test-harness bug found, NOT an app bug**: `vite preview`'s default
   static server does not resolve `/about` to `about/index.html` for
   extensionless nested paths without a trailing slash — it silently
   serves the SPA-fallback `dist/index.html` (the homepage) instead.
   Confirmed via curl: `/about` and `dist/index.html` were byte-identical
   through `vite preview`, while `/about/` (trailing slash) correctly
   matched `dist/about/index.html`. This means `hydration-sweep.js` had
   been hydrating every nested SSG route against the WRONG page's markup
   the whole time — the #418/#421/#422/#423 failures on `/about`, tool
   pages, etc. were largely a test-harness artifact, not real app bugs.
   Vercel itself resolves these correctly in production (already verified
   in Batch 5.5b). Fixed by adding `client/scripts/static-preview-server.js`
   — a small dependency-free Node http server matching Vercel's actual
   resolution order (exact file → `<path>/index.html` → SPA-fallback
   `index.html`) — and pointing the sweep at it instead of `vite preview`.
   **Impact: pass rate jumped from 2/130 to 74/130** with zero further
   app-code changes — confirms the ToastProvider and Suspense/streaming
   fixes (steps 2–3 above) are real and correct.
6. **Real remaining issue, root cause only partially identified**: of the
   56 failures against the corrected server, the overwhelming majority
   (48) were `/tools/:slug` routes, all with "This Suspense boundary
   received an update before it finished hydrating... wrap the original
   update in startTransition" (React #421/#422). Traced one concrete
   instance to `ToolPageShell.jsx`: `relatedTools` was computed via
   `useState([]) + useEffect(() => setRelatedTools(getRelatedTools(...)))`
   — but `getRelatedTools` is a pure, synchronous lookup over the static
   tool registry (no data-fetching, no randomness), so gating it behind an
   effect served no purpose except firing a post-mount `setState` that won
   a race against the Suspense boundary's hydration. Fixed by computing it
   directly during render instead (removes the state update entirely,
   makes SSR and first client render identical by construction — not a
   workaround, a correctness fix). **This did not resolve the bulk of
   tool-route failures** — re-swept and tool routes still fail at
   essentially the same rate (49/49 this time, vs 48/49 before), and blog
   post failures increased (5 → 16), suggesting the render-time-shift from
   this fix made a *different*, not-yet-identified early-effect race more
   likely to manifest elsewhere, rather than eliminating the underlying
   class of bug. Ruled out as candidates: `Header`'s route-change effect
   (calls `setState` with values already equal to the initial state on
   first mount — a no-op, doesn't disrupt hydration, and `/about` uses the
   same `Header` and passes); `MergePDF.jsx` (no effects, all state is
   user-interaction-driven); `AdBanner` (inactive — `ADS_ACTIVE` is false
   in this build, renders `null` on both sides).
7. **Category-based hydrate gating, per user ruling**: rather than keep
   chasing the tool-page/blog race open-endedly, gated `hydrateRoot` to
   only the route categories proven reliable by a rigorous 3-run
   determination methodology:
   - Fixed a methodology bug first: `hydration-sweep.js` at
     `CONCURRENCY=5` showed wild pass-rate swings (27-74/130) across
     identical builds — parallel page hydrations were competing for CPU
     in this sandboxed environment, which measurably affects hydration
     timing itself (the exact thing being tested). Lowered the default to
     2, and ran the actual determination sweeps at
     `HYDRATION_SWEEP_CONCURRENCY=1` for maximum rigor. This tightened the
     range to 77-82/130 — still not perfectly flat (React hydration
     timing is inherently CPU-scheduling-sensitive), but stable enough for
     a reliable 3-run intersection.
   - Also found and fixed real noise in the sweep itself: `/blog` and
     `/tools` (and, transitively, every individual tool page) legitimately
     fail CORS against the live production API
     (`awe-os.onrender.com`) from this sandboxed test origin — not a
     hydration bug, just this machine lacking real network access.
     `hydration-sweep.js` now excludes console errors matching that host
     + "CORS policy" (plus Chrome's generic companion "Failed to load
     resource: net::ERR_FAILED" line for the same failed request, gated
     behind an actual `requestfailed` event to that host so a
     genuinely-unrelated `ERR_FAILED` can't hide behind it).
   - Ran 3 clean determination sweeps. Result: **all 24 city pages** and
     **both compare/faq pages** passed 3/3 with zero flakiness. **38 of 41
     blog posts** passed 3/3, but 3 did not — per the ruling, this means
     excluding the *entire* blog category (not just the 3 flaky posts),
     since "an individual passing blog post today may fail tomorrow."
     **0 of 48 individual `/tools/:slug` pages** passed even once. Even
     `/` (home) and `/tools/ai` failed intermittently in one of the 3
     runs each (real #421 errors, not noise) — confirming the underlying
     race isn't strictly tool-page-specific, just far more *likely* to
     manifest there (more DOM to hydrate = more time for a competing
     effect to fire first) — both ended up passing all 3 after the
     concurrency fix, so both stayed in the hydrate-safe set.
   - Added `isHydrationSafe(pathname)` to `ssgRoutes.js`: excludes `/blog`
     + every `/blog/:slug` post, and every individual `/tools/:slug` tool
     page, by category (matching against `TOOL_SLUGS`) — not a per-URL
     allowlist. `main.jsx`'s hydrate/create decision is now
     `hasChildNodes() && isSsgRoute(...) && isHydrationSafe(...)`.
     Excluded routes still get prerendered static HTML from `ssg-build.js`
     (SEO/first-paint unaffected) — they just get a clean `createRoot`
     client render instead of attempting `hydrateRoot`.
   - Rebuilt with the gating in place and ran the required 2 confirmation
     sweeps: **130/130 passed both times**, zero console errors anywhere,
     including on the excluded (createRoot-fallback) routes.

## Final scope shipped

- **Hydrated** (uses `hydrateRoot`, real perf/CLS win): `/`, all 5 tool
  category/index pages (`/tools`, `/tools/pdf`, `/tools/calculators`,
  `/tools/converters`, `/tools/ai`, `/tools/productivity`, `/tools/free` —
  7 routes), 5 static pages (about/contact/privacy-policy/terms/disclaimer),
  all 24 city pages, the 1 compare page, the 1 faq page, plus `/login`
  (non-SSG, always `createRoot`, included as the control case). **39 SSG
  routes hydrate.**
- **Not hydrated yet** (still prerendered for SEO, but `createRoot` client
  render — today's pre-batch behavior, zero regression risk): all 48
  individual `/tools/:slug` tool pages, `/blog` + all 41 blog posts. **90
  SSG routes stay on `createRoot`.**
- Fixes shipped regardless (benefit every route, hydrated or not):
  `ToastProvider` now in `entry-server.jsx`'s SSR tree; `renderToPipeableStream`
  + matching `<Suspense>` boundaries for correct hydration-marker parity;
  `ToolPageShell.jsx`'s `relatedTools` computed at render time instead of
  via a post-mount effect (a real correctness fix, kept even though it
  alone didn't clear tool pages for hydration — it removes one genuine
  hydration-unsafe pattern and SSR now actually includes that content for
  crawlers/first-paint, which it never did before).

## Batch 5.6b (not started — recorded for a future batch)

The early-effect-vs-Suspense-hydration race blocking tool pages and 3/41
blog posts needs isolation. Starting point, per user's bisection proposal:
temporarily strip `ToolPageShell.jsx` down to a minimal version (no
`AdBanner`, no `useTrackToolView`, no schema.org JSON-LD blocks) in a
throwaway/local test, confirm hydration passes clean at minimal, then
restore each piece one at a time, re-running the sweep after each, until
the exact trigger reproduces. Once found, remove `/tools/*` (and `/blog`,
if its 3 flaky posts share the same trigger) from `isHydrationSafe()`'s
exclusions in `ssgRoutes.js`.
