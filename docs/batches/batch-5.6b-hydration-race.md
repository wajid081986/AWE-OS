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

_(filled in as work proceeds)_
