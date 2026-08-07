# Batch 51 — Bulk SEO Audit (no-AI, structural/heuristic)

## Context

The existing SEO Optimizer (`client/src/modules/admin/blog/SeoAuditor.jsx`,
route `POST /api/admin/blog/seo-audit`) audits ONE post at a time via an AI
call — too slow/costly to run across all published posts.

Goal: a lightweight bulk audit that does NOT call any AI — just checks
structural/heuristic signals across all published `blog_posts` in one pass,
so it's fast, free, and safe to re-run anytime.

## Scope conflict noted and resolved

`SeoAuditor.jsx` is reached from two places: the `seo` tab inside
`BlogAssistant.jsx` (explicitly named as protected by CLAUDE.md §3b's
carve-out — "No other tab ... SEO ... may be touched") and
`growth-os/CreateTab.jsx` (no exception covers it at all). Per user
decision, this batch does NOT touch either. It ships as a fully standalone
module instead, following the same "new isolated module, minimal additive
wiring" pattern CLAUDE.md §3a already sanctioned for Image Agent — landing
in the existing, non-restricted `client/src/modules/admin/seo/` directory
(home to `SeoDashboard.jsx`, `SeoAuditEngine.jsx`, etc., already wired
through plain `routes.jsx` + `AdminPage.jsx` nav array, unrelated to
Blog Assistant or Growth OS).

## Schema facts confirmed before writing code

- `blog_posts.faqs` — JSONB, default `'[]'` (migration 020). Used for the
  "no FAQ" flag.
- `blog_posts.human_score` — INT, default `NULL` (migration 037, from the
  earlier humanizer work). Used for the "not humanized" flag.
- No `word_count` column exists anywhere. Every existing route (including
  `POST /seo-audit`) computes it on the fly from article text
  (`text.trim().split(/\s+/).length`). This batch does the same, from the
  `content` JSONB column (array of `{type, text}` blocks — same shape
  `/generate` already writes).
- Internal links are written as raw HTML inside `p` block text, e.g.
  `<a href='/tools/tool-slug'>...</a>` (per the existing generation
  prompt). Detected via regex over concatenated block text.
- No new migration needed.

## Backend

New file `server/routes/admin-blog-bulk-audit.js` (does not touch
`admin-blog.js` or `admin-seo.js`):

- `GET /` — `requireAuth`, `requireAdmin`. Fetches
  `id, title, slug, category, content, faqs, human_score` from
  `blog_posts where status = 'published'`.
- Per post, no AI call, compute:
  - `wordCount` — strip HTML tags from concatenated `content[].text`,
    split on whitespace, count.
  - `thin_content` flag — `wordCount < 800`
  - `no_faq` flag — `!faqs || faqs.length === 0`
  - `no_internal_links` flag — no `href=['"]\/(?!\/)[^'"]*['"]` match
    found anywhere in the raw (unstripped) block text
  - `not_humanized` flag — `human_score == null || human_score < 70`
- Response: `{ success, posts: [{id, title, slug, category, wordCount,
  issuesCount, flags: [...] }], summary: { totalPosts, totalIssues } }`,
  `posts` sorted by `issuesCount` descending.

`server/index.js` — two additive lines only, mirroring the
`admin-image-agent` mount:
```
const adminBlogBulkAuditRoutes = require('./routes/admin-blog-bulk-audit');
...
app.use('/api/admin/blog-bulk-audit', adminLimiter, adminBlogBulkAuditRoutes);
```

## Frontend

New file `client/src/modules/admin/seo/BulkSeoAudit.jsx`:

- On mount, `GET /api/admin/blog-bulk-audit`.
- Table: Title | Word Count | Issues (count badge) | flag chips
  (thin content / no FAQ / no internal links / not humanized) | Edit link
  out to `/admin/blog`.
- Sorted worst-first (server already sorts; client keeps that order).
- "Refresh" button — cheap GET, no AI cost, safe to spam, re-fetches.

`client/src/app/routes.jsx` — one additive lazy import + one additive
route:
```
const BulkSeoAudit = lazy(() => import('../modules/admin/seo/BulkSeoAudit'))
...
<Route path="/admin/bulk-seo-audit" element={lazy$(<BulkSeoAudit />)} />
```

`client/src/modules/admin/pages/AdminPage.jsx` — one additive line in the
existing nav array, next to the current `SEO Audit` entry:
```
{ icon: '📋', label: 'Bulk SEO Audit', to: '/admin/bulk-seo-audit' },
```

## Explicitly out of scope

- No AI calls anywhere in this path.
- No auto-fixing — read-only reporting.
- No changes to `SeoAuditor.jsx`, `BlogAssistant.jsx`, `growth-os/CreateTab.jsx`,
  `admin-blog.js`, or `admin-seo.js`.

## Risks

- `content` block shape assumed consistent with what `/generate` writes
  (array of `{type, text}`); if any published post has a different shape,
  its word count / link detection may undercount rather than throw (guard
  with `Array.isArray` + `?.text` access).
