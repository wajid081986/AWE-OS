# Thin Content (AI Factory tool pages) + Internal Linking — Research & Proposed Plan

Status: **research complete, no implementation, no branch created.** Written for review per
CLAUDE.md §6. Anthropic→OpenAI migration (batch-82) stays paused; unrelated to this work.

**2026-08-15 update:** scope expanded from "AI-Factory tool pages only" to a full-site
content-quality bar (AdSense-driven) across blog posts AND every tool page regardless of how
it was created. See "Part A — Follow-up Audit" below for the corrected numbers and the revised
unified batch plan that supersedes the original Batch A1/A2/B1 split further down.

---

## Part A — Extending Humanize to Tool Pages

### A1. How Humanize actually works today (confirmed by reading the code)

- Button lives in `/admin/blog` → `BlogAssistant.jsx`'s `PublishedPostsTab` (§3b scope).
- `POST /api/admin/blog/humanize/:id` (`server/routes/admin-blog.js:1593`) reads
  `blog_posts.content` (a JSON block array, `[{type:'p', text:'...'}, ...]`), extracts
  paragraph blocks, chunks them 6-at-a-time (`HUMANIZE_CHUNK_SIZE`), and calls
  `contentStudio.humanize()` per chunk.
- `contentStudio.humanize()` (`server/core/content-studio/humanizer.js`) is **already 100%
  OpenAI** — 3 calls per chunk: analyze (`gpt-4o-mini`), rewrite (`gpt-4o`), score
  (`gpt-4o-mini`), all via `getOpenAI()` + `parseAIJson`. No Anthropic involvement anywhere in
  this feature — the paused migration doesn't block reusing it.
- `POST /api/admin/blog/humanize/:id/save` persists the rewritten blocks back to
  `blog_posts.content`, plus `ai_score`, `human_score`, `humanized_at` (migration
  `037_blog_posts_humanize_score.sql`, additive columns).
- The "Not scored" badge (`AiScoreBadge` in `BlogAssistant.jsx:890`) is simply `ai_score ==
  null` — it's not an independent scoring pass, it only reflects whether `/save` has ever run
  for that row. A **separate**, already-generic scorer exists —
  `contentStudio.score(content, {targetKeyword, contentType, targetAudience})` — `contentType`
  defaults to `'blog'` but is just a prompt-context string; it takes a `'tool'` value with zero
  code changes.

**Conclusion: the humanize/score machinery itself is reusable as-is for any content type.**

### A2. Where tool page content actually comes from (this is the important finding)

Traced `/tools/:slug` end to end:

- `routes.jsx` routes `/tools/:slug` → `DynamicToolPage.jsx`, which checks a static
  `TOOL_COMPONENTS` map (the 49 hand-built tools). If the slug isn't in that map, it explicitly
  falls back to `ToolDetailPage.jsx` — the code comment says this path is **"for
  autonomous-pipeline tools"**, i.e. this is the AI Factory tool page.
- `ToolDetailPage.jsx`'s "About {tool.name}" section (lines 339-355) and its FAQ section (the
  `FAQS()` function, lines 177-183) are **fully hardcoded template strings**. They interpolate
  only `tool.name`, `tool.description` (a short one-liner), and `tool.usageCount`. Every
  AI-Factory tool page renders the *same three paragraphs* and the *same five FAQ questions*,
  reworded only by name substitution.
- Confirmed by checking what the `tools` table actually returns to the public API
  (`tools.controller.js`): `PUBLIC_DETAIL_FIELDS = 'id, name, slug, category, description,
  is_free, price, quality_score, usage_count, idea_metadata, created_at, ai_prompt,
  input_fields'`. **There is no long-form content column at all** — no `about_content`, no
  `faq`, nothing. `idea_metadata` (JSONB, written by `idea-pipeline.js`) holds only pipeline
  business metadata (`problem_solved`, `monetization`, `target_audience`, `category`,
  `complexity`, `icon`) — not article content.

**This means the original framing ("humanize the AI-Factory-generated content") doesn't match
reality. There is no generated per-tool content sitting in the database waiting to be
humanized — every fallback tool page is byte-identical boilerplate.** That's arguably worse
for SEO than "thin AI content": it's duplicate content across every AI-Factory tool page, not
unique-but-weak content.

### A3. What this changes about the ask

Extending Humanize can't be step one, because there's nothing to feed it yet. The real
sequence has to be: **(1) generate unique per-tool content, (2) optionally humanize/score it**
using the existing, already-OpenAI machinery from A1.

