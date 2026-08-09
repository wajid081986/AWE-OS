# AWE-OS AI Factory — Advancement SDD
### System Design Document — Diversifying AWE-OS's internal AI Factory into a multi-product-type generator

**Version:** 1.1
**Status:** Phases 1–4 (batches 62–66) implemented and verified live in production. Phase 5 (below) is planned, not yet implemented. Grounded in two Claude Code read-only audits (AI Factory subsystem audit + Agent Pipeline state-machine audit).
**Scope:** AWE-OS repo only. AI SaaS Factory remains fully standalone (see separate `AI-SaaS-Factory_Product-Diversification-SDD.md`) — no integration between the two.

---

## 1. Purpose

Advance AWE-OS's internal AI Factory (`server/services/ai-factory.service.js` + `server/intelligence/`) from generating exactly one output shape (a single `ai_prompt` + flat `input_fields`, executed via one LLM call) into a system capable of producing multiple digital product types — in the spirit of ThemeForest, CodeCanyon, Gumroad, and Product-Hunt-style products — while staying fully isolated from AWE-OS's existing autonomous agent pipeline, which the audit found to be broken and unreliable.

## 2. Audit Findings Summary (what this SDD is grounded in)

### 2.1 AI Factory subsystem (audit 1)
- `ai-factory.service.js` (177 lines): one `claude-sonnet-4-6` call → JSON (`name/slug/description/category/price/is_free/input_fields/ai_prompt`) → insert into `tools` with `approved: false`.
- 5 of the 7 intelligence modules are pure algorithms (no LLM), **product-type-agnostic** — safe to reuse as-is.
- Only `ToolIdeaAnalyzer` and `ToolBlueprintGenerator` call an LLM; both have fallback paths (keyword-based / hardcoded) if the call fails.
- Execution model: `ToolRenderer.jsx` (one generic renderer for every tool) → `POST /api/tools/:slug/run` → raw `{{field}}` substitution into `ai_prompt` → one `claude-haiku-4-5` call with **no system prompt**, using its **own raw Anthropic SDK client** (inconsistent with the rest of the codebase).
- S3 storage (`s3.service.js`) is fully wired but **completely unused by AI Factory** — directly usable for new product types that need file/asset storage.
- Confirmed live bug: admin's main "Generate Tool" button calls `/api/generate-tool`, which doesn't exist (real route is `/api/factory/generate`) — likely a live 404. **Out of scope for this SDD**, tracked separately.

### 2.2 Agent pipeline / state machine (audit 2) — critical context
- **No single state machine driver exists.** At least 5 independent code paths write `tools.status`, with no coordination.
- `status='testing'` is **dead** — never written anywhere in the codebase, despite being a legal DB-enforced state.
- A DB-level trigger (`trg_validate_tool_status`, migration 007) enforces legal transitions, but at least one live path (`code-generator.js::approveGeneratedCode()`) violates it and **silently swallows the resulting error** — the caller sees `success: true` regardless.
- `status='live'` and `approved=true` are **two disconnected concepts**, set by different code with no guaranteed correlation — a committed script (`sync-tool-registry.js`) documents this already caused real invisible-tool production bugs.
- A completely **separate pipeline** (`idea-pipeline.js` → `builder-agent.js` → `code-generator.js`) exists on the same `tools` table, producing full multi-file app builds from `idea_metadata`-shaped rows — entirely independent of, and incompatible with, AI-Factory-shaped (`ai_prompt`-based) rows. The two are disambiguated only by which fields happen to be populated (no explicit discriminator column).
- A well-designed `PipelineOrchestrator` DAG system exists in `server/runtime/` but is **never invoked by any cron** — reachable only via a manual admin route, effectively dead code in practice.
- Telemetry bug: `testing.cron.js` destructures an array as an object — all dashboard/regression metrics from this cron read as zero.

### 2.3 Implication for this SDD
**Decision: this SDD's new work will not write to, read from, or depend on `tools.status`, `builder_plans`, `generated_code`, `idea_metadata`, or any of the 5 competing status-writing code paths.** The only fields this SDD's new code touches on the `tools` table are the existing `approved` boolean (already the real source of truth per `sync-tool-registry.js`) and new, additive columns scoped to this SDD (§5). This keeps the diversification work fully isolated from a subsystem with confirmed, un-remediated bugs — remediating that subsystem is explicitly **out of scope** here and would be its own SDD.

