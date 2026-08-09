# AWE-OS AI Factory — Growth Features SDD
### System Design Document — Marketplace Listing Automation, Bulk Generation, and WordPress/Shopify Product Types

**Version:** 1.0
**Status:** Draft — planned, not yet implemented
**Scope:** AWE-OS repo only. Builds directly on top of `AWE-OS_AI-Factory_Advancement-SDD.md` (Phases 1–5, batches 62–69, all live and verified). No integration with AI SaaS Factory.
**Prerequisite reading:** `AWE-OS_AI-Factory_Advancement-SDD.md` — this document assumes the `product_type` dispatch pattern, `packaging_metadata` shape, and the admin UI wiring (batch-67) are already live.

---

## 1. Purpose

The core AI Factory generation engine is complete and verified across 9 product types (batches 62–69). This SDD covers the next layer: turning generated products into **less manual, higher-throughput, and broader-market** output. Three independent features, each buildable and shippable on its own:

1. **Marketplace Listing Automation** — eliminate the manual step between "product generated" and "product live on AWE-OS Marketplace."
2. **Bulk Generation** — generate multiple products in one operation instead of one form submission at a time.
3. **WordPress/Shopify Product Types** — extend `product_type` dispatch to the two largest digital-product ecosystems not yet covered.

These are prioritized in this order because Feature 1 removes a real recurring manual step (highest day-to-day time savings for a solo operator), Feature 2 compounds that saving, and Feature 3 is the largest remaining market-size opportunity but the most implementation-heavy (new languages/ecosystems).

## 2. Current State (grounding facts)

