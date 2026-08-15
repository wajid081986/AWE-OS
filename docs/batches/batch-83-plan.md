# Batch 83 — Content Quality module (A1): generate unique per-tool content

Supersedes the "Batch A1" sketch in `docs/plans/thin-content-and-internal-links-plan.md` with
exact file-level detail. Branch: `batch-83-tool-content-quality-a1`.

## Why (recap)

`ToolDetailPage.jsx` (the fallback renderer for any `/tools/:slug` not in the hand-built
`TOOL_COMPONENTS` map) shows fully hardcoded "About" and FAQ boilerplate — same text on every
such page, name-swapped only. Confirmed via read-only count: **3 tools are affected today**
(Second Brain PKM System, Simple Word Counter, Final Price Calculator), all `source='manual'`
admin-created tools with `approved=true`. The 49 hand-built tools already have real per-tool
content (`toolGuideContent.js`, per-component `about`/`faqs` props) — not touched by this
batch. Blog posts have their own working Humanize backlog-clearer already — not touched by
this batch either, beyond a dashboard link-out in a later piece of A1.

## Scope — exactly what this batch does

1. **New migration** (additive only), next free number after `040_ai_factory_product_type.sql`:
   `tools` table gains:
   - `about_content TEXT DEFAULT NULL`
   - `faq JSONB DEFAULT '[]'`
   - `content_generated_at TIMESTAMPTZ DEFAULT NULL`
   (No `ai_score`/`human_score`/`humanized_at` yet — those belong to Batch A2, the humanize
   pass, per the plan doc's recommendation to keep generation and humanization as separate
   batches.)

2. **New server route file**: `server/routes/admin-content-quality.js`
   - `GET /api/admin/content-quality/tools` — lists tools where `about_content IS NULL`
     (the backlog view), plus enough fields for a simple dashboard table (name, slug, category,
     approved, created_at).
   - `POST /api/admin/content-quality/tools/:id/generate` — calls OpenAI to draft
     `about_content` + `faq`, returns a preview (does not save yet — mirrors the blog
     generate-then-humanize-then-save pattern, so a bad draft never overwrites silently).
   - `POST /api/admin/content-quality/tools/:id/save` — persists the previously-returned draft
     to `about_content`, `faq`, `content_generated_at`.
   - Bulk variant reusing the same generate function, matching Blog Assistant's "Generate All"
     UX (progress counter, per-item success/failure, cancel-safe).

3. **New admin module** (client): `client/src/modules/admin/content-quality/`
   - `ContentQualityPage.jsx` — dashboard: table of tools with no `about_content` yet, per-row
     "Generate" button + preview panel (same shape as Blog Assistant's humanize preview panel),
     "Generate All" bulk action.
   - A blog-side panel/section that reads `blog_posts` unscored count (16 today) and links out
     to `/admin/blog` → Published Posts — **no blog logic duplicated**, this is a summary +
     link only.

4. **Protected integration points** — one additive line each, per §3a:
   - `AdminSidebar.jsx` — one new nav entry: "Content Quality" → `/admin/content-quality`.
   - `Overview.jsx` — one new card.
   - `App.jsx` — one new lazy route import + `<Route>`.
   - `server/app.js` (or equivalent) — one new `app.use('/api/admin/content-quality', ...)`.

5. **Public file edit**: `client/src/pages/ToolDetailPage.jsx`
   - About section: if `tool.about_content` is present, render it (as paragraphs); else render
     today's existing template exactly as-is (zero behavior change for tools not yet
     backfilled — this is the safety net).
   - FAQ section: if `tool.faq` (array of `{q, a}`) is present and non-empty, render it instead
     of the hardcoded `FAQS()` list; else fall back to `FAQS()` exactly as today.
   - `tools.controller.js`'s `PUBLIC_DETAIL_FIELDS` needs `about_content, faq` added so the
     public API actually returns the new columns — additive `select()` change only, no
     behavior change for existing fields.

## Prompt / tone — confirmed: mirror the blog-writer's voice

Pulled the actual voice rules from `generatePostContent()` in `server/routes/admin-blog.js` to
replicate, not reinvent:
- Default tone = **beginner**: *"Write for someone completely new. Simple language, explain
  every term."* — same default the blog writer uses when no tone is specified.
- Indian context on: ₹ symbol, Indian number format (₹12,75,000), SEBI/RBI context where the
  tool is finance-related — same conditional the blog writer applies.
- Short paragraphs, natural (not stuffed) mention of the tool doing its job, no corporate/AI
  phrasing ("in conclusion," "it is worth noting" — same phrases the humanizer itself strips
  out, so first-draft generation should avoid them from the start rather than rely on a later
  humanize pass to fix it).
- FAQ answers: shorter than blog's 100+ word minimum (a tool page FAQ isn't a full article) —
  proposing 40-60 words each, 5 questions, tool-specific rather than the generic "Is it free /
  do I need an account" boilerplate currently hardcoded.
- Internal links: reuse the blog writer's rule of only linking to real, known tool
  slugs — pull from the same category or the hand-built catalogue, never invent a slug.

This isn't a copy-paste of the blog prompt (wrong content shape — About/FAQ isn't a 2000-word
article with H2 sections), but every tone/voice instruction inside it comes directly from
`generatePostContent()`'s existing rules, so the two read as one site's writing rather than two
different AI voices.

## Explicitly NOT in this batch

- Batch A2 (humanize/score the generated tool content) — separate batch, per the plan doc.
- Batch B1 (internal linking fixes) — separate batch, unrelated to content generation.
- Any change to `idea-pipeline.js`, `builder-agent.js`, `PipelineOrchestrator`, `tools.status`,
  or wiring generation into tool creation — backfill-only, confirmed by you.
- The 640 `manual`-source `status='idea'` rows — not public, not touched.
- `BlogAssistant.jsx` — not touched at all, including no new tab (per the §3b scope
  conflict already flagged in the plan doc).

## Files touched (count check against the ~25-file soft limit)

1 migration, 1 new route file, ~3-4 new client files under `content-quality/`, 4 one-line
integration edits, `ToolDetailPage.jsx`, `tools.controller.js` — **~11 files**, well under the
"stop and confirm" threshold.

## Verification plan

- Build + lint clean.
- No live OpenAI calls during automated verification (per your standing instruction) — test
  the generate/save round-trip manually against one real tool after you review, not as part of
  the automated build-verify step.
- Confirm `ToolDetailPage.jsx` renders identically to today for a tool with no `about_content`
  (regression check on the fallback template) before testing the new-content path.
