# Batch 23 — PDF Editor Phase 0: Critical Bug Fixes

## Context

A full audit of the PDF Editor (`PdfEditor.jsx` + supporting files) found the
root causes of three user-reported bugs plus several other confirmed defects
in the undo/history system and export path. This batch fixes all of them.
Phase 1 (font/opacity controls on selected annotations, signature
save-for-reuse) is a separate, subsequent batch — not started here.

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`

1. **Click-blocking overlay fix** (line ~1920): the full-page tool-capture
   div's active z-index drops from `20` to `1` — below every `AnnotationEl`
   (z-index 5 unselected / 15 selected). Existing annotations now always win
   the hit-test for clicks landing on them; empty canvas area is unaffected.
   Root cause of both "Edit Text textbox not focusable" and "X button not
   closing annotations" — whenever any tool stayed armed (e.g. re-selecting
   Edit Text for a second region), this invisible layer sat above every
   annotation and swallowed clicks meant for them.
   - Known trade-off: dragging a new annotation exactly on top of an old one
     will now select the old one instead of starting a new draw — intended,
     per the requirement that existing annotations get click priority.

2. **Escape closes modals** (line 1247): extend the handler to also call
   `setWmOpen(false); setHfOpen(false); setPwdOpen(false); setSigOpen(false);
   setExtractOpen(false); setDlRangeOpen(false)`. Root cause of "Esc/Cancel
   not working" — the Escape handler already deselected annotations/tools
   correctly, but never closed the Watermark/Header-Footer/Password/
   Signature/Extract-Text/Download-Range modals, which previously only had
   a click-target "✕"/"Cancel" button.

3. **B1 — textarea reselect on click** (lines 635, 657, 669: text/typewriter,
   note, callout textareas): change `onMouseDown={e=>e.stopPropagation()}`
   to `onMouseDown={e=>{e.stopPropagation(); onSelect()}}` so clicking back
   into an already-placed box re-confirms selection without starting a drag.

4. **B3 — Edit Text undo granularity**: add an `addAnns(pi, annsArray)`
   helper that calls `pushHistory()` once and adds all annotations in a
   single `setAnnotations` call. Rewire the `edit-text` branch in
   `onPageUp` (~1451-1455) to use it for the whiteout+text pair, so one Undo
   cleanly reverts the whole action instead of leaving a duplicate/corrupted
   history entry (previously both `addAnn` calls independently pushed the
   same pre-edit snapshot).

5. **B8 — silent image-embed failure**: `buildDoc` and `extractCurrentPage`
   currently swallow `embedAnnotation` failures via bare `catch{}`. Both will
   count failures instead, and call `showToast(...)` (imported from the
   existing `shared/components/ToastContext.jsx`, already wired app-wide via
   `ToastProvider` — no new component) once after export completes if any
   annotations were skipped (e.g. an unsupported image format).

6. **B10 + real page-op undo** (owner-chosen full fix, not the minimal
   parity patch): expand history snapshots from "just `annotations`" to
   `{ annotations, pageOrder, pageRotations, pageDims, pdfBytes }`.
   `pushHistory()` becomes no-arg (reads current state directly from the
   component closure); `undo`/`redo` restore all five fields together, and
   only re-parse `pdfjsDoc` via `pdfjsLib.getDocument` when the restored
   `pdfBytes` reference actually differs from the live one (cheap reference
   check — annotations-only/rotation-only undos skip re-parsing entirely).
   All 10 existing `pushHistory(annotations)` call sites become
   `pushHistory()`; `onFromFile` gets a `pushHistory()` call added before it
   merges pages. This makes rotate/delete/duplicate/move/insert-blank/
   insert-from-file all genuinely undoable for the first time — previously
   `pushHistory` only ever snapshotted/restored `annotations`, so Undo never
   actually reverted any page-structure change despite being called.
   - Known limitation, not fixed here: rapid repeated Ctrl+Z while a prior
     undo's async `pdfjsDoc` re-parse is still in flight isn't locked/
     queued — a narrow edge case, logged rather than adding a lock in this
     batch.

## Out of scope (unchanged in this batch)

- Phase 1 features (font/size/color on selected annotation, shape opacity,
  signature save-for-reuse) — separate batch, pending confirmation after
  this one's verification.
- B7 (unreliable popup-blocked detection) — pre-existing, outside the
  3 reported bugs and the 4 other picked fixes.
- The pointer-events quirk on line/arrow/polyline annotations (their hit
  area is a thin SVG path or, for polyline, an oversized invisible
  full-page SVG) — noticed during the audit, not one of the six items
  scoped here; will be logged to `docs/backlog.md` if not folded into a
  later phase.

## Verification

- `npm run build` — must stay clean.
- Manual browser test on `/tools/pdf-editor` (dev server):
  - Place a text annotation, deselect, click back into it — confirms
    selection and stays typeable (fix 1 + 3).
  - Use Edit Text twice on the same page while the tool stays armed,
    then click/delete the first replacement box (fix 1).
  - Open each of Watermark/Header-Footer/Password/Signature/Extract-Text/
    Download-Range modal and press Escape — each must close (fix 2).
  - Edit Text once, then Undo once — both the whiteout and text should
    disappear together (fix 4).
  - Rotate a page, delete a page, duplicate a page, move a page, insert a
    blank page, and insert from another file — Undo each and confirm the
    page structure actually reverts (fix 6).
  - Force an embed failure (e.g. a corrupted/unsupported image annotation)
    and confirm a toast appears instead of a silently incomplete export
    (fix 5).
