# Batch 25 — PDF Editor Phase 2: Page Management

## Context

Batches 23 (Phase 0 bug fixes) and 24 (Phase 1 font/opacity/signature reuse)
are done. This batch implements the two Phase 2 features from the original
audit: drag-and-drop thumbnail reorder, and real Split PDF / multi-range
Extract-to-new-PDF.

## Scope

### Files
- `client/src/pages/tools/pdf/PdfEditor.jsx` — both features
- No new npm dependency: `jszip` is already installed and used by 3 other
  tool pages (`SplitPDF.jsx`, `PDFtoJPG.jsx`, `PDFtoPPT.jsx`) — importing it
  into `PdfEditor.jsx` doesn't need separate approval.

### 1. Drag-and-drop thumbnail reorder

The sidebar thumbnail list (~line 1923, `pageOrder.map((pi,di)=>...)`)
currently only reorders via the discrete Move Up/Down ribbon buttons.

- `draggable` on each thumbnail div, `onDragStart` stores the dragged
  display-index in a ref, `onDragOver` (`preventDefault` to allow
  dropping), `onDrop` calls a new `reorderPage(from, to)`.
- `reorderPage`: `pushHistory()`, splices the page out of `pageOrder` and
  reinserts it at the drop position, sets `currentPage` to the new
  position — reuses the same undo/history mechanism batch-23 built, so
  drag-reorder is undoable.
- Light visual feedback (drop-target ring) while dragging — native
  browser HTML5 DnD API, no new dependency.

### 2. Real Split PDF + multi-range Extract (combined into one feature)

Mirrors the 3-mode picker the existing standalone `SplitPDF.jsx` tool
already uses: **Split into individual pages**, **Split by ranges**
(semicolon-separated, one output file per range), **Extract specific
pages** (comma/range list → one combined output file — this *is* the
"multi-range Extract-to-new-PDF" item from the original audit, so no
separate modal is needed for it).

- New `SplitModal` component (radio-button mode picker + range/pages text
  input, matching `SplitPDF.jsx`'s interaction pattern).
- Key difference from the standalone tool: instead of re-loading the raw
  uploaded file, this reuses the Editor's own `buildDoc(diRange)` (already
  built in batch-23/24) per output group — so split/extracted files
  include whatever annotations, rotations, and page reordering already
  exist in this editing session, not just the original upload.
- Import `parsePageRanges` from `pdfUtils.js` (already exists, currently
  unused by `PdfEditor.jsx`) to parse the range/pages input, same as
  `SplitPDF.jsx`.
- Results are zipped via `JSZip` and downloaded as one `.zip` (matching
  `SplitPDF.jsx`'s convention), with per-file names following the existing
  `${downloadName}-...` pattern already used elsewhere in this file.
- Embed failures across all generated files are aggregated and surfaced
  via the existing `warnIfEmbedFailures` toast (from batch-23) — no
  silent drops.
- New ribbon entry in the "Pages" tab, `_pg-split` → act `pg-split` →
  opens the modal. The existing single-page "Extract" button stays as-is
  (fast path for the common case); this is additive.

## Out of scope

- Insert-blank-page/duplicate/move via drag — this batch only adds page
  *reordering* via drag, not other page ops.
- Touch-based drag reordering (HTML5 DnD is desktop-mouse-oriented;
  touch/pinch support was already scoped separately as a later phase in
  the original audit).

## Verification

- `npm run build` — must stay clean.
- Manual browser test (no browser-automation tool available to the
  assistant in this environment — needs a human pass): drag a thumbnail to
  a new position, confirm the page order updates and Undo reverts it in
  one step; run each of the 3 split modes on a document with existing
  annotations/rotations, confirm the downloaded zip's PDFs reflect those
  edits.
