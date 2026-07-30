# Batch 38 — PdfEditorV2 Phase 8: Document Tools

Continues the auto-mode 37→41 sequence (see `batch-37-plan.md` for the
overall roadmap and the standalone-tools discovery that's driving these
ports). Same no-new-dependency guarantee holds here — `PageNumbersPDF.jsx`
and `WatermarkPDF.jsx` already do this exact drawing work with `pdf-lib`.

## Scope

Page numbers (position × format × start number), header text, footer
text, watermark text (position × opacity × diagonal/straight), Bates
numbering (`PREFIX-0001` style) — one "Document" toolbar menu, each
opening a small settings modal, Apply bakes the result directly into the
live document (not an annotation overlay).

## Why this is simpler than Phase 7

These draw real content onto *existing* pages in place — page count and
order never change, so none of Phase 7's page-remap machinery applies:
`pageManagerApi.pageOrder` stays valid as-is (same `srcIndex` per
position), and `annotationsApi` needs no remap (every annotation's `page`
is still the same page). Only `originalBytesRef.current` gets replaced
and `pdfDoc` reloaded from it, same mechanical shape as Phase 7's
`rebuild()` but without the order-tracking. Form fields get re-detected
defensively (drawing text doesn't move AcroForm widgets, but it's a cheap
safety net, same reasoning as Phase 7).

### New files

- `useDocumentTools.js` — `applyPageNumbers`, `applyHeaderFooter`,
  `applyWatermark`, `applyBatesNumbering`. Page numbers, header/footer,
  and Bates numbering share one internal `drawRunningText(pdf, position,
  fontSize, getLabel)` helper (each just supplies a different per-page
  label function and reuses `PageNumbersPDF.jsx`'s exact
  position/margin math) — watermark ports `WatermarkPDF.jsx`'s rotate/
  opacity logic directly, since its layout math doesn't overlap with the
  others. Every apply function ends with the same commit step: `pdf.save()`
  → `originalBytesRef.current = bytes` → `pdfDoc.loadFromBytes(bytes,
  pdfDoc.fileName)` → re-detect + reapply form values.
- `DocumentToolsModal.jsx` — one modal, `mode` prop
  (`page-numbers`/`header-footer`/`watermark`/`bates`) picks which form
  fields render, ported 1:1 from `PageNumbersPDF.jsx`'s and
  `WatermarkPDF.jsx`'s existing controls (same position/format dropdowns,
  sliders, color picker) so the settings feel identical to the standalone
  tools a returning user already knows.

### Modified

- `Toolbar.jsx` — new "Document" dropdown (same idiom as the existing AI
  Tools menu) with 4 entries, each opening `DocumentToolsModal` in the
  matching mode.
- `index.jsx` — wires `useDocumentTools`, modal open/close state, and the
  Apply handlers.

## Scoping calls

- Like Phase 7, these are **not undoable** via Ctrl+Z (they replace the
  base document, same as a page-management rebuild) — a toast confirms
  what was applied since there's no undo affordance for it.
- Header/footer text is identical on every page (no per-page variation) —
  matches `WatermarkPDF.jsx`'s existing "applies to every page, no
  exceptions" behavior and its stated reasoning (partial marking defeats
  the purpose).
- Bates numbering reuses the running-text helper with
  `getLabel(i) = prefix + String(startNum + i).padStart(digits, '0')` —
  no new layout code beyond that label function.
