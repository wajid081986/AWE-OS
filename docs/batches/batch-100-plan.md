# Batch 100 — fix remaining Category C posts

## Background

The original 6 "Category C" posts (lower-severity unsourced-but-
plausible pricing claims, not the urgent reused-magic-number
fabrication pattern) — 2 of the 6 (`10-free-pdf-tools-you-need-in-2026`,
`how-to-merge-pdf-files-for-free`) were already retired in batch-99.
4 remain. Re-read all 4 in full before deciding on fixes rather than
applying a blanket treatment.

## Findings

- `word-counter-online-writers-students`: re-checked — no actual
  fabricated cost-comparison claim exists here. The ₹5,000 freelance-
  writer example is a plausible illustrative scenario ("writer meets
  client's word-count expectations"), not a claim about savings versus
  a paid alternative. **No fix needed.**
- `unit-converter-online-length-weight-temperature`: the invented
  commodity prices ("100 pounds of cement costs ₹3,000," "16 ounces of
  an ingredient, costing ₹800") are clearly signaled hypotheticals for
  illustrating a conversion, not factual or competitive claims. Lower
  priority than the other two, but the pricing detail is irrelevant to
  the actual point (the conversion accuracy) and adds unnecessary risk
  — tightened to drop it.
- `how-to-compress-images-without-losing-quality`: genuinely the same
  pattern as the already-fixed posts — invented bandwidth-cost-per-MB
  figures (₹0.50/MB, ₹1/MB, ₹2/MB) used to derive specific fabricated
  "cost savings" (₹200, ₹225, ₹6,000). The underlying compression math
  (400 MB, 225 MB, 3 GB saved) is correct arithmetic and kept; the
  invented monetary conversion is removed and replaced with the
  genuine value (page load speed, Core Web Vitals).
- `how-to-convert-pdf-to-word-free`: same pattern — a comparison table
  claims "Premium Software: ₹5,000" as a specific price, and three
  examples build fabricated savings figures (₹5,000, ₹1,000, ₹5,000/
  month) around invented per-conversion costs. Removed the specific
  invented prices; reframed the examples around genuine, verifiable
  value (no per-file limit, browser-based speed, privacy for legal
  documents) instead of manufactured savings numbers.

## Scope

Edit `unit-converter-online-length-weight-temperature`,
`how-to-compress-images-without-losing-quality`, and
`how-to-convert-pdf-to-word-free`. No structural changes, no heading
changes — text-only edits within the existing "Real Examples" sections
(and one table cell in the PDF-to-Word post). `word-counter-online-
writers-students` untouched.

## Verification

Full rebuild; confirm no invented ₹-pricing claims remain in the 3
edited posts; confirm the legitimate compression-ratio math in the
Image Compressor post is preserved exactly.
