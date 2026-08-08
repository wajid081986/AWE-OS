# Batch 64 — AI Factory Phase 2 product types (SDD §5)

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md`, Phase 2, §5 only.
§4.2/§4.3/§4.4 (Phase 1 schema + dispatch foundation) already complete (batch-62, batch-63).

## Plan

**Scope: backend only** — `ai-factory.service.js` dispatch + 3 new template modules. No `ToolRenderer.jsx`/frontend changes this batch (explicit decision — frontend dispatch for all 4 non-prompt types deferred to a dedicated later batch).

**Key finding that shrinks this batch:** the Phase 1 dispatch pattern is already type-agnostic where it matters:
- `GET /api/tools/:slug/download` (`tools.routes.js`) branches on `product_type !== 'prompt-tool'`, not on specific type names — works unchanged for all 3 new types, zero edits needed.
- `POST /api/factory/generate` (`factory.routes.js`) already passes any `product_type` string straight through — zero edits needed.
- No CHECK constraint on `tools.product_type` (migration 040 is a plain `TEXT NOT NULL DEFAULT`), so no new migration needed.

**New template modules** (mirroring `server/templates/static/index.js`'s pattern — plain string/JSON builders, no dependencies):
1. `server/templates/ui-kit/index.js` — `buildUiKitBundle(config)` → `{ 'Component.jsx': '...', 'README.md': '...' }`.
2. `server/templates/notion-template/index.js` — `buildNotionTemplateBundle(config)` → `{ 'template.json': '...' }`.
3. `server/templates/browser-extension/index.js` — `buildBrowserExtensionBundle(config)` → `{ 'manifest.json': '...', 'popup.html': '...', 'popup.js': '...' }`.

**Modified:**
4. `server/services/ai-factory.service.js`:
   - `generateToolConfig()` — extend the `productType` branch into a 5-way dispatch (`ui-kit`, `notion-template`, `browser-extension`, `static-bundle`, default `prompt-tool`). Default and `static-bundle` prompt bodies stay byte-for-byte unchanged.
   - `runFactory()` — same extension; `static-bundle`/`prompt-tool` branches unchanged. 3 new branches share a small internal helper `uploadBundleAndInsert(bundle, primaryFile, toolConfig, productType)` (upload each file to `factory-bundles/<slug>/` via existing `uploadFile()`, insert `tools` row with `product_type` + `asset_url` at the primary file).

**Carried-over design decision (same as batch-63):** still no zip dependency. Files upload as separate S3 objects; `asset_url` points at the primary file per type (`Component.jsx`, `template.json`, `manifest.json`). Companion files upload alongside but aren't zipped together.

**Not touched:** `tools.status`, `builder-agent.js`, `code-generator.js`, `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, `ToolRenderer.jsx`, any frontend file, `packaging_metadata`, `factory.routes.js`, `tools.routes.js`, the schema (no new migration).

**Process:**
1. Branch `batch-64-ai-factory-phase2-types` off `batch-63-ai-factory-execution-layer`.
2. First commit: this plan.
3. Implement as isolated commits (template modules, then service dispatch extension).
4. Verify via `node -c` syntax checks + module-load smoke test (no lint config exists in this repo).
5. No live Supabase/S3 calls, no deploy — stop after committing. Per user: batch-63's verification checklist has not yet been run against live Supabase/S3; both batch-63 and batch-64 will be verified together before either merges.