---

## 3. Target Architecture

```
Admin fills "Generate Product" form (existing UI, client/src/modules/admin/factory/)
   │
   ▼
ai-factory.service.js::generateToolConfig()   [MODIFIED]
   │
   ├── product_type: 'prompt-tool'  (existing, default — unchanged behavior)
   ├── product_type: 'static-bundle' (NEW)
   ├── product_type: 'ui-kit'        (NEW)
   └── product_type: 'notion-template' (NEW)
   │
   ▼
runFactory()   [MODIFIED — dispatch on product_type]
   │
   ├── existing path: insert tools row (ai_prompt/input_fields) — UNCHANGED
   └── new path: generate + upload asset bundle to S3 (s3.service.js, already wired, unused today)
                  → insert tools row with product_type + asset_url + packaging metadata
   │
   ▼
tools row, approved: false   (existing approval gate — UNCHANGED, no status state machine involved)
   │
   ▼
Admin approves (existing flow)
   │
   ▼
EXECUTION — dispatches on product_type:
   ├── 'prompt-tool'     → existing ToolRenderer.jsx + /api/tools/:slug/run (UNCHANGED)
   └── other types        → NEW: DownloadRenderer.jsx + /api/tools/:slug/download (serves S3 asset, no LLM call at runtime)
```

## 4. Phase 1 — `product_type` Foundation + First New Type (Static Bundle)

### 4.1 Goal
Prove the dispatch pattern end-to-end with the simplest new type before adding more.

### 4.2 Schema Change
New migration (next number after the latest in `server/db/migrations/` — confirm exact number at implementation time):
```sql
ALTER TABLE tools ADD COLUMN product_type TEXT NOT NULL DEFAULT 'prompt-tool';
ALTER TABLE tools ADD COLUMN asset_url TEXT;              -- S3 URL for non-prompt product types
ALTER TABLE tools ADD COLUMN packaging_metadata JSONB;    -- README/license/screenshots, see Phase 3
```
Default `'prompt-tool'` means every existing row and every existing code path that doesn't know about `product_type` continues to behave exactly as today — purely additive.

### 4.3 `ai-factory.service.js` changes
- `generateToolConfig()`: accept a `product_type` parameter (default `'prompt-tool'`, preserving current behavior for all existing callers). For `'static-bundle'`, request a different JSON shape from the LLM: page sections/copy (hero, features, CTA) instead of `ai_prompt`/`input_fields`.
- New: `src/templates/static/` (mirrors the equivalent Phase 1 concept in the AI SaaS Factory diversification SDD, but implemented independently here — no shared code between the two projects per the no-integration decision) — barebones HTML/CSS building blocks the generated copy gets assembled into.
- `runFactory()`: branch on `product_type` — `'prompt-tool'` keeps the exact current insert; `'static-bundle'` additionally zips the assembled HTML/CSS/JS, uploads via `s3.service.js` (already fully wired, confirmed unused by AI Factory today), and stores the returned URL in `asset_url`.

### 4.4 Execution-side changes
- `POST /api/tools/:slug/run` stays exactly as-is for `product_type='prompt-tool'`.
- New: `GET /api/tools/:slug/download` — for non-prompt types, checks `approved=true`, returns/redirects to `asset_url`. No LLM call at request time for this route.
- `ToolRenderer.jsx`: add a dispatch — `product_type='prompt-tool'` renders the existing form+run UI unchanged; other types render a simple product page (description + "Download" button hitting the new download route).

### 4.5 Testing
- Regression: confirm every existing prompt-tool (generation, approval, execution) is byte-for-byte unaffected — run through the existing flow with `product_type` omitted/defaulted.
- New: generate 2–3 static-bundle sample products, confirm S3 upload, confirm download route serves them correctly post-approval, confirm they're blocked pre-approval (same as prompt-tools today).

---

## 5. Phase 2 — Additional Product Types

Once the Phase 1 dispatch pattern (schema column, service branch, execution branch, renderer branch) is proven, extend to:

| Product type | Notes |
|---|---|
| **UI Kit** | React component bundle (no backend) — reuses the static-bundle S3/download mechanism from Phase 1, different generation template |
| **Notion/Airtable Template** | Structured JSON export — no code execution needed, closest in simplicity to static-bundle |
| **Browser Extension** | Manifest V3 skeleton — new template base, same dispatch pattern |

