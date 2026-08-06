# Batch 46 — Blog Assistant Content Humanizer

**Branch:** `batch-46-content-humanizer`

## Scope

Wire the already-built Content Studio humanizer
(`server/core/content-studio/humanizer.js`) directly into Blog
Assistant's Published Posts list, instead of leaving it as a manual
paste-in tool only. Requires the §3b carve-out added to CLAUDE.md on
2026-08-06 (Blog Assistant is normally a protected existing agent file).

Four units, built and verified sequentially:

1. Per-post AI Score badge + Humanize button + before/after + save
2. "Humanize All" bulk action with progress
3. Quality-score display on the Published Posts list (color-coded, sortable)
4. Auto-humanize hook on new post generation

## Files created

- `server/db/migrations/037_blog_posts_humanize_score.sql` — additive
  columns on `blog_posts`: `ai_score`, `human_score`, `humanized_at`.

## Files modified

- `server/core/content-studio/humanizer.js` — additive `preserveMarkers`
  option: when true, instructs the rewrite prompt to keep `§§P<n>§§`
  marker lines intact so paragraph-level round-tripping is possible.
  Existing callers (unchanged, `preserveMarkers` defaults to false) are
  unaffected.
- `server/routes/admin-blog.js` — `GET /published` now also selects
  `ai_score, human_score, humanized_at`. New: `POST /humanize/:id`
  (preview only, does not persist) and `POST /humanize/:id/save`
  (persists a previously returned result). New: auto-humanize hook in
  `/generate`'s success path (Unit 4).
- `client/src/modules/admin/blog/BlogAssistant.jsx` — `PublishedPostsTab`
  gets the badge/button/bulk/sort UI (Units 2-3); AI Blog Writer tab
  shows the humanized draft after generation (Unit 4).

## Key design decision — paragraph-only humanization (Option A)

`blog_posts.content` is a JSONB block array (`p`, `h2`, `table`, `ul`,
`callout`); the humanizer takes/returns flat text. Only `p` blocks are
humanized, via marker-tagged round-trip (`§§P<n>§§`) so headings,
tables, lists, and callouts are never rewritten or reordered. If the
markers don't round-trip cleanly (`markerIntegrity: false` in the
preview response), the endpoint returns the original blocks unchanged
rather than guessing — the UI must surface this and block the save
action in that case.

## Bulk humanize — no new server endpoint

"Humanize All" calls `POST /humanize/:id` then `POST /humanize/:id/save`
sequentially per post from the client, updating a progress bar as it
goes — matches the plain-REST pattern used everywhere else in this
admin, avoids a long-running server job or new polling infra.

## Risks

- Cost/latency: each humanize call is 3 OpenAI calls; bulk runs will be
  slow and spend tokens — client should confirm before running "Humanize
  All" across many posts.
- `ai_score` / `human_score` are LLM self-estimates, not a real AI
  detector — UI copy must say "AI-likelihood estimate."
- Auto-humanize on `/generate` adds latency to an already multi-call
  request — ships as an opt-in toggle, not always-on.

## Verification

No `.env`/live-credential access in this session — server changes are
verified by syntax check (`node --check`) and isolated logic tests of
the marker round-trip (no live OpenAI/Supabase calls). Client changes
verified via `npm run build`. A full live Playwright QA pass is
recommended before deploy, per prior project convention, and is out of
scope for this batch.
