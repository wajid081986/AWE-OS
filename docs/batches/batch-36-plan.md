# Batch 36+ — PDF Editor V2 Advanced Features Roadmap (Phases 1-5)

Builds on batch 35 (`docs/batches/batch-35-plan.md`), which shipped the
rebuilt `PdfEditorV2` to production. This is a 5-phase roadmap, decided in
conversation on 2026-07-30. Each phase is its own batch (this file covers
all 5 for traceability; Phase 1 is implemented as part of this batch,
36 — Phases 2-5 get their own build/verify checkpoint before starting,
per CLAUDE.md §6's per-batch stop rule, even though the owner requested
"auto mode" for the full roadmap).

## Decisions locked in (2026-07-30, in conversation)

1. **Form fill downloads are flattened** — filled AcroForm values become
   static content via `form.flatten()`, consistent with how annotations
   are already flattened on download (batch-35-plan.md). Not re-editable
   if reopened elsewhere.
2. **Auto-fill profile is stored in `localStorage`** — the user's own
   name/email/phone/address, entered once, stays on their device only.
   No privacy conflict: this never transmits anywhere.
3. **Phase 3 (AI features) is a scoped, disclosed exception to the
   zero-upload privacy promise** — gated by an explicit consent modal
   ("your PDF text will be sent to our server for processing; no files
   are stored"), routed through a new public API endpoint that reuses
   the existing `server/services/ai.service.js` (today used only by
   internal Builder/Marketing Agent tooling, never a public tool). Only
   extracted *text* is sent, never the file itself; nothing is persisted
   server-side. This is a real, deliberate carve-out from CLAUDE.md §1/§3
   — logged here rather than silently implemented, per CLAUDE.md's own
   "conflicts with this file → stop and ask" instruction. Owner sign-off:
   direct instruction, 2026-07-30.
4. **Phase 5 export is client-side best-effort** — new deps `docx` (Word)
   and `exceljs` (Excel), no server round-trip, no paid conversion API.
   Text-only reflow; no table/image/layout fidelity.

## Phase 1 — Form Filling + Auto-fill Profile (this batch)

**New files**
- `useFormFields.js` — on PDF load, runs a second `PDFDocument.load(bytes)`
  (alongside the existing pdf.js load) and reads `pdfLibDoc.getForm().getFields()`.
  Per field, resolves widget → page via the widget's own `/P` ref, falling
  back to scanning each page's `/Annots` array by dict identity if `/P` is
  absent. Converts each rect from PDF point space to the same top-left
  `RENDER_SCALE` canvas space `drawAnnotation` (index.jsx) already uses —
  the inverse of its `toPt`/`yTop` math. Holds `values` (`name -> value`)
  separately from `useAnnotations`'s annotation state, since these are
  existing document fields, not user-drawn shapes.
- `FormFieldLayer.jsx` — pure render of one page's detected fields as
  positioned native `<input>` (text), checkbox, radio group, and `<select>`
  (dropdown) elements bound to `values`. Renders above `AnnotationLayer`.
  Each field stops pointerdown propagation (same trick `TextShape` already
  uses) so clicking a field doesn't trigger Select-tool's clear-selection
  or start an annotation drag.
- `useAutoFillProfile.js` — reads/writes a plain profile object
  (name, email, phone, address line, city, state, PIN, date of birth) to
  `localStorage` under `awe-pdf-editor-profile-v1`, inside effects/handlers
  only (SSR-safe). `autofill(fields)` does best-effort keyword matching
  against each field's name (e.g. contains "name"/"email"/"phone"/"addr"/
  "city"/"date") and writes matches into `values` — explicitly best-effort,
  since real-world PDF field names vary too much for a general solution;
  every filled value stays manually editable afterward.
- `ProfileModal.jsx` — small modal (same fullscreen-overlay idiom already
  reused in batch-35 for the editor itself) with plain inputs for the
  profile fields, a Save button, and an "Autofill this PDF" button, opened
  from the "N fillable fields detected" banner.

**Modified**
- `index.jsx` — wires `useFormFields`/`useAutoFillProfile`; detects fields
  on file load; `handleDownload` fills each field from `values` then calls
  `form.flatten()` before `pdfLibDoc.save()`; shows the fields-detected
  banner with a "Fill with my profile" action.
- `PageCanvas.jsx` — renders `FormFieldLayer` above `AnnotationLayer`.

**Out of scope, logged to `docs/backlog.md`**: multi-select option-list
fields and signature fields (pdf-lib can't fill a real digital signature
regardless).

## Phase 2 — Image Insert + Crop + Ctrl+V Paste

