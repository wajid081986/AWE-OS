# Batch 26 — PDF Editor Phase 3: Form Field Detection & Fill

## Context

Batches 23-25 (Phases 0-2) are done. This batch implements Phase 3: PDF
form field detection and filling. Owner-confirmed approach (asked because
it's a genuine architecture fork): **cover-and-place**, not real AcroForm
manipulation — see "Form-fill approach" decision below.

## Why cover-and-place, not real AcroForm fill+flatten

The editor's whole export pipeline (`buildDoc`) copies each page into a
fresh `PDFDocument` one at a time via pdf-lib's `copyPages()` — this is how
rotation/annotations/reordering/undo all already work together.
`copyPages()` has a well-documented pdf-lib limitation: it doesn't
reliably preserve the AcroForm (the actual interactive form structure)
across the copy. Genuinely filling+flattening real form fields would need
a separate, parallel export path bypassing `buildDoc` entirely, with real
edge-case risk interacting with rotation/reorder. Owner chose instead:
detect field positions (via pdf.js, already used for rendering) and let
users fill them via simple overlays, writing the filled values as
ordinary text/checkmark annotations at those coordinates on export — the
same technique already used by Edit Text and Whiteout (batch-22). Output
is a flat, filled-looking PDF; it doesn't touch the actual AcroForm data.

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`

### 1. Detection (on document load)

`loadPdfFromBytes`'s existing per-page loop already fetches each `pg` via
`pdfjsDoc.getPage(i+1)` to compute `pageDims`. Reuses that same `pg` to
also call `pg.getAnnotations()` — verified against the installed
`pdfjs-dist` package source (not assumed from memory): annotation objects
have `annotationType` (compare to `pdfjsLib.AnnotationType.WIDGET`,
confirmed exported from the package), `fieldType` (`'Tx'`/`'Btn'`/`'Ch'`/
`'Sig'`), `checkBox`/`radioButton` booleans on `'Btn'` fields, `fieldName`,
`fieldValue`, `exportValue` (checkbox on-value) / `buttonValue` (this
radio widget's own value), `multiLine`/`maxLen` (text fields), `readOnly`,
`rect` (PDF-space `[x1,y1,x2,y2]`, bottom-left origin).

- Filter to `fieldType==='Tx'` or (`fieldType==='Btn'` and
  (`checkBox`||`radioButton`)) — skip `readOnly`, `Ch` (dropdown), `Sig`,
  and plain push-buttons (out of scope, matches the original "text
  fields, checkboxes, radio buttons" ask).
- Convert each field's `rect` to this file's existing `xf/yf/wf/hf`
  fractional convention using the same bottom-left-to-top-left flip
  `embedAnnotation` already does, against the same `pageDims` used for
  every other annotation — same coordinate system, no new math pattern.
- New state: `formFields = { [pi]: [{id, fieldName, fieldType, checkBox,
  radioButton, exportValue, buttonValue, fieldValue, multiLine, maxLen,
  xf, yf, wf, hf}] }`.
- If any fields found, one-time `showToast('This PDF has N fillable
  field(s) — detected automatically.')` (existing toast system). No new
  ribbon tab/tool — filling happens directly in Select mode.

### 2. Fill UI

New `FormFieldEl` component, rendered per page only in Select mode
(`!activeTool`) and only for fields **not yet filled** — "filled" means an
existing annotation on that page already carries a `formFieldId` matching
that field, so once interacted with, the dashed-outline placeholder
disappears and the real annotation takes over like any other annotation.

- **Text field**: dashed-outline box; click calls `addAnn` to create a
  real `type:'text'` annotation at that exact rect, pre-filled with the
  field's existing PDF value (`fieldValue`) if any, tagged `formFieldId`.
  Immediately selected and typeable via the existing (batch-23-fixed)
  text-editing path — no new text-input code.
- **Checkbox**: dashed-outline box; click creates a `type:'checkmark'`
  annotation at that rect (reusing the existing checkmark shape
  renderer), tagged `formFieldId`.
- **Radio**: dashed-outline circle; click calls a new
  `setRadioSelection` helper that removes any existing checkmark tagged
  with the same `formFieldGroup` (fieldName) on that page and adds a new
  one for the clicked option, in one `pushHistory()` call — switching a
  radio selection is one undo step, not two.
- Deleting the derived annotation (same delete/undo flow as any
  annotation) brings the empty-field placeholder back on the next
  render.

## Known limitations (disclosed, not fixed here)

- Not real AcroForm manipulation, per the owner-confirmed approach —
  writes visually-filled content, not actual form field data. A PDF
  viewer's own "form fields" panel won't show these as filled form
  fields.
- Dropdown/choice (`Ch`) and signature (`Sig`) field types are not
  detected/fillable in this batch.
- Read-only fields are skipped entirely.
- Radio groups whose widgets span *multiple pages* (rare) only clear the
  same-page sibling on selection change, not cross-page ones.

## Verification

- `npm run build` — must stay clean.
- Manual browser test (no browser-automation tool available to the
  assistant in this environment — needs a human pass): load a PDF with a
  real AcroForm (text/checkbox/radio fields), confirm the detection toast
  fires, confirm each field type fills correctly and becomes a normal
  selectable/deletable/undoable annotation, confirm switching a radio
  option removes the previous checkmark in one undo step.
