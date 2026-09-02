# Batch 97 — merge GST-calculator post quartet, add 301 redirects

## Background

4 blog posts in `client/src/data/blogPosts.js` targeted the same
"GST calculator / how to use it in India" search intent with a near-
identical section skeleton (What is / How to Use / Key Features /
India-Specific Examples / FAQ) for 3 of the 4 — genuine SEO
cannibalization risk, analyzed and approved by user in prior turns.

## Scope (approved draft)

**Survivor**: `gst-calculator-india-2026-complete-guide` (URL/slug
unchanged, so any existing ranking signal carries over without a
redirect on the surviving page itself).

**Content changes to the survivor** (per approved draft):
- Add a new "When Reverse Charge Applies" body section (not an FAQ
  line) built from `what-is-gst-calculator-complete-guide-indians-2026`'s
  RCM content, with a worked advocate-fee example.
- Add 2 retail examples (washing machine 28%, restaurant meal 5%) to
  the existing "GST in Practice" scenarios section, sourced from
  `gst-calculator-india-add-remove-gst`, to round out rate-slab
  coverage (previously only 12–18%) and keep a consumer-facing angle.
- Add a 4th FAQ ("How often do GST rates change...") from
  `how-to-use-gst-calculator-online`, reworded to drop
  marketing-flavoured phrasing.
- Intro tightened slightly; everything else in the survivor (What is /
  How to Use / Key Features / existing 3 scenarios / existing 3 FAQs /
  callout) unchanged.

**Removed entirely** (content merged in, or deliberately left out):
- `gst-calculator-india-add-remove-gst`
- `what-is-gst-calculator-complete-guide-indians-2026` (was already
  `noindex: true`)
- `how-to-use-gst-calculator-online`

**Redirects** (added to `vercel.json`, `permanent: true`, matching the
existing redirect format used for retired tool URLs):
- `/blog/gst-calculator-india-add-remove-gst` → `/blog/gst-calculator-india-2026-complete-guide`
- `/blog/what-is-gst-calculator-complete-guide-indians-2026` → same
- `/blog/how-to-use-gst-calculator-online` → same

## Verified before implementing
- No internal cross-links exist to any of the 3 removed slugs from
  anywhere in the codebase (confirmed via repo-wide grep).
- Blog post URL pattern confirmed as `/blog/:slug`
  (`client/src/entry-server.jsx`).
- `vercel.json` redirect format confirmed: `{ source, destination
  (absolute URL), permanent: true }`.

## Out of scope
- The resume/ATS trio, the calculator-roundup pair, and the PDF-tools
  roundup pair flagged earlier as lower-priority near-duplicate
  clusters — not touched this batch.
- The 6 "Category C" posts with lower-severity unsourced claims.

## Verification plan
- Full rebuild; confirm 130 → 127 SSG routes (3 posts removed).
- Confirm the 3 old slugs 301-redirect correctly and the survivor page
  contains all merged content, no duplicate section headings.
- Confirm sitemap.xml no longer lists the 3 removed URLs.
