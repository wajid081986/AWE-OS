# Batch 85 — Increase Content Quality generation depth (About + FAQ)

Branch: `batch-85-tool-content-length`. Built directly on batch-84's fixes
(`approved`-only backlog filter, `has_dedicated_component`, de-dupe).

## Why

Batch-83/84 shipped and is live-verified, but the generated content is thin
by AdSense standards: About sections average 138-162 words, FAQ (5 Q/A)
adds ~200-260 more, for ~388-412 words total per tool page. Needs real depth
without turning into padded filler.

## Research — current state, confirmed by reading the file

`server/routes/admin-content-quality.js`:

1. **`buildContentPrompt()`** (lines 27-57) — the entire length instruction
   today is: About = *"3 short paragraphs (max 4 sentences each)"*, FAQ =
   *"exactly 5 question/answer pairs... Each answer 40-60 words."* No
   explicit word-count target is given for About at all — "3 paragraphs,
   ≤4 sentences" is what's producing the observed 138-162 words (short
   sentences × 12 max = thin by construction).

2. **`max_tokens: 1200`** (line 133, in `POST /tools/:id/generate`) — sized
   for the current short output. This is a real blocker for the new target,
   not just a prompt-wording issue: 700-800 words (About) + 6×60-90 words
   (FAQ) is roughly 700-800 + 360-540 ≈ 1060-1340 words of actual content,
   which is ~1400-1800 tokens before JSON structure/escaping overhead. At
   `max_tokens: 1200` the completion would be cut off mid-generation,
   producing invalid/truncated JSON that `parseAIJson.js` cannot recover
   (it only handles fence-stripping and slicing to the outermost brackets,
   not repairing truncated content) — the request would fail outright, not
   just come back short. **This must increase alongside the prompt change.**

3. **Regeneration/overwrite — confirmed, no fix needed on generate/save**:
   - `POST /tools/:id/generate` (line 121) re-generates from scratch every
     call, with no check against existing `about_content` — calling it again
     on an already-content'd tool works fine today.
   - `POST /tools/:id/save` (line 161) unconditionally overwrites
     `about_content`, `faq`, `content_generated_at` via `.update()` — also
     already correct, no fix needed.
   - **The actual blocker is `GET /tools`** (line 61-99): it filters
     `.is('about_content', null)`, so the 3 tools that already have (thin)
     content — final-price-calculator, second-brain-pkm-system,
     simple-word-counter — are excluded from `ContentQualityPage.jsx`'s list
     entirely. There's currently no way to reach their Generate button from
     the dashboard at all, regardless of content quality. This needs a
     query fix, not a generate/save fix.

## Scope — exactly what this batch does (all in `admin-content-quality.js`, no new files)

1. **`buildContentPrompt()` — new targets**:
   - About: 6 paragraphs (3-5 sentences each), ~700-800 words total, each
     paragraph given a distinct job so length comes from real substance, not
     padding:
     1. What the tool does and who it's for.
     2. How AWE-OS's version specifically works (browser-based, no
        signup/upload — tied to the privacy promise) and why that beats the
        manual/alternative way.
     3-4. Two concrete, tool-specific use-case scenarios (not generic
        "many people use this for various reasons").
     5. Practical tips for getting the best result from this specific tool.
     6. Indian-context relevance where it naturally applies (₹, common
        Indian forms/documents/scenarios) — same "don't force it" rule as
        today, kept as-is.
   - FAQ: 5 → **6** questions, answer length 40-60 → **60-90** words each.
     6 chosen over 7 to reduce the risk of the model padding out a 7th
     question that duplicates one of the first 6.
   - Keep unchanged: beginner-friendly tone, ₹/Indian number format rule,
     "avoid corporate/AI phrasing" list, JSON-only output contract, the
     "not generic filler" instruction.

2. **`max_tokens: 1200` → `3000`** on the `POST /tools/:id/generate` OpenAI
   call — sized with real headroom above the ~1400-1800 token estimate
   above, so longer tool names/descriptions or a slightly verbose model
   response don't risk truncation. Temperature (0.7) and model (`gpt-4o`)
   unchanged.

3. **`GET /tools` query fix** — replace the current `.is('about_content',
   null)` filter with logic that surfaces both never-generated AND
   thin-existing content:
   - Drop the DB-level `.is('about_content', null)` filter (PostgREST can't
     express "word count below N" directly).
   - After fetching (still `approved=true`, `has_dedicated_component=false`,
     de-duped by name), keep a row if `about_content` is `null` **or** its
     word count is below a `MIN_ABOUT_WORDS = 400` threshold.
   - 400 chosen as a safe cutoff: comfortably above the legacy ~138-162
     word content (so all 3 existing tools get flagged for regeneration)
     and comfortably below the new 700-800 word target (so freshly
     regenerated tools won't re-appear next time the dashboard loads,
     leaving margin for natural length variance between generations).
   - This is a general fix (any future thin content gets caught the same
     way), not a one-off hardcoded list of 3 tool IDs — consistent with
     "Content Quality" being about quality, not just presence.

## Explicitly NOT in this batch

- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or any of the
  status-writing code paths — untouched, per hard constraint.
- `ContentQualityPage.jsx` / any client file — no change needed; it already
  renders whatever `GET /tools` returns and already has a working
  Generate/Save flow per-row.
- `admin-blog.js`'s `generatePostContent()` — not touched, this batch only
  mirrors its voice rules as before, doesn't modify it.

## Files touched

1. `server/routes/admin-content-quality.js` only — 3 changes: prompt text,
   `max_tokens`, `GET /tools` query. 1 file.

## Verification plan

- Build/syntax check only (`node -c server/routes/admin-content-quality.js`).
- **No live OpenAI calls** as part of automated verification, per your
  standing instruction — you'll test the actual generate/save round-trip
  manually (including confirming word counts land in the 700-800 / 60-90
  range and the 3 existing tools now appear in the dashboard list) after
  reviewing this batch.
