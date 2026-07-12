# Batch 2 — Primitive Components

**Branch:** `batch-2-primitives`

## Strategy (confirmed)

New files only, in `client/src/components/primitives/` — flat files
matching `ui/`'s convention (`Button.jsx`, not `Button/index.jsx`).
Nothing under `client/src/components/ui/` changes. `Button`, `Badge`,
`Container` exist in both folders under the same names — deliberate,
not an oversight; documented in `component-library.md` as a known
duplication pending a future adoption batch.

## What the reference files resolved

`docs/reference/awe-os-homepage.html` and
`docs/reference/tool-page-merge-pdf.html` share one design system almost
exactly (same `:root` tokens, same component patterns):

- **Chip vs Badge** — homepage's `.chip` (hero "✓ 100% browser-based"
  pills) and tool-page's `.badge` (tool-hero "✓ 100% free" pills) are two
  distinct, named classes, nearly identical in shape but different exact
  values. Implementing both faithfully as named in the reference CSS.
- **Ledger** — fully specified: dashed box, dotted row dividers, mono
  text, a `.zero`/highlight modifier that turns specific values mint
  (used for "0 — ever", "NO"). Exact markup and CSS in
  `awe-os-homepage.html`.
- **Callout** — two variants: the marigold "honest limitation" box
  (`tool-page-merge-pdf.html`'s `.callout`) and a mint "privacy promise"
  box (`awe-os-homepage.html`'s `.promise`) — same structural pattern,
  different token set. Built as one `Callout` component with
  `variant="warning" | "success"`.

## Token additions to `design-system/tokens.css`

Every value below is copied directly from the reference CSS, not
invented — Batch 1 was written from Blueprint prose, before these files
existed.

| Token | Value | Source |
|---|---|---|
| `--marigold-tint` | `#FEF3E2` | both files' `:root` |
| `--mint-tint` | `#E6F7F0` | both files' `:root` |
| `--mint-border` | `#BFE8D6` | `.promise`/`.local-note` border |
| `--mint-text-strong` | `#14543C` | `.promise p` color |
| `--marigold-border` | `#F5D9AE` | `.callout` border |
| `--marigold-text-strong` | `#7A4A08` | `.callout p` color |
| `--shadow-button` | `0 4px 14px rgba(39,66,214,.28)` | `.btn-primary` box-shadow |
| `--content-width` | `1120px` | `.wrap` max-width |
| `--content-width-narrow` | `760px` | `.narrow` max-width |
| `--space-section-mobile` | `52px` | `section` padding at ≤560px |
| `--radius-ledger` | `11px` | `.ledger` border-radius |
| `--radius-callout` | `12px` | `.callout` border-radius (`.promise` reuses existing `--radius-m`) |
| `--text-breadcrumb` | `0.82rem` | `.crumbs` font-size |
| `--text-ledger` | `0.78rem` | `.ledger` font-size |
| `--text-badge` | `0.7rem` | `.badge` font-size (Chip's `.74rem` already equals existing `--text-caption` — reused, no new token) |
| `--btn-padding-y` / `-x` | `11px` / `22px` | `.btn` padding |
| `--btn-padding-y-compact` / `-x-compact` | `9px` / `18px` | header nav button's inline override |

19 additions, all additive (new custom properties only, same
non-destructive pattern as Batch 1). `tailwind.config.js`'s
`theme.extend` gets matching entries (e.g. `bg-marigold-tint`,
`rounded-ledger`, `shadow-button`) so components consume clean utility
classes instead of arbitrary-value soup — same mechanism Batch 1 already
set up for the original token set.

**Deliberate deviation from the reference files:** both use a global bare
`:focus-visible{outline:3px solid var(--cobalt);...}` rule. Not adding
that globally — `globals.css` is already imported on all 129 routes, and
a global rule would visibly change keyboard-focus rendering everywhere
today, breaking this batch's inertness requirement. The focus ring lives
scoped to the new `Button` component only (`focus-visible:outline-[3px]
focus-visible:outline-cobalt`, Tailwind arbitrary value, no new token —
single-use). Site-wide adoption of the real focus rule is future work
once existing interactive elements are ready for it; logged in
`docs/backlog.md`.

## Components (8, per playbook)

| Component | Key spec |
|---|---|
| **Button** | primary (cobalt fill, `--shadow-button`, hover → cobalt-deep + `-translate-y-px`) and ghost (transparent, `--border-standard`, hover → ink-soft border) only. `size="default" \| "compact"`. |
| **Chip** | pill, card bg, `--border-standard`, `--text-caption`, `--ink-soft` text, `<strong>` slot styled mint. Matches `.chip`. |
| **Badge** | pill, same shape as Chip, `--text-badge` (0.7rem), `<b>` slot styled mint. Matches `.badge`. |
| **Ledger** | dashed box (`--border-ledger`, `--radius-ledger`), mono rows with dotted dividers, `rows: [{label, value, highlight?}]` — `highlight` renders mint per the `.zero` pattern. |
| **Callout** | `variant="warning" \| "success"`, tinted box + border + strong-colored text per variant's token set above. |
| **Breadcrumb** | `nav[aria-label="Breadcrumb"]`, `items: [{label, href?}]`, last item without `href` renders as `<strong>` (current page), `/` separators in `--line` color. |
| **Section** | padding wrapper, `--space-8` (72px) desktop / `--space-section-mobile` (52px) at ≤560px. Scoped React component (className-based), not a global bare `section{}` selector — avoids the App.css collision risk Batch 1 already sidestepped for `body`/`h1`/`p` (confirmed no existing `section` rule in App.css, but scoping stays the safer choice regardless). |
| **Container** | `size="default"` (`--content-width`, 1120px) / `"narrow"` (`--content-width-narrow`, 760px), both centered, `--space-5` (24px) side padding. |

All eight are pure presentational components, no `window`/`document`/
`localStorage` reads — SSR-safe by construction, no effects needed.

## `docs/component-library.md` (new file)

One section per component: purpose, file path, props table, a usage
snippet, and the Blueprint/reference-file citation it's built from.
Flags the `ui/` naming overlap explicitly.

## Verification — inertness on all 129 routes

- Grep check: confirm zero files outside `primitives/`,
  `component-library.md`, `tokens.css`, and `tailwind.config.js` are
  touched, and zero existing files import from `primitives/`.
- `npm run build` before/after: HTML output must be 100% byte-identical
  across all 129 routes — nothing imports the new files, so no rendered
  markup or JS bundle can change.
- Caveat: the compiled CSS asset's bytes *will* change — `tokens.css`
  gains new custom properties, and Tailwind's JIT scanner reads file
  *text* (not the import graph) across `./src/**/*.{jsx,tsx}`, so utility
  classes referenced inside the new unimported primitive files still get
  compiled into the shared CSS bundle. Zero visual effect (no DOM
  references the new classes), but stating it upfront rather than
  claiming a false zero-diff.
- Manual visual check during implementation: temporarily render each
  primitive in a scratch/dev-only spot to eyeball against the reference
  HTML, then revert that wiring before committing.

## Not in scope

- No Header/Footer/Cards/pages (later batches).
- No adoption of primitives by existing pages.
- No new npm dependencies.
