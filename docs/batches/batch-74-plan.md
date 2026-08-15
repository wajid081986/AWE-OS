# Batch 74 — AI Factory: Switch LLM Provider from Claude to OpenAI

## Context

Live error hit: `No JSON in response — got keys: type, error, request_id`.
That key shape (`type`, `error`, `request_id`) is the raw Anthropic API
error envelope (e.g. an `overloaded_error` or rate-limit response),
leaking through unhandled and reaching the admin UI as-is. Decision:
rather than patch that one error, move AI Factory off Claude entirely
onto OpenAI, since a working, proven OpenAI integration already exists
in this codebase (`OPENAI_API_KEY` is live in Render; 9+ other features
already call it successfully).

## Research (completed before this plan)

- **`server/services/ai.service.js`** already exports **both**
  `callClaude()` (Anthropic) and `callOpenAI()` (OpenAI) — same file,
  same shape (`getClient()`/`getAnthropicClient()` lazy singleton,
  `AbortController` timeout, clean `err.code`/`err.status` on the
  explicit cases each function handles). `callOpenAI()` is the
  **proven, reused pattern**: it's already called from
  `builder-agent.js`, `code-generator.js`, `idea-agent.js`,
  `marketing-agent.js` (7 call sites), `monetization-agent.js`,
  `optimization-agent.js`, `revenue-agent.js`, `support-agent.js`
  (6 call sites), and `marketing.controller.js` — all via
  `require('../services/ai.service')`. No new OpenAI client/wrapper is
  needed; this batch reuses `callOpenAI()` as-is.
- **`callClaude()` call sites today** (repo-wide grep, excluding
  `node_modules`):
  - `server/services/ai-factory.service.js` — `generateToolConfig()`
    (line 337) and `generateToolIdeas()` (line 376). **In scope.**
  - `server/services/packaging.service.js` — `generateReadme()`
    (line 23). **In scope.**
  - `server/intelligence/ToolBlueprintGenerator.js`,
    `server/intelligence/ToolIdeaAnalyzer.js`,
    `server/routes/pdf-ai-tools.routes.js` (3 call sites) — **not AI
    Factory, not named in scope, left untouched.** `callClaude()` and
    the `@anthropic-ai/sdk` dependency stay in `ai.service.js`
    unchanged because these three files still need them.
  - Confirmed with user: `generateToolIdeas()` is included in this
    batch even though it wasn't explicitly named, since it's the same
    file/feature and leaving it on Claude would defeat "entirely."
- **`generateToolConfig()`'s "9 product types" is a single call site**,
  not 9. The `productType` ternary chain (lines 49–335) only builds a
  different `prompt` string per type (`ui-kit`, `notion-template`,
  `browser-extension`, `api-kit`, `agent-pack`, `bot-kit`,
  `automation-template`, `mobile-template`, `static-bundle`, default
  `prompt-tool`) — the actual `callClaude(...)` invocation (line 337)
  happens exactly once, after the prompt is built, regardless of type.
  So switching provider here is a one-call-site change; all 9 types
  automatically go through it.
- **Model choice**: grepped every literal `gpt-4o`/`gpt-4o-mini` in the
  codebase. Convention is consistent: `gpt-4o-mini` for short,
  structured-JSON or short-doc generation (e.g. `tool.routes.js:39`,
  `agents.routes.js:129`, `admin-blog.js` meta/short calls); `gpt-4o`
  reserved for longer-form content (full blog bodies, competitor
  analysis, multilingual translation). `generateToolConfig()` produces
  a small structured JSON object and `generateReadme()` produces
  <300 words of Markdown — both match the `gpt-4o-mini` bucket, not the
  `gpt-4o` one. `callOpenAI()`'s own default is already `gpt-4o-mini`.
  **Decision: `gpt-4o-mini` for all three call sites**, explicit in the
  call (not relying on the default) for clarity.
