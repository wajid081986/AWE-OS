# Batch 41 — PdfEditorV2 Phase 11: Annotations (Callout, Link)

Continues and closes out the auto-mode 37→41 sequence (see
`batch-37-plan.md`). No new dependency — Link is built on pdf-lib's
existing low-level annotation API (`page.node.addAnnot`, `context.obj`,
`context.register`), the same tier of API `useFormFields.js` already
reaches into for AcroForm manipulation; Callout is pure drawing (`pdf-lib`
`drawRectangle`/`drawText`/`drawLine`, already used everywhere else in
`index.jsx`'s `drawAnnotation`).

## Scope

1. **Callout** — a speech-bubble-style text box (filled + bordered,
   editable text) with a leader line to a separately draggable anchor
   point, for pointing at specific content on the page.
2. **Link** — a box-drag clickable region that becomes a real PDF `/Link`
   annotation on download — either an external URL or an in-document jump
   to another page. Invisible border in the exported file (an overlay
   hotspot, the standard pattern for "link over existing text/image"), a
   dashed blue outline + 🔗 icon on-canvas for editing only.

## Modified

- `constants.js` — `TOOLS.CALLOUT`, `TOOLS.LINK`, both added to
  `BOX_DRAG_TOOLS`; keyboard shortcuts `c`/`l` (both otherwise unused).
  `DEFAULT_ANNOTATION_STYLE`: Callout gets `color`/`fill`/`fontSize`/`text`
  plus `anchorDx`/`anchorDy` (the anchor's offset from the box's own
  top-left corner, in canvas/display units — an *offset*, not an absolute
  point, so moving/duplicating the whole callout carries the anchor with
  it); Link gets `url`/`targetPage` (mutually exclusive — only one is ever
  non-empty).
- `AnnotationLayer.jsx`:
  - `CalloutShape` — special-cased in `AnnotationItem` alongside
    `TextShape`/`ImageShape` (needs `onUpdate`/`isSelected`/`justCreated`,
    which the generic `SHAPES` map doesn't pass through). Renders the
    filled/bordered box with an editable `<textarea>` (same
    click-to-edit-in-place idiom as `TextShape`), an SVG leader line from
    the box's top-left corner to the anchor point, and a small circular
    drag handle at the anchor (same corner-drag-handle mechanics as
    `CropOverlay`'s resize handles) that updates `anchorDx`/`anchorDy`.
    Like `TextShape`, the whole box isn't body-draggable via Select (same
    deferred limitation already accepted for Text — a click on the body
    needs to focus the textarea, not start a move-drag); only the anchor
    handle drags.
  - `LinkShape` — plain generic `SHAPES` entry (no text editing needed):
    dashed blue box + 🔗, `title` showing the configured URL/target page.
- `PropertiesPanel.jsx` — Callout: text textarea, text/border color grid,
  fill color grid, one-line hint about the anchor handle. Link: a URL
  input and a "jump to page #" number input, each clearing the other on
  edit (enforces the mutual exclusivity `drawAnnotation`/pdf-lib's action
  object also assumes).
- `Toolbar.jsx` — Callout (💬) and Link (🔗) buttons in the main tool row.
- `index.jsx`:
  - `drawAnnotation`'s switch gains `case TOOLS.CALLOUT` (fill rect +
    border + multi-line text, matching `TOOLS.TEXT`'s line-splitting, plus
    a `drawLine` to the anchor point computed from `ann.x/y + anchorDx/dy`
    converted through the same `toPt`/page-height math every other case
    already uses) and `case TOOLS.LINK` (builds a `/Link` annotation dict
    via `pdfLibDoc.context.obj(...)` + `context.register(...)` +
    `page.node.addAnnot(...)` — a `URI` action when `ann.url` is set, a
    `GoTo` action targeting `pdfLibDoc.getPage(ann.targetPage - 1).ref`
    when `ann.targetPage` is set and in range, otherwise skipped
    entirely). `PDFString` added to the existing `pdf-lib` import (needed
    for the URI action's string value — `context.obj`'s literal-string
    branch produces a `PDFName`, not a `PDFString`, which would corrupt
    the action if used directly for `/URI`).

## Scoping calls

- No arrowhead on the Callout leader line — a plain line is a legitimate,
  common callout style (Acrobat's own basic callout is line + box, the
  arrowhead is an optional extra); keeping this scoped avoids adding
  per-shape angle math for marginal visual gain.
- Callout's leader line always originates at the box's top-left corner
  (not whichever corner is nearest the anchor) — matches the "fixed
  corner, no per-corner hit-testing" simplification, consistent with
  keeping this phase's new surface area small.
- Link's Rect is fully invisible in the exported PDF (`Border: [0, 0, 0]`)
  by design — this is the standard "hotspot over existing content"
  pattern; a visible box baked into a downloaded document would look like
  a rendering artifact to a reader who never opens the editor.

## Risk

The pdf-lib low-level annotation path (`context.obj`/`register`/
`addAnnot`) hasn't been exercised anywhere else in this codebase — needs a
live QA pass: place a URL Link and a page-jump Link, download, and confirm
in an actual PDF viewer (not just that the file opens) that both are
clickable and navigate correctly, since a malformed annotation dict could
silently fail to register as a link without raising a JS error.