New `TOOLS.IMAGE`. Toolbar's "Insert Image" button opens a hidden
`image/png,image/jpeg`-only file input directly (pdf-lib only embeds
PNG/JPEG); once chosen, the tool arms and the next canvas click places an
`IMAGE` annotation at a default size derived from the image's natural
aspect ratio, then resets to Select (same pattern `TEXT`/`NOTE` use).
`Ctrl+V` reads `event.clipboardData.items`, and places an image annotation
directly on the active page at a default position (no click-to-arm step —
matches normal paste UX) if the pasted data contains an image.

Crop is implemented as a re-rasterize, not stored crop-rect metadata: an
offscreen `<canvas>` draws the cropped region and `toBlob()`/`toDataURL()`
produces new image bytes that replace `imageBytes` on the annotation —
keeps the annotation model at "one full image per annotation" rather than
threading crop coordinates through to the pdf-lib download step.

Resizing is explicitly out of scope — no annotation type in V2 has a
resize handle yet (move-only via existing drag-by-body logic); Image
won't be a special case.

**Files**: `constants.js` (`TOOLS.IMAGE`), `index.jsx` (file input, paste
listener, `pendingImage` state, `drawAnnotation`'s new `IMAGE` case via
`embedPng`/`embedJpg` + `page.drawImage`), `PageCanvas.jsx` (placement
branch), `AnnotationLayer.jsx` (`ImageShape` + crop-handle overlay when
selected+cropping), `Toolbar.jsx`, `PropertiesPanel.jsx` (opacity + crop
toggle + delete), `pdfUtils.js` (`isImageFile`, `cropImageToBytes`).

## Phase 3 — AI Features (Consent-Gated)

`AiConsentModal.jsx` shown once per browser session (sessionStorage flag,
not localStorage — a new tab/session re-asks) before the first AI action:
"To use AI features, your PDF text will be sent to our server for
processing. No files are stored. [Cancel] [Accept]". A single "AI Tools ✨"
toolbar button opens a small menu with the 3 actions (toolbar is already
dense; not adding 3 more top-row buttons).

New server route (exact path/filename TBD at Phase 3 kickoff, likely
`server/routes/pdf-ai-tools.js`) exposing summarize/translate/
extract-tables endpoints, each taking `{ text, targetLang? }` and calling
the existing `ai.service.js` — text only, never file bytes, nothing
persisted server-side (stateless request/response; any request-logging
middleware must scrub the body, same rule already applied to error
monitoring's `beforeSend`).

- Summarize → read-only result modal.
- Translate to Hindi/Urdu → result modal, optional "insert as text
  annotation".
- Extract tables → client-side CSV download (`downloadFile`/`downloadBlob`,
  already in `pdfUtils.js`) from the server's extracted structure — only
  the extraction step is server-side, CSV generation itself is local.

**Needs owner-supplied privacy-policy copy** disclosing this exception —
flagged `TODO-CONTENT` per CLAUDE.md §7, not generated here.

## Phase 4 — Find & Replace

Lowest-risk phase — fully client-side, reuses the exact mechanism the
Text tool's "click existing text to cover-and-edit" path already uses
(`docs/batches/batch-35-inline-text-plan.md`): per match found via
`usePdfDoc.getTextItems()` across all pages, add a paired
WHITEOUT + pre-filled TEXT annotation via the existing `addAnnotations`
API (single undo step), just triggered by a Find/Replace bar instead of a
user click. `Ctrl+F` opens the bar (same overlay-focus idiom as elsewhere
in this file).

**Files**: `FindReplaceBar.jsx`, `useFindReplace.js`, small `index.jsx`
wiring.

## Phase 5 — PDF → Word/Excel Export (client-side best-effort)

New deps (need final confirmation of exact package at kickoff): `docx`
for Word generation, `exceljs` for Excel. Word export reflows each page's
extracted text into paragraphs — no columns/tables/images. Excel export
is scoped to formatting Phase 3's already-extracted table data into a
real `.xlsx`, rather than inventing table-detection a second time for a
generic "any PDF to Excel" path that has no well-defined output without a
table source.

**Files**: `pdfExport.js` util, `package.json` (new deps), small
Toolbar/`index.jsx` wiring.

## Risks

- Phase 1's widget→page mapping isn't a first-class pdf-lib API; the
  `/P`-then-`Annots`-scan fallback is the standard workaround, verified
  against a real multi-page fillable PDF during the build.
- Phase 3 is a genuine, deliberate exception to this repo's core privacy
  promise — scoped to 3 named tools, consent-gated, text-only. Not a
  general precedent for other tools.
- Phase 5's fidelity is explicitly limited (text-only); set expectations
  in the tool's own UI copy, not just this doc.