- **Where the raw error actually leaks**: `generateToolConfig()` has no
  try/catch of its own — an Anthropic SDK error propagates straight up
  through `runFactory()`'s catch (`ai-factory.service.js:510-516`),
  which stores `err.message` verbatim into `factory_jobs.error_message`.
  `factory.routes.js:42` (read-only, **not modified this batch** — it's
  in the hard-constraints list) returns `{ error: result.error }`
  straight to the admin UI. So whatever string ends up in `err.message`
  is exactly what the admin sees. The Anthropic SDK's error formatting
  is what produced the `type/error/request_id` blob; this is a
  message-quality problem, not a routes.js problem, so the fix lives in
  `ai-factory.service.js`/`packaging.service.js`, not the route.
  `packaging.service.js`'s `generateReadme()` already has a try/catch
  with a safe fallback template (line 22-31) — it never throws — so it
  doesn't leak to the UI today, but its `console.warn(err.message)`
  gets the same normalization treatment for consistency in server logs.
- `callOpenAI()`'s existing catch block only special-cases the abort/
  timeout path; any other OpenAI SDK error (429 rate-limit, 500, content
  filter, etc.) is re-thrown as-is (`ai.service.js:60`). The OpenAI SDK
  generally produces cleaner `.message` strings than what was observed
  from Anthropic, but nothing today guarantees that — so this batch
  still adds an explicit normalization step rather than assuming it.

## Decision: reuse `callOpenAI()`, don't repurpose `callClaude()`

Two options were on the table. Chosen: **switch the two files' call
sites from `callClaude` to the already-existing `callOpenAI`**, rather
than rewriting `callClaude()`'s internals to secretly call OpenAI.
Reasons:
- `callOpenAI()` already exists, is already the proven pattern used by
  9+ other features, and needs zero new code.
- Keeping a function named `callClaude()` that actually calls OpenAI
  internally would be a misleading name lying about what it does —
  and it's still genuinely needed for its other 3 real Claude callers.
