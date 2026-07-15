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
