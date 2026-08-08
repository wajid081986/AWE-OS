# Batch 63 — AI Factory static-bundle service + execution layer (SDD Phase 1 §4.3 + §4.4)

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md`, Phase 1, §4.3 and §4.4 only.
§4.2 (schema migration) already complete/verified in production (batch-62).

## Plan

**Key findings from research:**
- `product_type` isn't referenced anywhere yet (migration 040 only) — genuinely greenfield.
- `runFactory`/`generateToolConfig` have 3 call sites besides `factory.routes.js` (`ToolLaunchCoordinator.js`, `PipelineDefinitions.js` via `getFactoryService()`, `autonomous-agent.js`, `auto-approval-agent.js`) — all call with today's positional args, so a new trailing optional param with a default is safe and untouched.
- `s3.service.js` is real and wired (`uploadFile(buffer, key, mimetype)` → returns key; `generatePresignedUrl(key, expiry, filename)` → signed GET URL). Existing convention elsewhere (`products.routes.js`, `store.downloads.routes.js`): store the S3 key in the DB column, generate a presigned URL at request time. Followed the same convention for `asset_url`.
- `tools.ai_prompt`/`input_fields` are nullable/defaulted — a static-bundle insert that omits them won't violate any constraint.
- No zip dependency this batch (explicit user decision). `index.html` and `style.css` uploaded as two separate S3 objects; `asset_url` stores the `index.html` key.
  - Refinement: `index.html` inlines the CSS in a `<style>` tag so the primary download is self-contained (avoids a broken relative link to `style.css` since only one object is fetched via the presigned download URL). `style.css` is still uploaded separately as a plain-text companion object, not linked from `index.html` — present in S3 for reference/reuse ahead of Phase 3's real packaging step.

**Files created:**
1. `docs/batches/batch-63-plan.md` — this plan, first commit.
2. `server/templates/static/index.js` — new template module (sibling to the existing `corporate.js`/`creative.js`/etc. resume templates, under a new `static/` subfolder since it's a different concept — plain HTML/CSS string assembly, not PDFKit). Exports `buildStaticBundle({ name, description, hero, features, cta })` → `{ 'index.html': '...', 'style.css': '...' }`. No dependencies.

**Files modified:**
3. `server/services/ai-factory.service.js`:
   - `generateToolConfig(category, idea, productType = 'prompt-tool')` — existing branch/prompt untouched byte-for-byte; new `else if (productType === 'static-bundle')` branch requests `{ name, slug, description, category, price, is_free, hero: {headline, subheadline, cta_text}, features: [{title, description}], cta: {heading, button_text} }` instead of `ai_prompt`/`input_fields`.
   - `runFactory(jobId, category, idea, userId, productType = 'prompt-tool')` — `'prompt-tool'` branch keeps today's insert object identical; new `'static-bundle'` branch calls `buildStaticBundle()`, uploads both files to `factory-bundles/${slug}/index.html` and `.../style.css`, inserts a `tools` row with `product_type: 'static-bundle'`, `asset_url: <index.html key>`, `approved: false` (no `ai_prompt`/`input_fields`).
4. `server/routes/factory.routes.js` — `POST /generate` reads `product_type` from `req.body` (default `'prompt-tool'`) and passes it through to `runFactory`. Only reachable entry point for the admin "Generate Product" form per the SDD's architecture diagram — without this the new path is unreachable dead code. Backend-only, additive, no other route in this file touched.
5. `server/routes/tools.routes.js` — new `GET /:slug/download`, placed before the `/:slugOrId` wildcard (same placement rule as `/:slug/run`). Same approved-gate logic as `/:slug/run` (admin bearer token bypasses `approved=true`). If `product_type === 'prompt-tool'`, returns 400 (wrong endpoint). Otherwise redirects to a presigned URL for `asset_url`. `POST /:slug/run` stays untouched.

**Not touched:** `ToolRenderer.jsx`, any frontend file, `tools.status`, `builder-agent.js`, `code-generator.js`, `idea-pipeline.js`, `PipelineOrchestrator.js`/`PipelineDefinitions.js`, `testing-agent`, `packaging_metadata` (Phase 3 concern).

**Process (per CLAUDE.md §6, same as batch-62):**
1. Branch `batch-63-ai-factory-execution-layer` off `batch-62-ai-factory-product-type` (keeps migration 040 + this code consistent together, since batch-62 hasn't merged to main yet but its migration is already live in production).
2. First commit: this plan.
3. Implement changes as scoped, isolated commits.
4. Run build/lint to confirm nothing broke, including that the existing prompt-tool flow has zero behavioral change.
5. No live Supabase DB calls, no deploy — stop after committing.
