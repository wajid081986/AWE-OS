# Batch 34 — Retire PDF Editor v1, show Coming Soon

## Context

The PDF Editor (`PdfEditor.jsx`, 3,078 lines) has accumulated DOM-vs-state
desync bugs (a page-render race and a text-annotation focus bug, both
fixed in batches 23-32) that point to an architectural problem: DOM
manipulation instead of React-state-driven rendering, plus a new-tab
popup flow for the actual editing surface. Decision: remove it entirely
and rebuild as PDF Editor V2 with annotations as React state and no
popup tab (tracked separately as Batch 35). This batch only retires v1
and shows a "Coming Soon" placeholder so `/tools/pdf-editor` never
serves a broken tool while V2 is built.

## Correction to the literal request

The request said "change its status to `coming-soon`." `toolRegistry.js`
has no `status` field — it uses a boolean `comingSoon`. Flipping that
boolean alone does not change what `/tools/pdf-editor` renders:
`DynamicToolPage.jsx` resolves the page purely from
`toolComponentMap.js`'s `TOOL_COMPONENTS['pdf-editor']` entry and never
reads `comingSoon` (that flag only gates card/badge display on listing
pages). So this batch also repoints the component map at a new
placeholder component.

## Files removed

- `client/src/pages/tools/pdf/PdfEditor.jsx`
- `client/src/pages/tools/pdf/PdfEditorStandalone.jsx`
- `client/src/pages/tools/pdf/pdfEditorSession.js`
- `client/src/pages/tools/pdf/pdfSignatureStore.js`
- `client/src/components/pdf-editor/EditorErrorBoundary.jsx`
- `client/src/components/pdf-editor/DisabledToolButton.jsx`

Confirmed via grep that none of the above are imported by any other tool
page. `client/src/pages/tools/pdf/pdfUtils.js` is kept — it's shared by
13 other PDF tool files.

## Files added

- `client/src/pages/tools/pdf/PdfEditorComingSoon.jsx` — static
  placeholder wrapped in `ToolPageShell` (keeps SEO/schema/breadcrumbs
  and the SSG static-shell requirement intact).

## Files modified

- `client/src/data/toolRegistry.js` — `pdf-editor` entry:
  `comingSoon: true`, drop `isFeatured`/`isNew`.
- `client/src/pages/tools/toolComponentMap.js` — `'pdf-editor'` now
  imports `PdfEditorComingSoon` instead of `PdfEditor`.
- `client/src/app/routes.jsx` — remove the `PdfEditorStandalone` lazy
  import and the `/tools/pdf-editor/editor` route (not part of the
  frozen route table in `docs/reference/architecture.md`, so removal is
  in scope).
- `client/src/ssgRoutes.js` — no change; `pdf-editor` stays in the
  prerender list (the placeholder still needs a static shell).

## Risks

- None to other tools — all removed files are pdf-editor-exclusive,
  confirmed via grep before deletion.
- `main` stays deployable: the route always renders something (either
  the old tool or the placeholder), never a blank/broken page.

## Verification

- `npm run build` (client) succeeds.
- Lint passes for changed files.
- Manual check: `/tools/pdf-editor` renders the Coming Soon placeholder,
  not a blank page or a 404.
