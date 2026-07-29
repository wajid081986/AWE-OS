# Batch 27 — PDF Editor Phase 4: Find-in-PDF + Annotation JSON Export/Import

## Context

Batches 23-26 (Phases 0-3) are done. This batch implements Phase 4 from
the original audit: find-in-PDF with highlight/navigation, and export/
import annotations as JSON (which also covers the "share annotation layer
separately" item — export the JSON, someone else importing it into the
same PDF is exactly that).

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`, no new deps

### 1. Find-in-PDF (highlight + next/prev navigation)

Builds on the same `pg.getTextContent()` call `extractAllText` already
uses, but keeps per-item position data instead of just concatenating
strings.

- New floating search bar (not a full-screen modal — `position:fixed`,
  same pattern this file already uses for the right-click context menu,
  so the document stays visible/usable while searching), toggled by a
  new ribbon action in the View tab (`🔍 Find Text`).
- `runFind(query)`: for each page, case-insensitive substring search
  against each text item's `str`. For every match, convert the item's
  `transform`/`width`/`height` (PDF-space, same coordinate system used
  everywhere else in this file) into the existing `xf/yf/wf/hf`
  convention via a proportional-width slice of the item (start-ratio/
  width-ratio based on character offset) — the standard technique for
  highlighting without full glyph-level positions, which
  `getTextContent()` doesn't provide.
- Matches sorted by **current display order** (`pageOrder.indexOf`), not
  raw page index, so Next/Prev moves forward through the document as
  currently arranged even after page reordering (batch-25).
- Highlight overlays render per page (non-interactive,
  `pointer-events:none`) — active match styled differently from the
  rest, matching common browser/PDF-viewer find-bar conventions.
- Next/Prev scrolls to the match's page via the existing `pageElRefs`
  (same ref map the sidebar thumbnail click-to-scroll already uses).
- Escape closes the find bar too, extending batch-23's Escape-closes-
  modals handler.

**Disclosed limitations:**
- Matches straddling two adjacent text items (e.g. a query spanning
  exactly where the PDF's internal text run breaks) won't be found —
  only searches within each item's own string, not the whole page's
  concatenated text. Handling cross-item matches needs re-mapping a
  page-wide match position back onto the specific items it spans — a
  meaningfully bigger feature, not in this batch.
- Assumes horizontal, non-rotated text for the position math; rotated/
  skewed text runs would highlight in the wrong place.
- Case-insensitive only, no whole-word or regex option.

### 2. Export/Import annotations as JSON

- New ribbon actions (View tab): `📤 Export Anns` serializes the current
  `annotations` state as `{ version, pageCount, exportedAt, annotations
  }` and downloads it via the existing `downloadBlob` helper.
- `📥 Import Anns` (hidden file input, same pattern as the existing
  "Insert from File" flow) reads a JSON file, validates it's a plain
  object of arrays, and **replaces** the current `annotations` (not
  merged — simpler, more predictable, undoable in one step via the
  existing `pushHistory()`/Undo system).
- If the imported file's `pageCount` doesn't match the current
  document's page count, a toast warns annotations may land on the wrong
  page but still proceeds (best-effort) — there's no reliable way to
  verify it's the *same* document without embedding a content
  fingerprint, out of scope here.

## Verification

- `npm run build` — must stay clean.
- Manual browser test (no browser-automation tool available to the
  assistant in this environment — needs a human pass): search a
  multi-page PDF for a term appearing several times, confirm all
  instances highlight and Next/Prev cycles through them in document
  order; export annotations, reload the same PDF, import them back,
  confirm they reappear in the same positions and are selectable/
  deletable/undoable like any other annotation.
