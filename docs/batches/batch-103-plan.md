# Batch-103 plan: real byline + Person schema for YMYL finance content

GSC/E-E-A-T follow-up: financial/tax tool pages and their related blog
posts currently show a generic "AWE-OS Team" / "Team AWE-OS" byline, with
Article/schema.org `author` typed as an Organization. Since AWE-OS is an
independent-creator project (per batch-101's About page reframe), this
replaces that generic attribution with a genuine, honest byline reusing
the real name/bio already public and approved on `/about` — no fabricated
credentials, no invented expertise claims.

## Scope

**10 tools** (all genuinely YMYL — real tax/investment/loan decisions;
excludes tip/discount/percentage calculators despite sharing the same
`subcategory: 'Finance'` tag, since those aren't YMYL):
`sip-calculator`, `ppf-calculator`, `fd-calculator`, `gst-calculator`,
`tax-calculator`, `loan-calculator`, `hra-calculator`, `nps-calculator`,
`capital-gains-calculator`, `roi-calculator`

**7 blog posts** (every post directly about the above topics):
`sip-calculator-mutual-fund-returns-india`,
`ppf-calculator-india-maturity-80c-tax-benefits`,
`gst-calculator-india-2026-complete-guide`,
`free-gst-invoice-generator-for-indian-freelancers`,
`sip-vs-fd-india-2025`, `new-vs-old-tax-regime-fy-2025-26`,
`emi-calculator-home-car-personal-loan`

## Changes

1. `client/src/data/author.js` — new file. Extracts the existing
   `FOUNDER` object out of `AboutPage.jsx` verbatim (name: 'Wajid',
   role: 'Founder & Builder', real bio) as the single shared source of
   truth. No new claims — reuses exactly what's already live and
   approved on `/about`.

2. `client/src/pages/AboutPage.jsx` — import `FOUNDER` from the new
   `author.js` instead of defining it locally. No visible/content change.

3. `client/src/pages/tools/ToolPageShell.jsx`:
   - New `ymyl` boolean prop (default `false`).
   - When `ymyl` is true, `articleSchema.author` becomes
     `{ '@type': 'Person', name: FOUNDER.name, url: 'https://www.awe-os.com/about' }`
     instead of the current `{ '@type': 'Organization', name: 'AWE-OS' }`.
     `softwareSchema.author` is unchanged (Organization is correct for a
     SoftwareApplication schema type — this isn't a content-authorship
     claim).
   - New small visible byline line, rendered next to the existing
     `AuthorBox` (which stays as-is — it's about tool testing, not
     content authorship): "Reviewed by Wajid — independent developer,
     verified against official sources.", linking to `/editorial-policy`
     (the real, live page already explaining the process) as an honest
     interim target until batch-104's dedicated methodology page exists.

4. The 10 calculator page files (`SIPCalculator.jsx`, `PPFCalculator.jsx`,
   `FDCalculator.jsx`, `GSTCalculator.jsx`, `TaxCalculator.jsx`,
   `LoanCalculator.jsx`, `HRACalculator.jsx`, `NPSCalculator.jsx`,
   `CapitalGainsCalculator.jsx`, `ROICalculator.jsx`) — add `ymyl` to
   their `<ToolPageShell>` call. (Exact filenames confirmed at
   implementation time via the tool registry / component map.)

5. `client/src/pages/BlogPostPage.jsx` — no structural change needed;
   Article schema already types `author` as Person correctly, and the
   byline UI already renders `post.author`. Verified during
   investigation.

6. `client/src/data/blogPosts.js` — change `author: 'AWE-OS Team'` to
   the real name, for the 7 posts listed above only. All other posts
   keep the existing "AWE-OS Team" byline — out of scope for this batch.

7. `docs/backlog.md` — one line noting the `/financial-data-methodology`
   page (batch-104) is pending the owner's real source-list/review-
   cadence input, so it isn't silently forgotten.

## Out of scope (batch-104, blocked on owner input)

The dedicated `/financial-data-methodology` page itself — needs real
details (which sources are checked: Income Tax Dept, GST Council, RBI,
etc., and how often) that only the owner can honestly supply. Byline
links to `/editorial-policy` in the meantime.

## Workflow

1. Branch off `main`, commit this plan verbatim first.
2. Implement as separate logical commits (`batch-103: <what>`).
3. Run build; verify SSG output for at least 2 of the 10 tool pages and
   1 blog post shows the new byline + Person schema.
4. End with changed-files list, verification checklist, known issues,
   then stop.
