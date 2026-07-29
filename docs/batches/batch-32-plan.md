# Batch 32 — PDF Editor: Real Dark Theme (Ribbon + Right Panel)

## Context

Deferred from batch-31 (`docs/backlog.md`, 2026-07-29 entry): `darkCanvas`
only ever recolored the canvas backdrop. Extending it to the ribbon and
right properties panel was judged too risky to ship blind — dozens of
nested components with their own explicit Tailwind color classes, and no
way to visually verify legibility without a browser. That gap is now
closed: a working Playwright rig (built during the manual QA pass that
shipped batches 23-31) lets this batch actually be screenshotted and
inspected in both light and dark mode before it's considered done.

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`, no new deps

No new styling approach — matches this file's existing convention of
explicit `darkCanvas ? 'x' : 'y'` ternaries (already used for the canvas
backdrop) and existing prop-drilling of `darkCanvas` into `ToolBtn`,
rather than introducing Tailwind's `dark:` variant (unused anywhere in
this codebase) or a new Context.

### What goes dark

`topBar`/`sidebar` are already dark (`#1f2937`/`#111827`) — untouched.

1. **Ribbon tab bar** (Home/Annotate/Draw/.../View) — background +
   active/inactive text colors.
2. **Tool ribbon** (tool buttons under the active tab) — background,
   `ToolBtn`'s text/hover/active colors, `DisabledToolButton`'s styling.
3. **Right properties panel** — container background/border, and every
   state: empty-state instructions + shortcuts list, tool-active header,
   `PropSection` labels, `WidthPicker`, `FontControls`, `ShapeControls`,
   selected-annotation-actions buttons, page-number panel.
4. **`ColorGrid`/`HL_COLORS`/`STAMP_COLS` swatches left untouched** —
   already render true colors via inline `style={{background:c}}`, not
   Tailwind classes; only their surrounding labels/containers change.

### Explicitly out of scope

- Modals (Signature/Watermark/Header-Footer/Password/Download-Range/
  Split/Shortcuts/Extract-Text) and the Find bar/History panel floating
  overlays stay light-themed — self-contained dialogs layered on top of
  everything, and the original deferred item only scoped ribbon + right
  panel.
- Left sidebar and top bar — already dark, no changes.

### Palette

Reuses existing dark tones already in this file: `#1f2937` (matches
`topBar`) for ribbon areas, `#111827` (matches `sidebar`) for the right
panel, light grays (`#e5e7eb`/`#9ca3af`) for text, low-opacity white
borders in place of `border-gray-200`/`border-gray-100`.

## Verification

- `npm run build` — must stay clean.
- Live Playwright screenshots in both light and dark mode: ribbon with a
  tool active, right panel showing tool-prep controls (font/shape),
  right panel showing a selected annotation, and the empty-state panel —
  visually inspected for actual legibility, not just class-name review.
