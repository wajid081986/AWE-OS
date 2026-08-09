# Batch 68 — AI Factory Phase 5: 3 New Product Types

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md` §8 (Phase 5), items 1–3
of §8.4's recommended order. Follows the exact dispatch pattern proven in
batch-64 (§8.5 of the SDD).

## Scope

Add 3 new `product_type` values to the existing dispatch table:

1. **`api-kit`** — Standalone API/backend kit. Backend-only output: an
   Express router file + a controller file + a config file, no frontend.
   Mirrors `buildUiKitBundle()`'s shape but for a backend skeleton.
2. **`agent-pack`** — AI agent / prompt-pack template. Structured JSON
   export (agent definition, system prompt, prompt chain, tool list).
   Mirrors `buildNotionTemplateBundle()` — no code execution.
3. **`bot-kit`** — Discord/Telegram/Slack bot boilerplate. Manifest-style
   config (`bot.config.json`) + one stub command-handler file per command
   + README. Mirrors `buildBrowserExtensionBundle()`.

## Files to create

- `server/templates/api-kit/index.js` — exports `buildApiKitBundle(config)`.
  Returns `{ 'routes/{resource}.routes.js', 'controllers/{resource}.controller.js', 'config.json', 'README.md' }`.
  Router file wires each configured endpoint to a named controller stub;
  controller file exports one stub handler per endpoint (returns 501/TODO
  body — no real logic, matches the "skeleton" nature of every existing
  template). `resource_name` sanitized to a safe camelCase/kebab identifier
  the same way `ui-kit`'s `toPascalCase` sanitizes `component_name`.
- `server/templates/agent-pack/index.js` — exports `buildAgentPackBundle(config)`.
  Returns `{ 'agent-pack.json': ... }` — single structured JSON file
  (agent_name, system_prompt, prompt_chain, tools), same one-file shape as
  `notion-template`.
- `server/templates/bot-kit/index.js` — exports `buildBotKitBundle(config)`.
  Returns `{ 'bot.config.json', 'commands/{command}.js' (one per command), 'README.md' }`.
  Each command file is a stub handler (`module.exports = { name, execute() {...} }`)
  named after the sanitized command name.

## Files to modify

- `server/services/ai-factory.service.js`:
  - Add 3 `require()` lines for the new template modules (next to the
    existing 4).
  - `generateToolConfig()`: extend the existing ternary chain with 3 more
    branches (`productType === 'api-kit'`, `'agent-pack'`, `'bot-kit'`),
    each requesting the JSON shape described above from the LLM, following
    the exact prompt/rules/IMPORTANT-footer format of the existing branches.
  - `runFactory()`: extend the existing `if/else if` chain with 3 more
    branches, each calling `uploadBundleAndInsert(toolConfig, '<type>', build<Type>Bundle(toolConfig), '<primaryFile>')` —
    no changes to `uploadBundleAndInsert()` itself (confirmed generic
    across bundle shapes per batch-64's finding).

## Explicitly not touched (per SDD §8.6 and hard constraints)

- No schema/migration changes (`product_type` column already accepts any
  string).
- No changes to `factory.routes.js`, `tools.routes.js`, or the download
  route (already generic for any `product_type != 'prompt-tool'`).
- No admin UI changes (dropdown update deferred, per §8.6).
- No changes to `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or any of
  the 5 competing status-writing paths.
- `packaging.service.js` needs no changes — it already runs generically
  for `productType !== 'prompt-tool'` in `runFactory()`.

## Testing (no live LLM/Supabase/S3 calls this batch)

- Each new `build*Bundle()` function exercised directly with a sample
  config object (via a throwaway local script, not committed) to confirm
  it returns a `{ filename: content }` map with valid JSON where
  applicable and no runtime errors on missing/partial fields (same
  defensive `config.x || fallback` style as the 4 existing templates).
- `node --check` (or equivalent) on all touched/new files to catch syntax
  errors, since no live execution is in scope.
- Manual re-read of the extended `generateToolConfig()` / `runFactory()`
  dispatch chains to confirm the 4 existing branches are byte-for-byte
  unchanged (only new branches inserted).

## Out of scope, noted but not fixed here

- The pre-existing `// TEMPORARY DEBUG` `console.log` inside
  `uploadBundleAndInsert()` (ai-factory.service.js) — not introduced by
  this batch, left as-is per "don't fix while you're there."
