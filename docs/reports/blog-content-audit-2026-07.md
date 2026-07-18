# Blog Content Audit — Content Sprint Hissa C

Date: 2026-07-18
Scope: all 41 posts in `client/src/data/blogPosts.js`. **Analysis only —
no edits, no deletions.** This table is input for the owner + advising
AI to make per-post decisions.
Method: programmatic pass over `BLOG_POSTS` (word counts, image/link
detection, filler-phrase and duplicate-title-template heuristics) plus
manual review of clusters and rate-sensitive content.

## Corpus-wide findings (apply to all/most posts, not per-row)

1. **Zero images anywhere.** `content` blocks only ever use
   `p`/`h2`/`ul`/`table`/`callout` — no `img` block type exists in the
   schema and none of the 41 posts use one. Every post's "has images?"
   answer is **No**.
2. **In-body content links are effectively non-functional.** `BlogPostPage.jsx`'s
   renderer only converts `<a href="...">label</a>` HTML tags and
   `**bold**` markers inline — it does **not** parse Markdown
   `[text](url)` syntax. Corpus-wide: **zero** working `<a href>` tags
   in body text, but **one** broken Markdown link (renders as literal
   visible text `[QR Code Generator](https://...)`) in
   `qr-code-generator-10-practical-uses`. Several posts also mention
   bare URLs as plain prose (e.g. "Open the GST Calculator at
   awe-os.com/tools/gst-calculator") — not broken, just a missed
   clickable-link opportunity. **The only real, functioning internal
   links on any post are the `relatedTools` widget at the bottom** (2-6
   entries per post) — that's what the "internal links" column below
   counts.
3. **AI title-templating pattern.** Several titles are the same
   generation template with the tool name swapped in — a mechanical
   tell, not a one-off:
   - "Unlocking the Potential[:/ of] X" — `qr-code-generator-10-practical-uses`, `ppf-calculator-india-maturity-80c-tax-benefits`
   - "Maximize Your Investments with the X Calculator" — `sip-calculator-mutual-fund-returns-india`, `ppf-calculator-2026-maturity-amount-withdrawal-rules-tax-benefits`
   - "Maximize Efficiency with X" / "Master Your Finances with the X" — `word-counter-online-writers-students`, `emi-calculator-home-car-personal-loan-guide`
   - "Effortlessly [Convert/Create] X with Y" — `unit-converter-online-length-weight-temperature`, `free-gst-invoice-generator-for-indian-freelancers`
4. **One hallucinated tool reference**: `how-to-create-a-personal-budget-in-india`
   repeatedly calls out "the **personal-budget-tool**" — a
   hyphenated-slug-shaped name that doesn't correspond to any real
   AWE-OS tool (not in `relatedTools` anywhere in the corpus, not a real
   route). Classic AI-generation artifact — invented a plausible-sounding
   tool name instead of naming a real one.
5. **No thin posts.** Shortest post is 601 words
   (`how-to-convert-word-to-pdf-free`); the <500-word threshold catches
   zero posts.
6. **9 of 41 posts are already `noindex: true`** — the team has
   evidently already self-identified some duplicates and suppressed
   them from search rather than deleting. Noted per-row below; this
   audit's duplicate-cluster findings mostly *confirm* those existing
   calls, but surface a few active (both-indexed) duplicates that
   weren't caught.

## Full per-post table

| # | Slug | Date | Words | Images | Int. links | Thin | Cluster | AI-filler risk | Verify rates |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `how-to-create-a-personal-budget-in-india` **(noindex)** | 2026-06-13 | 1040 | No | 2 | No | D | **High** (fake tool name) | — |
| 2 | `how-to-create-a-budget-that-works-for-you-in-india` | 2026-06-13 | 1006 | No | 2 | No | D | Low-Med | — |
| 3 | `merge-pdf-files-for-bank-documents-india` | 2026-06-02 | 1257 | No | 2 | No | — | Low | — |
| 4 | `qr-code-generator-10-practical-uses` | 2026-06-01 | 1211 | No | 2 | No | — | **Med-High** (template + broken MD link) | — |
| 5 | `emi-calculator-home-car-personal-loan` | 2026-06-01 | 620 | No | 2 | No | B | Low | — |
| 6 | `income-tax-calculator-india-2026-old-vs-new-regime` | 2026-06-01 | 1054 | No | 2 | No | C | Low | **Yes** — tax slabs |
| 7 | `gst-calculator-india-add-remove-gst` | 2026-06-01 | 1235 | No | 2 | No | A | Low-Med | — |
| 8 | `sip-calculator-mutual-fund-returns-india` | 2026-06-01 | 979 | No | 2 | No | — | Med (template) | — |
| 9 | `free-ats-resume-builder-get-past-ats-systems` | 2026-06-01 | 1216 | No | 2 | No | J | Low | — |
| 10 | `10-free-pdf-tools-you-need-in-2026` | 2026-06-01 | 1149 | No | 2 | No | I | Low | — |
| 11 | `word-counter-online-writers-students` | 2026-06-01 | 1086 | No | 2 | No | — | Med (template) | — |
| 12 | `how-to-create-strong-password-tips` | 2026-06-01 | 801 | No | 2 | No | — | Low-Med | — |
| 13 | `unit-converter-online-length-weight-temperature` | 2026-06-01 | 1166 | No | 2 | No | — | Med (template) | — |
| 14 | `age-calculator-uses-beyond-birthday` | 2026-06-01 | 985 | No | 2 | No | — | Med (2 filler hits) | — |
| 15 | `free-gst-invoice-generator-for-indian-freelancers` | 2026-06-01 | 1094 | No | 2 | No | — | Med (template) | — |
| 16 | `ppf-calculator-india-maturity-80c-tax-benefits` | 2026-06-01 | 1091 | No | 2 | No | E | **Med-High** (template) | **Yes** — PPF rate (7.1% cited) |
| 17 | `how-to-compress-images-without-losing-quality` | 2026-06-01 | 1087 | No | 2 | No | F | Low | — |
| 18 | `how-to-convert-pdf-to-word-free` | 2026-06-01 | 1241 | No | 2 | No | — | Low | — |
| 19 | `emi-calculator-home-car-personal-loan-guide` **(noindex)** | 2026-06-01 | 1020 | No | 2 | No | B | Med (template) | — |
| 20 | `income-tax-calculator-india-2025-old-vs-new-regime` **(noindex)** | 2026-06-01 | 1478 | No | 2 | No | C | Low-Med (1 filler hit) | **Yes** — tax slabs |
| 21 | `gst-calculator-india-add-or-remove-gst` **(noindex)** | 2026-06-01 | 826 | No | 2 | No | A | Low | — |
| 22 | `bmi-calculator-for-indians-icmr-vs-who` | 2026-06-01 | 935 | No | 2 | No | — | Low-Med | — |
| 23 | `how-to-merge-pdf-files-for-free` | 2026-06-01 | 1186 | No | 2 | No | — | Low | — |
| 24 | `what-is-gst-calculator-complete-guide-indians-2026` **(noindex)** | 2026-05-24 | 740 | No | 2 | No | A | Low | — |
| 25 | `how-to-use-gst-calculator-online` **(noindex)** | 2026-05-24 | 683 | No | 2 | No | A | Low | — |
| 26 | `ppf-calculator-2026-maturity-amount-withdrawal-rules-tax-benefits` **(noindex)** | 2026-05-21 | 699 | No | 2 | No | E | Med (template) | **Yes** — PPF rate |
| 27 | `gst-calculator-india-2026-complete-guide` | 2026-05-21 | 751 | No | 2 | No | A | Low | — |
| 28 | `best-free-ai-tools-for-students-2025` | 2025-04-18 | 701 | No | 3 | No | — | Low | — |
| 29 | `how-to-compress-pdf-without-losing-quality` | 2025-04-25 | 610 | No | 3 | No | — | Low | — |
| 30 | `qr-code-marketing-guide-small-business` | 2025-05-02 | 741 | No | 3 | No | — | Low | — |
| 31 | `resume-tips-beat-ats-systems-2025` | 2025-05-07 | 661 | No | 3 | No | J | Low | — |
| 32 | `top-10-free-online-calculators-for-students` **(noindex)** | 2025-05-10 | 795 | No | 6 | No | H | Low | — |
| 33 | `how-to-convert-word-to-pdf-free` | 2025-05-13 | 601 | No | 4 | No | G | Low | — |
| 34 | `how-to-build-resume-no-experience-2025` | 2025-05-16 | 721 | No | 3 | No | J | Low | — |
| 35 | `best-free-pdf-tools-for-students` | 2025-05-17 | 696 | No | 4 | No | I | Low | — |
| 36 | `ai-writing-tools-comparison-2025` | 2025-05-18 | 728 | No | 3 | No | — | Low | — |
| 37 | `free-calculator-tools-for-students` **(noindex)** | 2025-05-19 | 743 | No | 4 | No | H | Low | — |
| 38 | `word-to-pdf-complete-guide-2025` | 2025-05-20 | 734 | No | 4 | No | G | Low | — |
| 39 | `sip-vs-fd-india-2025` | 2026-05-20 | 1411 | No | 3 | No | — | Low | **Yes** — FD rates, date/title year mismatch |
| 40 | `new-vs-old-tax-regime-fy-2025-26` | 2026-05-20 | 1024 | No | 3 | No | C | Low | **Yes** — tax slabs |
| 41 | `image-compression-guide-2025` | 2025-05-21 | 695 | No | 3 | No | F | Low | — |

## Duplicate / overlapping-topic clusters

| Cluster | Posts | Status | Note |
|---|---|---|---|
| **A — GST calculator "how to use"** | #24, #25, #27, #7, #21 (5 posts) | 3 already noindex, 2 live | Same core topic ("how to use the GST calculator") told 5 times. #7 (`add-remove-gst`) and #21 (`add-or-remove-gst`, noindex) are near-identical slugs/topic. Largest cluster in the corpus. |
| **B — EMI calculator** | #5, #19 | #19 already noindex | Same topic, near-identical slug (`...-loan` vs `...-loan-guide`). Already handled. |
| **C — Old vs new tax regime** | #6, #20, #40 | #20 already noindex, #6 and #40 both live | #6 and #40 cover the exact same comparison; #40 additionally has the FY-labeled angle. |
| **D — Personal budgeting** | #1, #2 | #1 already noindex | Same topic; #1 also has the fake-tool-name issue, reinforcing it as the weaker twin already correctly suppressed. |
| **E — PPF calculator** | #16, #26 | #26 already noindex | Same topic, same title template. Already handled. |
| **F — Image compression** | #17, #41 | **Both live — not yet deduped** | `how-to-compress-images-without-losing-quality` and `image-compression-guide-2025` cover the same topic; neither is noindexed. |
| **G — Word to PDF conversion** | #33, #38 | **Both live — not yet deduped** | `how-to-convert-word-to-pdf-free` and `word-to-pdf-complete-guide-2025` cover the same topic; neither is noindexed. |
| **H — Calculators for students roundup** | #32, #37 | Both already noindex | Already handled. |
| **I — PDF tools roundup** | #10, #35 | Both live | Milder overlap (one general "10 tools in 2026", one "for students") — same theme, different angle. Lower priority than F/G. |
| **J — Resume / ATS** | #9, #31, #34 | All live | 3 posts, genuinely distinct angles (general ATS tips / tool promotion / no-experience-specific) — mildest overlap, flagged for awareness not urgency. |

**Two active (both-indexed) duplicate pairs — F and G — are the clearest
candidates for a same-topic-as-already-noindexed-siblings pattern that
hasn't been applied yet.**

## Rate/fact-sensitive content ("verify" flags)

Posts citing specific numeric rates that India revises periodically
(union budget tax slabs, PPF interest rate, bank FD rates) — this audit
does not have live authoritative data to confirm whether the cited
figures are still current for 2026, so these are flagged for the owner
to verify rather than asserted as wrong:

- **Tax slabs** (0/5/10/15/20/25/30%, new regime): #6, #20, #40 — revised in most Union Budgets.
- **PPF interest rate** (7.1% cited): #16, #26 — reviewed quarterly by the government.
- **FD rates**: #39 (`sip-vs-fd-india-2025`) — also has a date/title year mismatch (dated 2026-05-20, title says "in 2025").

## Summary

- **41 posts total**, 9 already `noindex: true`.
- **0 thin** (<500 words) — content length is not a corpus problem.
- **0 with real body images**; **1 broken in-body link** (Markdown syntax
  not rendered); in-body linking generally underused (plain-text URL
  mentions instead of real links) — a template/renderer-level pattern
  across the whole corpus, not a per-post editorial issue.
- **10 clusters of topic overlap** covering 24 of the 41 posts; 7
  clusters already have the weaker twin noindexed, **2 clusters (F, G —
  4 posts) are live duplicates with no noindex applied to either side**.
- **5 posts show a distinct AI-title-templating fingerprint** (exact
  phrase reuse across unrelated topics); **1 post has a fabricated tool
  name**.
- **5 posts cite rate-sensitive figures** that should be checked against
  current 2026 numbers before being trusted as-is.

### Rough bucketing (for the owner/advising AI's per-post pass)

- **Solid, no action needed (~24 posts)**: no cluster membership, no
  filler/template flag, no rate-verify flag. Roughly posts #3, #9, #10,
  #12, #14 (borderline), #18, #22, #23, #28, #29, #30, #31, #32, #33,
  #34, #35, #36, #37, #38 and similar — the majority of the corpus.
- **Need-edit candidates (~13 posts)**: cluster members that are *live*
  and worth a rewrite/differentiation pass rather than removal (A's live
  members #7/#27, F's #17/#41, G's #33/#38, I's #10/#35, J's 3 posts),
  plus the 5 template/filler-flagged posts (#4, #8, #11, #13, #15, #16)
  and the 3 rate-verify posts if their numbers turn out stale.
- **Consider-removal candidates (~4 posts)**: the weaker twin in
  clusters where a stronger, already-indexed sibling exists and the
  noindex flag suggests the team already made this call in spirit —
  #1 (fake tool name, worst offender), plus the already-noindexed
  #19, #21, #26 could be formally deleted rather than kept as dead
  noindexed weight, if the owner wants to actually shrink the corpus
  instead of just suppressing these from search.

No edits made. This table is the input for per-post decisions.
