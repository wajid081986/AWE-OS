# Batch 28 — PDF Editor Phase 5a: History Panel, Shortcuts, Zoom-to-Selection, Fullscreen

## Context

Batches 23-27 (Phases 0-4) are done. Phase 5 in the original audit bundles
9 fairly different items — some safe/additive UI polish, some
architecturally risky (virtualization, Web Worker export, touch gestures)
that can't be verified without a real browser/device. Splitting into 3
batches by risk rather than implementing all 9 blind:

- **Batch 28 (this one)**: history panel, shortcuts modal,
  zoom-to-selection, fullscreen mode — additive, self-contained, no
  existing-styling-correctness risk.
- **Batch 29 (deferred)**: virtualized rendering, Web Worker export,
  touch/pinch-zoom, real dark theme extension — each needs real
  browser/device verification before merging; a wrong implementation
  risks breaking core functionality (export) or shipping something
  visibly broken (illegible dark-mode text, broken virtualization) that
  can't be caught without visual testing.
- **Batch 30 (deferred)**: accessibility pass (aria-labels sweep,
  keyboard path for annotation select/delete, accessible canvas
  fallback) — broad enough to deserve its own focused batch.

Note on dark theme specifically: `topBar`/`sidebar` are already dark
(`#1f2937`/`#111827` in the `C` colors constant) — only the ribbon and
right properties panel are light. Extending it properly means checking
text/border contrast on dozens of nested `PropSection`/`ColorGrid`/
`WidthPicker` instances; doing it shallow risks illegible dark-gray-on-
dark-gray text that can't be caught without a browser. Moved to batch 29.

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`

### 1. Undo/redo history panel

- `pushHistory()` gets a `label` parameter (default `'Edit'`), threaded
  through all ~15 existing call sites (e.g. `pushHistory('Add text')`,
  `pushHistory('Rotate page')`, `pushHistory('Reorder pages')`) —
  mechanical sweep, same style as batch-23's `pushHistory(annotations)` →
  `pushHistory()` change.
- New `jumpToHistoryIndex(i)` / `jumpToFutureIndex(i)` functions let a
  click on any history entry jump straight there. Array-splicing math for
  correctly repositioning `past`/`future` was hand-derived and verified
  against worked examples before writing the implementation (easy to
  subtly corrupt undo/redo ordering otherwise):
  - Jump back to `past[i]`: `newPast = past.slice(0,i)`,
    `newFuture = [...past.slice(i+1), currentSnapshot, ...future]`.
  - Jump forward to `future[i]`: `newFuture = future.slice(i+1)`,
    `newPast = [...past, currentSnapshot, ...future.slice(0,i)]`.
- New toggle button near Undo/Redo in the top bar opens a dropdown
  listing the last 20 past actions (newest first) plus available redos.

### 2. Keyboard shortcuts modal

Static reference listing shortcuts that already exist (V/H/T/I/U/D/E/N/
A/R/W/S tool keys, Ctrl+Z/Y/C/V/D, Delete, Escape, `[`/`]`, +/-, Ctrl+S),
opened via a new `?` button in the top bar.

### 3. Zoom-to-selection

New button in the existing "Selected annotation actions" panel; computes
a zoom level fitting the selected annotation's bounding box in the
visible canvas area, then scrolls to it.

### 4. Fullscreen mode

New top-bar button using the Fullscreen API on the editor's own root
container (not the whole page), with a `fullscreenchange` listener to
keep the icon in sync. Escape exiting fullscreen is native browser
behavior, no extra code needed.

## Verification

- `npm run build` — must stay clean.
- Manual browser test (no browser-automation tool available to the
  assistant in this environment — needs a human pass): open the history
  panel after several actions, click an older entry, confirm it jumps
  there and Redo correctly replays forward; open the shortcuts modal;
  select an annotation and use zoom-to-selection; toggle fullscreen and
  confirm Escape exits it.
