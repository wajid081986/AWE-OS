# Batch 1C — env-var-only AdSense activation (index.html shell)

**Branch:** `batch-1c-adsense-loader-envvar`

## Scope

`client/index.html` has two AdSense loader `<script>` blocks that are
inert only because they're wrapped in HTML comments. Turning ads on today
means hand-editing this file to uncomment one block — which bypasses the
single-env-var (`VITE_ADSENSE_PUBLISHER_ID`) flip that
`AdBanner`/`LazyAdSlot` already honor via `ADS_ACTIVE` (Batch 1B). Batch
1C makes the loader script obey that same flag, so there is exactly one
activation mechanism site-wide, and removes the stale manual-comment
toggle (including a real-looking publisher ID, `ca-pub-9932827285389290`,
sitting inert in committed source).

## Correction to Batch 1B's backlog entry

Batch 1B's report and `docs/backlog.md` claimed this script "loads
unconditionally on every route." That was wrong — verified on production
(`www.awe-os.com`) on 2026-07-12 that both blocks are fully wrapped in
`<!-- -->` and never parsed or fetched by the browser. The real problem
isn't unwanted loading; it's that activation requires a manual file edit
instead of the env-var flip. `docs/backlog.md` is corrected as part of
this batch's first commit.

## Changes (2 files)

1. **`client/index.html`** — delete both commented AdSense blocks (the
   banner comment, the `ca-pub-XXXXXXXXXXXXXXXX` placeholder block, and
   the `ca-pub-9932827285389290` block). Nothing replaces them here — the
   shell stops mentioning AdSense entirely.
2. **`client/src/main.jsx`** — after mount, if `ADS_ACTIVE` (imported
   from `../adsense.config`), inject the AdSense loader
   `<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}" async crossorigin="anonymous">`
   into `document.head` once. Runs client-side only (`main.jsx` is never
   imported by `entry-server.jsx`, so SSR stays untouched) — same pattern
   `AdSlot` (in `AdBanner.jsx`) already uses for
   `window.adsbygoogle.push()`.

## Flip-path check

`ADS_ACTIVE` remains the single source of truth. Setting
`VITE_ADSENSE_PUBLISHER_ID` at build time makes `ADS_ACTIVE` true, which
simultaneously: (a) lets `AdBanner`/`LazyAdSlot` render real ad units, and
(b) injects the loader script that makes those units actually request
ads. Unsetting it removes both — zero code changes either direction.

## Not in scope

- No change to `AdBanner.jsx`, `LazyAdSlot.jsx`, `AdContainer.jsx`,
  `AdPlaceholder.jsx` — Batch 1B's guards stay as-is.
- No change to `ads.txt` or slot config.

## Verification

- `npm run build` with `VITE_ADSENSE_PUBLISHER_ID` unset: confirm no
  `<script>` referencing `adsbygoogle.js` appears anywhere in `dist/`.
- `npm run dev` with `VITE_ADSENSE_PUBLISHER_ID` set to a test value:
  manually inspect `document.head` in a real browser to confirm the
  loader script is injected (build-output diffing alone can't verify a
  runtime DOM mutation).
- Diff `dist/` against Batch 1B's baseline: expect zero HTML byte
  differences (this change only touches the static shell markup and a
  browser-only runtime script, not any SSG-rendered output).
