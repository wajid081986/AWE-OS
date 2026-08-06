# Batch 48 — Advanced Humanizer Features

**Branch:** `batch-48-advanced-humanizer-features`

## Scope

Extends the CLAUDE.md §3b carve-out (Blog Assistant Humanizer Integration)
with four features on top of batch-46/47's Published Posts humanizer,
confirmed by user:

1. **Title Humanizer** — humanize post titles, strip AI-tell patterns
   ("Unlock Your", "Transform Your", "Discover…"), keep target keyword,
   show original vs humanized, separate title AI score.
2. **SEO + Humanize combined** — keyword density check, meta description
   humanize (150-160 chars), Flesch-Kincaid readability before/after,
   internal-link count check.
3. **Advanced AI Detection Score** — burstiness (sentence-length
   variance), vocabulary richness (type-token ratio), extended AI-phrase
   detection, combined weighted score with a gauge display. See note
   below on "perplexity."
4. **Bulk Humanize Dashboard** — live results table, Pause/Resume/Cancel,
   completion summary (avg before/after, AdSense-readiness %), CSV
   export.

Confirmed with user: SEO auto-fix stays on the existing OpenAI
(`getOpenAI()`/gpt-4o-mini) infra already used by `humanizer.js` and
`content-scorer.js` — no new dependency, no new secret.

## Grounding notes (why the design looks like this)

- `blog_posts.content` is a JSONB block array (`p`, `h2`, `table`, `ul`,
  `callout`). Internal links live either as `<a href='/tools/...'>` HTML
  inside `p`-block text, or as a `callout.links[]` array
  (`admin-blog.js` generation prompts, lines ~253/311, target 2-3 links)
  — the internal-link checker scans both, no new representation needed.
- `content-scorer.js` already computes keyword density with plain
  arithmetic (count / wordCount), not an OpenAI call — reusing that
  approach for Feature 2 keeps it free and instant.
- **"Perplexity" caveat**: true LM perplexity needs token
  log-probabilities from the model, which isn't obtainable for
  arbitrary input text via the Chat Completions API. What ships is a
  **heuristic predictability proxy** (frequency of cliché
  transitions/AI-tell phrases + generic-phrase density), clearly
  labeled as an estimate in the UI, not real GPT logprob perplexity.
  Flagging this now since it's a gap between the request and what's
  technically deliverable without a different API surface.
- Bulk Dashboard (Feature 4) intentionally stays scoped to **content**
  humanization only (same as today) — Title/SEO enhancements remain a
  manual per-post action, not part of the bulk loop, to keep bulk-run
  OpenAI cost bounded per batch-46's already-flagged cost risk.

## Files created

- `server/db/migrations/038_blog_posts_advanced_seo.sql` — 6 additive
  columns on `blog_posts`: `humanized_title`, `title_ai_score`,
  `meta_description_humanized`, `readability_score`, `keyword_density`,
  `target_keyword`. No existing column touched.
- `server/core/content-studio/advanced-humanize.js` — new sibling file
  (per §3b: `humanizer.js`/`index.js` stay "reused as-is," so new logic
  lives here, not inside them). Exports:
  - `humanizeTitle(title, targetKeyword)` — one OpenAI call
    (gpt-4o-mini, JSON response) returning humanized title + before/after
    title AI score in a single round trip (titles are short — no need
    for the 3-call pattern `humanizer.js` uses for full articles).
  - `humanizeMetaDescription(metaDescription, targetKeyword)` — one
    OpenAI call (gpt-4o-mini), enforces 150-160 char output.
  - `analyzeKeywordDensity(text, targetKeyword)` — pure JS, same
    arithmetic as `content-scorer.js`.
  - `computeReadability(text)` — pure JS Flesch-Kincaid Reading Ease
    (standard vowel-group syllable estimator, no dependency).
  - `checkInternalLinks(blocks)` — pure JS, scans `p`-block
    `<a href=...>` tags and `callout.links[]`.
  - `computeAdvancedDetection(originalText, humanizedText)` — pure JS:
    burstiness (stdev of sentence length), TTR (unique/total words),
    AI-phrase density against an extended static phrase list (seeded
    from `humanizer.js`'s existing "Furthermore/Moreover/In
    conclusion/It is worth noting" set plus common GPT tells: "dive
    into", "unlock", "elevate", "seamless", "robust", "testament to",
    "when it comes to", "navigating", "game-changer", "delve", "in
    today's fast-paced world"), predictability proxy (see caveat
    above), and a combined weighted score. No OpenAI call — keeps this
    feature free to run on every preview.
  - Static `AI_TITLE_PATTERNS` list (seeded from "Unlock Your",
    "Transform Your", "Discover", + common title-tell prefixes) used in
    the title-humanize prompt.

