# Batch 55 — Fix dead blog links in blogPosts.js

## Context

`docs/backlog.md` (2026-08-04 entry) flagged 8 dead tool-slug references in
`client/src/data/blogPosts.js` found via a GSC soft-404 crawl audit — Google
found and crawled `/tools/<slug>` links from blog post bodies that were
never built. A prior batch fixed the *serving* side (404 handling); this
batch fixes the *source* (the dead links themselves), so Google stops
re-discovering them.

## Investigation findings

The backlog's list of 8 was a partial sample, not exhaustive. A full
programmatic scan of every `relatedTools[].slug` and inline `/tools/<slug>`
href against `toolRegistry.js` (registry + `SLUG_ALIASES`) found **26 dead
references**: 25 `relatedTools` entries across 16 posts, plus 1 inline
callout link (`/tools/budget-calculator`, in
`how-to-create-a-budget-that-works-for-you-in-india`).

`BlogPostPage.jsx:388` already guards on
`post.relatedTools && post.relatedTools.length > 0` — an empty array is
already a safe, existing rendering path (no broken UI).

## Classification (user-approved)

**Group A — remap to the real tool** (label already names it, just an
outdated/wrong slug — not a content decision):
- `loan-emi-calculator` (×2) → `loan-calculator`
- `income-tax-calculator` (×3) → `tax-calculator`
- `awe-os-pdf-editor` → `pdf-editor`
- `image-resizer` → `image-compressor` (post is literally about image
  compression)

**Group B — remove, no real tool exists** (18 entries): `barcode-generator`,
`url-shortener`, `interest-rate-tracker`*, `savings-calculator`*,
`compound-interest-calculator`*, `investment-growth-calculator`*,
`ai-cover-letter-generator`, `job-interview-simulator`, `pdf-converter-pro`,
`character-counter`, `grammar-checker`, `security-check`,
`time-zone-converter`, `retirement-calculator`, `sebi-guidelines`,
`file-converter`, `health-risk-assessment`, `awe-os` (a stray brand mention,
not a real tool reference to begin with).
(* = also appears in a Group C substitution below instead of a bare removal)

**Group C — removal leaves `relatedTools: []`; substitute a real,
topically-relevant tool where one genuinely fits, otherwise leave empty**:
- `emi-calculator-home-car-personal-loan`: Interest Rate Tracker + Savings
  Calculator → **FD Calculator** + **SIP Calculator**
- `sip-calculator-mutual-fund-returns-india`: Compound Interest Calculator +
  Investment Growth Calculator → **ROI Calculator** + **FD Calculator**
- `free-gst-invoice-generator-for-indian-freelancers`: AWE-OS + SEBI
  Guidelines → **GST Calculator**
- `qr-code-generator-10-practical-uses`: Barcode Generator + URL Shortener
  → leave `[]` (no real substitute)
- `free-ats-resume-builder-get-past-ats-systems`: AI Cover Letter Generator
  + Job Interview Simulator → leave `[]` (linking `resume-builder` would be
  self-referential — it's the post's own subject)
- `word-counter-online-writers-students`: Character Counter + Grammar
  Checker → leave `[]` (word-counter already covers char count; no real
  grammar-checker exists)

**Inline link fix**: the `budget-calculator` callout in
`how-to-create-a-budget-that-works-for-you-in-india` — remove the dead
`links` array (drops the button, keeps the informational callout text
as-is; no real budget-calculator tool exists to substitute).

## Plan

Single edit pass over `client/src/data/blogPosts.js` applying the
classification above — only `relatedTools[].slug` values (and occasionally
`.label`) and the one callout's `links` field are touched; no other content,
no post `slug`/`title`/body text edited anywhere. Re-run the scan script
after editing to confirm zero dead references remain. Build check, single
commit (`batch-55: fix dead tool-slug links in blogPosts.js`), full diff
shown before commit.
