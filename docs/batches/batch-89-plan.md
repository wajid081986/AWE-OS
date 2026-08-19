# Batch 89 — PDF↔Word Conversion Fidelity (client-side only)

## Context

User reported both `word-to-pdf` and `pdf-to-word` tools lose formatting/structure.
Initial ask was to move both to server-side LibreOffice headless conversion. This
was flagged as a direct conflict with CLAUDE.md §1's core privacy promise ("file
processing happens client-side — user files are never uploaded to a server. This
is the core product promise; no change may weaken it") — both tools' own FAQ copy
also publicly claims files are never sent to a server. Per CLAUDE.md's instruction
to STOP and ask on conflicts, the user was presented options and chose to stay
100% client-side and improve fidelity within that constraint instead.

No new npm dependencies are needed: `docx`, `jspdf`, `mammoth`, `html2canvas`, and
`pdfjs-dist` are all already in `client/package.json`.

## Scope

### 1. `client/src/pages/tools/pdf/PDFtoWord.jsx`

- Extract PDF.js text items with position (`transform`) and `fontName`/height
  instead of just concatenating `item.str`.
- Group items → lines (by y-coordinate) → paragraphs (by y-gap threshold).
- Heading heuristic: font-size above the page's median body size → DOCX
  `HeadingLevel.HEADING_1`/`HEADING_2`.
- Bold heuristic: `fontName` containing "Bold"/"-B" → `TextRun({ bold: true })`.
- Build a `docx` `Document` from the detected paragraphs; `Packer.toBlob()` →
  download `.docx` directly. Remove the `.txt` download step entirely.
- UI: "Download as Text File (.txt)" button → "Download as Word Document (.docx)".
- Update STEPS/FAQS/ABOUT copy: remove the "Save As → Word" manual instruction,
  keep privacy claims (still true — no server involved), add an honest
  limitation that tables/images/exact fonts are not reconstructed — only
  reading-order text with heading/bold structure.

### 2. `client/src/pages/tools/pdf/WordToPDF.jsx`

- Replace the manual raw-text line-loop (fixed 11pt Helvetica, no structure)
  with a parser over mammoth's existing `html` output.
- Walk the HTML via `DOMParser` (browser-only, runs client-side inside the
  conversion handler): map `h1`-`h6` → larger/bold jsPDF font sizes, `p` →
  normal paragraphs, `strong`/`b` → bold runs, `em`/`i` → italic, `ul`/`ol`/`li`
  → indented bullet/numbered lines, blank line between block elements.
- Keep `doc.splitTextToSize()` per run for wrapping and the existing page-break
  cursor logic, but switch font weight/size/style per element type instead of
  one fixed style throughout.
- Output stays real selectable/searchable PDF text — no html2canvas, no
  rasterization (explicitly rejected in favor of fidelity-vs-text-layer
  tradeoff discussion with user).
- Update STEPS/FAQS/ABOUT copy: now say headings/bold/italic/lists are
  preserved (not just "basic formatting"); keep the limitation that text
  boxes, tables, images, and multi-column layouts are not reconstructed.

### Not in scope

- No server changes, no LibreOffice, no new routes.
- No protected zones touched (Admin Panel, Login, internal namespace).
- No new npm dependencies.
- Privacy promise (100% client-side processing) stays fully intact; copy
  continues to truthfully state files are never uploaded to a server.

## Risks

- Font-size/y-gap heuristics for PDF→Word heading/paragraph detection are
  approximate — multi-column PDFs or unusual embedded fonts may misgroup
  lines. This is the same known limitation class as today's PDF.js text
  extraction, not a regression.
- Manual HTML→jsPDF parsing needs to cover mammoth's actual output tags
  (mammoth's output is fairly plain: p, h1-h6, strong, em, ul/ol/li, and
  occasionally img). Images will be a documented limitation — dropped/noted,
  not rendered — since rendering raster images into jsPDF text flow is out
  of scope for this batch.
