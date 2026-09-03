# Batch-105 plan: founder full name update ("Wajid" -> "Abdul Wajid")

Small follow-up to batch-103. Owner wants the byline's full name used
consistently instead of the first name only.

## Changes

1. `client/src/data/author.js` — `FOUNDER.name`: `'Wajid'` -> `'Abdul Wajid'`.
   Cascades automatically (no other code change needed) to:
   - `AboutPage.jsx`'s founder card
   - `ToolPageShell.jsx`'s `YMYLByline` text and Article `Person` schema
     on all 10 YMYL tool pages (sip/ppf/fd/gst/tax/loan/hra/nps/
     capital-gains/roi calculators)

2. `client/src/data/blogPosts.js` — NOT derived from `author.js` (confirmed
   via `BlogPostPage.jsx`, which reads `post.author` directly as a plain
   string). Needs 7 separate edits, `author: 'Wajid'` -> `author: 'Abdul Wajid'`,
   on the same 7 posts touched by batch-103: `emi-calculator-home-car-personal-loan`,
   `sip-calculator-mutual-fund-returns-india`,
   `free-gst-invoice-generator-for-indian-freelancers`,
   `ppf-calculator-india-maturity-80c-tax-benefits`,
   `gst-calculator-india-2026-complete-guide`, `sip-vs-fd-india-2025`,
   `new-vs-old-tax-regime-fy-2025-26`.

## Workflow

Branch off main, commit plan, implement as 2 commits, build + spot-check
SSG output, then merge/push/deploy on request.
