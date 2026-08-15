# Batch 77 Plan — Migrate remaining `api/*.js` Vercel functions to OpenAI

**Scope:** the 5 `api/*.js` files identified in the Anthropic inventory as
still calling Claude directly, excluding `api/analyze-tool.js` (already
fixed in batch-76). All 5 deploy as Vercel serverless functions, separate
from the Render/Express `server/` tree — this batch does not touch `server/`.

1. `api/generate-blueprint.js`
2. `api/generate-tool.js`
3. `api/generate-ideas.js`
4. `api/generate-prompt.js`
5. `api/cover-letter.js` (2 call sites: `action: 'generate'`, `action: 'improve'`)

## Current state (re-confirmed this session, unchanged since the inventory)

| File | Provider today | `response.ok` check | Failure behavior |
|---|---|---|---|
| `generate-blueprint.js` | Anthropic, `claude-sonnet-4-20250514` | Yes | 502 with `{error, detail}` — **reference pattern** |
| `generate-tool.js` | Anthropic, `claude-sonnet-4-20250514` | Yes, but throws generic `Error('Claude API ${status}')` caught by outer try/catch → 500, no detail | Works, but thinner than generate-blueprint.js |
| `generate-ideas.js` | Anthropic, `claude-sonnet-4-6` | **No** | Anthropic error body gets treated as success shape; `text.match(/\[...\]/)` fails → generic 500 "No ideas JSON in AI response" (misleading — masks the real upstream error) |
| `generate-prompt.js` | Anthropic, `claude-sonnet-4-6` | **No** | Same masking pattern as generate-ideas.js |
| `cover-letter.js` | Anthropic, `claude-sonnet-4-6` (both actions) | **No** | Worst case: on Anthropic failure, `data.content?.[0]?.text` is `undefined` → `text = ''` → **returns HTTP 200 with `{ text: '' }`**. Client can't detect failure. |

## Client consumers (checked so response shape doesn't need to change)

- `client/src/hooks/useToolIntelligence.js` calls `generate-blueprint` (expects
  the blueprint object directly, unwrapped), `generate-prompt` (expects
  `{ prompt }`), and `generate-ideas` (expects `{ ideas }`). All three already
  do `if (!res.ok) throw new Error(...)` client-side, so tightening the
  server's error path is pure upside — no client change needed.
- `client/public/cover-letter-generator.html` calls `cover-letter` for both
  actions, expects `{ text }` on success, and **already** does
  `if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error || ...) }`
  on the `generate` call and `if (!res.ok) throw new Error(...)` on `improve`.
  The client is already correct — it's been waiting on the server to actually
  return a non-200 with an `error` field. No client change needed.
- `generate-tool.js` — **no current client consumer found** anywhere in
  `client/` (only referenced in docs). Fixing it per the batch scope since
  it's a live endpoint, but flagging that it appears unwired/orphaned right
  now. Response shape (`{ tool }`) preserved regardless.

## Changes (same shape for all 5 files)

- Endpoint: `https://api.anthropic.com/v1/messages` → `https://api.openai.com/v1/chat/completions`
- Auth header: `'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01'` → `'Authorization': \`Bearer ${process.env.OPENAI_API_KEY}\``
- Model: → `'gpt-4o-mini'` (matches batch-76's `analyze-tool.js` and the batch-74 convention)
- Request body: Anthropic's `{ model, max_tokens, system?, messages: [{role:'user', content}] }`
  → OpenAI's `{ model, max_tokens, messages: [{role:'system', content}?, {role:'user', content}] }`
  (only `cover-letter.js` uses a `system` field today; it becomes a
  `role: 'system'` message, same conversion `ai.service.js`'s `callOpenAI()`
  already does for `options.systemPrompt`)
- Response parsing: `data.content?.[0]?.text` → `data.choices?.[0]?.message?.content`
- No new npm dependency — raw `fetch`, matching each file's existing style
  and `analyze-tool.js`'s established pattern.

## Per-file error-handling change

Target pattern (generate-blueprint.js's existing shape, applied uniformly):

```js
if (!response.ok) {
  const errText = await response.text();
  console.error('OpenAI API error:', response.status, errText);
  return res.status(502).json({
    error: `OpenAI API error: ${response.status}`,
    detail: errText.slice(0, 200)
  });
}
```

- **generate-blueprint.js** — already has this shape; just swap provider/model/parsing, keep the check as-is.
- **generate-tool.js** — replace the `throw new Error('Claude API ${status}')` (caught generically, 500, no detail) with the direct `res.status(502).json({error, detail})` return above. Note: this changes the upstream-failure status code from 500→502, matching the other 4 files — flagging as an intentional consistency fix, not a side effect.
- **generate-ideas.js** — add the check (currently missing entirely).
- **generate-prompt.js** — add the check (currently missing entirely).
- **cover-letter.js** — add the check to **both** the `generate` and `improve` branches. This is the fix for the silent-200 bug: today `data.content?.[0]?.text || ''` swallows failures into a successful-looking empty string; after the fix, an upstream failure returns 502 with `{error, detail}` before that line is ever reached, so `improveSection()`'s existing `if (!res.ok) throw new Error(...)` and the `generate` handler's existing `if (!res.ok) { ...throw new Error(err.error || ...) }` will finally fire as designed.

## Out of scope (unchanged from the inventory / explicit constraints)

- No changes to `server/` — `ai.service.js`, `ToolIdeaAnalyzer.js`, `ToolBlueprintGenerator.js`, `pdf-ai-tools.routes.js`, `tools.routes.js`, any `admin-*.js`, `landing-page-generator.service.js` — all separate later batches.
- No changes to `tools.status`, `builder-agent.js`, `code-generator.js`, `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or the 5 competing status-writing code paths.
- `api/analyze-tool.js` — already fixed in batch-76, not touched here.

## Risks / things to confirm before merge

- Needs `OPENAI_API_KEY` set as a Vercel project env var for all 5 functions — same requirement batch-76 already flagged for `analyze-tool.js`, presumably already satisfied since that shipped. Not independently verifiable from this environment.
- `generate-tool.js`'s failure status code changes 500→502 on upstream AI errors (see above) — noting in case anything greps for that specific code, though no client consumer was found.
- No live API calls will be made during implementation — build/syntax verification only (`node --check` per file, or the repo's existing build/lint step if it covers `api/`).

## Workflow

This plan is the first commit on `batch-77-api-openai-migration` (branched
off `origin/main`, which already has batch-76 merged). Implementation would
land as a second commit (`batch-77: migrate api/*.js to OpenAI + fix error
forwarding`), followed by build/lint verification, then a summary + human
verification checklist, then stop — **pending your confirmation below before
any file is edited.**
