# Batch 35 — PDF Editor v2 rebuild

Builds on batch 34 (docs/batches/batch-34-plan.md), which removed the
DOM-driven v1 editor and pointed `/tools/pdf-editor` at a Coming Soon
placeholder. This batch replaces the placeholder with a real editor
built on a clean architecture: annotations as React state (not DOM
manipulation), single-page (no new-tab popup), undo/redo, and a
pdf-lib flatten-on-download step.

## Why rebuild instead of patch v1

v1 (`PdfEditor.jsx`, 3,078 lines) rendered annotations by mutating the
DOM directly. Two of its bugs found via live QA (batches 23-32) were
both DOM-vs-React-state desync: a page-render race and a text-box
focus bug. Both were symptoms of the same architectural problem, not
one-off mistakes — hence a rebuild rather than another patch.

## File structure

```
client/src/pages/tools/pdf/PdfEditorV2/
  index.jsx            — mounts ToolPageShell, top-level layout, wires hooks together
  Toolbar.jsx           — sticky top toolbar, tool buttons, keyboard shortcuts
  PagePanel.jsx         — left sidebar, collapsible page thumbnails
  PageCanvas.jsx        — one PDF.js-rendered page + its AnnotationLayer overlay
  AnnotationLayer.jsx   — pure render of annotation state -> DOM/SVG nodes for one page
  PropertiesPanel.jsx   — right sidebar, props for the selected annotation
  useAnnotations.js     — annotation CRUD, selection state, reducer-style actions
  usePdfDoc.js          — PDF.js document load, page count, per-page render-to-canvas
  useHistory.js         — undo/redo command stack
  constants.js          — tool ids, default colors/sizes, keyboard map, stamp presets
```

`toolComponentMap.js`'s `'pdf-editor'` entry and `entry-server.jsx`'s
static import both get repointed from `PdfEditorComingSoon` to
`PdfEditorV2/index.jsx` once the shell is usable (end of Phase 3, not
before — the placeholder stays live until then so `main` never serves
a half-built editor).

## State model

Annotations: `{ id, type, page, x, y, w, h, ...styleProps }[]` in React
state, owned by `useAnnotations.js`. `AnnotationLayer` is a pure
function of that state plus the current selection — no imperative DOM
writes outside React's own reconciliation.

## Text box focusability (the specific past failure)

A real `<textarea>` in the annotation layer (not inside a `<canvas>`):
`position: absolute`, `z-index` above the PDF canvas, `pointer-events:
auto`, `.focus()` called in a `useEffect` keyed on "just created," and
the PDF canvas gets `pointer-events: none` while a text annotation is
being edited so nothing steals the click.

## Undo/redo

Command-pattern stack in `useHistory.js`:
`{ type: 'add'|'update'|'delete'|'reorder', before, after }`. Cheaper
than full-state snapshots for freehand drawing (many small updates),
and keeps `useAnnotations.js`'s reducer as the single mutation path so
every action is automatically undoable.

## Download / flatten

`pdf-lib` (already a dependency, no new npm package) draws each
annotation onto the real PDF: `drawText`, `drawRectangle`,
`drawEllipse`, `drawSvgPath`/`drawLine` for freehand and arrows, and
highlight/underline/strikethrough as positioned rectangles using the
same coordinate model as the on-screen layer. Whiteout is an opaque
rectangle — it covers, it does not remove the underlying text (true
redaction needs content-stream editing, which pdf-lib does not do);
this matches v1's behavior and is called out again at ship time.

## Tools (13)

Select/Move, Text Box, Highlight, Underline, Strikethrough, Draw,
Arrow, Rectangle, Ellipse, Sticky Note, Whiteout, Stamp, Signature.
Each is a `type` in `constants.js` with a dedicated pointer-down/move/up
handler in `useAnnotations.js`.

## Signature

Session-only: a signature (drawn/typed/uploaded) is just another
annotation, gone on reload. No persistence store is re-added (v1's
`pdfSignatureStore.js` is not recreated) — matches the "annotations as
React state" model. Can be revisited later as a separate, explicitly
scoped feature if wanted.

## Shortcuts

V=Select, T=Text, H=Highlight, D=Draw, A=Arrow, R=Rect, E=Ellipse,
W=Whiteout, S=Stamp, N=Note, Esc=deselect/cancel, Delete=remove
selected, Ctrl+Z=undo, Ctrl+Y=redo, Ctrl+S=download. Bound once in
`Toolbar.jsx`, guarded so they don't fire while a `<textarea>`/input has
focus.

## SSR/SSG compliance

No module-scope `window`/`document`/`indexedDB` access. PDF.js worker
setup and canvas work happen inside `usePdfDoc.js`'s effects.
`pdf-editor` stays in `ssgRoutes.js`'s prerender list throughout.

## Build order (this batch, in phases — build/verify after each)

1. Foundation: `constants.js`, `useHistory.js`, `useAnnotations.js`,
   `usePdfDoc.js` — no UI yet, verified via build only (no runtime
   behavior to click through until Phase 2).
2. `PageCanvas.jsx` + `AnnotationLayer.jsx` — first renderable surface.
3. `index.jsx` minimal shell wiring `ToolPageShell` + hooks +
   `PageCanvas` — first end-to-end usable page. `Toolbar.jsx`,
   `PagePanel.jsx`, `PropertiesPanel.jsx`, and per-tool interaction
   logic follow in subsequent phases (not yet planned in file-level
   detail here; each gets its own build/verify checkpoint before the
   route is repointed away from the Coming Soon placeholder).

## Risks

- pdfjs-dist worker + pdf-lib flatten are both already-proven
  approaches from v1 — the rebuild changes *architecture* (state model,
  no popup tab), not the underlying PDF libraries.
- Route stays on the Coming Soon placeholder until the shell is
  genuinely usable end-to-end, so `main` never regresses mid-rebuild.
