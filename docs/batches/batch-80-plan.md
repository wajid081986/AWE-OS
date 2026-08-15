# Batch 80 — Simple Admin Routes: Anthropic → OpenAI Migration

## Scope

3 low-volume, internal-only admin routes, 5 call sites total, all using the
identical local `getAnthropic()` + `extractJson()` helper pattern and
`res.status(err.status||500).json(...)` error handling:

1. `server/routes/admin-content-intelligence.js`
   - `POST /content-patterns-claude`
   - `POST /content-suggestions-claude`
2. `server/routes/admin-weekly-report.js`
   - `POST /weekly-report-claude`
3. `server/routes/admin-traffic-alerts.js`
   - `POST /recovery-plan-claude`
   - `POST /goal-analysis-claude`

## Research findings

- **`getAnthropic()`/`extractJson()` are NOT shared helpers.** Each of the
  5 admin-*.js files (these 3, plus the not-yet-migrated
  `admin-content.js` and `admin-traffic.js`) defines its own **local
  copy** of both functions. There is nothing to detach from a shared
  module — editing these 3 files does not affect `admin-content.js` or
  `admin-traffic.js` in any way.
- A shared OpenAI helper already exists at `server/core/ai-engine/index.js`
  (`getOpenAI()`, lazy singleton, same env-check/503-error shape),
  currently used by `keyword-engine.js`. This batch does **not** switch
  these 3 files to that shared helper — doing so would be a structural
  change beyond "pure provider substitution." Instead each file gets its
  own local `getOpenAI()`, mirroring the exact shape of its existing local
  `getAnthropic()` (same env-var check, same `err.status = 503`, same
  lazy-per-call instantiation).
- `extractJson()` bodies differ slightly between files today
  (`admin-content-intelligence.js` matches both `{}` and `[]`; the other
  two match `{}` only) — left as-is per file, no consolidation.
- All 5 call sites currently use `claude-sonnet-4-20250514` via
  `client.messages.create()`.
- `@anthropic-ai/sdk` stays in `package.json` — still required by
  `admin-content.js`, `admin-traffic.js`, and
  `landing-page-generator.service.js` (all out of scope for this batch).

## Model choice

`gpt-4o-mini` for all 5 sites. Reasoning: these are structured JSON
generation tasks over internal admin data (content pattern analysis,
weekly report synthesis, recovery plans, goal-analysis blurbs) — closer
in nature to batch-78's Haiku-tier structured-extraction sites than to
its `/translate`/`/summarize` long-document sites that got `gpt-4o`. Max
output sizes are modest (300–2000 tokens). Flagging that the original
Claude model was Sonnet-tier (not Haiku) for all 5 — open to switching
`weekly-report-claude` (highest complexity, 2000 max_tokens, synthesizes
5 input fields into a multi-section strategic report) to `gpt-4o` if
mini's output quality doesn't hold up, but starting with mini per the
batch brief's default.

## Changes per file (identical shape, repeated 3x)

For each file:

1. Replace `const Anthropic = require('@anthropic-ai/sdk')` with
   `const OpenAI = require('openai')`.
2. Replace `getAnthropic()` with `getOpenAI()`:
   ```js
   function getOpenAI() {
     if (!process.env.OPENAI_API_KEY) {
       const err = new Error('OPENAI_API_KEY not set')
       err.status = 503
       throw err
     }
     return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
   }
   ```
3. Leave `extractJson()`, `requireAdmin()`, `AI_CALL_TIMEOUT_MS` untouched.
4. In each route handler:
   - `const client = getAnthropic()` → `const client = getOpenAI()`
   - `client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: N, messages: [{ role: 'user', content: prompt }] }, { timeout: AI_CALL_TIMEOUT_MS })`
     → `client.chat.completions.create({ model: 'gpt-4o-mini', max_tokens: N, messages: [{ role: 'user', content: prompt }] }, { timeout: AI_CALL_TIMEOUT_MS })`
   - `const raw = msg.content?.[0]?.text` → `const raw = completion.choices?.[0]?.message?.content`
   - Error message text `'Empty response from Claude'` → `'Empty response from OpenAI'`
   - No other logic, prompt text, JSON schema, or error handling changes.

## Explicitly not touched

- `admin-content.js` (7 sites, needs JSON-mode verification — separate batch)
- `admin-traffic.js` (needs duplicate-route dedupe decision — separate batch)
- `landing-page-generator.service.js`
- `@anthropic-ai/sdk` dependency / any shared Anthropic client helper
- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or any of
  the 5 competing status-writing code paths

## Verification

- `npm run build` (or equivalent) for syntax/type verification
- No live API calls — this is a build/syntax check only, per instruction
- Deploys on Render after merge, per established workflow

## Risk

Low. Internal-only admin endpoints (all behind `requireAuth` +
`requireAdmin`), low request volume, isolated files with no shared state,
identical pattern to 5 prior successful migrations (batch-74 through
batch-79).
