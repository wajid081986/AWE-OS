# Batch 37 — PdfEditorV2 Phase 7: Page Management

Continues the Phase 7-11 roadmap approved in conversation on 2026-07-30
(audit + plan discussed live, not written to a separate roadmap doc since
the 5 phases map 1:1 to batches 37-41). Owner authorized "auto mode" for
the full 37→41 sequence — batch-to-batch chaining proceeds without a
stop-and-wait per phase, but CLAUDE.md §5's no-new-dependency-without-
approval rule still applies independently and will still pause for a
decision if triggered.

## Discovery that changed the plan mid-flight

Standalone tools already exist for most of Phase 7-9's asks — `OrganizePDF.jsx`
(reorder via up/down + delete, using `pdf-lib` `copyPages`), `ProtectPDF.jsx`
(`pdf.encrypt()` — confirms pdf-lib DOES support encryption in this version,
so Phase 9 password protect needs no new dependency), `UnlockPDF.jsx`
(`PDFDocument.load(buf, { password })`), `WatermarkPDF.jsx`, `PageNumbersPDF.jsx`.
These are separate single-purpose tool pages; the gap this roadmap actually
fills is bringing the same pdf-lib operations into the interactive
PdfEditorV2 canvas/toolbar (Soda-PDF-style single workspace), not inventing
new PDF manipulation logic. Batch 37-40 port proven patterns from these
existing tools rather than writing new ones from scratch.

## Phase 7 scope (this batch)

Insert blank page, duplicate page, delete page, move up/down, drag-drop
reorder, extract selected pages, split at a page boundary — all from the
`PagePanel.jsx` thumbnail rail.

### New files

- `usePageManager.js` — owns a `pageOrder` array of
  `{ key, kind: 'existing'|'blank', srcIndex? }`, one entry per currently
  displayed page, `key` stable across ops (so annotations can be remapped
  by following the same key, not by position). Actions: `insertBlankPage`,
  `duplicatePage`, `deletePage`, `movePage(from,to)` (used by both the
  up/down buttons and drag-drop), `extractPages(positions)`,
  `splitAt(position)`. Every mutating action calls a shared `rebuild()`:
  loads a fresh `PDFDocument` from `originalBytesRef.current` (the
  pristine source — duplicating always copies from original content, so
  repeated duplicates don't compound), builds a new `PDFDocument` by
  walking `pageOrder` (`copyPages` for `existing` entries, `addPage()` for
  `blank`), saves it, updates `originalBytesRef.current`, and calls
  `pdfDoc.loadFromBytes()` to reload pdf.js. Extract/split build a
  separate one-off `PDFDocument` and trigger `downloadFile()` directly —
  they don't touch the live editor state.
- `ConfirmModal.jsx` — generic yes/no modal (same fixed-overlay idiom as
  `AiConsentModal.jsx`), used for delete-page and split confirmations.

### Modified

- `useAnnotations.js` — new `remapPages(mapFn)`: applies `mapFn(oldPage) ->
  newPage|null` to every annotation, drops annotations whose new page is
  `null` (deleted pages), clears the undo/redo stack (old undo closures
  reference now-stale page numbers — unsafe to keep). `index.jsx` shows a
  toast noting undo history was cleared when this fires.
- `PagePanel.jsx` — per-thumbnail hover action row (insert above/below,
  duplicate, delete, move up/down), a checkbox per thumbnail for
  multi-select (drives Extract), native HTML5 drag-and-drop reorder on the
  thumbnails, and a small header bar with "Extract selected" / "Split
  after this page" actions.
- `index.jsx` — wires `usePageManager`; after any rebuild, computes the
  old-position → new-position map from `pageOrder` before/after and calls
  `annotationsApi.remapPages()`; duplicate additionally clones the source
  page's annotations onto the new page (matches user expectation that
  "duplicate" duplicates what's on the page, not just blank source
  content); re-runs `formFieldsApi.detect()` on the rebuilt bytes and
  reapplies any in-progress `values` the user had already typed (detect()
  itself always resets values from the fresh document's own defaults,
  which would otherwise silently wipe unsaved form input); guards
  `activePage` back into range if it now exceeds the new page count; wraps
  page-delete in the new `ConfirmModal` when the page holds ≥1 annotation.

### Explicit scoping calls (flagging, not asking — matches the "auto
mode" authorization; would stop and ask if these turned out to need a new
dependency, which they don't)

- Page-management ops do **not** enter the Ctrl+Z undo stack — same
  reasoning as annotations losing their undo history on a rebuild: a
  document-structure snapshot per op is a different (heavier) kind of
  undo than the existing annotation-diff based one, and mixing them risks
  a corrupted state. Destructive ops get a confirm dialog instead.
- Deleting the last remaining page is blocked (`pageOrder.length > 1`
  guard), matching `OrganizePDF.jsx`'s existing "at least one page must
  remain" rule.
- Blank page size defaults to the current page 1's size (`page.getSize()`
  of whichever `pageOrder` entry currently sits at position 1), not a
  hardcoded A4/Letter — matches the visual page it's being inserted next
  to in the common case.

## Risk

Annotation/form-field remapping across a rebuild is the main correctness
risk — needs a live QA pass (insert/duplicate/delete/reorder each with
annotations present, verify they land on the correct resulting page)
before this is considered done, not just build-clean.
