# Batch 5.6b Plan — Hydration Race Isolation (React #421/#422)

Branch: `batch-5.6b-hydration-race`, created from `origin/main` @ `7034c6e`
(merge of PR #13 / batch-12-tool-prose).

## Origin

Backlog item #32 (`docs/backlog.md`): an early-effect-vs-Suspense-hydration
race (React #421/#422, "update received before it finished hydrating")
blocks `hydrateRoot` on all 48 individual `/tools/:slug` pages and 3/41
blog posts. Batch 5.6 shipped `hydrateRoot` only for the 39 routes proven
reliable via a 3-run determination sweep; tool pages and blog stayed on
`createRoot` (zero regression, today's pre-batch behavior) pending this
isolation. One contributing cause was found and fixed in Batch 5.6
(`ToolPageShell.jsx`'s `relatedTools` moved from effect-driven to
render-time) but did not clear the race.

Escalated 2026-07-17 (batch-12 diagnostic, folded into backlog item #32):
re-ran the sweep 2x at `HYDRATION_SWEEP_CONCURRENCY=1` (5.6's own
gold-standard condition) — neither run hit 135/135. Run 1 failed `/login`
(network noise, not hydration-pattern). Run 2 failed `/tools/ai` with
`Minified React error #421` — a genuine hydration-mismatch match, on a
route that had passed every prior sweep. Confirms the race is not purely
parallel-worker CPU contention; it reproduces even single-threaded.

## History (recap, full detail in `docs/batches/batch-5.6-ssg-hydration.md`)

- 0/48 individual tool pages ever passed a determination sweep.
- 3/41 blog posts flaky.
- City pages (originally 3/3 clean, part of the hydrate-safe set) later
  went intermittently flaky too (batch 8b's verification sweep).
- `/tools/ai` (a hydrated category page) failed once during 5.6's own
  3-run determination, and again at concurrency=1 in the batch-12
  diagnostic.
- Homepage failed once during 5.6's determination runs.

## 1. Suspect inventory

Traced every effect/setState that can fire during initial mount across
the shared tree that wraps every SSG route (`main.jsx` → `AppProviders` →
`PublicLayout` → `Header`/`Footer` → route element).

| # | Location | What fires on mount | Verdict |
|---|---|---|---|
| 1 | `modules/auth/context/AuthContext.jsx:43-51` | `useEffect` with `[authFetch]` dep (stable, mount-only in practice). For an anonymous visitor (no `awe_token` in `localStorage` — default for every crawler, every hydration-sweep run, and most real first-time visitors) it takes `if (!savedToken) { setIsLoading(false); return }` **synchronously in the first passive-effect flush**, changing `AuthContext`'s value (`isLoading: true → false`). `AuthProvider` sits *above* `PublicLayout`/`App`/every route's `<Suspense>` (`app/providers.jsx:13-25`), so this re-renders the entire subtree, including whichever lazy route chunk is still resolving. **Lead suspect.** Explains the shape of every symptom: fires on every route; danger window (time between mount and this effect firing vs. time for the route's Suspense boundary to finish hydrating) is wider for routes with larger lazy chunks — consistent with tool pages (heavy libs: pdf-lib, jsPDF, papaparse) failing near-100% while small static pages mostly survive it, and with occasional homepage/`/tools/ai` failures under CPU contention or single-worker timing variance. |
| 2 | `hooks/usePerformanceMonitor.js:97-119` (`useWebVitals`, via `VitalsObserver` in `providers.jsx:8-11`) | `useEffect` registers `PerformanceObserver`s, writes into a module-level plain object, never calls `setState`. | **Ruled out** — no React state touched. |
| 3 | `main.jsx:14` (`initMonitoring()`) + `utils/performance/webVitals.js` | Runs synchronously at module load, **before** `hydrateRoot`/`createRoot` is even called. | **Ruled out** — not concurrent with hydration, no React involvement. |
| 4 | `hooks/useTrackToolView.js:32-49` | `useEffect` does a `sessionStorage` check + fire-and-forget `fetch`/`trackEvent`. No `setState` in this hook or `useAnalytics.js`. | **Ruled out** — fire-and-forget, no re-render. |
| 5 | `components/AdBanner.jsx:14-21` | `useEffect` pushes to `window.adsbygoogle`, no `setState`. `ADS_ACTIVE` is `false` in this build — returns `null` before the effect can mount. | **Ruled out for this build** — dormant. Revisit when ads activate. |
| 6 | `react-helmet-async` (`HelmetProvider`, wraps everything) | Traced into `node_modules/react-helmet-async/lib/index.esm.js`. On the client (`canUseDOM: true`), `HelmetDispatcher.emitChange()` → `setHelmet()` is a **plain mutable-object assignment**, not a `useState` setter. The DOM commit (`commitTagChanges`) mutates `document.head` directly, bypassing React reconciliation entirely (standard react-helmet-async pattern). | **Ruled out as a `setState`-based race source.** Note (not a fix target): `HelmetDispatcher.init()` calls `emitChange()` synchronously during `render()` on first mount — a side-effect-during-render purity smell, but it touches no React state so it can't itself throw #421. |
| 7 | `components/Header.jsx:189-216` | 4 effects, all gated behind `openMenu`/`mobileOpen` (start `false`) or set state to its already-current value on first mount (route-change effect — already ruled out by 5.6's own investigation). | **Ruled out**, consistent with `/about` (same `Header`) passing reliably. |
| 8 | `components/PublicLayout.jsx`, `components/Footer.jsx` | No effects — pure render. | **Ruled out.** |
| 9 | `pages/tools/ToolPageShell.jsx:158-160` | `useEffect(() => window.scrollTo(0,0), [slug])` — pure side effect, not `setState`. `relatedTools` already fixed in 5.6 (render-time). | **Ruled out** — already investigated in 5.6, didn't clear the race (correctly so, since it isn't a `setState`). |
| 10 | The 48 individual tool components under `pages/tools/*.jsx` | Spot-checked several (`MergePDF.jsx`, `CurrencyConverter.jsx`); no `fetch`/`api.`-in-mount-`useEffect` pattern found via grep across `pages/tools/`. 5.6 already ruled out `MergePDF.jsx` specifically. | **Not exhaustively cleared** — resolved empirically by bisection (§2), not by further hand-audit. |

**Working hypothesis**: suspect #1 (`AuthContext`'s mount-time
`setIsLoading(false)`) is the root cause, with blast radius scaling by how
long a route's lazy chunk takes to resolve.

## 2. Bisection method

The full-site sweep is too noisy for bisection (5.6 documented 27–74/130
swings from CPU contention alone; even concurrency=1 just failed twice
more in the batch-12 diagnostic). Isolate with a dedicated stress harness
instead of chasing a flaky full-sweep signal.

1. **`client/scripts/hydration-stress.js`** (new file, no new dependency
   — Playwright's Chromium already exposes CDP via
   `page.context().newCDPSession(page)`):
   - Target one known-worst-case route with a large lazy chunk (e.g.
     `/tools/merge-pdf`, pulls in `pdf-lib`) — 0/48 tool-page pass rate
     makes this reproduce reliably even unthrottled, per 5.6's
     determination sweeps.
   - Apply `Emulation.setCPUThrottlingRate` (start at 4×, adjust as
     needed) via CDP before navigation, to reliably widen the race
     window instead of relying on ambient sandbox contention.
   - Run the same route N times (10) in a tight loop, report pass/fail
     count and, on failure, the console error text.
   - Find a throttle setting where the **unmodified** build fails close
     to 10/10 — that is the trustworthy baseline signal.
   - For any failure needing a full (non-minified) stack trace, reuse
     5.6's trick: splice the SSG'd HTML into a live Vite dev-mode page.
2. **Strip-and-restore, ranked by §1**:
   - Step A: stub `AuthContext`'s mount effect to a no-op (skip the
     `setIsLoading(false)` branch, or seed `isLoading: false` as initial
     state). Re-run the stress harness. If it flips from ~10/10 fail to
     0/10 fail, root cause is confirmed and localized.
   - Step B (only if A doesn't fully clear it): reintroduce A, bisect
     remaining §1 row-10 candidates (per-tool-component effects) using
     the same harness against different tool routes. Also worth a
     stub-and-test pass on `HelmetDispatcher`'s render-phase
     `emitChange()` even though the static trace ruled out the
     `setState` theory — a synchronous `document.head` mutation during
     React's render phase could still interact badly with concurrent
     features through a different mechanism.
   - Record each step's harness score in this doc's implementation log,
     same format as 5.6.

## 3. Candidate fix classes

Per owner ruling, if suspect #1 confirms:

1. **First attempt: `startTransition`.** Wrap `AuthContext`'s mount
   effect state updates (`setIsLoading(false)` in the sync branch, and
   `setUser`/`setIsLoading(false)` in the async `.then()`/`.finally()`)
   in `startTransition`, so React deprioritizes them behind any
   in-flight Suspense hydration instead of racing it. Smallest diff.
2. **If the harness shows `startTransition` doesn't fully clear it**
   (React's docs note transition updates can still interrupt in-progress
   hydration in some versions) — **separate commit**, individually
   revertible: defer the whole session-restore effect one tick past
   hydration completion via a hydration-done flag
   (`requestIdleCallback` or a `useSyncExternalStore`-based signal).

If a per-tool-component effect confirms instead: same `startTransition`
wrap, scoped to that component only.

If `HelmetDispatcher`'s render-phase DOM mutation is implicated: this is
library behavior, not app code — needs more investigation before
proposing a concrete change (upgrade vs. different Helmet usage pattern),
flagged rather than fixed in this batch.

Explicitly not proposing: touching `ssg-build.js`'s Suspense-marker
emission again (5.6 already fixed that mechanism — different, earlier
race), or reverting to `createRoot`-everywhere.

## 4. Success criteria

Per owner ruling, both bars are hard requirements, not one-or-the-other:

- Stress harness: previously-100%-failing route passes 10/10 after the
  fix, at the throttle setting that reliably reproduced the race
  pre-fix.
- **3 consecutive clean full-site sweeps at
  `HYDRATION_SWEEP_CONCURRENCY=2`** (script's shipped default — 5.6's own
  bar).
- **2 consecutive clean full-site sweeps at
  `HYDRATION_SWEEP_CONCURRENCY=1`** — stricter than 5.6 required,
  justified by 5.6's concurrency=2 bar already shipping once and later
  turning out to hide a live race (batch-12 diagnostic).

Only after **both** bars pass, per owner ruling: expand
`isHydrationSafe()` in `ssgRoutes.js` to drop the `/tools/:slug` and
`/blog` exclusions, **as its own separate commit** — so if production
shows anything weird post-merge, the expansion alone can be reverted
while keeping the underlying race fix.

## 5. Rollback

- Each candidate fix from §3 lands as its own commit; if the stress
  harness or sweep regresses after a given fix, `git revert` that commit
  specifically and try the next candidate.
- `isHydrationSafe()`'s category-based gating (5.6's shipped safety
  valve) stays untouched until §4's criteria are met in full — a failed
  bisection attempt leaves production exactly where it is today.
- The `isHydrationSafe()` expansion is its own commit (§4), independently
  revertible from the underlying fix commit(s).
- `main` is never touched until a single final merge.

## 6. Scope guard

- Branch: `batch-5.6b-hydration-race`, from `origin/main` @ `7034c6e`.
- No `server/` changes — 100% client-side hydration timing.
- No new npm dependencies — CDP throttling uses Playwright's existing
  Chromium CDP session, already a devDependency approved in 5.6.
- Stage only batch files: `client/scripts/hydration-stress.js` (new),
  whichever of `AuthContext.jsx` / a specific tool component /
  `ssgRoutes.js` the confirmed fix touches, plus this plan doc and
  `docs/backlog.md` for any new out-of-scope findings.
- Per owner ruling: anything found in the 48 tool components during
  bisection that is NOT the confirmed root cause goes to
  `docs/backlog.md`, not fixed inline.

## Owner approval (2026-07-17)

Plan approved with the following rulings, incorporated above:

1. Suspect #1 (`AuthContext`) tested first via Step A stub, exactly as
   planned, before any real fix is written.
2. The stricter success bar (§4) is a hard requirement, not a
   recommendation: 3 clean runs at concurrency=2 **and** 2 clean runs at
   concurrency=1.
3. Fix order if `AuthContext` confirms: `startTransition` first (§3.1);
   only if the harness shows it's insufficient, the hydration-done-flag
   deferral (§3.2) — as a separate, individually revertible commit.
4. `isHydrationSafe()` expansion happens only after both success bars
   pass, as its own commit (§4/§5).
5. Findings in the 48 tool components during bisection that aren't the
   confirmed root cause: backlog, not fixed inline (§6).

## Implementation log

1. **Calibration attempt 1 — CDP CPU/network throttling, FAILED to
   reproduce**: built `client/scripts/hydration-stress.js` (repeated
   single-route hydration under CDP throttling). Tried CPU throttle 4x
   and 20x, network throttle 400ms/50KB/s ("Slow 3G"-like), a combined
   aggressive profile (6x CPU + 1000ms/10KB/s — broke navigation itself,
   `page.goto` timeouts before hydration was ever reached), and a
   moderate combined profile (3x CPU + 150ms/150KB/s). **Every profile
   produced 10/10 clean PASS on `/tools/merge-pdf`** (except the
   navigation-breaking one, which never got far enough to test
   anything). Conclusion: uniform throttling (CPU or network) scales the
   mount-effect timing and the chunk-resolution timing by the same
   factor, preserving their relative order — it cannot recreate the
   asymmetric/bursty scheduling delays that real host contention causes.
2. **Calibration attempt 2 — real concurrent decoy pages, ALSO
   inconclusive (wrong reason)**: extended the harness to open N decoy
   pages navigating to other heavy tool routes in the same browser,
   concurrently with the target route's navigation (real host-CPU/
   process contention, not simulated). Tried N=4 (matching 5.6's
   concurrency=5), N=6, N=8 — **still 10/10 clean every time.**
3. **Root cause of the clean 10/10s, found before concluding anything
   about the race itself**: `client/src/ssgRoutes.js`'s `isHydrationSafe()`
   returns `false` for every `/tools/:slug` route, including
   `merge-pdf` — meaning `main.jsx` was correctly using `createRoot`
   (not `hydrateRoot`) for the entire target route throughout both
   calibration attempts. There was never any hydration happening to
   race in the first place; the harness was testing an inert path.
   Fixed by adding `window.__AWE_FORCE_HYDRATE__` to `main.jsx` — a
   test-only override, undefined in all real traffic, read (never set)
   by shipped code, set only by the harness via Playwright's
   `page.addInitScript()`. Verified inert: `grep`ing `dist/` shows only
   a read (`window.__AWE_FORCE_HYDRATE__===!0||ko(...)`, minified), and
   a normal `npm run hydration-sweep` run (flag never set) stayed
   135/135 clean after this change. Per owner ruling, this hook is kept
   past this batch's end — future determination sweeps need it to
   re-test `isHydrationSafe()`-excluded routes before that gate is ever
   expanded.
4. **Working baseline found — no throttling or decoys needed at all**:
   with the force-hydrate flag active, a plain run (no CPU/network
   throttle, no decoy pages, 1 page hydrating at a time) produced
   **10/10 FAIL** on `/tools/merge-pdf`, every failure `Minified React
   error #422`. Matches 5.6's own original finding (0/48 tool pages
   passed even at `HYDRATION_SWEEP_CONCURRENCY=1`, i.e. sequential,
   uncontended) — the race on this route is apparently fully
   deterministic once hydration is actually attempted, not contention-
   dependent at all. (Reconciling this with 5.6's homepage/`/tools/ai`
   *intermittent* failures, and the batch-12 diagnostic's intermittent
   `/tools/ai` failure at concurrency=1, is unresolved — those routes
   may have a genuinely different, timing-sensitive trigger than tool
   pages' apparently-deterministic one. Flagged for Step B if needed.)
5. **Step A — suspect #1 (`AuthContext`) stub test, RULED OUT**:
   temporarily neutralized `AuthContext.jsx`'s entire mount effect
   (commented out `setIsLoading(false)`/`setUser()`/the whole
   session-restore body) and re-ran the identical profile (plain, 10
   runs, force-hydrate). **Result: 10/10 FAIL, byte-identical error
   (`Minified React error #422`) to the unmodified baseline.**
   Suspect #1 is not the (sole) cause — removing it entirely made no
   measurable difference. Stub reverted immediately after the test
   (`git diff` confirms `AuthContext.jsx` is back to HEAD); dist
   rebuilt clean.

6. **Unminified error captured (dev-mode splice), and it's a different
   diagnosis than the structural-mismatch theory**: built
   `client/scripts/hydration-diagnose.js` — splices `dist/tools/merge-pdf/`'s
   real prerendered `#root` markup into a live Vite dev server's empty
   shell (via Playwright request interception on the document response),
   with `window.__AWE_FORCE_HYDRATE__` set, so `hydrateRoot` runs for
   real against an unminified React dev build. Captured message (full
   text, not a minified code):

   > This Suspense boundary received an update before it finished
   > hydrating. This caused the boundary to switch to client rendering.
   > The usual way to fix this is to wrap the original update in
   > startTransition.

   This is React's generic "dehydrated Suspense boundary received an
   update mid-hydration" message — not a content/attribute mismatch
   message (those name the specific mismatched value). No app component
   is named in the message itself; the stack trace is entirely inside
   React's own internals (`updateDehydratedSuspenseComponent` etc. in
   the pre-bundled dev chunk), confirming this is a *timing* event
   hitting React's hydration machinery, not a *shape* mismatch in our
   JSX.
7. **Suspense-marker structural diff, server vs. client's real code
   path — suspect #3 CONFIRMED, but the mechanism is timing, not DOM
   shape**: grepped `dist/tools/merge-pdf/index.html`'s raw source for
   React's streaming-SSR boundary comment markers
   (`<!--$-->`/`<!--/$-->`/`<!--$?-->` for pending). Found exactly 2
   markers of each type, positioned back-to-back with zero DOM between
   them: `<main class="flex-1"><!--$--><!--$--><div class="max-w-7xl...">`
   at the open, `...</div></div><!--/$--><!--/$--></main>` at the close.
   Both are the **complete** marker (`<!--$-->`), never the **pending**
   marker (`<!--$?-->`) — because `entry-server.jsx` imports every tool
   component directly (`TOOL_PAGE_COMPONENTS`, no `lazy()`), so neither
   of its two manually-added `<Suspense>` wraps (file header comment,
   root cause #2) ever actually suspends during SSR; the whole two-layer
   tree resolves synchronously in one pass, and `ChunkErrorBoundary`/
   `ToolErrorBoundary` (present client-side, absent server-side) render
   no host DOM themselves so they don't show up as a marker/shape
   difference either — ruling out my initial "extra wrapper components"
   theory specifically.
   The REAL mismatch: the **client's** route for `/tools/:slug` requires
   **two sequential, network-dependent `lazy()` resolutions** —
   `routes.jsx`'s `lazy$(<DynamicToolPage />)` (routes.jsx:36, :174) must
   resolve BEFORE `DynamicToolPage.jsx` can even evaluate
   `getOrCreateLazy(canonicalSlug, importFn)` and request the *second*
   chunk (the actual tool component, e.g. `MergePDF`) — a true waterfall,
   not parallel. `entry-server.jsx`'s SSR output has no equivalent delay
   at all (both "boundaries" are already-resolved by construction). Any
   real, non-zero latency in that two-step waterfall is enough to have
   the second lazy resolution's promise settle (and ping its Suspense
   boundary) after the outer boundary's hydration attempt has already
   started but not committed — exactly the message captured in step 6.
   This is structurally **guaranteed to occur on every load**, not
   contention-dependent, which matches the observed 10/10 determinism.
8. **Comparison to non-tool routes, checking whether this is really a
   separate bug from the intermittent race**: homepage
   (`dist/index.html`) has exactly **1** boundary marker pair (matching
   `routes.jsx`'s single `lazy$(<Home />)` wrap; `Home` is also directly
   imported in `entry-server.jsx`, so it too never suspends server-side).
   Client-side, `Home` is `lazy()`-wrapped exactly once — a single
   resolution, no waterfall. This offers a plausible **unifying
   hypothesis, not yet confirmed**: every hydrated route has at least one
   client-side `lazy()` resolution racing its own hydration commit;
   single-layer routes (home, category pages, city pages) usually *win*
   that race (chunk small/fast enough) and only occasionally lose it
   under real contention — matching 5.6's "homepage failed once in 3
   runs" and the batch-12 diagnostic's intermittent `/tools/ai` failure —
   while tool pages' forced two-layer waterfall makes them lose it
   essentially every time. If true, bug (a) and bug (b) share one root
   *mechanism* (a `lazy()` promise settling mid-hydration) but differ in
   *reliability* purely because of structural depth (1 vs. 2 sequential
   lazy layers), not because they're unrelated bugs. **Not yet tested
   directly against a non-tool route with this same dev-splice
   technique** — logged as the natural next validation step, not
   asserted as confirmed.
9. **Incidental finding, not fixed (logged to backlog)**:
   `hydration-sweep.js`'s (and this batch's `hydration-stress.js`'s,
   copied from it) `HYDRATION_MISMATCH_PATTERNS` regex
   `/minified react error #41[0-9]/i` only matches codes **410–419** —
   it does NOT match #421/#422/#423/#425, despite the adjacent comment
   explicitly listing those as the intended coverage. Harmless to
   pass/fail correctness (any console error fails the route regardless
   of pattern match — the list only controls the friendlier "hydration
   mismatch" vs. generic "console error" label), so no sweep verdict has
   ever been wrong because of it, but every tool-page failure in every
   sweep run to date has been mislabeled "console error" instead of
   "hydration mismatch." Fix is a one-character-class change
   (`#4[12][0-9]` or similar) — trivial, but out of this investigation's
   scope; logged to `docs/backlog.md`.

## Two-bug tracking (per owner instruction, 2026-07-17)

- **Bug (a) — deterministic, tool pages**: confirmed root cause is the
  structural double-`lazy()` waterfall in `/tools/:slug`'s client route
  (routes.jsx's `DynamicToolPage` wrap + `DynamicToolPage`'s own internal
  `ToolComponent` lazy) racing against `entry-server.jsx`'s always-
  synchronous SSR output for the same route. 10/10 reproducible via
  `hydration-diagnose.js` / `hydration-stress.js` with force-hydrate on,
  no throttling or decoys needed.
- **Bug (b) — intermittent, homepage/category/city pages**: mechanism
  UNCONFIRMED. Step 8's hypothesis (same `lazy()`-vs-hydration race,
  single-layer version, contention-dependent because it's usually fast
  enough to win) is plausible and would mean (a) and (b) share a root
  mechanism rather than being fully independent bugs — but this needs
  its own dev-splice/stress-harness confirmation pass before being
  treated as established. Tracking separately until then, per
  instruction.

**Status**: root cause of bug (a) identified with strong evidence, not
yet fixed (no code changes made per "report before changing any code").
Bug (b) still open. Suspect #1 (`AuthContext`) ruled out for bug (a) via
Step A; not yet tested against bug (b) specifically.

## Fix class evaluation (owner-accepted root cause, 2026-07-17)

Owner ruling: `startTransition` is off the table — the update racing
hydration isn't a `setState` we control; it's `lazy()`'s own internal
promise settling and pinging its Suspense boundary. Three fix classes
evaluated per owner's request, `A`/`B`/`C` as named in their message.

### A — Preload-before-hydrate

**Mechanism**: `React.lazy(ctor)` always throws on its very first
render call, regardless of whether the underlying module is already
cached — the wrapper's internal `payload._status` starts
`Uninitialized`, transitions straight to `Pending`, and throws the
promise unconditionally on that first call. What actually varies is how
long the thrown promise takes to *settle*. If `ctor()`'s dynamic
`import()` resolves via an already-warm browser module cache (near-
instant, same microtask flush) instead of a real network fetch, React's
retry can happen before the browser yields to any other task — closing
the window against interleaving updates (an unrelated effect flush, a
second lazy layer's own async resolution, anything scheduled on a
macrotask). Calling `await import('<same specifier>')` in `main.jsx`
*before* `hydrateRoot` warms that exact module in the browser's cache
(module caching is keyed by resolved specifier, shared across every
piece of code that imports it — the awaiting call doesn't need to be
the same `lazy()` wrapper instance).
Critically, since `main.jsx` would `await` the imports **before ever
calling `hydrateRoot`**, correctness doesn't actually depend on the
microtask-timing nuance above — `hydrateRoot` simply isn't invoked
until every required chunk for the matched route is fully resolved, so
there is nothing left to resolve asynchronously *during* hydration,
regardless of network speed. This makes the fix latency-agnostic: it
closes the race even under a throttled/slow connection, not just on a
fast localhost server.
**UX cost**: none per owner's own note — the SSG'd HTML is already
painted on screen for the whole wait (that's the point of SSG), and the
page was never interactive before this chunk loaded anyway (preload or
not, you can't use `MergePDF` until `MergePDF.jsx`'s chunk is
downloaded) — preloading just moves the *same* unavoidable wait earlier
and off the hydration-race's critical path, no additional wait is
introduced.
**Implementation shape** (sketch, not yet built):
1. New `client/src/routeImports.js` — hoists the plain `() =>
   import('../pages/Home')`-style closures currently inlined in
   `routes.jsx`'s `lazy(...)` calls into a shared, keyed object.
   `routes.jsx` sources its `lazy()` wraps from this module instead of
   inline closures — mechanical, zero behavior change, keeps Vite's
   static-analyzable `import()` paths intact (`toolRegistry.js`'s own
   header comment already notes Vite "needs static paths" for
   code-splitting — this refactor preserves that).
2. New `client/src/pages/tools/toolComponentMap.js` — hoists
   `DynamicToolPage.jsx`'s inline `TOOL_COMPONENTS` map the same way.
   `DynamicToolPage.jsx` imports it instead of defining it inline;
   `SLUG_ALIASES` already lives in `toolRegistry.js`, reused as-is for
   alias resolution.
3. New `client/src/hydratePreload.js` — `preloadForHydration(pathname):
   Promise<void>`. Matches `pathname` against `ssgRoutes.js`'s existing
   `STATIC_PATHS`/`CATEGORY_SLUGS`/`TOOL_SLUGS` (already the single
   source of truth for route shape) to find the matching top-level
   route import from `routeImports.js`, awaits it; for `/tools/:slug`
   specifically, additionally resolves the slug (via `SLUG_ALIASES`)
   and awaits the matching entry from `toolComponentMap.js`. Covers
   every currently-hydrated category (home, category pages, static
   pages, city pages, compare, faq, tool pages) — not tool-pages-only —
   so the validation ladder's step (iii) can actually test whether it
   helps bug (b) too.
4. `main.jsx`: wrap the hydrate/createRoot decision in an async IIFE;
   when `canHydrate` would be `true`, `await
   preloadForHydration(window.location.pathname)` immediately before
   calling `hydrateRoot`. `createRoot` path is untouched (no boundary
   timing concern for a plain client render).

**Verdict: RECOMMENDED**, as the sole fix.

### B — Flatten the waterfall (DynamicToolPage's map feeds routes.jsx directly)

Would cut `/tools/:slug` from 2 sequential `lazy()` layers to 1. Real
architectural change (~48 new `<Route>` entries or an equivalent
per-slug route-generation step, replacing `DynamicToolPage`'s runtime
dispatch/alias-fallback logic that `routes.jsx`'s header comment
documents as the "add one line" auto-registration convenience).

**Verdict: NOT NEEDED, given A.** A's `await`-before-`hydrateRoot`
mechanism is correctness-independent of *how many* sequential lazy
layers exist on a route — main.jsx just awaits each one in turn before
ever calling `hydrateRoot`; a second layer costs one more `await` in an
already-async function, not a reopened race window. B would only earn
its cost (bigger diff, loses the current auto-registration convenience,
new surface area for routing bugs) as a *separate* performance
optimization (marginally faster time-to-interactive after hydration,
unrelated to the hydration-mismatch defect) — out of scope for a
correctness fix, and CLAUDE.md's anti-overengineering guidance argues
against bundling it in here. Logging as a possible future
backlog/optimization item, not implementing now.

### C — React 18/19 resource-preload hints

Checked `react-dom`'s actual installed build
(`node_modules/react-dom@18.3.1`, verified via
`node -e "require('react-dom')"` and grepping the dev bundle for
`preload`/`preinit`/`prefetchDNS`/`preconnect` exports): **none of
these exist on this React version** — they're React 19-only APIs.
Confirmed absent, not just undocumented; a major React version bump is
far outside this batch's scope (and CLAUDE.md §5 requires explicit
approval + stated reason/size cost for any dependency change, let alone
a major-version upgrade of the rendering library itself).

The framework-agnostic alternative — hand-emitting `<link
rel="modulepreload" href="...">` tags into the SSG'd HTML `<head>` for
each route's specific chunk(s), reading Vite's build manifest at
`ssg-build.js` time to resolve hashed chunk filenames — is real and
would work on React 18. It's a **pure latency optimization**, though:
it makes the browser start fetching earlier (parallel with HTML
parsing, before `main.jsx` even runs), but does NOT by itself
guarantee the fetch is *complete* by the time `hydrateRoot` is called —
only `await`ing the import (option A) gives that guarantee. Correctness
comes from A regardless of whether this hint exists.

**Verdict: NOT REQUIRED. Optional hardening**, worth a fast-follow if
the validation ladder shows real-network latency ever makes the
preload wait long enough to matter for perceived load time — not
needed for correctness, not implementing as part of this batch's core
fix.

## Validation ladder (owner-specified, once A is implemented)

1. `hydration-stress.js`, force-hydrate, `/tools/merge-pdf`, plain (no
   throttle/decoys — the working baseline profile): must flip from
   10/10 FAIL to **10/10 PASS**.
2. Same profile against 2 more heavy tool routes (candidates:
   `/tools/split-pdf`, `/tools/pdf-editor` — both pulled `pdf-lib`-class
   chunks per §2's decoy-route list).
3. Bug-(b) hypothesis test "for free": repeated `hydration-stress.js`
   runs against homepage and a city-page route (force-hydrate not
   needed for these — they're already `isHydrationSafe()`-included) —
   if pass-rate visibly improves/stabilizes versus 5.6's and batch-12's
   documented intermittent failures, that's evidence bug (a) and bug
   (b) share the `lazy()`-vs-hydration mechanism. Not a hard pass/fail
   gate (bug (b) was never reliably reproducible to begin with — no
   clean "before" baseline to diff against — so this is corroborating
   evidence, not a certification).
4. Full-site sweeps, the agreed bar: **3× clean at
   `HYDRATION_SWEEP_CONCURRENCY=2`, 2× clean at
   `HYDRATION_SWEEP_CONCURRENCY=1`**, all 5 runs 135/135 (or the then-
   current SSG route count).
5. Only after all of the above pass: expand `isHydrationSafe()` in
   `ssgRoutes.js` (drop the `/tools/:slug` and `/blog` exclusions) as
   its **own separate commit** — independently revertible from the fix
   commits, per standing rollback posture.

## Implementation of A (2026-07-17) — partial success, new finding

Built the 5-file preload-before-hydrate implementation exactly per plan
(`routeImports.js`, `toolComponentMap.js`, `hydratePreload.js`,
`routes.jsx`/`DynamicToolPage.jsx` sourcing from the shared modules,
async `mount()` in `main.jsx`). Validation ladder step 1 result:

- **`/tools/merge-pdf`, plain profile, force-hydrate: still 10/10 FAIL.**
  BUT the error changed — from `Minified React error #421`
  ("received an update before it finished hydrating") to `#422`
  ("switched to client rendering"), preceded (dev-mode splice) by a
  genuine mismatch warning: `Expected server HTML to contain a matching
  <div> in <div>` and `Hydration failed because the initial UI does not
  match what was rendered on the server` (×2).

**The timing race IS closed** — #421's exact message never recurs after
the fix, on any run. **A second, previously-masked bug surfaced in its
place.** Root-caused via a structural DOM diff (`hydration-stress.js`'s
target page vs. a captured post-recovery live DOM, tag-sequence
comparison): at the exact point where `DynamicToolPage`'s resolved
content begins, the live/recovered DOM shows

    <!--$--><!--/$--><div style="display: contents;"><div class="max-w-7xl...

— `<!--$--><!--/$-->` is a boundary that's already been closed as
*complete*, immediately followed by `<div style="display: contents;">`,
which is React's own internal wrapper for a Suspense boundary that has
already fallen back to client-only rendering. The original SSR output at
this same position is `<!--$--><!--$-->` (both of `entry-server.jsx`'s
two manually-nested boundaries, back-to-back, both complete, zero DOM
between — as documented in step 7 above). This means React's hydration
algorithm is not correctly matching the **inner** (nested) boundary's
markers against `DynamicToolPage`'s real inner `<Suspense>` — plausibly
because, now that the preload makes *both* the outer (`DynamicToolPage`
itself) and inner (`ToolComponent`) lazy chunks resolve essentially
synchronously before `hydrateRoot` is even called, React discovers the
inner boundary as part of a single synchronous resolution rather than
across a staged/async gap, and its marker-consumption for that scenario
does not correctly consume the second `<!--$-->`/`<!--/$-->` pair —
a different, deeper mechanism than either the original timing-race
theory or the initial "extra wrapper component" theory.

**Confirmed systemic, not `merge-pdf`-specific**: `/tools/split-pdf`
(also a `pdf-lib`-heavy tool, different component) — 5/5 FAIL, identical
`Minified React error #422`.

**Confirmed no regression on single-lazy-layer routes**: `/` (homepage,
routes.jsx's single `lazy$(<Home/>)` wrap, no nested inner Suspense) —
**10/10 PASS** with the preload fix active, same as before. The preload
mechanism itself works correctly; the remaining failure is specific to
the *nested*-Suspense-boundary shape unique to `/tools/:slug` routes
(`DynamicToolPage`'s own internal `<Suspense>` around `ToolComponent`).

**Status**: Option A's core mechanism (await lazy imports before
`hydrateRoot`) is validated as sound and does close the originally-
diagnosed timing race. It does not, by itself, clear tool pages, because
it has surfaced a second, previously-hidden bug specific to hydrating a
*nested* dehydrated Suspense boundary. This second bug needs its own
root-cause pass before tool pages can pass the validation ladder.
Validation ladder steps 2-5 not yet run to full completion pending this.
No further code changes made past this point — reporting before
proceeding further.

## B-lite (2026-07-17) — did not fix it; disproves the nested-boundary theory

Per owner direction, tried B-lite (smaller than full B) before full route
flattening: removed `DynamicToolPage.jsx`'s internal `<Suspense>` (tool
components now suspend up to `routes.jsx`'s route-level boundary
directly) and `entry-server.jsx`'s matching manually-added second nested
`<Suspense>` for tool routes — one boundary for `/tools/:slug`, same
shape as every other route. Kept Option A's preload exactly as-is.

- Build clean, 134 routes. Confirmed `dist/tools/merge-pdf/index.html`
  now emits exactly **1** boundary marker pair (was 2). Confirmed full
  content still present (steps/FAQ/limitation/author-box all intact —
  the boundary removal didn't drop any rendered output).
- `hydration-stress.js`, force-hydrate, `/tools/merge-pdf`, plain
  profile: **still 10/10 FAIL**, still `Minified React error #422`.

**This disproves the nested-boundary-marker theory from Option A's
implementation log.** Dev-mode splice against the B-lite build shows the
exact same warning at the exact same location:

    Warning: Expected server HTML to contain a matching <div> in <div>.
        at div
        at ToolPageShell (.../ToolPageShell.jsx:245:41)
        at MergePDF
        at div
        at ToolErrorBoundary
        at ChunkErrorBoundary
        at DynamicToolPage
        at Suspense          <- only ONE Suspense frame now, confirmed
        ...

A second structural DOM diff against the B-lite build shows *why* the
earlier diff was misleading: the `<div style="display: contents;">`
this batch attributed to "nested boundary marker mismatch" is actually
just **React's generic wrapper for any Suspense boundary that has
already fallen back to client rendering** — it appears identically with
a single boundary. It's evidence hydration failed, not the cause. Once
that's understood, the earlier diff's real information is just: some
child of `ToolPageShell` (the stack shows no further component between
`ToolPageShell` and the mismatch site) doesn't produce the same host DOM
on the client as `entry-server.jsx` produced during SSR — a genuine,
independent content/structure bug, not a Suspense-timing or Suspense-
shape issue at all. It was masked until now because the original #421
timing race always fired first and never let hydration walk deep enough
to reach it.

**Both Option A and B-lite are still correct, kept as-is** — they fixed
the bugs they targeted (the timing race; the redundant nested boundary
entry-server.jsx never needed once the client no longer has one). They
were necessary, just not sufficient. **Full B (flattening `/tools/:slug`
into per-slug routes) is not expected to help** — the evidence shows
this mismatch is unrelated to lazy-layering or Suspense structure at
all, so removing another layer of indirection wouldn't touch it.

**Not yet found**: the specific host-element difference inside
`ToolPageShell`'s (or a prop it receives — `about`, `steps`, `faqs`,
`guide`, `limitation`, `relatedTools`) rendered output between
`entry-server.jsx`'s SSR pass and the client's render. Spot-checked and
ruled out so far: `AdBanner` (confirmed empty in both SSR output and
current build, `ADS_ACTIVE` false both sides), `MergePDF`/`PDFDropZone`
(no module-scope or render-time browser-API reads, no conditional
structure keyed on anything environment-dependent). Stopping here per
instruction — reporting before further investigation.

## Direct comparison (2026-07-17) — prop and DOM diff both inconclusive; new lead found

Per owner direction, ran the two direct comparisons before any further
section-bisection:

1. **Prop comparison**: temporarily added a `console.log` at the top of
   `ToolPageShell`'s body (slug-gated to `merge-pdf`, reverted
   immediately after capturing both sides — confirmed `git diff` clean
   afterward), logging a normalized snapshot (name, description, icon,
   `steps.length`, `faqs.length`, `about` shape/keys, `limitation`,
   `guide` presence, `relatedTools` slugs). Captured via `npm run build`
   (server) and `hydration-diagnose.js` (client, dev-mode splice).
   **Byte-identical JSON on both sides**, every field, every run. Props
   are not the divergence.
2. **DOM diff**: built a one-off tree-walking differ (real browser DOM
   parser on both sides, not hand-rolled HTML parsing) comparing (a) the
   `<main>` subtree parsed from `dist/tools/merge-pdf/index.html`
   against (b) the same subtree from a clean, unhydrated client-only
   render (plain Vite dev server, no splice — `createRoot`, not
   `hydrateRoot`, so no hydration mechanics involved at all). Diffs tag,
   attributes, and trimmed text content, node by node, transparently
   collapsing React's `display:contents` recovery wrapper so it can't
   skew indices. **Result: `NO DIVERGENCE FOUND — trees are structurally
   identical.`** Final rendered output is pixel-for-pixel the same tree
   on both sides.

**Both explicitly inconclusive** — no prop difference, no rendered-DOM
difference. Whatever is wrong isn't "wrong content."

### New lead, found while building the above (not speculation — verified by re-reading both files)

`entry-server.jsx`'s tool-route loop renders `<Comp />` (i.e.
`<MergePDF/>`) **directly** as the route element — that's the entire
point of its "49 registered tool components — direct static imports"
approach (file header, `TOOL_PAGE_COMPONENTS`). It never goes through
`DynamicToolPage` at all. Server-side component tree for
`/tools/merge-pdf`: `<Suspense><MergePDF/></Suspense>` — nothing else.

Client-side (`routes.jsx` + `DynamicToolPage.jsx`, even after B-lite):
`<Suspense><DynamicToolPage/></Suspense>`, and `DynamicToolPage` itself
renders `<ChunkErrorBoundary><ToolErrorBoundary><MergePDF/></ToolErrorBoundary></ChunkErrorBoundary>`.
**Three component layers (`DynamicToolPage`, `ChunkErrorBoundary`,
`ToolErrorBoundary`) exist in the client's fiber tree with zero
server-side equivalent.** They render no host DOM themselves (pure
pass-through / class components returning `this.props.children`), which
is exactly why neither the prop check nor the DOM diff could catch
this — it's invisible to both. But it's a real, confirmed asymmetry in
component *identity*, not just content, and error boundaries in
particular have special hydration-related internal handling that a
plain functional wrapper wouldn't.

This is a concrete, narrow, easily-testable hypothesis — smaller and
more targeted than bisecting `ToolPageShell`'s ~480 lines of JSX.
Reporting before testing it or changing any code, per instruction.

## Stub test + root cause CONFIRMED, real fix implemented, full validation clean (2026-07-17)

Resumed after `/clear` from the "new lead" state (three client-only
component layers — `DynamicToolPage`, `ChunkErrorBoundary`,
`ToolErrorBoundary` — with no server-side equivalent).

**Stub test**: temporarily removed `ChunkErrorBoundary`/`ToolErrorBoundary`
from `DynamicToolPage.jsx` (rendering `<ToolComponent/>` directly).
**Result: 10/10 PASS on both `merge-pdf` and `split-pdf`** (were 10/10
FAIL). Confirmed and localized. Stub reverted immediately
(`git diff` clean).

**Actual root cause**: `ToolErrorBoundary.jsx`'s non-error render path
(line ~78) is:

```jsx
return (
  <div key={this.state.retryCount} style={{ display: 'contents' }}>
    {this.props.children}
  </div>
)
```

This is a **real host `<div>`**, not a pass-through — always rendered,
every load. `entry-server.jsx` never rendered `ToolErrorBoundary` at
all (renders the tool component directly, bypassing `DynamicToolPage`
entirely per its "direct static imports" design), so this div had zero
server-side counterpart. Deterministic `div`-in-`div` mismatch, on
every tool page, every time — exactly matching the observed 10/10
failure rate. `ChunkErrorBoundary` was never part of it (confirmed
pure pass-through, `return this.props.children`, no host DOM).

This also explains the earlier "inconclusive" DOM diff (§"Direct
comparison"): that diff tool explicitly special-cased and collapsed
`display:contents` divs, on the (wrong) assumption they were a
React-internal recovery artifact rather than real app-rendered content.
Built the exact blind spot into the tooling that the bug was hiding
in — a lesson for next time: don't special-case anything in a diff
tool without first confirming *where* the special-cased pattern
actually originates in the code.

**Real fix** (`entry-server.jsx`): wrapped the tool-route element in the
same `ChunkErrorBoundary`/`ToolErrorBoundary` the client uses, so both
sides produce identical DOM (and SSR gets the same error isolation the
client has, as a bonus — previously zero). Verified: `dist/` output now
contains the `display:contents` div; all tool-page content
(steps/FAQ/limitation/author-box) still intact.

### Full validation ladder — all clean

- Force-hydrate, plain profile, 10/10 each: `/tools/merge-pdf`,
  `/tools/split-pdf`, `/tools/pdf-editor` (3 heavy tool pages).
- Force-hydrate, 10/10 each: `/blog` index, 2 individual blog posts
  (`how-to-merge-pdf-files-for-free`,
  `income-tax-calculator-india-2026-old-vs-new-regime`) — direct check
  before extending the expansion to `/blog`, not just analogy to
  homepage.
- Force-hydrate, 10/10: `/` (homepage) and `/bmi-calculator/mumbai`
  (previously-flaky city page, batch 8b) — no regression.
- **Pre-expansion** full-site sweeps (confirms no regression from Option
  A / the error-boundary fix on the existing hydrate-safe route set):
  3× clean at `HYDRATION_SWEEP_CONCURRENCY=2`, 2× clean at
  `HYDRATION_SWEEP_CONCURRENCY=1` — 135/135 every run.
- `isHydrationSafe()` expanded (own commit, `da8de78`) — dropped both
  the `/tools/:slug` and `/blog` exclusions, function kept in place
  (now unconditionally `true`) rather than deleted, preserving it as an
  independently revertible safety valve per the standing rollback
  posture.
- **Post-expansion** full-site sweeps (real hydration now attempted on
  every tool page and blog post, not force-hydrate): 3× clean at
  concurrency=2, 2× clean at concurrency=1 — 135/135 every run.

**10 full-site sweeps total this validation round, zero failures.**
Every route category — home, tool category pages, static pages, city
pages, compare, faq, all 48 individual tool pages, blog index, all
blog posts — now hydrates via `hydrateRoot`, none on the `createRoot`
fallback.

### Bug (b) resolution

Bug (b) (intermittent homepage/`/tools/ai`/city-page failures from 5.6
and the batch-12 diagnostic) is resolved as a side effect of Option A's
preload fix — same `lazy()`-vs-hydration mechanism as bug (a), just a
single-layer, lower-probability version of it (per the "Comparison to
non-tool routes" hypothesis, now corroborated by 10/10 clean stress
runs plus 10/10 clean full sweeps with no analogous intermittent
failure recurring anywhere in this validation round). Bug (a)'s
`ToolErrorBoundary` div mismatch was a second, independent,
tool-page-specific bug layered on top — both now fixed.

**Status: DONE.** All plan success criteria met. Ready to push and open
a PR for owner QA.

## In-passing fix (owner-approved, tooling only)

`hydration-sweep.js` and `hydration-stress.js`'s
`HYDRATION_MISMATCH_PATTERNS` regex `/minified react error #41[0-9]/i`
only matches codes 410-419 (backlog entry, 2026-07-17). Widened to
match the set the adjacent comment always claimed to cover — 418, 419,
421, 422, 423, 425 — via `/minified react error #4(18|19|2[1235])/i`.
Test-tooling only, no behavior change to pass/fail verdicts (see
backlog entry for why).
