# Batch 65 — AI Factory Phase 3 Packaging Layer (SDD §6)

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md`, Phase 3, §6 only.
Phase 1 (batch-62, batch-63) and Phase 2 (batch-64) are complete and verified
live — `product_type` dispatch works for `static-bundle`, `ui-kit`,
`notion-template`, `browser-extension`. `packaging_metadata` JSONB column
already exists on `tools` (migration 040), unused until this batch.

## Research findings

- **No server-side headless-browser capability exists.** `playwright` is only
  in `client/package.json` (client-side/dev). Nothing in `server/package.json`
  or its dependencies can render/screenshot server-side.
- **LLM client to reuse**: `callClaude` from `server/services/ai.service.js`
  (Anthropic SDK) — the same client `ai-factory.service.js` already uses. No
  second LLM client introduced.
- **Marketplace listing shape** confirmed from `digital_products` table
  (migration 024) + `server/routes/store.seller.routes.js`: `title,
  description, category, price, thumbnail_url, tags`. `listing.json` mirrors
  this field set directly.
- **Hook point**: `runFactory()` in `ai-factory.service.js`, immediately after
  the `tools` insert succeeds, for `productType !== 'prompt-tool'` only.
- Noticed, **not touched this batch**: a leftover `console.log('[DEBUG s3
  bucket investigation]'...)` at `ai-factory.service.js:263-264` from
  batch-63 that was never reverted (unlike the batch-64 debug log). Logged in
  `docs/backlog.md` instead of fixed inline, per user request.

## Screenshot decision (SDD §11 open question) — resolved

**Option (a): skip screenshots this phase.** `listing.json.screenshots` ships
as `[]`. No new dependency (a server-side headless browser would need
separate dependency approval per CLAUDE.md §5), no placeholder-asset
maintenance surface. `digital_products.thumbnail_url` remains available for
manual fill whenever/if this gets wired into an actual marketplace upload —
that wiring is a separate future decision, out of scope here.

## Plan

**New file:**
- `server/services/packaging.service.js` — exports `generatePackaging(tool,
  toolConfig)`:
  - `generateReadme(toolConfig, productType)` — one `callClaude()` call
    (same model/pattern as `ai-factory.service.js`). On failure, falls back
    to a templated README built from `tool.name`/`description`, mirroring
    the existing fallback pattern used by `ToolIdeaAnalyzer` /
    `ToolBlueprintGenerator`. No retry wrapper duplicated — packaging is a
    best-effort follow-up, not a blocking step.
  - `mitLicenseText(holder, year)` — static MIT template, holder "AWE-OS",
    current year.
  - `buildListing(tool, toolConfig)` — `{ title, description, price,
    category, tags, screenshots: [] }` derived from the DB row +
    `toolConfig`. `tags` = simple heuristic (`[category, product_type]`
    lowercased/deduped), no extra LLM call.
  - Returns `{ readme, license, listing, generated_at }`.

**Modified:**
- `server/services/ai-factory.service.js` — in `runFactory()`, after the
  `tools` insert succeeds and only when `productType !== 'prompt-tool'`:
  call `packagingService.generatePackaging(newTool, toolConfig)`, then
  `supabase.from('tools').update({ packaging_metadata }).eq('id',
  newTool.id)`. Wrapped in try/catch — packaging failure is logged
  (`console.warn`) and non-fatal; it does not fail the already-successful
  tool creation.

**Not touched:** `tools.status`, `builder-agent.js`, `code-generator.js`,
`idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`,
`ToolRenderer.jsx`, any frontend file, `factory.routes.js`,
`tools.routes.js`, no new migration (column already exists), no new npm
dependency.

**Process:**
1. Branch `batch-65-ai-factory-packaging` off `batch-64-ai-factory-phase2-types`.
2. First commit: this plan.
3. Second commit: `docs/backlog.md` entry for the batch-63 leftover debug log.
4. Implement as isolated commits (`packaging.service.js`, then the
   `runFactory()` hook).
5. Verify via `node -c` syntax checks + module-load smoke test. No live
   Supabase/S3/LLM calls this batch.
6. Stop after committing — no merge, no deploy.
