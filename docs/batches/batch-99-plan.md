# Batch 99 — retire 2 weak duplicate posts, revive 1 dormant post, fix 5 more FAQ-heading bugs

## Background

Continuation of the blog near-duplicate-cluster audit (GST quartet
merged in batch-97). Analysis and this plan approved by user across
several turns this session.

## 1. Cluster B — retire `10-free-pdf-tools-you-need-in-2026`

Weak, generic, Category-C post (invented monthly software-cost
comparisons, headings don't name specific tools) vs
`best-free-pdf-tools-for-students` (strong, specific, student-
submission-framed, names 8 tools each with a real detail). Both
indexable — genuine cannibalization risk skewed entirely toward the
weak post.

- Remove `10-free-pdf-tools-you-need-in-2026` entirely.
- Redirect `/blog/10-free-pdf-tools-you-need-in-2026` -> `/blog/best-free-pdf-tools-for-students`.
- No content merge — nothing in the weak post adds value the strong
  post lacks.

## 2. Cluster C — retire `how-to-merge-pdf-files-for-free`

Generic post vs `merge-pdf-files-for-bank-documents-india` (India-
bank-documents-specific, already cleaned of fabrications in batch-94/
95). The weak post also contains a **false claim**: its feature table
says Merge PDF has a paid tier at "₹2,500/year" — the tool has no paid
tier, confirmed against the actual implementation in batch-93.

- Remove `how-to-merge-pdf-files-for-free` entirely.
- Redirect `/blog/how-to-merge-pdf-files-for-free` -> `/blog/merge-pdf-files-for-bank-documents-india`.
- No content merge — its generic use-cases are already covered by the
  survivor's existing "Who Should Use This" list.

## 3. Cluster A — fold into `free-calculator-tools-for-students`, make it live

Both `top-10-free-online-calculators-for-students` and
`free-calculator-tools-for-students` are currently `noindex: true` —
no active cannibalization, but both otherwise decent content sitting
invisible to search. Rather than a plain retire-and-redirect:

- Add two new sections to `free-calculator-tools-for-students`,
  adapted from `top-10-free-online-calculators-for-students`'s unique
  content (bonus-tools list, browser-vs-apps argument), inserted
  before the closing summary section.
- Extend the closing "All Calculators Available Free" bullet list to
  include the 4 newly-added tools, so the summary matches the body.
- Remove `noindex: true` from `free-calculator-tools-for-students`.
- Remove `top-10-free-online-calculators-for-students` entirely.
- Redirect `/blog/top-10-free-online-calculators-for-students` -> `/blog/free-calculator-tools-for-students`.

## 4. Fix 5 more instances of the batch-94 FAQ-heading bug

batch-94's fix only matched paragraphs starting literally with
"Conclusion:" — these 5 have the identical bug (a `content`-array
"Frequently Asked Questions" h2 followed by wrap-up prose instead of
real Q&A, while actual FAQs live in the separate `faqs` array,
rendered under the shell's own duplicate heading) with different
wording that evaded the original regex:

- `free-ats-resume-builder-get-past-ats-systems` — rename h2 to "Conclusion".
- `age-calculator-uses-beyond-birthday` — rename h2 to "Conclusion".
- `how-to-convert-pdf-to-word-free` — rename h2 to "Conclusion" (the
  paragraph was literally labeled "Conclusion paragraph:" — an
  unmistakable generation artifact).
- `bmi-calculator-for-indians-icmr-vs-who` — **delete** the mislabeled
  h2 + its one paragraph, since a correct standalone "Conclusion"
  section already immediately follows it; renaming would create two
  adjacent "Conclusion" headings.
- `how-to-merge-pdf-files-for-free` — moot, removed entirely per #2.

## Verification

- Full rebuild; confirm route count drops by 3 (2 retirements + Cluster A retirement), noindex count drops by 1 (Cluster A's survivor going live).
- Confirm all 3 new redirects resolve to the correct survivor.
- Confirm the merged content renders on `free-calculator-tools-for-students` and it's no longer `noindex`.
- Confirm each of the 4 FAQ-heading fixes renders exactly one "Frequently Asked Questions" heading (not two, not zero).