Each new type is additive to the same `product_type` dispatch table in `ai-factory.service.js` / execution routes / `ToolRenderer.jsx` — no changes to Phase 1's foundation required.

## 6. Phase 3 — Packaging Layer

### 6.1 Goal
Every non-prompt-tool product exits generation with marketplace-ready metadata, using the `packaging_metadata` JSONB column added in Phase 1.

### 6.2 Technical Changes
- New: `server/services/packaging.service.js` — runs after any non-prompt-tool generation completes:
  - README generation (LLM call, reuses existing Claude client setup)
  - License file (templated, MIT default)
  - Screenshot capture — **note:** the AWE-OS audit didn't confirm a server-side headless-browser dependency (Playwright is a client-side/dev dependency per the earlier full-codebase audit) — confirm feasibility or use a static preview-image approach instead before committing to this sub-feature.
  - `listing.json` — shape matches AWE-OS Marketplace's own product upload fields directly (title, description, suggested price, category, tags, screenshots) since these products are going into AWE-OS's *own* marketplace, not an external one — no translation layer needed, unlike the AI SaaS Factory case.

## 7. Phase 4 — Market Intelligence (Trend-Driven Ideas)

- New: `server/intelligence/market-trend-scorer.js` — separate from the existing 5 pure-algorithm modules (kept untouched per §2.1), scores a candidate idea/product-type combination against demand signals from ThemeForest/CodeCanyon/Gumroad category data and Product-Hunt-style launch trends.
- Data source for trends: **open question** — start with manual curation (a simple admin-editable trend list) before investing in scraping/API integration.
- Surfaces as a pre-generation suggestion in the admin UI: "these product types/categories are trending" — informational only in this phase, not a hard gate.

---

## 8. Phase 5 — Additional Product Type Engines

### 8.1 Goal
Extend the same additive `product_type` dispatch pattern proven in Phases 1–2 (batches 63–64) to a broader set of digital product formats that regularly sell on marketplaces like ThemeForest, CodeCanyon, Gumroad, and Product Hunt. No architectural change is required — every new type is another branch in the same `generateToolConfig()` / `runFactory()` dispatch table, another `server/templates/{type}/` builder, and reuses the existing `asset_url` + `packaging_metadata` + `GET /:slug/download` machinery from Phases 1 and 3 unchanged.

### 8.2 Already Covered (Phases 1–2, for reference)
| Product type | Status |
|---|---|
| Landing page kit | ✅ Live (`static-bundle`, batch-63) |
| Admin dashboard UI kit | ✅ Live (`ui-kit`, batch-64) |
| Notion/Airtable template | ✅ Live (`notion-template`, batch-64) |
| Browser extension | ✅ Live (`browser-extension`, batch-64) |

### 8.3 New Types for Phase 5

| Product type | Effort | Notes |
|---|---|---|
| **Standalone API/backend kit** | Low | Closest to existing `ui-kit` pattern, just backend-only output (routes/controllers/config, no frontend) |
| **AI agent / prompt-pack template** | Low | Structured JSON/config export (agent definitions, prompt chains) — no code execution, similar simplicity to `notion-template` |
| **Discord/Telegram/Slack bot boilerplate** | Low–Medium | Simple bot skeleton (command handlers, config), no complex build step |
| **No-code automation template** | Medium | Zapier/Make/n8n each have their own export/import JSON formats — requires learning each target format before templating |
| **Mobile app template** | Medium–High | Flutter or React Native — introduces a new build/scaffold shape, more boilerplate than prior types but still static-file output (no compilation at generation time) |
| **WordPress plugin/theme** | High | First template type requiring **PHP** — new language for `server/templates/`, biggest lift in this batch of types |
| **Shopify app/theme** | High | Liquid templating + Shopify CLI folder structure — another new ecosystem, comparable effort to WordPress |

### 8.4 Recommended Order
Lowest-effort, highest-reuse types first, to keep proving the pattern cheaply before investing in the two high-effort ecosystems:

1. Standalone API/backend kit
2. AI agent / prompt-pack template (notably trending category as of 2025–26)
3. Discord/Telegram/Slack bot boilerplate
4. No-code automation template
5. Mobile app template
6. WordPress plugin/theme
7. Shopify app/theme

