# Batch 52 — Bulk SEO Audit: "Fix This" in-place regeneration/humanize

## Context

Bulk SEO Audit (`server/routes/admin-blog-bulk-audit.js`,
`client/src/modules/admin/seo/BulkSeoAudit.jsx`, live from batch-51) currently
only reports flags (`thin_content`, `no_faq`, `no_internal_links`,
`not_humanized`) — read-only, no AI calls.

Goal: add a "Fix This" action that regenerates or re-humanizes a flagged post
**in place** — same `blog_posts` row, same `id`, same `slug`. Never creates a
new post, never touches `slug`/`title`/`excerpt`/`meta_description`.

## Investigation findings

1. `/generate` (`admin-blog.js:97-419`) is one inline handler — 3 parallel
   OpenAI calls → merge → word-count validation → optional auto-humanize →
   `res.json`. It never writes to `blog_posts` (a separate `/publish-db`
   does). Not reusable as-is; needs extracting into a function.
2. Humanize logic is already factored: `extractParagraphs`,
   `humanizeParagraphsChunked`, `applyHumanizedParagraphs`
   (`admin-blog.js:1504-1576`), with an existing preview/confirm split
   (`/humanize/:id`, `/humanize/:id/save`) — the same pattern this batch
   reuses for the fix flow.
3. Confirmed `blog_posts` columns (migrations 020/037/038): `id, slug,
   title, category, content (jsonb), faqs (jsonb), target_keyword,
   human_score, ai_score, humanized_at, status, updated_at, related_tools
   (jsonb)`. No `keyword` column — it's `target_keyword`.

## CLAUDE.md scope note

§3b lists `admin-blog.js` as open only for new humanize endpoints and wiring
humanize into `/generate`'s success path — not for extracting `/generate`'s
core into a function for another route file to call. User approved
proceeding, on condition Step 1 is shown as a diff and verified to be a pure,
behavior-preserving refactor before anything is built on top of it.

## Decisions (user-confirmed)

- Step 1 (admin-blog.js refactor) ships as its own commit, diff reviewed and
  confirmed byte-for-byte equivalent before Step 2 begins.
- Regenerate-mode fix never touches `title`, `slug`, `excerpt`, or
  `meta_description` — only `content`, `faqs`, `ai_score`, `human_score`,
  `humanized_at`, `updated_at` are ever written by `/fix/:id/confirm`.

## Plan

**Step 1 — `admin-blog.js` pure refactor (own commit)**
Extract `/generate`'s body into `async function generatePostContent({ topic,
keyword, toolSlug, toolName, wordCount, tone, category, indianContext,
autoHumanize })` returning `{ post, actualWords, humanizeInfo }` (throws on
failure, same as today). Route handler becomes a thin wrapper with identical
request/response shape. No prompt/token/validation changes. Additively
export `generatePostContent`, `humanizeParagraphsChunked`,
`extractParagraphs`, `applyHumanizedParagraphs` as properties on the
exported router.

**Step 2 — `admin-blog-bulk-audit.js` additive endpoints**
- `POST /fix/:id` — preview only, no DB write. Determines mode from the
  post's current flags (or explicit `req.body.mode`):
  `thin_content`/`no_faq`/`no_internal_links` → `regenerate` (calls
  `generatePostContent` targeting ~1800 words + `autoHumanize: true`,
  discarding the AI's title/slug/excerpt/meta); `not_humanized` only →
  `humanize` (reuses `humanizeParagraphsChunked` on current content).
  Returns `{ success, mode, preview: { content, faqs?, wordCount?,
  humanizeInfo } }`.
- `POST /fix/:id/confirm` — commits the previously returned preview via
  `UPDATE ... WHERE id = :id` (never INSERT, never touches `slug`):
  `content`, `faqs` (regenerate mode only), `ai_score`, `human_score`,
  `humanized_at`, `updated_at`.

**Step 3 — `BulkSeoAudit.jsx` additive UI**
"Fix This →" action per row (when `issuesCount > 0`) opens a preview panel
(local trimmed copy of `growth-os/CreateTab.jsx`'s block-renderer pattern,
not imported) with Replace/Cancel. Replace calls `/fix/:id/confirm` with the
held preview payload, then refetches the audit list. `SeoAuditor.jsx` and
`BlogAssistant.jsx` are untouched.

**Step 4** — build check; one commit per step (`batch-52: ...`); summary +
verification checklist at the end; stop.
