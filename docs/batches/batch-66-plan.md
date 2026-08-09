# Batch 66 — AI Factory Phase 4: Market Intelligence (Trend-Driven Ideas)

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md` §7 (Phase 4).
Prior phases (batches 62–65) are complete and verified live: `product_type`
dispatch (Phase 1–2) and the packaging layer (Phase 3, `packaging.service.js`)
both work for all 4 non-prompt-tool types.

## Scope (this batch)

Backend only, informational scoring, no admin UI. Per the SDD, §7 resolves
its own open question (trend data source) as **manual curation** — a static,
human-edited config file, not a new DB table, not scraping, not an LLM call.

## Files to create

### 1. `server/intelligence/market-trend-catalog.js`
A plain JS module exporting a curated array of trend entries. Chosen over
a `.json` file so entries can carry comments explaining the reasoning
inline (easier for a human to maintain over time) — still a static data
structure, no logic.

Each entry: `{ category, product_type, demand, reasoning, keywords }`
- `category` — matches the existing category taxonomy already used by
  `SEOIntelligence.js`'s `CATEGORY_DIFFICULTY` map (pdf, calculators,
  converters, writing, marketing, productivity, finance, health,
  education, legal, ecommerce, other) — reusing it instead of inventing a
  new one, since Phase 4 doesn't touch the category-taxonomy open
  question raised in SDD §11.
- `product_type` — one of the 5 values `ai-factory.service.js` already
  dispatches on: `prompt-tool`, `static-bundle`, `ui-kit`,
  `notion-template`, `browser-extension`.
- `demand` — one of `'high-demand' | 'saturated' | 'emerging'`.
- `reasoning` — one short human-written sentence (general marketplace
  knowledge — ThemeForest/CodeCanyon/Gumroad/Product Hunt category
  patterns), not generated.
- `keywords` — optional array of extra words to match against the free-text
  `idea` string, for entries where the category/product_type pair alone is
  too broad (e.g. distinguishing "budget tracker" from other finance
  Notion templates).

**Draft dataset (14 entries) — please review, this is the part I want your
sign-off on specifically:**

```js
[
  { category: 'productivity', product_type: 'notion-template', demand: 'high-demand',
    reasoning: 'Notion templates are one of Gumroad\'s best-selling categories for personal knowledge management and planning.',
    keywords: ['planner', 'pkm', 'second brain', 'task'] },

  { category: 'finance', product_type: 'notion-template', demand: 'high-demand',
    reasoning: 'Budget trackers and finance dashboards are consistently top sellers in Gumroad/Etsy digital template shops.',
    keywords: ['budget', 'expense', 'finance tracker'] },

  { category: 'pdf', product_type: 'prompt-tool', demand: 'saturated',
    reasoning: 'PDF utilities are heavily commoditized by iLovePDF/SmallPDF/Adobe — hard to differentiate without a strong niche angle.',
    keywords: [] },

  { category: 'converters', product_type: 'prompt-tool', demand: 'saturated',
    reasoning: 'File/unit converters are a crowded, low-differentiation category across the free-tools web.',
    keywords: [] },

  { category: 'calculators', product_type: 'prompt-tool', demand: 'saturated',
    reasoning: 'Basic calculator tools are extremely common free-tool-site fare with little room to stand out.',
    keywords: [] },

  { category: 'marketing', product_type: 'ui-kit', demand: 'high-demand',
    reasoning: 'Landing-page and marketing UI kits are consistent top sellers on ThemeForest/CodeCanyon.',
    keywords: ['landing page', 'hero section'] },

  { category: 'productivity', product_type: 'ui-kit', demand: 'high-demand',
    reasoning: 'Admin/dashboard UI kits are a perennial CodeCanyon bestseller category.',
    keywords: ['dashboard', 'admin panel'] },

  { category: 'ecommerce', product_type: 'static-bundle', demand: 'high-demand',
    reasoning: 'Landing page bundles for storefronts and product launches sell well on both ThemeForest and Gumroad.',
    keywords: ['storefront', 'product launch'] },

  { category: 'education', product_type: 'notion-template', demand: 'emerging',
    reasoning: 'Student planner / course-tracker templates are a growing Gumroad niche, less saturated than general productivity trackers.',
    keywords: ['student', 'course tracker', 'study planner'] },

  { category: 'writing', product_type: 'browser-extension', demand: 'emerging',
    reasoning: 'AI writing-assistant browser extensions are a fast-growing Product Hunt launch category.',
    keywords: ['writing assistant', 'grammar'] },

  { category: 'productivity', product_type: 'browser-extension', demand: 'high-demand',
    reasoning: 'Productivity and tab-management extensions are consistently among top Chrome Web Store and Product Hunt launches.',
    keywords: ['tab manager', 'focus', 'time tracker'] },

  { category: 'legal', product_type: 'notion-template', demand: 'emerging',
    reasoning: 'Contract/compliance tracker templates are a newer, less crowded Gumroad niche compared to general productivity templates.',
    keywords: ['contract tracker', 'compliance'] },

  { category: 'health', product_type: 'notion-template', demand: 'emerging',
    reasoning: 'Habit and wellness tracker templates are growing but not yet as saturated as productivity/finance trackers.',
    keywords: ['habit tracker', 'wellness'] },

  { category: 'marketing', product_type: 'browser-extension', demand: 'high-demand',
    reasoning: 'Social-media and SEO helper extensions are a strong, recurring Product Hunt and Chrome Web Store category.',
    keywords: ['seo', 'social media scheduler'] },
]
```

Any `{category, product_type}` combination not in this list falls back to a
neutral `'unrated'` signal (see scorer below) rather than guessing — the
whole point of manual curation is that silence means "not reviewed yet,"
not "bad idea."

### 2. `server/intelligence/market-trend-scorer.js`
Mirrors the style of the existing pure-algorithm modules (`SEOIntelligence.js`
et al. — plain functions, no class, `'use strict'`, JSDoc header) but lives
as its own file per the SDD, kept separate from the 5 modules orchestrated
by `intelligence/index.js` (not added to that pipeline or its `index.js`
exports — Phase 4 is intentionally a standalone lookup, not part of the
existing `runIntelligencePipeline`).

```js
scoreIdea({ idea, category, product_type })
```
Matching logic (simple, no LLM):
1. Exact match on `{category, product_type}` → return that entry's
   `demand`/`reasoning`, `matchType: 'exact'`.
2. No exact match, but `idea` text contains one of an entry's `keywords`
   for the same `category` (any product_type) → return that entry,
   `matchType: 'keyword'`.
3. No match at all → `{ demand: 'unrated', reasoning: 'No curated trend data yet for this category/product-type combination.', matchType: 'none' }`.

Returns: `{ demand, reasoning, matchType, matchedEntry: {category, product_type} | null }`.

### 3. `server/routes/factory.routes.js` — additive endpoint
New route, same auth pattern as the existing `/intelligence/analyze` route
(`requireAuth, requireAdmin`, no rate limiter — it's a synchronous local
lookup, not an LLM call or generation run):

```js
// POST /api/factory/score-idea
// Informational trend signal only — never called by /generate, never blocks it.
router.post('/score-idea', requireAuth, requireAdmin, async (req, res) => {
  const { idea, category, product_type } = req.body;
  if (!category) return res.status(400).json({ success: false, error: 'category is required' });

  try {
    const result = marketTrendScorer.scoreIdea({ idea, category, product_type });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

Placed as its own section below the existing "PHASE 6A — Intelligence
Endpoints" block, labeled for Phase 4. No existing route in this file is
modified.

## Explicitly not touched

- No admin UI, no `ToolRenderer.jsx`, no frontend files.
- `/api/factory/generate` and `runFactory()` — untouched; `/score-idea` is
  fully independent, not consulted or blocked on.
- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent` — untouched.
- `tools` table schema — no migration in this batch, no columns added,
  nothing written to `tools`.
- The 5 existing modules in `server/intelligence/` and `intelligence/index.js`
  — untouched; the new scorer is not wired into `runIntelligencePipeline`.
- No web scraping, no external API calls, no new npm dependency.

## Testing

- Syntax/require check on both new modules (`node -e "require(...)"`) —
  no live Supabase/S3/LLM calls this batch, per instructions.
- Manual review of a few `scoreIdea()` calls covering: exact match, keyword
  match, and no-match fallback.
- Confirm `factory.routes.js`'s existing routes are byte-for-byte unchanged
  aside from the one new route block.

## Open item for user sign-off before implementation

The trend dataset content above (14 entries) is a judgment call, not a
mechanical derivation — please review and edit/add/remove entries before
I write the code. Once approved, I'll implement exactly the file layout
above.