## Files modified

- `server/routes/admin-blog.js` (additive only, existing routes
  untouched):
  - `POST /humanize/:id/title` — body `{ targetKeyword }`, preview only.
  - `POST /humanize/:id/seo` — body `{ targetKeyword }`, runs meta
    humanize + density + readability + link check, preview only.
  - `POST /humanize/:id/save-advanced` — body `{ humanizedTitle,
    titleAiScore, metaDescriptionHumanized, readabilityScore,
    keywordDensity, targetKeyword }`, persists the 6 new columns.
    Separate from the existing `/humanize/:id/save` so content-save
    behavior is untouched.
  - `/humanize/:id` (existing, preview) — response `scores` object
    gains the Feature 3 fields (`burstiness`, `vocabularyRichness`,
    `predictability`, `combinedDetectionScore`) computed from the
    already-fetched original/humanized text — no new endpoint, no new
    OpenAI call, additive fields only.
- `client/src/modules/admin/blog/BlogAssistant.jsx` — **only**
  `PublishedPostsTab` touched, per §3b:
  - Humanize panel gains: a "Target Keyword" input (feeds density +
    title/meta humanize), a Title Humanize button + before/after title
    display + title AI score badge, an SEO sub-panel (density,
    readability, internal-link count, meta-description humanize +
    before/after), and an Advanced AI Detection gauge (plain
    div/Tailwind segmented bar — no new UI dependency, matches
    `AiScoreBadge`'s existing style) built from the extended `scores`
    fields.
  - Bulk section becomes a dashboard: live table (post · before ·
    after · status) replacing the current bar-only progress view,
    Pause/Resume (new `bulkPauseRef`, checked in the existing
    sequential loop) alongside the existing Cancel, a completion
    summary card (avg before/after score, AdSense-readiness % = share
    of posts with final `ai_score < 40`, matching the existing
    `eligibleForBulk` threshold), and a "Export CSV" button
    (client-side `Blob`/`URL.createObjectURL`, no new dependency).

## Risks

- Two more OpenAI calls (title + meta) when a user runs Title/SEO on a
  post in addition to content humanize — same per-call
  timeout/maxRetries pattern as batch-47, but per-post cost goes up if
  someone runs everything on every post.
- "Perplexity" is a heuristic proxy, not literal GPT log-probability
  perplexity — documented above and will be labeled as an estimate in
  the UI copy, same "AI-likelihood estimate" framing batch-46 already
  requires for `ai_score`.
- `target_keyword` is manually entered per post (no auto-detection from
  title/category) — first use on older posts will show blank density
  until a keyword is set and saved.
- Flesch-Kincaid syllable counting is a standard vowel-group heuristic;
  it can misjudge unusual/technical words, same caveat any
  non-dictionary-based readability formula has.

## Verification

`node --check` on all touched/new server files; `npm run build` (vite)
on the client. No `.env`/live-credential access — no live
OpenAI/Supabase calls during the batch. A full live Playwright QA pass
before deploy is recommended, per prior project convention, and stays
out of scope for this batch.
