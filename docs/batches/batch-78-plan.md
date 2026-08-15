# Batch 78 Plan — Migrate `ai.service.js`'s `callClaude()` callers to OpenAI

**Scope:** the shared `server/services/ai.service.js` helper's Claude path,
plus its 3 real callers. Deploys on Render (Express server), not Vercel —
different from batches 76/77.

## Fresh re-verification (this session, before deleting anything)

`grep -rn "callClaude|getAnthropicClient"` across the whole repo confirms
exactly what the earlier inventory found, no drift:

- **Definitions**: `getAnthropicClient()` (ai.service.js:134) and
  `callClaude()` (ai.service.js:158) — only used inside `ai.service.js`
  itself and by the 3 files below.
- **Callers** (3, unchanged):
  - `server/intelligence/ToolIdeaAnalyzer.js:82`
  - `server/intelligence/ToolBlueprintGenerator.js:117`
  - `server/routes/pdf-ai-tools.routes.js:24,45,62`
- No other file imports `callClaude`. Safe to delete.

`grep "@anthropic-ai/sdk"` confirms it's still required by
`server/routes/tools.routes.js`, all 4 `admin-*.js` files, and
`server/services/landing-page-generator.service.js` — **not removing the
package**, per the explicit constraint (cleanup happens only after every
batch in this migration is done).

`server/index.js:91-92` — `OPENAI_API_KEY` is already in `REQUIRED_ENV`
(server won't boot without it, so it's confirmed live on Render already).
`ANTHROPIC_API_KEY` stays in `OPTIONAL_ENV` — still needed by the
not-yet-migrated files above, not touched this batch.

## Model mapping

The current Haiku/Sonnet split reflects a fast-cheap vs. higher-quality
choice per call site. Mapping each to the nearest OpenAI equivalent already
used elsewhere in this codebase (`gpt-4o-mini` is the established default
per batch-74/76/77; `gpt-4o` is already used for the higher-quality Reddit/
Quora/Pinterest content sites in `admin-traffic.js`):

| File | Current model | New model | Reasoning |
|---|---|---|---|
| `ToolIdeaAnalyzer.js` | `claude-haiku-4-5-20251001` | `gpt-4o-mini` | Fast structural-analysis call (~800ms target), Haiku's role today |
| `ToolBlueprintGenerator.js` | `claude-sonnet-4-6` | `gpt-4o` | Heavier, higher-quality call (~5-10s), Sonnet's role today |
| `pdf-ai-tools.routes.js` (all 3: summarize/translate/extract-tables) | `claude-sonnet-5` | `gpt-4o` | Was already Sonnet-tier (not Haiku) in this file — keeping the same quality tier |

## Changes

### 1. `server/services/ai.service.js`
- Delete `getAnthropicClient()` (L132-145) and `callClaude()` (L147-197)
  entirely, including the `// ── Anthropic / Claude ──` section comment.
- Delete `const Anthropic = require('@anthropic-ai/sdk');` (L2) — unused
  in this file once `callClaude` is gone. (Package itself stays in
  `package.json` — other files still `require` it directly.)
- `module.exports = { callOpenAI, callClaude, parseJSONResponse };` →
  `module.exports = { callOpenAI, parseJSONResponse };`
- `callOpenAI()` and `parseJSONResponse()` themselves are untouched.

### 2. `server/intelligence/ToolIdeaAnalyzer.js`
- L11: `const { callClaude, parseJSONResponse }` → `const { callOpenAI, parseJSONResponse }`
- L82: `await callClaude(userPrompt, { model: 'claude-haiku-4-5-20251001', ... })`
  → `await callOpenAI(userPrompt, { model: 'gpt-4o-mini', ... })` — `max_tokens`
  and `systemPrompt` options unchanged, same shape both functions accept.
- L7 docblock comment ("using a single Claude Haiku call") updated to say
  OpenAI/gpt-4o-mini, since it directly describes the call being changed.
- **Fallback behavior in `_fallbackAnalysis()` is untouched** — the
  try/catch around the call, and everything the catch block does, stays
  exactly as-is. Only the try block's call changes.

