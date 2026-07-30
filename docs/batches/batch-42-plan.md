# Batch 42 — PdfEditorV2 Ribbon Architecture

Ad-hoc UI request (not part of the original 37-41 phase sequence) — owner
asked for a Soda-PDF-style ribbon UI, first as a lighter "Option 3"
(tab-dimming only, no ribbon architecture), then explicitly overrode that
mid-session with a full ribbon rebuild and direct authorization to exceed
Blueprint §10's closed Phase-1 component list for this internal editor
(same category as the existing full-screen-takeover deviation from
batch-35, now both logged in `docs/backlog.md`).

## What shipped

`Toolbar.jsx` deleted, replaced by `RibbonToolbar.jsx`:
- **App header** — PDF Editor identity, current file name, and the
  handful of actions needed regardless of tab (Select, Undo/Redo, Export
  Word, Download, Fullscreen).
- **Tab bar** — Annotate / Draw / Insert / Edit / Pages / Security / View
  / AI Tools. Purely local UI state in `RibbonToolbar.jsx` — never
  touches `activeTool` (owned by `index.jsx`), so keyboard shortcuts keep
  working unchanged regardless of which tab is visible.
- **Per-tab ribbon** — 32px-ish icon-on-top/label-below buttons
  (`RibbonButton`), shortcut-key corner badge, descriptive `title` tooltip,
  `Divider`s between logical groups. `bg-cobalt`/`text-cobalt`/
  `border-cobalt` throughout (already `#0F766E`), no raw hex added.

## Decisions made on the 6 items flagged before implementing (owner said
"go with your stated defaults" by approving without addressing them
individually)

1. **Security tab** ships with **Redact only** (working) + a disabled,
   clearly-labeled "Password Protect (soon)" placeholder — not a working
   button, since `pdf-lib` has no `.encrypt()` (see backlog).
2. **Eraser**: not added — matches the earlier, still-standing decision
   to skip a literal eraser tool in favor of Select+Delete.
3. **Line tool**: added as `TOOLS.LINE`, distinct from `TOOLS.LINK` (the
   hyperlink tool) — a plain straight line, no arrowhead. Reuses Arrow's
   exact box-to-line-segment geometry in both `AnnotationLayer.jsx`
   (`LineShape`) and `index.jsx`'s `drawAnnotation` (folded into the same
   `case` as `ARROW`, with the points-synthesis ternary extended to cover
   both — `ann.points` doesn't exist for either, since both are box-drag,
   not freehand).
4. **Rotate View**: added as a **display-only** CSS rotation
   (`viewRotation` state in `index.jsx`, never baked into the download).
   While rotated, `PageCanvas.jsx` skips rendering `AnnotationLayer`/
   `FormFieldLayer` entirely (not just visually — several of those
   components' inner elements set their own `pointerEvents:'auto'`, which
   would silently override a parent `pointer-events:none` and leave
   editing half-working under wrong, non-rotation-aware pointer math).
   A banner explains this and offers a one-click reset to 0°.
5. **Pages tab**: new ribbon buttons (Insert/Duplicate/Delete/Move
   Up-Down/Extract/Split) operate on `activePage`, calling the exact same
   `index.jsx` handlers PagePanel's per-thumbnail hover menu already uses
   — a second call site, no new page-management logic. "Extract" is a new
   `handleExtractCurrentPage` (extracts just `activePage`, unlike
   `handleExtractSelected`'s checkbox-driven multi-page extract), reusing
   the existing `buildFlattenedSubsetPdf`.
6. **Edit tab → Form Fill / Auto Fill**: "Form Fill" jumps to the first
   fillable field's page (`handleJumpToFirstField`, new — reuses
   `formFieldsApi.fields`/`jumpToPage`, disabled when the PDF has no
   fields); "Auto Fill" opens the existing `ProfileModal`.

## Also added, not explicitly asked but needed to avoid dropping a shipped
feature

- **Insert tab's Bates Numbering** — the user's tab spec only listed Page
  Number/Header/Footer/Watermark under Insert, omitting Bates (shipped in
  batch-38's Phase 8). Added as a 5th button rather than silently dropping
  it. Header and Footer both open the same `header-footer`
  `DocumentToolsModal` mode (it already edits both fields together — no
  second modal built).
- **Fit Page** (View tab) — genuinely new: `index.jsx`'s `computeFitWidth`
  generalized into `computeFit(pagesPerRow, mode)`, where `mode: 'page'`
  additionally constrains by the viewer's available height, not just
  width. The existing auto-fit-on-load effect still always uses `'width'`
  — Fit Page stays an explicit opt-in.

## Verified live (Playwright, dev server)

Upload → all 8 tabs render and switch → Draw tab's Line tool creates and
downloads correctly (pdf-lib reloads the result) → Insert tab's 5
Document-tools buttons all present and Watermark opens the modal → Edit
tab's Form Fill correctly disabled on a no-fields PDF, Auto Fill opens
`ProfileModal` → Pages tab's "Insert Page" adds a page → Security tab
shows the disabled placeholder + working Redact → View tab's Fit Page and
Rotate View (banner shows, canvas still renders, reset clears it) → AI
tab renders. Zero console errors from this batch's own code — one
pre-existing, unrelated `ToastContext.jsx` key-collision warning was
found and logged in `docs/backlog.md` instead of fixed inline.
