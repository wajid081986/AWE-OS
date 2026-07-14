# Batch 5 — Production Verification Report

**Date:** 2026-07-14
**Scope:** Homepage replacement (Blueprint §30), `batch-5-homepage` → `main`
**PR:** #7 (`wajid081986/batch-5-homepage`)
**Merge commit:** `d7a439a` (main), final branch commit `d8c0aaf`
**Deployment:** `dpl_HhtAs1W5FLuKeGnvzr56wqTaCMyE` — status **Ready**, aliased to `www.awe-os.com`
**Verified against:** raw production HTML (`curl` fetch, no JS execution — confirms the SSG-rendered output, not client-hydrated content)

## Result: PASS

All checks below were run directly against `https://www.awe-os.com/` after confirming the deployment status.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Single `<title>` | PASS | `AWE-OS — Free Online Tools for PDF, India Tax & Finance` (1 occurrence) |
| 2 | Single meta description | PASS | `49+ free browser tools — PDF, Indian tax & finance calculators, converters. Files never uploaded, most need no signup. Everything runs on your device.` (1 occurrence) |
| 3 | Single `<h1>` | PASS | `Online tools that never upload your files.` (1 occurrence) |
| 4 | Single og:title / og:description | PASS | 1 each |
| 5 | Canonical | PASS | `<link rel="canonical" href="https://www.awe-os.com"/>` |
| 6 | Hero + Ledger present in raw HTML (no JS) | PASS | "never upload" copy and full Ledger (`Tools available: 49`, `Signup required (most tools): NO`, `Your files stored on our servers: 0 — ever`) all present in un-hydrated HTML source |
| 7 | Stats strip values match `TOOL_REGISTRY` | PASS | "free tools across 5 categories", "PDF utilities — merge to sign", "calculators built for Indian finance"; category counts `21 / 13 / 10 / 3 / 2` (pdf/calculators/converters/productivity/ai) match the live registry |
| 8 | JSON-LD intact, incl. `WebSite` `SearchAction` | PASS | 3 `application/ld+json` blocks (`WebSite`, `Organization`, `FAQPage`); `SearchAction.target.urlTemplate` = `https://www.awe-os.com/tools?q={search_term_string}` |
| 9 | No ad markup | PASS | No `adsbygoogle`, `ADVERTISEMENT`, or ad-container/banner strings found |
| 10 | Internal links resolve | PASS | Tested 5: 3 blog-card links + `/tools/merge-pdf` + `/privacy-policy` — all HTTP 200 |

## Pre-merge discrepancy (resolved)

An initial verification pass (same day, prior to PR #7 actually merging) found `main` and production still serving the pre-Batch-5 homepage, despite an earlier report that the batch was merged. Confirmed via `git merge-base --is-ancestor` and a direct fetch of `www.awe-os.com` showing the old title/H1. PR #7 was merged shortly after; this report reflects the verification re-run against the corrected state, confirmed via `git log --merges` and a fresh production fetch.

## Method

- Deployment status confirmed via `vercel ls awe-os --prod` and `vercel inspect` (target: production, aliased to `www.awe-os.com`).
- Homepage HTML fetched directly with `curl` (raw HTTP response, not a browser) specifically to verify content is present before any client-side JavaScript executes — the SSG contract required by CLAUDE.md §4 ("every new route must serve complete HTML with JavaScript disabled").
- All counts (title, h1, meta tags, ld+json blocks, category counts) obtained via exact string/pattern matching against the fetched HTML, not visual inspection.