### 3. `server/intelligence/ToolBlueprintGenerator.js`
- L14: same import swap as above.
- L117: `callClaude(userPrompt, { model: 'claude-sonnet-4-6', ... })` →
  `callOpenAI(userPrompt, { model: 'gpt-4o', ... })`.
- L6/L10 docblock comments ("using Claude Sonnet") updated similarly.
- **`_fallbackBlueprint()` untouched** — same preserve-the-fallback rule.

### 4. `server/routes/pdf-ai-tools.routes.js`
- L2: same import swap.
- L24, L45, L62: `callClaude(clamped, { model: 'claude-sonnet-5', ... })` →
  `callOpenAI(clamped, { model: 'gpt-4o', ... })` in all 3 routes
  (`/summarize`, `/translate`, `/extract-tables`).
- Error handling (`res.status(err.status || 500).json(...)`) is untouched —
  `callOpenAI()` throws the same `{code, status}` shaped errors
  (`AI_TIMEOUT`/504, `AI_UNAVAILABLE`/503) as `callClaude()` did, so this
  keeps working with zero changes.

### Noted but explicitly NOT changed this batch (flagging, not fixing)
- `ToolBlueprintGenerator.js:68,158` — `"aiIntegration": "claude-haiku"` is
  a **string value embedded in the generated blueprint JSON output**
  (describing what AI a *future generated tool* should use), not a live
  call site. Leaving as-is since it wasn't named in scope; flagging here
  so it doesn't get lost — worth a one-line `docs/backlog.md` entry after
  this batch since it'll be stale once nothing in this codebase actually
  uses `claude-haiku` anymore.

## ⚠️ Translation quality re-check required (flagging per your instruction)

`server/routes/pdf-ai-tools.routes.js`'s `/translate` endpoint (Hindi/Urdu)
already had an **unverified output-quality flag** in `docs/backlog.md:65`
under Claude (`claude-sonnet-5`) — specifically calling out that Urdu is
riskier than Hindi because it's less represented in training data. Moving
to `gpt-4o` **resets that verification** — GPT-4o's Hindi/Urdu quality
relative to Claude Sonnet is a genuinely open question, not something to
assume parity on. This batch will add/update a `docs/backlog.md` line
flagging that the existing Hindi/Urdu quality caveat now applies to
`gpt-4o` output post-migration and still needs a human spot-check with a
real PDF before this feature is promoted or relied upon.

## Out of scope (unchanged from the inventory / explicit constraints)

- `tools.routes.js`, any `admin-*.js`, `landing-page-generator.service.js`
  — separate later batches, `@anthropic-ai/sdk` still required by them.
- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, the 5
  competing status-writing code paths — untouched.
- Removing `@anthropic-ai/sdk` from `server/package.json` — happens only
  after every batch in this migration is complete.

## Risks / things to confirm before merge

- This is the first batch in the Anthropic migration that deploys on
  **Render**, not Vercel — `OPENAI_API_KEY` is already `REQUIRED_ENV`
  there (server crashes on boot without it), so it's confirmed already
  set; no new env var needed.
- `gpt-4o` costs more per token than `gpt-4o-mini` — `ToolBlueprintGenerator.js`
  and all 3 `pdf-ai-tools.routes.js` endpoints move to `gpt-4o`. Worth
  knowing this changes the cost profile of blueprint generation and the
  public (rate-limited, consent-gated) PDF AI tools, not just the provider.
- No live API calls during implementation — build/syntax verification only
  (`node --check` per file, since there's no root build step covering
  `server/` either, matching batch-77's precedent).
- Post-merge: manually re-verify `/translate` Hindi and Urdu output quality
  with a real PDF (see flag above) before treating it as equivalent to the
  pre-migration Claude behavior.

## Workflow

This plan is the first commit on `batch-78-ai-service-openai-migration`
(branched off `origin/main`, which has batches 74/76/77 merged).
Implementation lands as a second commit
(`batch-78: migrate ai.service.js callClaude callers to OpenAI`), followed
by syntax verification, then a summary + human verification checklist,
then stop — **pending your confirmation before any file is edited.**
