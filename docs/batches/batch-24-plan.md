# Batch 24 — PDF Editor Phase 1: Font/Opacity Controls + Signature Reuse

## Context

Batch 23 (Phase 0) fixed the 3 user-reported bugs plus 4 other confirmed
defects. This batch implements the 3 Phase 1 features called out in the
original audit and confirmed by the owner: font/size/color controls that
apply to an already-selected annotation (not just the next new one),
opacity control for all shape types, and signature save-for-reuse.

## Scope

### Files
- `client/src/pages/tools/pdf/PdfEditor.jsx` — bulk of the work
- **New:** `client/src/pages/tools/pdf/pdfSignatureStore.js` — localStorage
  wrapper for saved signatures, following the exact pattern already
  established by `client/src/hooks/useIdeaTracker.js` (try/catch-wrapped,
  capped array, unique IDs). No new npm dependency.

### 1. Font/size/color controls on the *selected* annotation

Today the font controls (~lines 2009-2036) only apply to tool-prep state
(`fontFamily`/`fontSize`/etc.) for the *next new* annotation — nothing lets
you edit an already-placed text/typewriter/callout/note box.

- Add `updateSelAnn(upd)` helper: `pushHistory(); updateAnn(selAnn.page,
  selAnn.id, upd)` — one undo step per discrete change.
- Extract a `FontControls` component (alongside the existing
  `ColorGrid`/`WidthPicker`/`PropSection` helpers near line 2275+) so the
  family/size/color/bold/italic/underline/align set isn't duplicated
  between "next new annotation" and "selected annotation."
- New panel block gated on `!activeTool && selAnn &&
  ['text','typewriter','callout','note'].includes(selAnn.type)`, placed
  above the existing "Selected annotation actions" (duplicate/front/
  back/delete) block, reading/writing `selAnn`'s own properties via
  `updateSelAnn`.

### 2. Opacity control for all shape types

Shapes (rect/circle/triangle/diamond/star/cloud/cross/checkmark) have no
opacity concept anywhere today — not in state, not rendered, not exported.

- New state `shapeOpacity` (default 1.0), alongside `strokeWidth`/
  `fillColor`/`hasFill`.
- `onPageUp`'s rect/circle and shared-shapes creation branches
  (~lines 1492-1493 and the `includes(activeTool)` line after) get
  `,opacity:shapeOpacity` added to the annotation object.
- `AnnotationEl` (~lines 544-578): add `opacity:ann.opacity??1` to rect/
  circle's style and to the SVG-shapes wrapper div's style.
- `DrawPreview`: new `shapeOpacity` prop applied to the same branches, for
  live-drag-preview parity.
- `embedAnnotation`: add `opacity: ann.opacity??1` to the
  `drawRectangle`/`drawEllipse`/`drawLine` calls in the rect, circle,
  triangle, diamond, star/cloud, cross, and checkmark branches (pdf-lib's
  draw methods all accept an `opacity` option).
- UI: add an Opacity slider to the existing tool-prep "Shapes" panel
  (~2093-2104), and extract a `ShapeControls` component (stroke color/
  width/fill/opacity) reused by both the tool-prep panel and a new
  "selected shape" panel, gated on `!activeTool && selAnn && [shape
  types].includes(selAnn.type)`.
- **Undo correctness for the slider specifically:** a range input fires
  `onChange` continuously while dragging. Calling `pushHistory()` on every
  tick would spam undo history the same way per-keystroke text edits
  already do (logged to backlog in batch-23, not fixed there). To avoid a
  second instance of that pattern, the new selected-shape opacity slider
  calls `pushHistory()` once on `onMouseDown`/`onTouchStart` (before the
  value changes) and only calls `updateAnn` (no history push) on
  `onChange` — exactly one undo step per drag gesture.

### 3. Signature save-for-reuse

- `pdfSignatureStore.js`: `loadSignatures()`, `saveSignature(dataUrl)`
  (caps at 10, newest first), `deleteSignature(id)` — all client-side
  `localStorage`, nothing leaves the browser (consistent with the privacy
  promise).
- `SignatureModal` gets a 4th tab, "💾 Saved", showing thumbnails of
  previously saved signatures — click to insert immediately, small "✕" to
  remove.
- Draw/Type/Upload tabs get a "Save this signature for reuse" checkbox;
  when checked, `insert()` (and the upload file handler) also calls
  `saveSignature()` before/alongside `onInsert()`.

## Out of scope for this batch

- The per-keystroke/per-drag history-spam pattern in general — only the
  one new slider gets the mousedown-commit treatment; existing
  text-typing behavior is untouched (tracked in batch-23's backlog entry).
- Any other Phase-1-adjacent features from the original audit not
  explicitly requested (e.g. opacity for draw/line mid-stroke).

## Verification

- `npm run build` — must stay clean.
- Manual browser test (no browser-automation tool available to the
  assistant in this environment — needs a human pass):
  - Select an existing text box and change its font/color/size — confirms
    it updates the placed annotation, not just future ones.
  - Select an existing shape, change stroke/fill/opacity, then Undo once —
    confirms it reverts in one step.
  - Drag the new opacity slider and confirm only one undo step results
    regardless of how long the drag was.
  - Draw/type/upload a signature with "save for reuse" checked, close and
    reopen the modal, confirm it appears under the Saved tab and can be
    reinserted or deleted.
