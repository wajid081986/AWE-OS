# Batch 40 — PdfEditorV2 Phase 10: View (Fit Width, Two-Page)

Continues the auto-mode 37→41 sequence (see `batch-37-plan.md`). No new
dependency — pure layout/state work on top of the existing zoom and
page-rendering machinery in `index.jsx`/`PageCanvas.jsx`.

## Scope

1. **Fit Width button** — an explicit toolbar action that recomputes zoom
   to fit the viewer column, reusing the exact math the existing "default
   zoom on load" effect already computes, instead of that being the only
   way to get back to a fit-to-width zoom (right now, only re-uploading or
   toggling fullscreen re-triggers it).
2. **Two-page (spread) view** — a view-mode toggle that lays out pages two
   at a time, side by side, instead of the current single vertical column.

## Modified

- `index.jsx`:
  - The existing fit-to-width `useEffect` (computes `fitZoom` from
    `viewerRef`'s `clientWidth` and page 1's native viewport width) has its
    computation pulled out into a plain `computeFitWidth()` helper the
    effect now calls; a new `handleFitWidth` callback calls the same
    helper on demand and `setZoom` — no behavior change to the existing
    auto-fit-on-load/fullscreen-toggle effect, just exposing it as a
    button too. Two-page mode fits *two* page widths plus the gap between
    them, so `computeFitWidth` takes a `pagesPerRow` argument.
  - New `viewMode` state (`'single' | 'two-page'`), toggle button in
    Toolbar. The page-rendering loop (currently one flat `.map` over
    `pdfDoc.pageCount` inside the scrollable viewer div) is restructured to
    group page numbers into chunks of `viewMode === 'two-page' ? 2 : 1`
    and render each chunk as a flex row — every page keeps its existing
    `id="pdf-editor-page-N"` wrapper div and its own `PageCanvas`
    instance, so `jumpToPage`'s scroll-to-element logic and Find & Replace/
    AI tools' page-number references need zero changes.
  - `computeFitWidth`/the effect re-run when `viewMode` changes (same
    dependency-array shape as the existing `isFullscreen` re-fit), so
    switching into two-page view immediately re-fits rather than leaving
    whatever zoom was set for single-page view, which would either overflow
    or look tiny depending on direction.
- `Toolbar.jsx` — "Fit Width" button next to the zoom −/+ controls; a
  two-button toggle (single-page icon `📄` / two-page icon `📑`) for
  `viewMode`, placed next to it.

## Scoping calls

- Two-page mode does not attempt a "book" cover-page offset (page 1 alone,
  then 2-3, 4-5, ...) — plain sequential pairing (1-2, 3-4, ...), matching
  how the existing single-column view has no page-1-special-cased layout
  either. Flagging as a possible follow-up in `docs/backlog.md`, not
  building it now since it wasn't asked for.
- An odd final page in two-page mode renders alone in its row (the chunk
  loop naturally produces a 1-length last chunk) rather than reserving
  blank space next to it.
- No persistence of `viewMode`/zoom across a file reload — matches the
  existing zoom's own behavior (resets via the fit-to-width effect
  whenever a new file loads).

## Risk

Low — this is additive layout/state, no document-mutation path touches
it. Verify by loading a multi-page PDF, confirming Fit Width recovers a
sane zoom after manually zooming in/out, and confirming two-page mode
renders pairs correctly with annotations still landing on the correct
page after switching view modes.
