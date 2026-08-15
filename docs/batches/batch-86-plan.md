# Batch 86 — Fix multi-hop redirect chains (GSC "Page with redirect — Failed")

## Context

User reported Google Search Console "Page indexing" report showing 20 pages
under "Page with redirect — Failed". Investigation (code-only, no live GSC
export available for this category) found a concrete root cause in
`vercel.json`.

## Root cause

`vercel.json`'s `redirects` array has, in order:

1. An apex→www host rule (line 6-12): any request to `awe-os.com/*` matches
   `"source": "/(.*)"` with `has: [{ type: "host", value: "awe-os.com" }]`
   and redirects to `https://www.awe-os.com/$1`.
2. 33 path-specific rules for retired tool/blog/city-page slugs, each with a
   **relative** destination (e.g. `"/tools/merge-pdf"`).

Vercel's redirect matching returns only the **first matching rule per
request**. Because rule 1 is listed first and matches *any* path on the
apex host, any apex-domain request to one of the 33 retired slugs resolves
in two round trips instead of one:

```
awe-os.com/tools/pdf-merger
  -> 301 -> www.awe-os.com/tools/pdf-merger   (rule 1: host redirect)
  -> 301 -> www.awe-os.com/tools/merge-pdf    (rule 2: path redirect)
```

This 2-hop chain is what GSC flags as "Page with redirect — Failed."

All 33 destination slugs were verified against `client/src/data/toolRegistry.js`
and `client/src/data/blogPosts.js` — every destination is a real, live route.
No destination is itself broken or another redirect source, so there are no
loops (A→B→A) and no chains longer than 2 hops.

## Fix

- Make all 33 path-specific redirect destinations **absolute**
  (`https://www.awe-os.com/...`) instead of relative.
- Move these 33 rules **above** the apex→www host catch-all rule.

Result: any request — apex or www — to one of these retired slugs resolves
in a single 301 straight to the final `www` URL. Requests to paths not in
this list still fall through to the host catch-all rule for the plain
apex→www redirect (unchanged behavior, still single-hop).

## Files touched

- `vercel.json` — reorder + absolutize the 33 path-specific redirect
  entries. No other file changes. `rewrites` and `headers` blocks
  untouched.

## Out of scope (logged separately, not fixed in this batch)

Per CLAUDE.md §7 (no content generation, ask rather than guess) and §8, the
other 4 GSC categories from the user's report are **not** addressed in this
batch:

- **Soft 404 (12 pages)** — needs the actual GSC-flagged URL list from the
  user; code-only investigation can't reliably identify which 12 specific
  URLs Google flagged.
- **Excluded by noindex tag (15 pages)** — investigated via code (all
  `noindex: true` usages in `cityPages.js`, `blogPosts.js`,
  `NotFoundPage.jsx`, `PaymentSuccess.jsx`); all 29 found instances look
  intentional per prior batch history (batch-15, batch-15b, batch-58). No
  accidental noindex on a public page found. Reported to user, no fix
  needed unless they flag a specific page.
- **Duplicate without user-selected canonical (2 pages)** — needs the
  actual GSC-flagged URL pair from the user before adding canonical tags.
- **Blocked by robots.txt (2 pages)** — `robots.txt` reviewed; all
  `Disallow` rules (`/dashboard/`, `/admin/`, `/api/`, `/login`,
  `/tools/test-ai-tool`) are internal/QA paths, none overlap with any
  sitemap-listed public route. No accidental block found. Reported to
  user, no fix needed unless they flag a specific page.

## Risk

Low — pure `vercel.json` redirect-table edit, no app code touched. Verify
via `vercel.json` JSON validity and a manual spot-check of a few
apex-domain + retired-slug combinations post-deploy.
