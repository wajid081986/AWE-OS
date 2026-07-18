# Batch 14 — Production Verification Report

Date: 2026-07-18
Verified against: `https://www.awe-os.com` (live production)
PR: #17 (`batch-14-sitemap` → `main`), merge commit `6dc8748`

## Overall result: **PASS**

## 1. `sitemap.xml` — fetch, count, well-formedness

```
$ curl -s -o sitemap_prod.xml -w "HTTP %{http_code}\n" https://www.awe-os.com/sitemap.xml
HTTP 200
```

| Check | Expected | Result |
|---|---|---|
| `<url>` entry count | 122 | **122** |
| `<url>` open/close tag balance | equal | **122 / 122** |
| Starts with `<?xml version="1.0" encoding="UTF-8"?>` | yes | **yes** |
| Ends with `</urlset>` | yes | **yes** |
| Unescaped `&` in body | 0 | **0** |
| Unique `<loc>` values | 122 (no duplicates) | **122** |

## 2. Spot-check: 3 `<loc>` present

| Route type | URL | Present |
|---|---|---|
| Tool page | `https://www.awe-os.com/tools/merge-pdf` | **Yes** |
| Policy page | `https://www.awe-os.com/privacy-policy` | **Yes** |
| Blog post | `https://www.awe-os.com/blog/how-to-merge-pdf-files-for-free` | **Yes** |

## 3. Removed/redirected/noindex slugs — confirmed absent

All 8 `vercel.json`-redirected old slugs (batch-13 blog cleanup) and 3 redirected old tool slugs checked — none found:

| Slug | Result |
|---|---|
| `how-to-create-a-personal-budget-in-india` | absent |
| `image-compression-guide-2025` | absent |
| `word-to-pdf-complete-guide-2025` | absent |
| `emi-calculator-home-car-personal-loan-guide` | absent |
| `gst-calculator-india-add-or-remove-gst` | absent |
| `ppf-calculator-2026-maturity-amount-withdrawal-rules-tax-benefits` | absent |
| `income-tax-calculator-india-2026-old-vs-new-regime` | absent |
| `income-tax-calculator-india-2025-old-vs-new-regime` | absent |
| `tools/pdf-merger` | absent |
| `tools/emi-calculator` | absent |
| `tools/image-to-pdf` | absent |

The 4 noindex blog posts (`what-is-gst-calculator-complete-guide-indians-2026`, `how-to-use-gst-calculator-online`, `top-10-free-online-calculators-for-students`, `free-calculator-tools-for-students`) also confirmed absent, as designed.

## 4. `robots.txt` — sitemap reference

```
$ curl -s https://www.awe-os.com/robots.txt
...
Sitemap: https://www.awe-os.com/sitemap.xml
```

Confirmed: `Sitemap:` line present and points to the correct production URL. Unchanged from pre-batch (no edit was needed).

## 5. `main` tip

```
$ git fetch origin && git log origin/main -3 --oneline
6dc8748 Merge pull request #17 from wajid081986/batch-14-sitemap
92145a7 batch-14: auto-generate sitemap.xml from ssg-build.js route list
98895fb batch-14: approved plan — sitemap auto-generation
```

Confirmed: `origin/main` tip is the PR #17 merge commit, with the batch's implementation commit (`92145a7`) as its direct parent.

## Conclusion

Batch 14 is confirmed correctly deployed to production: the live `sitemap.xml` is valid, well-formed XML with exactly 122 unique URLs (126 total SSG routes minus the 4 noindex blog posts), all 3 spot-checked route types resolve to the expected canonical URLs, zero removed/redirected/noindex slugs leak into the sitemap, and `robots.txt` correctly references it. Closing Batch 14 as **CLOSED** — see status update in `docs/batches/batch-14-sitemap-plan.md`.
