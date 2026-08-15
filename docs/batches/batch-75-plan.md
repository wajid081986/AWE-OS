# Batch 75 — Admin AI Factory: Add Remaining 5 Product Types to Dropdown

## Context

The Product Type `<select>` in `client/src/modules/admin/factory/AIFactoryPage.jsx`
(from batch-67) only lists 5 of the 10 `product_type` values the backend
supports. `api-kit`, `agent-pack`, `bot-kit`, `automation-template`, and
`mobile-template` were added to the backend in batch-68/69 and are
live-verified working via direct API calls, but an admin can't reach
them through the UI — the dropdown never got the matching options.

## Research (completed before this plan)

- `PRODUCT_TYPES` (`AIFactoryPage.jsx:19-25`) is a flat array of
  `{ value, label }` objects rendered directly into `<option>` tags
  (line 497-499). Currently:
  ```js
  const PRODUCT_TYPES = [
    { value: 'prompt-tool',       label: 'Prompt Tool (default)' },
    { value: 'static-bundle',     label: 'Static Bundle' },
    { value: 'ui-kit',            label: 'UI Kit' },
    { value: 'notion-template',   label: 'Notion Template' },
    { value: 'browser-extension', label: 'Browser Extension' },
  ]
  ```
  This is the **only** hardcoded product-type list in the client —
  confirmed via `grep -rn "product_type|productType" client/src`: every
  hit outside this file's own state/API-call plumbing is zero. No other
  component in the codebase references a product-type value at all.
- Confirmed backend value strings against `ai-factory.service.js`'s
  `generateToolConfig()` ternary branches (batch-68/69): the 5 missing
  branches use exactly `api-kit`, `agent-pack`, `bot-kit`,
  `automation-template`, `mobile-template` — matches what's asked for
  verbatim.
- **Item 3 check — Session History badge / download link
  (`AIFactoryPage.jsx:632-679`)**: already fully generic, no per-type
  branching to extend:
  - Badge (line 646-650): renders `{jobProductType}` directly as text
    with `capitalize` styling — works for any string, no lookup table.
  - Download link gate (line 635): `isNonPrompt = jobProductType &&
    jobProductType !== 'prompt-tool'` — a single inequality check, not
    a list membership check. The 5 new types automatically get the
    download link once selectable, no code change needed.
  - No icon-per-type mapping exists anywhere in this file (`IdeaCard`'s
    `idea.icon || '🔧'` is about generated-idea icons from the AI
    response, unrelated to `product_type`).
  - Checked sibling files in the module (`IntelligencePanel.jsx`,
    `BlueprintViewer.jsx`, `IdeaTracker.jsx`, `CompareMode.jsx`) and
    outside it (e.g. `StoreApprovalQueue.jsx`, `ProductManager.jsx`) —
    none reference `product_type` at all.
  - **Conclusion: no changes needed anywhere except the `PRODUCT_TYPES`
    array itself.**

## Scope

1. **`client/src/modules/admin/factory/AIFactoryPage.jsx`** — extend
   `PRODUCT_TYPES` (lines 19-25) with 5 new entries, matching the
   existing 5 labels' style (Title Case, short, no trailing punctuation):
   ```js
   const PRODUCT_TYPES = [
     { value: 'prompt-tool',         label: 'Prompt Tool (default)' },
     { value: 'static-bundle',       label: 'Static Bundle' },
     { value: 'ui-kit',              label: 'UI Kit' },
     { value: 'notion-template',     label: 'Notion Template' },
     { value: 'browser-extension',   label: 'Browser Extension' },
     { value: 'api-kit',             label: 'API/Backend Kit' },
     { value: 'agent-pack',          label: 'AI Agent Pack' },
     { value: 'bot-kit',             label: 'Bot Kit' },
     { value: 'automation-template', label: 'Automation Template' },
     { value: 'mobile-template',     label: 'Mobile App Template' },
   ]
   ```
   No other line in this file changes — the `<select>` already maps
   `PRODUCT_TYPES` generically (`.map(pt => <option ...>)`), so the 5
   new options render and become selectable with zero other edits.

2. Nothing else changes: same `<select>` component, same
   `productType`/`setProductType` state, same `handleGenerate` /
   `handlePublish` flow, same Session History rendering.

## Explicitly NOT in this batch

- No backend changes — `product_type` values, `generateToolConfig()`
  branches, and the templates they build from
  (`buildApiKitBundle`, etc.) already exist and are live-verified;
  this batch only exposes them in the dropdown.
- No icon-per-type or badge-per-type visual differentiation — the
  existing generic text badge already display these correctly.
- No change to `factory.routes.js`, any route, or any schema.

## Hard constraints (unchanged from all prior batches)

Do not touch `tools.status`, `builder-agent.js`, `code-generator.js`,
`idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, the 5
competing status-writing code paths, or any backend route/schema. This
batch touches exactly one client file, a static array literal — no
backend files at all.

## Files touched

- `client/src/modules/admin/factory/AIFactoryPage.jsx` (edit)
- `docs/batches/batch-75-plan.md` (this file)

## Process

1. Branch `batch-75-admin-dropdown-remaining-types` (created off `main`
   — no dependency on batch-73 or batch-74, both still unmerged).
2. This plan committed as the first commit on the branch.
3. Implement exactly the scope above.
4. Build/syntax verification only — no live calls.
