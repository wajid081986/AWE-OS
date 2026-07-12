# Batch 1B — Hide ad placeholder rendering on all public pages

**Branch:** `batch-1b-hide-ad-placeholders`

## Scope

When no approved publisher/ad configuration is active
(`VITE_ADSENSE_PUBLISHER_ID` unset), `AdBanner`/`AdContainer`/`LazyAdSlot`
must render nothing at all — no dashed box, no "Advertisement" label, no
reserved empty space. Components, `ads.txt`, and the slot architecture are
NOT deleted (Blueprint §24 reserves them for post-approval). Smallest
possible change.

## Root cause

Two independent places render placeholder markup even when
`VITE_ADSENSE_PUBLISHER_ID` is unset:

1. `AdBanner.jsx` — when `PUB_ID` is falsy, renders a dashed-border box +
   "Advertisement" label (its own fallback branch).
2. `LazyAdSlot.jsx` — renders `AdPlaceholder.jsx` (gray reserved-space box
   + label) while waiting for the intersection observer to fire,
   regardless of whether an ad is configured. `AdContainer.jsx` and
   `ToolLayout`/`ToolSidebar`/`CategoryPage`/`Home`/`ToolsPage`/
   `ToolDetailPage` all go through this path.

Direct `<AdBanner>` usage (not via `AdContainer`) also exists in
`ToolPageShell.jsx` (3 call sites — used by all individual tool pages) and
`ResumePage.jsx` (2 call sites, client-only SPA route `/tools/resume`,
excluded from SSG).

Additional finding: in `ResumePage.jsx`, the ad sits in
`<aside className="sidebar-ad">`, and `App.css` sets
`.sidebar-ad { width: 160px; flex-shrink: 0; }`. Even after `AdBanner`
returns `null`, that `<aside>` would still reserve 160px of width. This is
the one place a wrapper — not just the ad component — needs a guard.

## Changes (4 files)

1. **`client/src/adsense.config.js`** — add
   `export const ADS_ACTIVE = Boolean(ADSENSE_CONFIG.publisherId)` as the
   single shared source of truth.
2. **`client/src/components/AdBanner.jsx`** — add
   `if (!ADS_ACTIVE) return null` as the first line of `AdBanner`, before
   the "Advertisement" label; remove the now-dead placeholder-box branch.
3. **`client/src/components/ads/LazyAdSlot.jsx`** — add
   `if (!ADS_ACTIVE) return null` as the first line, before the
   ref/observer setup, so `AdPlaceholder` is never mounted and no observer
   is created.
4. **`client/src/modules/tools/resume/pages/ResumePage.jsx`** — wrap the
   sidebar `<aside className="sidebar-ad">` in `{ADS_ACTIVE && (...)}` so
   the 160px-reserving wrapper itself disappears too.

Not touched: `AdPlaceholder.jsx`, `AdContainer.jsx`, `ads/index.js`,
`ads.txt`, slot config — architecture stays intact for post-approval flip.

## Flip-path requirement

Activation after AdSense approval must be exactly one env var
(`VITE_ADSENSE_PUBLISHER_ID`) with zero code changes. `ADS_ACTIVE` is
derived from `ADSENSE_CONFIG.publisherId`, which is populated by that env
var at build time — setting it flips `ADS_ACTIVE` to `true` everywhere
with no further edits.

## Verification

- `npm run build` (in `client/`) with no `VITE_ADSENSE_PUBLISHER_ID` set —
  confirms no build errors.
- Diff `dist/` HTML output against a `main`-branch build to confirm: ad
  markup (`Advertisement` label, dashed/gray boxes, `sidebar-ad` aside) is
  gone; everything else byte-identical.
- Every route whose HTML changes is listed in the batch report.
- `/tools/resume` is SPA-only (excluded from SSG per
  `entry-server.jsx`'s explicit exclusion list) — verified by code
  inspection, not the build diff.
- Internal `/app/*` routes are untouched (they don't use these
  components).
