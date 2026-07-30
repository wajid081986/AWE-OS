# Batch 39 — PdfEditorV2 Phase 9: Security (Redact, Permissions)

Continues the auto-mode 37→41 sequence (see `batch-37-plan.md`). No new
dependency — both features reuse `pdf-lib`, which `ProtectPDF.jsx` already
confirmed supports encryption (`pdf.encrypt()`).

## Scope

1. **Redact tool** — a new box-drag annotation tool, alongside Whiteout on
   the canvas, that draws a solid opaque black rectangle.
2. **Permissions / Protect** — a new toolbar action that flattens the
   current document (annotations + form values, same as Download) and then
   encrypts it with an optional open password, an owner password, and a
   granular permissions profile, ported from `ProtectPDF.jsx`.

## Honesty constraint carried over from Whiteout

`index.jsx`'s existing FAQ already discloses that Whiteout "draws a
permanent white rectangle... the underlying text itself is not removed
from the file" — pdf-lib has no content-stream text-removal API (same
limitation noted for true inline text editing in
`batch-35-inline-text-plan.md`). Redact is the same mechanism in black, so
it gets the same disclosure, not a stronger claim. The Properties Panel
entry for Redact includes a one-line note referencing this; no copy in the
app calls Redact "permanent removal" or "secure redaction."

## New files

- `SecurityModal.jsx` — one modal, ported field-for-field from
  `ProtectPDF.jsx`: open password + confirm (with the same strength
  meter), and a permissions checklist (printing high-res / modifying /
  copying / annotating / filling forms / accessibility / assembly) each
  defaulting to `ProtectPDF.jsx`'s existing profile. Unlike
  `DocumentToolsModal`, Apply here doesn't reload the live editor — see
  below.

## Modified

- `constants.js` — `TOOLS.REDACT`, added to `BOX_DRAG_TOOLS`; keyboard
  shortcut `x` (only unused letter among the tool's initials); default
  style `{ color: '#000000' }` with no opacity/fill override exposed
  anywhere (a redaction that can be made translucent defeats the purpose).
- `AnnotationLayer.jsx` — `RedactShape`, a solid `background: '#000000'`
  div, opacity hardcoded to 1 (never reads `ann.opacity`).
- `Toolbar.jsx` — Redact button next to Whiteout in the main tool row; new
  "Protect" button (icon 🔐) opening `SecurityModal` — kept separate from
  the existing "Document" dropdown because Document tools bake into the
  live document and editing continues, while Protect ends the session with
  an encrypted download (reloading an encrypted buffer back into pdf.js
  for continued canvas editing is out of scope and not how
  `ProtectPDF.jsx`/`UnlockPDF.jsx` behave either).
- `PropertiesPanel.jsx` — Redact entry: Delete button only, plus the
  one-line disclosure note above (no color picker — color is fixed).
- `index.jsx`:
  - `drawAnnotation`'s switch gains `case TOOLS.REDACT`: draws an opaque
    black `drawRectangle` (`color: rgb(0,0,0)`, `opacity: 1`, no border),
    ignoring any stray `ann.opacity`.
  - `handleDownload`'s inline "load pdf-lib doc, draw every annotation,
    fill+flatten form fields" block is extracted into a reusable
    `buildFlattenedPdfLibDoc()` returning the in-memory `PDFDocument`
    (not yet `.save()`d) — `handleDownload` now calls it then `.save()`s
    and downloads; the new `handleApplyProtection(settings)` calls it,
    then `.encrypt(settings)`, then `.save()`s and downloads as
    `${baseName}-protected.pdf`. No behavior change to the existing
    Download path, just de-duplicating the flatten logic between it and
    the new Protect action.
  - new `showSecurityModal` state, wired to Toolbar's Protect button and
    `handleApplyProtection`.

## Scoping calls

- Protect is a terminal, one-shot action (matches `ProtectPDF.jsx`): it
  downloads an encrypted copy but does not attempt to reload the encrypted
  bytes back into the live pdf.js canvas. The user keeps editing the
  unencrypted in-memory document if they want to keep working, or starts
  over by re-uploading if they need to edit the encrypted result.
- Redact is not a new undo-tier concept — it's a plain annotation like
  Whiteout, so it lives in the normal annotation undo/redo stack (unlike
  Phase 7/8's document-structure ops).
- No new "restrict without password" toggle beyond what pdf-lib already
  gives via an empty `userPassword` — `SecurityModal` allows leaving the
  open-password fields blank while still setting an owner password and
  permissions, matching `UnlockPDF.jsx`'s documented understanding that
  owner-only restriction is a valid PDF security mode.

## Risk

Encryption is one-way in this session (no "verify by reopening" step in
the editor itself) — needs a live QA pass: apply Redact and confirm the
exported PDF has no recoverable text/image under the box via a text
selection check in a PDF viewer; apply Protect with a password and confirm
the downloaded file actually prompts for it.
