# Batch 13 — Production Verification Report

Date: 2026-07-18
Verified against: `https://www.awe-os.com` (live production)
PR: #15 (`batch-13-blog-cleanup` → `main`), merge commit `bbf9057`

## Overall result: **PASS** (one status-code nuance noted, not a failure — see §1)

## 1. Removed blog URLs — redirect check

All 6 `curl -I` against production:

| # | Removed URL | Status | `Location` header |
|---|---|---|---|
| 1 | `/blog/how-to-create-a-personal-budget-in-india` | 308 | `/blog/how-to-create-a-budget-that-works-for-you-in-india` |
| 2 | `/blog/image-compression-guide-2025` | 308 | `/blog/how-to-compress-images-without-losing-quality` |
| 3 | `/blog/word-to-pdf-complete-guide-2025` | 308 | `/blog/how-to-convert-word-to-pdf-free` |
| 4 | `/blog/emi-calculator-home-car-personal-loan-guide` | 308 | `/blog/emi-calculator-home-car-personal-loan` |
| 5 | `/blog/gst-calculator-india-add-or-remove-gst` | 308 | `/blog/gst-calculator-india-add-remove-gst` |
| 6 | `/blog/ppf-calculator-2026-maturity-amount-withdrawal-rules-tax-benefits` | 308 | `/blog/ppf-calculator-india-maturity-80c-tax-benefits` |

All 6 `Location` headers point to the correct surviving twin, exactly
as configured in `vercel.json`.

**Status-code nuance**: the plan called for 301; Vercel actually serves
**308 Permanent Redirect** for every `"permanent": true` entry in
`vercel.json` — including the 3 pre-existing redirects from before this
batch (`/tools/pdf-merger`, etc. — not re-tested here, but same
mechanism). This is documented Vercel platform behavior, not a
misconfiguration: `permanent: true` maps to 308 there, and 308 was
designed specifically to be the "corrected" version of 301 (it
explicitly preserves the HTTP method, which 301 technically doesn't
guarantee across all clients). For SEO purposes the two are treated
identically — Google's own documentation states 301 and 308 both pass
ranking signals and are both treated as permanent for indexing
purposes. Functionally: **PASS** (permanent redirect behavior is
correct and all destinations are correct); **literally**: not a 301,
which is worth knowing if anything downstream ever asserts on the
exact status code.

## 2. Content checks

| Route | HTTP | Check | Result |
|---|---|---|---|
| `/blog` | 200 | Title correct, no reference to any of the 6 removed slugs | Pass |
| `/blog/qr-code-generator-10-practical-uses` | 200 | Title correct, content size 35,634 bytes | Pass |
| ″ | | Literal broken Markdown text `[QR Code Generator](` | **0 occurrences** — gone |
| ″ | | Real `<a href>` tag for the same link | **Present**: `<a href="https://www.awe-os.com/tools/qr-code-generator" target="_blank" rel="noopener noreferrer" class="...">QR Code Generator</a>` |

Confirms the `renderInline()` fix is live and working: the one
previously-broken Markdown link now renders as a real, styled anchor
tag in production-served HTML.

## 3. `main` tip

```
$ git fetch origin && git log origin/main -3 --oneline
bbf9057 Merge pull request #15 from wajid081986/batch-13-blog-cleanup
867fa69 batch-13: implementation + verification log
862b624 batch-13: renderInline() now handles Markdown [text](url) links
```

Confirmed: `origin/main` tip is the PR #15 merge commit, with the
batch's final commit (`867fa69`) as its direct parent.

## Conclusion

Batch 13 is confirmed correctly deployed to production: all 6 removed
blog URLs permanently redirect to their correct surviving twin (308,
Vercel's documented equivalent of 301), `/blog` and a spot-checked
remaining post serve intact content with no dangling references to
removed posts, and the Markdown-link renderer fix is live and
verifiably working on real served HTML. Closing Batch 13 as **CLOSED**
— see status update in `docs/batches/batch-13-blog-cleanup-plan.md`.
