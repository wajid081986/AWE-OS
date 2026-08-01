# Batch 44 — PdfEditorV2 Edit-Text & Image-Insert fixes

Follow-up to the PdfEditorV2 audit (2026-08-01). Scope: B1–B4 (Edit Text)
and B9 (Image insert position) only — B5–B8/B10–B14 were not reproduced
in the audit and are explicitly out of scope for this batch.

## Unit 1 — Edit Text fixes (B1, B2, B3, B4)

Root cause for B1/B2/B3: `usePdfDoc.js`'s `getTextItems()` returns one
padded "hit-box" per text run (padded ±0.5×fontHeight on every side, for
generous click-detection), and both consumers (`PageCanvas.jsx`'s
click-to-edit, `index.jsx`'s Replace All) wrongly reuse that padded box
as the text annotation's literal `fontSize`/`x`/`y`/`w`/`h` — that's what
makes the font ~2x too large, shifted up, and (once font is fixed) too
narrow.

Files:
1. `usePdfDoc.js` — `getTextItems()`: keep the existing padded
   `x/y/width/height` fields unchanged (still used for click hit-testing
   and by `pdfExport.js`'s line-grouping — not touching those call
   sites). Add new fields per item: `fontSize` (real unpadded font
   height), `layoutX/layoutY/layoutWidth` (unpadded position/width), and
   `fontFamily` (mapped from pdf.js's
   `textContent.styles[item.fontName].fontFamily` to one of this
   project's `FONT_FAMILIES` — substring match: contains "courier"/"mono"
   -> Courier New, contains "times"/"serif"/"georgia" -> Times New Roman,
   else Helvetica, matching current default).
2. `PageCanvas.jsx` (TEXT-tool click-to-edit) — whiteout box keeps using
   padded `hit.x/y/width/height` (that's correct, unchanged). The new
   TEXT annotation uses `hit.layoutX/layoutY`, `hit.fontSize`, a small
   (not full-padded) width allowance on `hit.layoutWidth`, and
   `hit.fontFamily`.
3. `index.jsx` (`handleReplaceAll`) — identical fix, mirrored, so Find &
   Replace matches Edit Text visually.

Explicit non-goals: text color still defaults to black on edit —
pdf.js's `getTextContent()` doesn't expose fill color at all (would need
content-stream operator parsing). Bold/italic detection is unreliable
from `TextStyle` alone, so it stays `false` by default (unchanged) —
only `fontFamily` improves.

## Unit 2 — Image insert position (B9)

`PageCanvas.jsx`'s `TOOLS.IMAGE` click branch: currently places the
click point as the image's top-left corner. Fix: center the image on
the click point.

## Verification (after each unit)

- `npm run build` in `client/` (or `vite build` for a fast check).
- Playwright: load a generated test PDF, click existing text with Edit
  Text, assert computed `fontSize` is not ~2x too large, assert box
  position lands near the real glyph position, screenshot to confirm the
  full string is visible un-wrapped; for image insert, arm the tool,
  click, assert the annotation is centered on the click point.

## Risks

- Font-family detection is best-effort — `TextStyle.fontFamily` for
  embedded/subset fonts is often a generic fallback, not the "true"
  family name.
- Changing `getTextItems`'s return shape only adds fields, doesn't
  rename/remove existing ones.

No push/deploy in this batch.