- The two call sites' surrounding code (`callWithRetry()`,
  `systemPrompt` option, JSON cleanup) needs no structural change:
  `callOpenAI()` already accepts the same `(prompt, { model, max_tokens,
  systemPrompt })` shape `callClaude()` does, and
  `callWithRetry()`'s retry-eligibility check (`err.status === 429 ||
  err.code === 'AI_TIMEOUT' || err.code === 'ECONNRESET'`) is
  provider-agnostic already — no change needed there.

## Scope

1. **`server/services/ai-factory.service.js`**
   - Line 2: `require('./ai.service')` — swap `callClaude` →
     `callOpenAI` (keep `parseJSONResponse`).
   - `generateToolConfig()` (line 337): `callClaude(prompt, { model:
     'claude-sonnet-4-6', max_tokens: 1024, systemPrompt })` →
     `callOpenAI(prompt, { model: 'gpt-4o-mini', max_tokens: 1024,
     systemPrompt })`. Wrap the `callWithRetry(...)` result handling so
     a thrown error's message is passed through a new
     `toUserMessage(err)` helper before it's re-thrown, so whatever
     reaches `runFactory()`'s catch (and then `factory_jobs.error_message`
     / the admin UI) is always a clean sentence, never a raw
     provider error blob.
   - `generateToolIdeas()` (line 376): same swap (`claude-sonnet-4-6`
     → `gpt-4o-mini`, `max_tokens: 2048` unchanged), same
     `toUserMessage()` wrapping on failure.
   - New local helper `toUserMessage(err)`:
     ```js
     // Normalizes provider errors so factory_jobs.error_message (surfaced
     // verbatim to the admin UI by factory.routes.js) never leaks a raw
     // API error blob (e.g. Anthropic's {type, error, request_id} shape).
     function toUserMessage(err) {
       if (err.code === 'AI_TIMEOUT' || err.code === 'AI_UNAVAILABLE') return err.message;
       if (err.code === 'PARSE_ERROR') return 'AI response could not be parsed as JSON. Please try again.';
       if (typeof err.message === 'string' && !/^[{[]/.test(err.message.trim())) return err.message;
       return 'AI tool generation failed. Please try again in a moment.';
     }
     ```
     Applied at the point `generateToolConfig`/`generateToolIdeas`
     catch and re-throw (or, for `generateToolConfig`, at the existing
     `catch (err)` around the `JSON.parse(cleaned)` block — extended to
     also wrap errors coming out of `callWithRetry` itself).

2. **`server/services/packaging.service.js`**
   - Line 1: `require('./ai.service')` — swap `callClaude` →
     `callOpenAI`.
   - `generateReadme()` (line 23-27): same model/param swap
     (`claude-sonnet-4-6` → `gpt-4o-mini`). Keep the existing
     try/catch/fallback structure exactly as-is (it already prevents
     any error, clean or not, from reaching the caller) — only change
     the `console.warn` line to log through the same `toUserMessage`
     style normalization for log hygiene, no behavior change.

3. No changes to `ai.service.js` itself — `callOpenAI()`,
   `callClaude()`, and `parseJSONResponse()` all stay exactly as they
   are; `callClaude()` and `@anthropic-ai/sdk` remain because
   `ToolBlueprintGenerator.js`, `ToolIdeaAnalyzer.js`, and
   `pdf-ai-tools.routes.js` still depend on them.

## Known risk — flagged, not silently worked around

Every prompt in `generateToolConfig()`'s 9 branches (and
`generateToolIdeas()`) was originally written and tuned against
Claude's output behavior (instruction-following, JSON strictness,
markdown-fence habits). GPT-4o-mini may format JSON differently, wrap
it in fences more or less often, or interpret "2-5 props max"-style
constraints slightly differently. `parseJSONResponse()`'s fence-
stripping and trailing-comma repair should absorb minor formatting
drift, but **this is not a guarantee of equal output quality**.
**This batch is implementation + syntax verification only — no live
API calls.** Live regression testing across all 9 product types plus
`generateToolIdeas()` plus the README generator must happen after
deploy, same process as every prior batch. If any product type
regresses noticeably, the fix is prompt tuning for that type, not a
silent revert.

## Explicitly NOT in this batch

- `ToolBlueprintGenerator.js`, `ToolIdeaAnalyzer.js`,
  `pdf-ai-tools.routes.js` — untouched, still on Claude.
- `ai.service.js` — untouched (both `callOpenAI` and `callClaude` stay
  exactly as they are today).
- No prompt-content rewrites for GPT — only the provider/model swap.
  Prompt tuning, if needed, is a follow-up batch after live regression
  testing surfaces a specific problem.
- No removal of `@anthropic-ai/sdk` from `package.json` — still a real
  dependency for the three files above.

## Hard constraints (unchanged from all prior batches)

Do not touch `tools.status`, `builder-agent.js`, `code-generator.js`,
`idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or the 5
competing status-writing code paths. Do not touch the `tools` table
schema, `factory.routes.js`'s routes, or `tools.routes.js`. This batch
touches exactly two files' internals
(`ai-factory.service.js`, `packaging.service.js`) — no schema, no
routes.

## Files touched

- `server/services/ai-factory.service.js` (edit)
- `server/services/packaging.service.js` (edit)
- `docs/batches/batch-74-plan.md` (this file)

## Process

1. Branch `batch-74-ai-factory-openai-switch` (created off
   `batch-73-admin-product-price-edit`'s tip, i.e. current `main`
   pending that PR — no dependency on batch-73's actual changes).
2. This plan committed as the first commit on the branch.
3. Implement exactly the scope above — no live API calls.
4. Build/syntax verification only.
5. Live regression testing across all 9 product types + ideas +
   README generation happens after deploy, same as every prior batch.
