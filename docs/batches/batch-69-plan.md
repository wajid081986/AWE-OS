# Batch 69 — AI Factory Phase 5, Round 2: 2 New Product Types

Source: `docs/sdd/AWE-OS_AI-Factory_Advancement-SDD.md` §8 (Phase 5), items 4–5
of §8.4's recommended order. Follows the exact dispatch pattern proven in
batch-64 and batch-68 (§8.5 of the SDD). Batch-68 (`api-kit`, `agent-pack`,
`bot-kit`) is live and verified — `generateToolConfig()` and `runFactory()`
each currently have 7 non-`prompt-tool` branches; this batch adds 2 more to
each, taking the total to 9.

## Scope

Add 2 new `product_type` values to the existing dispatch table:

1. **`automation-template`** — No-code automation template (Zapier/Make/n8n
   category). Zapier, Make, and n8n each have their own native
   importable JSON schema, and matching any one of them exactly is out of
   scope for this first pass. Instead this type produces a **generic,
   clearly-labeled workflow description** — trigger + ordered steps, each
   with an app/action/description — plus a README that explains how a
   buyer manually recreates the workflow in their platform of choice.
   **Simplification is stated explicitly in the generated README** — no
   claim of one-click import into any specific platform.
2. **`mobile-template`** — Mobile app template. Per SDD §8.3 guidance,
   static-file output only, no build/compile step at generation time.
   Produces a React Native/Expo-style file skeleton: a few screen
   component stubs, a navigation config file, an Expo-flavored
   `app.json` + a minimal `package.json`, and a README. Structurally the
   mobile equivalent of what `ui-kit` does for a single React component —
   just more files, following an Expo project shape instead of one
   component file.

## Files to create

- `server/templates/automation-template/index.js` — exports
  `buildAutomationTemplateBundle(config)`. Returns:
  - `workflow.json` — generic readable JSON:
    ```json
    {
      "format": "generic-workflow-v1",
      "note": "Generic workflow description — not a native Zapier/Make/n8n import file. See README.md to recreate this manually in your platform of choice.",
      "trigger": { "app": "...", "event": "...", "description": "..." },
      "steps": [ { "app": "...", "action": "...", "description": "..." } ]
    }
    ```
  - `README.md` — explains the workflow in plain language (trigger →
    steps table) and gives step-by-step guidance for manually rebuilding
    it in Zapier, Make, and n8n, with an explicit "Compatibility note"
    section stating this is a generic description, not a one-click
    import file for any of the three platforms.
  - Sanitization follows the existing defensive style
    (`config.automation || {}`, array guards, string fallbacks) used by
    `bot-kit`/`agent-pack`.
  - `primaryFile`: `workflow.json`.

- `server/templates/mobile-template/index.js` — exports
  `buildMobileTemplateBundle(config)`. Returns:
  - `App.js` — Expo entry stub that imports and renders the navigator.
  - `screens/{ScreenName}.js` — one stub screen component per configured
    screen (PascalCase name via the same `toPascalCase` sanitizer pattern
    `ui-kit` uses for `component_name`), each a minimal functional
    component with a placeholder `<View>`/`<Text>`.
  - `navigation/AppNavigator.js` — a stub stack-navigator config
    referencing the generated screens (illustrative import/config shape,
    not a working `@react-navigation` wire-up — no new dependency is
    added or assumed installed).
  - `app.json` — Expo-style config object (`expo.name`, `expo.slug`,
    `expo.version`, etc.) derived from `config.name`/`config.slug`.
  - `package.json` — minimal manifest listing the app name/version and
    the conventional Expo/React Native dependency names as **string
    version placeholders only** (no install, no lockfile) — purely
    descriptive of what the buyer would `npm install` themselves.
  - `README.md` — explains the file layout and the manual steps to drop
    this into a fresh `npx create-expo-app` project.
  - `primaryFile`: `app.json` (mirrors `browser-extension`'s use of
    `manifest.json` as the primary/entry file for a non-executable
    config-first bundle).

## Files to modify

- `server/services/ai-factory.service.js`:
  - Add 2 `require()` lines for the new template modules, next to the
    existing 7.
  - `generateToolConfig()`: extend the existing ternary chain with 2 more
    branches (`productType === 'automation-template'`,
    `productType === 'mobile-template'`), each requesting the JSON shape
    below from the LLM, following the exact prompt/rules/IMPORTANT-footer
    format of the existing branches:
    - `automation-template` requests:
      `{ name, slug, description, category, price, is_free, automation: { trigger: { app, event, description }, steps: [ { app, action, description } ] } }`
      (2–6 steps max).
    - `mobile-template` requests:
      `{ name, slug, description, category, price, is_free, mobile: { app_name, screens: [ { name, description } ], navigation_type } }`
      (2–5 screens max; `navigation_type` one of `"stack"`, `"tabs"`).
  - `runFactory()`: extend the existing `if/else if` chain with 2 more
    branches, each calling
    `uploadBundleAndInsert(toolConfig, '<type>', build<Type>Bundle(toolConfig), '<primaryFile>')`
    — no changes to `uploadBundleAndInsert()` itself (already confirmed
    generic across bundle shapes in batch-64/68).

## Explicitly not touched (per SDD §8.6 and hard constraints)

- No schema/migration changes (`product_type` column already accepts any
  string).
- No changes to `factory.routes.js`, `tools.routes.js`, or the download
  route (already generic for any `product_type != 'prompt-tool'`).
- No admin UI changes (deferred, per §8.6).
- No changes to `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or any of
  the 5 competing status-writing paths.
- `packaging.service.js` needs no changes — it already runs generically
  for `productType !== 'prompt-tool'` in `runFactory()`.
- No new npm dependencies — `mobile-template`'s `package.json` output
  lists conventional dependency names/versions as descriptive text only,
  it does not install or require `react-native`/`expo` in this repo.
- WordPress and Shopify types are not part of this batch — per SDD §8.4
  they warrant their own dedicated scoping pass.
- No real Zapier/Make/n8n import-format compatibility for
  `automation-template` — flagged as a known, explicit simplification in
  both this plan and the generated README, not silently implied.

## Testing (no live LLM/Supabase/S3 calls this batch)

- Each new `build*Bundle()` function exercised directly with a sample
  config object (via a throwaway local script, not committed) to confirm
  it returns a `{ filename: content }` map with valid JSON where
  applicable and no runtime errors on missing/partial fields (same
  defensive `config.x || fallback` style as the existing 7 templates).
- `node --check` (or equivalent) on all touched/new files to catch syntax
  errors, since no live execution is in scope.
- Manual re-read of the extended `generateToolConfig()` / `runFactory()`
  dispatch chains to confirm the existing 7 branches are byte-for-byte
  unchanged (only new branches inserted).

## Out of scope, noted but not fixed here

- The pre-existing `// TEMPORARY DEBUG` `console.log` inside
  `uploadBundleAndInsert()` (`ai-factory.service.js`) — not introduced by
  this batch, left as-is per "don't fix while you're there" (already
  flagged in batch-68).