### A4. CLAUDE.md scope check (good news, no new carve-out needed)

- A brand-new admin module to generate tool content fits entirely inside the **existing** §3a
  exception ("new agent module under `client/src/modules/admin/`... new route files... new core
  directories") — no new named carve-out required, unlike the §3b humanizer integration did.
- `ToolDetailPage.jsx` is a **public-website file**, not part of the protected Admin
  Panel/internal namespace — editing it to render new columns (when present, falling back to
  today's template when absent) is normal in-scope public-site work under §1/§5, not a
  protected zone at all.
- Reusing `contentStudio.humanize()` / `.score()` "as calling code only" is explicitly
  pre-approved by §3b's own wording, even though this isn't the Blog Assistant.

---

## Part B — Internal Linking

### B1. Tool → Tool (current state: two different mechanisms)

- **49 hand-built tools** (`ToolPageShell.jsx`) already use `getRelatedTools(toolMeta, 5)`
  (`client/src/data/toolRegistry.js:1217`) — a manual `relatedSlugs[]` override first, falling
  back to same-category matching, excluding self/`comingSoon`. This is already reasonable,
  deterministic, and free.
- **AI-Factory fallback tools** (`ToolDetailPage.jsx:210-216`) do something much weaker: fetch
  *all* public tools and `.filter(t => t.slug !== slug).slice(0, 5)` — the first 5 tools in
  whatever order `/api/tools/public` returns (default sort: `created_at`), with **no category
  matching at all**. This is the actual gap — most AI-Factory tool pages likely show a very
  similar or identical "related" list regardless of their own category.

### B2. Blog → Tool (current state: exists, works, but limited on the AI side)

- Static human-written posts (`client/src/data/blogPosts.js`) carry a manually curated
  `relatedTools: [...]` array (33 occurrences across posts) — already audited for dead slugs in
  batch-55 (2026-08-08), zero known-dead references as of that pass.
- DB-backed posts have a `blog_posts.related_tools` JSONB column (migration `020`), correctly
  mapped to `relatedTools` in the API response (`blog.public.js:21`). It **is** populated —
  `auto-campaign.js` and `marketing-agent.js` both set it when generating a post, but only ever
  to **exactly one hardcoded tool**: `[{slug: toolSlug, label: toolName, icon: '🔧'}]` (the
  campaign's own target tool). Manually-created posts via `admin-blog.js`'s create endpoint
  accept `related_tools` from the admin's request body.

### B3. Tool → Blog (current state: does not exist)

Checked both `ToolPageShell.jsx` and `ToolDetailPage.jsx` for any blog reference — neither
tool-page rendering path links to a blog post in either direction. This is a genuine gap, not
a partial one.

### B4. Recommended approach: rule-based, not AI-suggested

**Recommendation: deterministic category/tag matching, computed at request time (or build
time for SSG pages) — not an AI call per page.** Reasoning:

- **Cost**: an AI-suggested-links pass would mean one OpenAI call per tool page (potentially
  hundreds of AI-Factory tools) plus reruns whenever content changes — ongoing recurring cost
  for something a `category === category` filter does for free, instantly, with no external
  call.
- **Correctness**: AI-suggested links can hallucinate slugs or go stale as the catalogue
  changes — exactly the failure mode batch-55 just spent an audit pass cleaning up (26 dead
  references across 16 posts). A rule-based join can't reference a slug that doesn't exist in
  the same query.
- **Precedent already in the codebase**: `getRelatedTools()` for the 49 built tools is already
  this exact pattern (manual override → category fallback) and it works. The fix isn't to
  replace it with something costlier and less predictable — it's to extend the same pattern to
  where it's missing (AI-Factory tools, tool→blog).
- AI still has a legitimate role *upstream*, at content-creation time, in assigning good
  `category`/tag metadata in the first place (which `idea_metadata.category` already partially
  covers) — that's a data-quality input to the rule, not a per-page-request decision.

This directly answers the open question about AI cost/model choice for linking: **there isn't
one, under this recommendation.** For Part A's content generation (which does need an LLM),
recommend **OpenAI** (`gpt-4o` / `gpt-4o-mini`, matching the humanizer's existing split) —
consistent with everything shipped since batch-74, and there's no reason to introduce a new
Anthropic dependency into new code while that migration is still mid-flight.

---

## Part A — Follow-up: Full-Site Content-Quality Audit (2026-08-15)

Triggered by a corrected understanding of scope: this isn't just about the old
`source='ai'` autonomous idea-pipeline tools — it's every page on the site needing to clear
Google AdSense's content-quality bar, using the same "detect thin → generate/humanize → score"
approach Blog Assistant already has for blog posts. All numbers below came from read-only
`SELECT`/count queries against the live DB (disclosed and run with explicit permission this
session; scratch scripts deleted immediately after use, nothing committed).

### 1. Blog posts — scoring backlog

- 75 total `blog_posts` rows, all `status='published'`.
- **59 already scored** (`ai_score` set), **16 unscored** ("Not scored" badge).
- 72/75 have a non-empty `related_tools[]` already (higher coverage than the earlier research
  pass assumed — most posts do link to at least one tool).
- A bulk mechanism already exists: `BlogAssistant.jsx`'s `eligibleForBulk` filter
  (`p.ai_score == null || p.ai_score >= 40`) — "Humanize All" already targets both never-scored
  posts *and* posts that scored poorly (≥40 = still AI-sounding). This is a working,
  self-service backlog reducer, not a dead feature.

**Conclusion: blog is not "fully handled," but it's not a blind spot either** — there's a
16-post backlog and the tooling to clear it already exists and is reachable today via
`/admin/blog` → Published Posts → Humanize All. No new mechanism needed for blog specifically.

### 2. The 49 hand-built tools — sampled, not assumed

Checked whether `ToolPageShell.jsx`-based tools (the ones with their own React component) have
real content or are secretly thin too. They don't need any work:

- Every hand-built tool component (`MergePDF.jsx`, `BMICalculator.jsx`, `WordCounter.jsx`, etc.)
  wraps itself in `ToolPageShell` and passes its **own** `about`/`faqs` props — not a shared
  template. `ToolPageShell.jsx` explicitly supports "legacy string[] and new structured object"
  formats, confirming this has been iterated on per-tool over time.
- `client/src/data/toolGuideContent.js` (996 lines) supplies **Tips** and **Mistakes**
  sections — 6 of each per tool, sampled `merge-pdf` and `split-pdf` in full: genuinely
  specific, unique content (references real government portal size limits, DPI thresholds,
  cross-links to other actual AWE-OS tools by name — not generic filler).
- Coverage check: diffed all 53 `TOOL_COMPONENTS` slugs against `TOOL_GUIDE` keys — **52/53
  have a guide entry**. The one gap, `test-ai-tool`, is a dev/test artifact, not a real product
  tool.

**Conclusion: no gap here.** These pages already clear a real content-quality bar; don't spend
batch effort on them.

### 3. AI-Factory / admin-generated tools — corrected count

Re-ran the count using `POST /api/tools` (the admin-triggered creation endpoint,
`server/routes/tools.routes.js:86`, which takes `name`/`slug`/`ai_prompt` and defaults
`source` to `'manual'` at the DB level) as the actual "AI Factory" population, instead of the
old autonomous `idea-pipeline.js` (`source='ai'`, now mostly dead — 60/72 of those rows are
`status='killed'`).

- **Only 3 tools are currently `approved=true`** (the only flag `getPublicTool`/
  `getPublicTools` actually check): **Second Brain PKM System**, **Simple Word Counter**,
  **Final Price Calculator** — all `source='manual'`, all created via the admin panel, none in
  the 53 hand-built slugs. **Confirmed: all 3 render through `ToolDetailPage.jsx`'s hardcoded
  boilerplate fallback** — same 3 About paragraphs, same 5 FAQs, name-swapped only.
- The 16 `status='live'` rows found in the earlier pass are a red herring for this question —
  cross-checked every slug against the hand-built list: all but 2 are legacy/orphaned seed rows
  for tools that already have their own component (`tip-calculator`, `gst-calculator`,
  `sip-calculator`, etc. — the DB row is vestigial, the page renders from
  `TOOL_COMPONENTS`/`toolGuideContent.js` regardless of this row's state). The 2 that aren't
  (`invoice` and `invoice-generator-pro`) are both `approved=false`, so they 404 today — not
  reachable, not part of this batch's scope.
- 640 more `manual`-source rows sit at `status='idea'` (not approved, not live) — likely
  in-progress/unpublished admin drafts, not part of current scope. Flagging as an open question
  below rather than assuming they should be included.

**Conclusion: current real scale is 3 pages, not 72 and not "hundreds."** The underlying
`approved`/`status` sync gap flagged in an earlier session (2026-07-15 memory) is real and
larger than previously known — but fixing that gate is out of scope here per the hard
constraint (no `tools.status` changes). This batch should build for the mechanism, not
over-invest in today's exact count, since more tools will likely reach `approved=true` over
time.

### 4. Proposed unified mechanism: one new admin module, not a BlogAssistant tab

**Recommendation: build a new, separate admin module — do not add a tab to `BlogAssistant.jsx`.**

Reasoning: CLAUDE.md §3b's carve-out for the Blog Assistant humanizer integration is explicit
and narrow — *"No other tab (Ideas, Calendar, SEO, Keyword Research, Content Intelligence,
Content Studio) may be touched"* — and a new "Tool Pages" tab would be exactly that, a new tab,
which the carve-out doesn't cover. A brand-new module, by contrast, fits cleanly inside the
**already-granted** §3a exception (new isolated module under `client/src/modules/admin/`, new
route files, new core dirs) with zero ambiguity — no new carve-out negotiation needed, unlike
§3b required at the time.

Proposed shape: a new `/admin/content-quality` module that:
- Queries both `blog_posts` (existing `ai_score`/`humanized_at` columns) and `tools` (new
  columns, this batch) in one dashboard, listing every thin/unscored page across both tables
  sorted by score.
- For blog posts: **links out to the existing** `/admin/blog` Humanize flow rather than
  reimplementing it — avoids duplicating logic that's already correct and tested.
- For tool pages: offers per-tool "Generate content" (first draft, since none exists yet) and,
  once generated, "Humanize" + "Score" using `contentStudio.humanize()`/`.score()` exactly
  as-is (same reuse rule §3b already established), mirroring Blog Assistant's UX (per-item panel
  + bulk action + CSV-style summary) without touching `BlogAssistant.jsx`'s file at all.

---

## Proposed Batches

*Batch A1 and A2 below are revised as of the 2026-08-15 follow-up audit (module name/path and
scale numbers updated); Batch B1 is unchanged from the original research pass.*

### Batch A1 (revised) — Content Quality module: generate & store unique per-tool content

**Scope:**
- New migration (additive only): `tools` table gains `about_content TEXT`, `faq JSONB DEFAULT
  '[]'`, `content_generated_at TIMESTAMPTZ` (mirrors the `blog_posts` migration 037 pattern).
- New isolated admin module under existing §3a scope: `/admin/content-quality` —
  `client/src/modules/admin/content-quality/` (new directory). Dashboard lists thin/unscored
  pages from **both** `blog_posts` and `tools` in one view (see A4 above); the blog side links
  out to the existing `/admin/blog` Humanize flow rather than reimplementing it. The tools side
  gets a per-tool "Generate content" action + bulk "Generate All" (same UX shape as Blog
  Assistant's Published Posts, but its own module — doesn't touch `BlogAssistant.jsx` at all).
- New server route file: `server/routes/admin-content-quality.js` — OpenAI call(s) to draft
  About copy + FAQ per tool (first-draft generation, not humanization — there's nothing to
  rewrite yet), writes to the new columns. Also a lightweight read endpoint that lists
  unscored/thin rows across both tables for the dashboard.
- One additive line each in `AdminSidebar.jsx`, `Overview.jsx`, `App.jsx`, `server/app.js` (or
  equivalent) — exactly what §3a already permits.
- Edit `ToolDetailPage.jsx` (public file, not protected): render `tool.about_content` / `tool.faq`
  when present, fall back to today's template text when null — safe incremental rollout, no
  breakage for tools not yet backfilled.

**Files likely touched:** 1 new migration, 2-3 new files under
`client/src/modules/admin/content-quality/`, 1 new `server/routes/admin-content-quality.js`,
1 line each in the 4 protected integration points, `ToolDetailPage.jsx`.

**Scale (confirmed via read-only count, 2026-08-15):** 3 tools currently `approved=true` and
affected today (Second Brain PKM System, Simple Word Counter, Final Price Calculator). Build
for the mechanism, not the current count — more will land here as the `approved` gate issue
gets resolved separately.

**Open decisions before implementation:**
1. ~~How many tools does this affect~~ — answered above (3 today).
2. Exact prompt/tone for first-draft About + FAQ generation — should mirror the blog generation
   voice or be tool-specific?
3. Backfill-only (this batch) vs. wiring generation into tool creation going forward — the
   latter would touch `idea-pipeline.js`/`builder-agent.js`/`PipelineOrchestrator`, which are
   hard-constraint protected. Confirmed by you already: **backfill-only**, pipeline stays
   untouched.
4. **New**: the 640 `manual`-source rows sitting at `status='idea'` (not approved, not live) —
   explicitly out of scope for this batch (they're not public pages today), but flagging so
   scope doesn't silently creep to "generate content for every draft in the system."

### Batch A2 (revised) — Humanize & score the new tool content

**Scope:** Reuse `contentStudio.humanize()` / `.score()` exactly as-is (already OpenAI,
already `contentType`-parameterized) against `tools.about_content`, inside the same
`/admin/content-quality` module from A1 (not `BlogAssistant.jsx` — avoids overlapping §3b's
Published-Posts-only scope). Adds `ai_score` / `human_score` / `humanized_at` to the tools
table (can fold into A1's migration or split — recommend one migration, your call). Same
per-item + bulk "Humanize All" UX pattern as Blog Assistant.

**Files likely touched:** same `server/routes/admin-content-quality.js` (additive endpoints),
same admin module client files.

**Open decision:** run this as its own batch after A1 ships and is verified, or fold into A1?
Recommend keeping separate — same discipline as blog's humanizer having its own batch history
(Batch 48 etc.), and it lets you verify content generation quality before spending calls on
humanizing it.

### Batch B1 — Internal linking pass

**Scope:**
- **Tool→Tool fix**: replace `ToolDetailPage.jsx`'s naive `slice(0,5)` with category-matching
  (mirroring `getRelatedTools()`'s fallback logic) against the `tools` table's existing
  `category` column. Public file only, no new DB columns needed.
- **Tool→Blog (new)**: add a "Related reading" section to both `ToolPageShell.jsx` and
  `ToolDetailPage.jsx`, matching blog posts by `category` or by reverse-lookup on existing
  `relatedTools[]`/`related_tools` data — no AI call, no new writes.
- **Blog→Tool diversification**: *optional, flagged separately below* — improving
  `auto-campaign.js`/`marketing-agent.js` beyond their current single-hardcoded-tool link would
  mean editing files that look like existing protected agent files under §3a's "all existing
  agent files... unchanged" clause. Recommend treating this as excluded from B1 unless you
  explicitly want it in scope (and if so, whether that needs its own named CLAUDE.md carve-out
  the way §3b did for the Blog Assistant humanizer).

**Files likely touched:** `client/src/pages/ToolDetailPage.jsx`,
`client/src/pages/tools/ToolPageShell.jsx`, `client/src/data/toolRegistry.js` (possible new
helper), possibly one small server-side query addition if category-matching for AI-Factory
tools is cheaper done server-side at scale rather than client-side over the full list.

**Open decisions before implementation:**
1. Include the blog→tool diversification (touches agent-adjacent files) or explicitly exclude
   it from this batch?
2. Should tool→tool matching for AI-Factory tools happen client-side (fetch all, filter) like
   today, or should `/api/tools/public/:slug` return same-category tools server-side to avoid
   over-fetching as the catalogue grows?

---

## Summary

- Part A is **not** "extend Humanize to existing thin content" — it's "there is no content yet
  for the affected tool pages; generate it first (A1), then reuse the existing OpenAI-only
  humanizer/scorer machinery as-is (A2)."
- The follow-up full-site audit (2026-08-15) found the actual gaps are narrower than assumed
  in two places and about right in a third: blog has a real but small 16-post backlog with
  working tooling already; the 49 hand-built tools already have rich, unique, per-tool content
  (no gap); AI-Factory/admin-generated tools currently affect exactly 3 live pages (not 72, not
  hundreds), all rendering identical boilerplate via `ToolDetailPage.jsx`.
- Recommended mechanism: one new admin module (`/admin/content-quality`), not a new
  `BlogAssistant.jsx` tab — the latter would conflict with §3b's explicit "no other tab" carve-out
  wording; the former fits cleanly inside the already-granted §3a exception.
- Part B's clearest gap is tool→blog linking (doesn't exist) and AI-Factory tool→tool matching
  (naive). Recommended fix is rule-based/deterministic throughout — no AI cost, no new
  hallucinated-slug risk, consistent with the one pattern in the codebase that already works
  well (`getRelatedTools`).
- Neither part requires pausing further or conflicts with the paused batch-82
  Anthropic→OpenAI migration; the humanizer/scorer being reused are already OpenAI-only.
- Part A doesn't require a new CLAUDE.md carve-out (fits inside existing §3a + normal
  public-site scope). Part B's core scope doesn't either; only the optional blog→tool
  diversification sub-item might.
