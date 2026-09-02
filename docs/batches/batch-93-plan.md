# Batch 93 — rewrite Era 1 PDF-tool content (AdSense low-value-content fix)

## Background

Content audit (see conversation history / `project_adsense_content_audit`
memory) found 11 PDF tools whose `TOOL_ABOUT` entries in
`client/src/data/toolPageContent.js` are rigid AI-template prose —
description/features/useCases/howToUse/whyUseUs/faqs, ~75-85% generic
filler, near-identical sentence shapes across tools:

`merge-pdf`, `split-pdf`, `compress-pdf`, `jpg-to-pdf`, `pdf-to-jpg`,
`word-to-pdf`, `rotate-pdf`, `watermark-pdf`, `protect-pdf`, `unlock-pdf`,
`pdf-editor`.

## Rules for every tool in this batch

1. **At least one genuinely non-interchangeable fact per tool** —
   disclosed technical limitation, specific edge case, named library/
   mechanism detail, or a concrete comparison with a sibling tool.
   Sourced by reading the tool's actual implementation code. Any claim
   about runtime behavior (not just static code reading) gets empirically
   tested before being stated as fact — no "we haven't verified" hedges
   in published copy; either test it or word it without the specific
   untested claim.
2. **Vary section structure per tool** — not every tool keeps the same
   6-section shape. `ToolPageShell.jsx` only renders a sub-section (Key
   Features / Who Should Use / How to Use / Why Choose / FAQ) if its data
   key is populated, so cutting a section is a content decision only, no
   shell code change needed.
3. **Prose style** — see `feedback_prose_style_no_ai_patterns` memory:
   no stock transitions ("Additionally," "Furthermore," "It's worth
   noting," "In conclusion"), no corporate-brochure tone, no forced
   parallel bullet structure, no vague superlatives ("seamless," "robust,"
   "cutting-edge," "user-friendly") — state the specific fact instead,
   uneven paragraph/bullet lengths are fine and expected.
4. **Review process**: draft shown per tool, applied only after approval,
   same as `merge-pdf` below — not batched sight-unseen.

## merge-pdf (done this batch)

Verified facts (read from `MergePDF.jsx`):
- `addFiles` dedupes incoming files by `.name` — two different files that
  happen to share a filename: the second is silently dropped, no warning.
- `merge()` uses `PDFDocument.load(buf, { ignoreEncryption: true })`.

Empirically tested (Node script replicating the exact merge() code path
against a real password-protected PDF, created via the app's own
`@pdfsmaller/pdf-encrypt`, same call `ProtectPDF.jsx` makes):
merge() does not throw, produces the correct page count, downloads
successfully — but the page(s) sourced from the encrypted file are
corrupted in the output (unreadable content stream; `pdfjs-dist` throws a
flate-stream decompression error and extracts empty text on that page).
The existing published claim ("Password-protected PDFs must be unlocked
first — this tool cannot bypass PDF passwords," implying a clean
rejection) is inaccurate — there's no rejection, no error, just a broken
page in an apparently-successful merge.

Structure: cut Key Features, cut Who Should Use This Tool, cut Why Choose
AWE-OS (all pure interchangeable filler for this tool) — down to 4
sections: short intro (with sibling-tool comparison folded in), How to
Use (unchanged, already specific), a "Good to know" callout (the
`limitation` prop) carrying both verified facts, and FAQ (revised).

## Remaining 10 tools

Same process, one at a time: read the actual tool component, find the
real fact(s), test empirically if the fact is a runtime-behavior claim,
propose structure + draft, get approval, then apply. Order not yet fixed
— will proceed roughly in `toolComponentMap.js` order:
`split-pdf`, `compress-pdf`, `jpg-to-pdf`, `pdf-to-jpg`, `word-to-pdf`,
`rotate-pdf`, `watermark-pdf`, `protect-pdf`, `unlock-pdf`, `pdf-editor`.

## Out of scope

- `toolGuideContent.js` (Tips/Mistakes) — not touched this batch unless a
  specific tool's tips turn out to be actively wrong (only content-data
  duplication, not established as wrong yet).
- Era 2 PDF tools and calculators — already adequate per the audit.