Items 6–7 are large enough (new language/ecosystem each) that they likely warrant their own dedicated scoping pass (a "Phase 5b" style addendum) once items 1–5 are live and the team has bandwidth — bundling them into the same batch as the low-effort types risks the same kind of scope creep this SDD was written to avoid in the original AI Factory subsystem.

### 8.5 Technical Pattern (same as Phase 2, restated for a new implementer)
For each new type:
- Add one branch to `generateToolConfig()`'s `product_type` dispatch — request the LLM JSON shape appropriate to that type (e.g. bot boilerplate wants `{ botName, commands: [...], configFields: [...] }`).
- Add `server/templates/{type}/index.js` exporting a `build{Type}Bundle(config) → { filename: content, ... }` function, following the existing `buildUiKitBundle` / `buildNotionTemplateBundle` / `buildBrowserExtensionBundle` shape (batch-64).
- Add a branch in `runFactory()`'s shared `uploadBundleAndInsert()` helper call — no changes needed to the helper itself, it's already generic across bundle shapes.
- No schema changes, no new routes, no frontend changes — identical to how batch-64 required zero changes to `factory.routes.js`, `tools.routes.js`, or the schema.

### 8.6 Non-Goals for Phase 5 (same constraints as prior phases)
- No changes to `tools.status` or the agent pipeline (§2.2/§8 constraints still apply).
- No admin UI changes — new types remain API-only until a dedicated frontend batch, same pattern as Phases 1–4.
- No new heavy dependencies (e.g. Shopify CLI tooling, WordPress scaffolding libraries) without a separate, explicit approval step per each type's implementation batch — flag the need, don't add speculatively.

---

## 9. Explicit Non-Goals

- **No changes to `tools.status`, the agent pipeline, or any of the 5 competing code paths documented in §2.2.** Fixing that subsystem is a separate, dedicated effort — bolting diversification onto it would inherit its bugs.
- **No use of `builder-agent`, `code-generator`, `idea-pipeline`, `PipelineOrchestrator`, or `testing-agent`** for any new product type in this SDD.
- **No integration with AI SaaS Factory** — confirmed standing decision, both projects remain fully independent.
- **No fix for the `/api/generate-tool` 404 bug** in this SDD — tracked separately, low-risk to fix independently at any time.

## 10. Rollback Plan

Every schema addition is a nullable/defaulted column — reverting means dropping 3 new columns and the `product_type` dispatch branches, with zero impact on `product_type='prompt-tool'` rows or code paths, since those remain byte-for-byte unchanged throughout every phase.

## 11. Phased Rollout & Status

| Phase | Scope | Batch(es) | Status |
|---|---|---|---|
| 1 | Schema + dispatch pattern + static-bundle type, end-to-end | 62, 63 | ✅ Live, verified |
| 2 | UI kit, Notion template, browser extension types | 64 | ✅ Live, verified |
| 3 | Packaging layer (README/license/listing.json) | 65 | ✅ Live, verified |
| 4 | Market intelligence / trend scoring (backend, informational) | 66 | 🔄 In progress |
| 5 | Additional product types (§8: API kits, AI agent packs, bots, no-code templates, mobile, WordPress, Shopify) | TBD (67+) | 📋 Planned, not started |

## 12. Open Questions

- **Screenshot generation**: confirm a server-side headless-browser capability exists or needs adding (Playwright is currently client-side/dev-only per the base audit) — affects Phase 3 scope.
- **Category taxonomy**: does the existing `category` field on `tools` (used by prompt-tools today) need to be extended/rethought for the new product types, or is it already generic enough?
- **Migration numbering**: exact next migration number to confirm at implementation time (latest known was `039_gsc_daily_stats.sql` per the earlier full-codebase audit — may have advanced since).
- **`/api/generate-tool` bug**: confirmed live per audit 1 — recommend a small, separate fix task, independent of this SDD's timeline.
- **Admin UI wiring**: Phases 1–4 are all API-only — no `client/src/modules/admin/factory/` changes have been made yet to surface `product_type` selection, download links, or market-intelligence scores in the admin panel. This is deliberately deferred and would be its own frontend-focused batch once the backend surface (Phases 1–5) is considered stable.
- **WordPress/Shopify scoping**: per §8.4, these two Phase 5 types are large enough to warrant their own dedicated planning pass rather than being folded into the same batch as the lower-effort Phase 5 types.
