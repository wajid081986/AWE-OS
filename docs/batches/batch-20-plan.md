# Batch 20 — Online Text Editor + PDF Editor enhancement

## Discrepancies flagged (not silently resolved)

1. `architecture.md` describes Next.js App Router, but the real stack is Vite SPA
   + custom SSG (`entry-server.jsx` / `scripts/ssg-build.js`) — already logged in
   CLAUDE.md's own changelog, nothing new here.
2. Tool-page components don't use design tokens. `MergePDF.jsx`, `PdfEditor.jsx`,
   and `ToolPageShell.jsx` all use raw Tailwind (`bg-blue-600`, `text-gray-900`,
   etc.), not `design-system/tokens.css`. Only `Header.jsx`/nav components are
   token-based. `architecture.md` §14 only flagged this debt for
   `ToolsPage`/`CategoryPage`; it actually extends to the entire tool-page
   layer. Per §5 ("match existing stack and patterns"), both new tools are
   built the same raw-Tailwind way as all 49 existing tools rather than making
   2 pages inconsistent with the other 47. Logged in `docs/backlog.md`, not
   fixed.
3. PDF Editor already existed — not a stub. `client/src/pages/tools/pdf/PdfEditor.jsx`
   (2258 lines) already implements viewer, zoom, annotations (text/highlight/
   draw/shapes/arrows/stamps/signatures), page management, watermark,
   header/footer, password note, and a standalone full-screen mode — already
   registered everywhere (`toolRegistry.js`, `toolComponentMap.js`,
   `entry-server.jsx`, `ssgRoutes.js`, `TOOL_ABOUT`, `TOOL_GUIDE`). It exceeded
   the batch-prompt spec except for two gaps: no "Extract Text" action, and no
   prominent privacy badge (only a small caption). It was also missing from
   the Header mega-menu (`toolCatalogue.js`, a separately-maintained nav file
   that has drifted from the registry).
4. Content-generation policy conflict (CLAUDE.md §7): tool-page prose must be
   human-written per §7, but every existing tool entry in `toolPageContent.js`/
   `toolGuideContent.js` (including `pdf-editor`) is already AI-generated
   marketing prose. Owner ruling (asked via AskUserQuestion before
   implementation): generate the new `text-editor` entry's prose matching the
   existing style, consistent with actual repo precedent, rather than using
   `TODO-CONTENT` markers.

## Plan

### Tool 1 — Text Editor (new)
- `client/src/pages/tools/TextEditor.jsx` — contenteditable-based editor in
  `ToolPageShell`, matching `MergePDF.jsx`'s style (raw Tailwind). Toolbar via
  `document.execCommand` (bold/italic/underline/strike, font family/size,
  text/highlight color, align, line-height, headings, lists, indent/outdent,
  blockquote), Insert menu (table via prompted rows×cols, hr, link modal,
  image-by-URL only — no upload, keeps the privacy promise), live word/char
  count, simple Find & Replace modal, native undo/redo, A4-styled page
  (794×1123px, margins, approximate "Page N of M" from scrollHeight), print
  via `window.print()`.
- `client/src/pages/tools/textEditorUtils.js` — export helpers: `.txt`/`.html`
  via Blob, `.docx` via the `docx` npm package.
- New dependency: `docx` (^9.7.1, ~110KB minzipped, pure JS, MIT license, no
  native/binary deps) — was missing from `package.json`; user's batch prompt
  explicitly authorized adding it if missing. Table/image fidelity in the
  `.docx` export is basic (text formatting + structure + tables preserved;
  images embedded best-effort from the already-loaded `<img>`'s pixel data,
  falling back to a text placeholder if the browser blocks reading it due to
  cross-origin restrictions).

### Tool 2 — PDF Editor (targeted enhancement, not a rebuild)
Edited the existing `PdfEditor.jsx` only:
- Added an **Extract Text** action (View tab) using `pdfjs`'s
  `getTextContent()` (already used for rendering) → modal with textarea +
  Copy/Download-.txt.
- Upgraded the existing caption into a prominent **"🔒 Your PDF stays on your
  device"** badge in the upload screen.

### Registration (both tools)
1. `toolRegistry.js` — added `text-editor` entry (category `productivity`,
   new subcategory `Document Tools`, tags as specified in the batch prompt).
2. `toolComponentMap.js` — added `'text-editor': () => import('./TextEditor')`.
3. `entry-server.jsx` — added static import + `TOOL_PAGE_COMPONENTS['text-editor']`
   (required by its own drift-guard assertion).
4. `ssgRoutes.js` — added `'text-editor'` to `TOOL_SLUGS`.
5. `toolPageContent.js` — added `TOOL_ABOUT['text-editor']` (description/
   features/useCases/howToUse/whyUseUs/faqs).
6. `toolGuideContent.js` — added `TOOL_GUIDE['text-editor']` (tips/mistakes).
7. `toolCatalogue.js` — added `pdf-editor` under PDF → "Edit PDF" section, and
   `text-editor` under Productivity → new "Document Tools" section (fixes the
   nav-drift gap for `pdf-editor` too, since it was never added there).
   Bumped Productivity's hardcoded mega-menu `count` from `'2+'` to `'3+'`
   since this batch is the direct cause of that number changing.
8. `client/src/app/routes.jsx` — no changes needed; `DynamicToolPage` +
   registry handles it.

### Verification
- `npm run build` from `client/` — confirm `dist/tools/text-editor/index.html`
  and `dist/tools/pdf-editor/index.html` both exist and the drift-guard
  assertion passes.
- Manual smoke test both tools in the dev server.

### Backlog additions (logged, not fixed)
- Tool-page layer-wide raw-Tailwind vs. design-tokens gap (broader than
  architecture.md §14's note).
- `toolCatalogue.js` has drifted from `toolRegistry.js` beyond just these 2
  tools (several other tools missing from the mega-menu) — needs a dedicated
  sync pass.
- Existing `pdf-editor` `TOOL_ABOUT` content claims "Real-time collaboration,"
  which is false for a client-side-only tool — needs a content correction.
