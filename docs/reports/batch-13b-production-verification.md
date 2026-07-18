# Batch 13b — Production Verification Report

Date: 2026-07-18
Verified against: `https://www.awe-os.com` (live production)
PR: #16 (`batch-13b-blog-retitles` → `main`), merge commit `2be897c`

## Overall result: **PASS**

## 1. Removed tax-post URLs — redirect check

| URL | Status | `Location` header |
|---|---|---|
| `/blog/income-tax-calculator-india-2026-old-vs-new-regime` | 308 | `/blog/new-vs-old-tax-regime-fy-2025-26` |
| `/blog/income-tax-calculator-india-2025-old-vs-new-regime` | 308 | `/blog/new-vs-old-tax-regime-fy-2025-26` |

Both correct — 308 is Vercel's documented mapping for
`"permanent": true` (SEO-equivalent to 301), established in Batch 13's
production verification.

## 2. `/blog` and content checks

| Check | Expected | Result |
|---|---|---|
| `/blog` HTTP status | 200 | 200 |
| Unique `/blog/:slug` links on `/blog` | 33 | **33** |
| References to either removed tax post on `/blog` | 0 | **0** |
| `qr-code-generator-10-practical-uses` new title present | "10 Practical Uses for QR Codes in India (Free Generator)" | **Present** (h1 + JSON-LD + breadcrumb, 3 occurrences) |
| `ppf-calculator-india-maturity-80c-tax-benefits` new title present | "PPF Calculator: Maturity Value & Section 80C Tax Benefits" | **Present** (JSON-LD name, breadcrumb, h1) |
| PPF post's updated rate sentence live | "As of the July–September 2026 quarter, it stands at 7.1% per annum" + National Savings Institute mention | **Both present** |

## 3. `main` tip

```
$ git fetch origin && git log origin/main -3 --oneline
2be897c Merge pull request #16 from wajid081986/batch-13b-blog-retitles
209ffa3 batch-13b: implementation + verification log
84bfbc8 batch-13b: 2 owner-approved content edits (rate-currency caveats)
```

Confirmed: `origin/main` tip is the PR #16 merge commit, with the
batch's final commit (`209ffa3`) as its direct parent.

## Content Sprint status

**Hissa A, B, C — all COMPLETE** (per owner confirmation). Hissa C
(blog audit → Batch 13 removals/link-fix → Batch 13b retitles/outdated-
tax-post removal/rate-currency edits) is fully shipped and production-
verified as of this report.

## Conclusion

Batch 13b is confirmed correctly deployed to production: both removed
tax-regime posts permanently redirect to the accurate replacement post,
`/blog` serves exactly 33 posts with no dangling references to removed
content, both retitled posts serve their new titles, and the PPF post's
rate-currency caveat is live. Closing Batch 13b as **CLOSED** — see
status update in `docs/batches/batch-13b-blog-retitles-plan.md`.
