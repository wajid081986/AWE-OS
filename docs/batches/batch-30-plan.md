# Batch 30 — PDF Editor Phase 5c: Accessibility Pass

## Context

Batches 23-28 covered Phases 0-4 and Phase 5a. This batch implements
Phase 5c, deferred from batch-28's planning: an accessibility pass on
`PdfEditor.jsx` (aria-labels, keyboard path for annotations, accessible
canvas fallback).

## Correction to the original (batch-23) audit's framing

There is no `eslint-plugin-jsx-a11y`, no ESLint config at all, and no
`axe-core`/`jest-axe`/`pa11y` anywhere in this repo — confirmed via
search (none in `package.json`, no config files, no matches repo-wide
outside `node_modules`). `docs/reference/architecture.md` §11
*describes* these as intended CI gates, but they aren't actually wired
up, and even if they were, that blueprint scopes axe checks to "the five
template pages" (homepage/category/tool-template/policy), not the
interactive internals of a specific tool like the PDF Editor. This batch
is a genuine, worthwhile accessibility improvement for real keyboard/
screen-reader users — it does not unblock a currently-failing CI check.

Also correcting one specific claim from the original audit: ribbon tool
buttons (`ToolBtn`) already render visible text labels below their icons
(confirmed by reading the component) — they are not icon-only and don't
need `aria-label` for the "buttons must have discernible text" rule.
The real gaps are elsewhere (see below).

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`

### 1. `aria-label` on genuinely icon-only controls

Top-bar icon buttons (Undo/Redo/History/Fullscreen/Shortcuts/Zoom in-out/
prev-next page — currently `title` only), every modal's "✕" close button
(~9 modals), `ResizeHandles`' delete button plus the line/arrow/polyline
annotation types' own inline delete buttons, sidebar thumbnail hover
rotate/delete buttons, `ColorGrid` swatches (pure color squares, no text
today — also adding `aria-pressed` for the currently-selected swatch),
the saved-signature "✕" in `SignatureModal`, and the Find bar's
prev/next/close buttons.

### 2. Keyboard path for annotations (select → move → delete)

- Every `AnnotationEl` branch gets `tabIndex={0}` (reachable via Tab in
  DOM order) and `role="button"` with an `aria-label` describing the
  type (e.g. "Text annotation").
- `Enter`/`Space` while focused calls the existing `onSelect()` — same
  selection path a mouse click already uses.
- Arrow keys while selected nudge the annotation's position via a new
  `onNudge(dx, dy)` prop → `updateAnn`, pushed as one undo step
  (`pushHistory('Move annotation')`, reusing batch-28's labeled
  history).
- Delete/Backspace already works today once `selectedId` is set (a
  pre-existing global handler) — reachable via keyboard for the first
  time once Tab+Enter can set selection.
- **Explicitly out of scope**: keyboard-driven *resize*. Move+select+
  delete covers the core "can a keyboard-only user actually use this"
  bar; resize would need per-corner-handle equivalents for less
  accessibility payoff. Flagged as a follow-up, not fixed here.

### 3. Accessible canvas fallback

Each page's `<canvas>` gets `role="img"` and `aria-label="Page N of M"`
so screen readers announce something instead of nothing.

## Honest disclosure on verification

This is a large sweep (~25-30 individual attribute additions across many
components) but each change is small, mechanical, and additive — no
logic changes to existing mouse-driven behavior. Build + code review can
confirm syntactic correctness and that props/handlers are wired
consistently, but there is no way to test actual screen-reader
announcement quality, tab-order correctness, or focus-visible styling
without a browser and assistive tech — more than any prior batch, this
needs a real human pass.

## Verification

- `npm run build` — must stay clean.
- Manual test (human required): Tab through the page with a keyboard
  only, confirm an annotation can be reached and selected, nudged with
  arrow keys, and deleted with Delete — all without touching the mouse.
  Ideally spot-check a few buttons with a screen reader (VoiceOver/NVDA).
