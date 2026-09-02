# Batch 94 — blog content fixes (structural bug + urgent factual corrections)

## Background

Blog post audit (same session as batch-93) found `client/src/data/blogPosts.js`
(33 posts) has two distinct problems, more severe than the tool-page
content audited in batch-93:

1. A structural bug affecting 11 of 33 posts: each post's `content` array
   has an `h2` block reading "Frequently Asked Questions" immediately
   followed by a `p` block starting "Conclusion: ...". This is wrap-up
   text mislabeled as an FAQ heading. `BlogPostPage.jsx` separately
   renders the real `faqs` array under its own hardcoded "Frequently
   Asked Questions" `h2` (line 370), so every affected post shows **two**
   "Frequently Asked Questions" headings on the page — the same class of
   bug as the tool-page duplicate-FAQ issue fixed in batch-92.

2. The 3 current homepage-linked posts (`how-to-create-a-budget-that-
   works-for-you-in-india`, `merge-pdf-files-for-bank-documents-india`,
   `qr-code-generator-10-practical-uses`) contain actual factual errors,
   not just generic filler — e.g. a table showing PDF file sizes in
   rupees ("₹12,75,000" as a file size, repeated as "₹12,75,000 bytes"
   in the prose), the same hallucinated number reused as fake revenue in
   an unrelated post (appears in 9 of 33 posts total in different
   nonsensical contexts), fabricated "real" customer case studies with
   invented names/numbers, and a false claim that QR codes are used by
   "government bodies like SEBI" (SEBI is India's securities regulator,
   unrelated to QR codes). User directive: these are misleading, not
   just low-value, and should not stay live even temporarily.

## Scope for this batch (two parts, in order)

### Part 1 — structural fix, all 11 affected posts

Rename the mislabeled `h2` from "Frequently Asked Questions" to
"Conclusion" in exactly these 11 posts (verified via script — each has
the identical h2-then-"Conclusion:"-paragraph pattern; 8 other posts
also have a "Frequently Asked Questions" h2 but are NOT bugged, followed
by genuine FAQ lead-in text or a callout, and must not be touched):

`how-to-create-a-budget-that-works-for-you-in-india`,
`merge-pdf-files-for-bank-documents-india`,
`qr-code-generator-10-practical-uses`,
`gst-calculator-india-add-remove-gst`,
`sip-calculator-mutual-fund-returns-india`,
`10-free-pdf-tools-you-need-in-2026`,
`word-counter-online-writers-students`,
`unit-converter-online-length-weight-temperature`,
`free-gst-invoice-generator-for-indian-freelancers`,
`ppf-calculator-india-maturity-80c-tax-benefits`,
`how-to-compress-images-without-losing-quality`.

The conclusion paragraph text itself is legitimate wrap-up prose in all
11 cases (not touched) — only the heading label is wrong.

### Part 2 — urgent factual strip, 3 homepage posts only

Not a full rewrite (that's future work, out of scope here). Delete or
correct only the specific false/fabricated elements:
- `how-to-create-a-budget-that-works-for-you-in-india`: delete the
  fabricated "Real Examples with ₹ Calculations" section (3 invented
  personas with made-up numbers presented as fact).
- `merge-pdf-files-for-bank-documents-india`: delete the "Bank Document
  Types: Page Count and File Size Reference" table (file sizes shown in
  rupees) and the "Real Examples with ₹ Calculations" section that
  repeats the same error and adds more fabricated examples.
- `qr-code-generator-10-practical-uses`: delete the "QR Code Usage and
  Investment by Industry in India" table and "Real Examples with ₹
  Calculations" section (fabricated ROI figures, reuses the same
  hallucinated ₹12,75,000 number), and fix/remove the false "government
  bodies like SEBI" claim in the `faqs` array.

Leaving a visible gap where a deleted section was is acceptable per
user direction — correctness over completeness for this pass. Full
rewrite of these 3 posts, and audit of the remaining 30, is future work.

## Out of scope this batch

- Auditing/fixing the other 30 posts.
- The near-duplicate post clusters flagged earlier (4 GST posts, 3
  resume posts, 2 calculator-roundup posts, 2 PDF-roundup posts) — not
  yet investigated.
- Full rewrite of the 3 homepage posts beyond removing false content.

## Verification

- Confirm exactly 11 h2 renames applied, the other 8 legitimate
  "Frequently Asked Questions" headings untouched.
- Confirm the deleted sections are fully removed (no orphaned table/p
  blocks) and the `content` array stays valid.
- Full rebuild; spot-check the 3 homepage posts' rendered HTML no longer
  contains the flagged false claims.