- `packaging.service.js` (batch-65) already produces a `listing.json`-shaped object inside `packaging_metadata`: `{ title, description, price, category, tags, screenshots: [] }` — this shape was deliberately designed to match AWE-OS Marketplace's own product upload fields (per the original SDD §6.2), so no new data needs to be generated for Feature 1, only moved.
- The AWE-OS Marketplace itself (audited in the base full-codebase audit) is a **separate, already-production system** — `server/routes/store.*`, `digital_products` table, seller/commission/download machinery. AI Factory has never written to this system; it only writes to `tools`.
- `s3.service.js` is already used by AI Factory (`uploadFile`) to store product bundles under `factory-bundles/<slug>/...` — the same client can be reused to also serve/reference files for a marketplace listing, no new S3 wiring needed.
- The current generation flow is single-item: `POST /api/factory/generate` accepts one `{category, idea, product_type}` and returns one tool. There is no batch endpoint.
- `product_type` is a plain `TEXT` column with no `CHECK` constraint (confirmed in batch-64's research) — adding new string values (e.g. `wordpress-plugin`, `wordpress-theme`, `shopify-app`, `shopify-theme`) requires zero schema change, consistent with every product type added so far.

---

## 3. Feature 1 — Marketplace Listing Automation

### 3.1 Goal
When an admin clicks "Publish Tool →" on a non-`prompt-tool` product (already wired in batch-67 to call `PUT /api/tools/:id` with `approved: true`), the product should also become a real, purchasable listing in the AWE-OS Marketplace — without a separate manual upload step.

### 3.2 What "manual" looks like today
Per the prior SDD's discussion: `packaging_metadata.listing` exists, but nothing reads it into the Marketplace's own `digital_products` table (or whatever backs live marketplace listings — to be confirmed against `store.seller.routes.js` at implementation time, per the "don't assume, research first" rule established in every prior batch).

### 3.3 Target Flow
```
Admin clicks "Publish Tool →" (existing button, batch-67)
   │
   ▼
PUT /api/tools/:id { approved: true }   [UNCHANGED — existing batch-67 behavior]
   │
   ▼
NEW: server-side hook — on successful approval of a non-'prompt-tool' row,
     read packaging_metadata.listing + asset_url, create/link a row in
     the Marketplace's product table (exact table TBD at research time)
   │
   ▼
Admin sees a NEW confirmation: "Published to Marketplace" with a link
     to the live listing, OR a review-first stopgap (see §3.5)
```

### 3.4 Technical Approach
- **Research first (mandatory, per established process):** read `store.seller.routes.js`, `digital_products` migration, and any existing "create listing" code path used by human sellers today, to confirm the exact fields/table a new listing needs — do not assume `digital_products` is the only or correct table without confirming.
- New, isolated module: `server/services/marketplace-listing.service.js` — takes a `tools` row + its `packaging_metadata`, maps to whatever the Marketplace's listing-creation function expects, and calls it (reusing existing marketplace code, not reimplementing it).
- Hook point: the existing `PUT /api/tools/:id` approval handler (touched already in batch-67 for the Publish fix) — add a call to the new service only when `approved` transitions to `true` **and** `product_type !== 'prompt-tool'`.
- **Price handling:** `packaging_metadata.listing.price` is currently always `0` (no pricing logic was built — packaging only copies `tools.price`, which itself defaults from the LLM's guess). Decide at implementation time: auto-publish at a default/free price with a manual price-edit step, or hold the listing in an unpublished/draft marketplace state until the admin sets a real price. **Recommend the latter** — auto-listing a mispriced product is a worse outcome than one extra manual step.

### 3.5 Non-Goals / Guardrails
- Does **not** touch `tools.status` or the agent pipeline — same constraint as every prior batch.
- Does **not** auto-set a price with real money implications without an explicit human confirmation step — see §3.4.
- Does **not** change the existing `prompt-tool` publish flow at all — this feature only activates for the 9 non-prompt-tool types.

### 3.6 Rollback
Additive DB write only (a new marketplace listing row referencing an existing tool) — reverting means deleting the hook call; no schema change to `tools` itself.

---

## 4. Feature 2 — Bulk Generation

### 4.1 Goal
Generate multiple products in a single admin action instead of one `POST /generate` call per product — e.g. "5 notion templates across 5 education niches."

### 4.2 Target Flow
```
Admin submits a bulk request: 
  { product_type: 'notion-template', 
    category: 'education', 
    count: 5, 
    variation_hint: 'different niches' }   (exact input shape TBD)
   │
   ▼
NEW: POST /api/factory/generate-bulk
   │
   ▼
Server loops N times, calling the EXISTING generateToolConfig() + 
runFactory() per item — each with a slightly varied prompt (e.g. 
appending "focus on niche N of 5, avoid repeating prior niches" or, 
simpler, just re-running the same idea and relying on the LLM's own 
temperature/variation across calls)
   │
   ▼
Returns array of results (success/failure per item) — partial 
failure is expected and must not fail the whole batch
```

### 4.3 Technical Approach
- **No change to `generateToolConfig()` or `runFactory()` themselves** — bulk generation is purely a new orchestration layer that calls the existing single-item functions N times. This preserves every guarantee already established (packaging still runs per-item, S3 upload still per-item, etc.) with zero risk to the proven single-item path.
- New endpoint: `POST /api/factory/generate-bulk` in `factory.routes.js`, admin-gated identically to `/generate`.
- **Sequential, not parallel, execution** for the first version — each item still involves a real LLM call (cost + rate-limit considerations); running 5 in parallel multiplies simultaneous API load for uncertain benefit. Revisit parallelization only if sequential proves too slow in practice.
- **Variation strategy is the open design question:** the simplest approach (re-run the same `{category, idea, product_type}` N times) will likely produce near-duplicate outputs, since the LLM call is otherwise deterministic-ish for a fixed prompt. A more useful version needs either (a) N distinct idea strings supplied by the admin upfront, or (b) a "diversify" instruction appended to each call referencing what's already been generated in the batch so far. Decide at implementation time; do not ship a bulk feature that silently produces 5 near-identical products.
- **Cost visibility:** bulk generation multiplies LLM spend linearly with `count`. Surface an estimated cost/count confirmation before firing, and consider a sane hard cap (e.g. max 10 per batch call) to prevent an accidental large spend.

### 4.4 Non-Goals
- No new template/bundle logic — reuses all 9 existing `product_type` builders unchanged.
- No parallel execution in v1 (see §4.3).
- No changes to the download/approval/packaging paths — each bulk-generated item goes through the exact same post-generation flow as a single-generated item.

### 4.5 Rollback
Purely additive — a new route and a new orchestration function; deleting both fully reverts with zero effect on single-item generation.

---

## 5. Feature 3 — WordPress and Shopify Product Types

### 5.1 Goal
Extend the `product_type` dispatch pattern (proven across 9 types, batches 63–69) to the two largest remaining digital-product ecosystems, per the original Advancement SDD's §8.4 recommendation to scope these separately due to their size.

### 5.2 Why These Are Different From Prior Types
Every type shipped so far (`static-bundle` through `mobile-template`) produces **JavaScript/JSON/HTML** — a single toolchain the LLM prompt-shapes and the existing template builders assemble. WordPress and Shopify each require:
- A **new language** in the templates layer (PHP for WordPress; Liquid for Shopify themes).
- Ecosystem-specific file/folder conventions a buyer will expect (WordPress plugin header comments, `readme.txt` in the WordPress.org format; Shopify's `theme.liquid`, `config/settings_schema.json`, section/snippet folder structure).
- No existing code in this repo to model the pattern from — batch-70+ would be the first template module that isn't JS/JSON-shaped.

### 5.3 Recommended Split
Per the original SDD, treat these as **two separate batches**, not one — WordPress first (larger market: 40%+ of the web per the original research), Shopify second.

#### 5.3.1 WordPress (`product_type: 'wordpress-plugin'`)
- Output: a minimal WordPress plugin skeleton — main plugin PHP file with the required header comment block (`Plugin Name`, `Version`, etc.), a basic `readme.txt` in WordPress.org's expected format, and an `admin/` or `includes/` stub structure appropriate to whatever the LLM-described feature is (e.g. a settings page stub, a shortcode stub — keep the first version simple, a single-feature plugin skeleton rather than attempting a general-purpose scaffold).
- Explicitly **not** a WordPress theme in the first pass — plugin-only, since themes require even more convention (template hierarchy, `style.css` header, `functions.php`) and can be a follow-on once the plugin path is proven.

#### 5.3.2 Shopify (`product_type: 'shopify-theme'` or `'shopify-app'` — decide which first)
- Recommend **theme** before **app** for the first pass: a Shopify theme is closer in shape to `static-bundle`/`ui-kit` (template files + config, no backend/OAuth), whereas a Shopify app requires OAuth, API scopes, and a hosted backend — significantly more scaffolding and buyer setup complexity.
- Output: a minimal theme skeleton — `layout/theme.liquid`, one or two section files, `config/settings_schema.json`, and a README explaining Shopify CLI setup for the buyer.

### 5.4 Technical Approach (both)
- Same dispatch pattern as every prior type: new `generateToolConfig()` branch, new `server/templates/{type}/index.js` builder, new `runFactory()` upload branch. No schema/route/admin-UI changes required by the pattern itself.
- **Research required before implementation** (not assumed in this SDD): confirm the exact minimum-viable file set a buyer would consider a legitimate, usable starting point for each ecosystem — this is a domain-knowledge question (what does a WordPress.org reviewer or a Shopify Theme Store buyer actually expect), not just a coding pattern question. Recommend a short research pass (Claude Code or manual) before writing the first plan, specifically to avoid shipping a "skeleton" that's actually unusable/rejected in its target ecosystem.
- **LLM prompt shape** for these two types needs more structure than prior types (e.g. the LLM must be steered toward valid PHP function-naming conventions, valid Liquid syntax) — expect the `generateToolConfig()` branches for these two to need more explicit formatting instructions in the prompt than, say, `notion-template`'s.

### 5.5 Non-Goals
- No WordPress theme in the first pass (plugin only) — see §5.3.1.
- No Shopify app (OAuth/backend) in the first pass — theme only — see §5.3.2.
- No submission-to-store automation (WordPress.org plugin review, Shopify Theme Store submission) — output is a downloadable buyer-facing skeleton, same as every other product type; the buyer handles their own store submission if they choose to.

### 5.6 Rollback
Same as every prior type addition — purely additive dispatch branches and new template files; reverting removes 2 files and dispatch branches per type with zero effect on existing types.

---

## 6. Phased Rollout & Priority

| Phase | Feature | Rationale for this order |
|---|---|---|
| A | Marketplace Listing Automation (§3) | Removes a real, recurring manual step for the actual current single-operator workflow — highest day-to-day time savings for the lowest implementation effort (reuses existing `packaging_metadata` and existing Marketplace code) |
| B | Bulk Generation (§4) | Compounds Phase A's benefit — more products reaching the marketplace faster, no new generation logic, pure orchestration |
| C | WordPress (§5.3.1) | Largest remaining market-size opportunity; higher effort (new language/ecosystem), do after A/B are stable |
| D | Shopify (§5.3.2) | Same category as C, sequenced after WordPress per the original SDD's recommendation |

## 7. Explicit Non-Goals (all features)

- No changes to `tools.status`, the agent pipeline, or any of the 5 competing status-writing code paths documented in the original Advancement SDD's §2.2 — this constraint carries forward unchanged to every feature in this document.
- No AI Factory Assistant / conversational layer — evaluated separately and deprioritized for the current single-operator usage pattern (see prior conversation); not part of this SDD.
- No integration with AI SaaS Factory.

## 8. Open Questions

- **Feature 1:** exact target table/route for creating a live Marketplace listing — must be confirmed by reading `store.seller.routes.js` and the `digital_products` schema at implementation time, not assumed here.
- **Feature 1:** pricing policy for auto-published listings — recommend draft/unpublished-until-priced as the default (§3.4), but this is a business decision, not purely technical.
- **Feature 2:** variation strategy to avoid near-duplicate bulk outputs (§4.3) — needs a concrete decision before implementation, not left as a TODO in the code.
- **Feature 2:** hard cap on `count` per bulk call, to bound accidental LLM spend.
- **Feature 3:** minimum-viable file set per ecosystem (§5.4) — recommend a dedicated research pass before the first WordPress/Shopify plan is written, since this is domain knowledge (what buyers/platforms actually expect) rather than a pattern-matching exercise like every prior product type.
