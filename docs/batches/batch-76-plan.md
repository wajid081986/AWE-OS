# Batch 76 Plan — Fix "Analyze Idea" raw-error leak in `api/analyze-tool.js`

**Root cause recap:** `api/analyze-tool.js` (a separate Vercel serverless function,
outside the `server/` Express tree batch-74 touched) still calls Anthropic
directly and forwards Anthropic's response — success or error — as HTTP 200
unconditionally, which leaks the raw `{type, error, request_id}` envelope to
the client. This produces the "No JSON in response — got keys: type, error,
request_id" error seen in the AI Factory "Analyze Idea" flow.

## Files to modify

**`api/analyze-tool.js`** (only file in scope):

1. Switch provider: `https://api.anthropic.com/v1/messages`
   (`ANTHROPIC_API_KEY`, `claude-sonnet-4-6`) → `https://api.openai.com/v1/chat/completions`
   (`OPENAI_API_KEY`, `gpt-4o-mini`), via raw `fetch` — no SDK, matching this
   file's existing style and batch-74's model convention. No new npm
   dependency needed.
2. Add a `response.ok` check before forwarding, mirroring the already-correct
   pattern in `api/generate-blueprint.js` (lines 74-81): on failure, return
   `502` with a normalized `{ error: '...' }` message — never the raw
   provider body.
3. Normalize the success payload to `{ content: [{ text: '<model output>' }] }`
   so `client/src/hooks/useToolIntelligence.js`'s existing parse logic
   (`json.content?.[0]?.text`, line 91) keeps working with zero client-side
   changes.

## Out of scope (logged to `docs/backlog.md`, not fixed here)

Grepped all of `api/*.js` — every file still calls Anthropic directly with no
OpenAI migration:

- `api/generate-blueprint.js` — still Claude, but not buggy (already checks
  `response.ok` correctly) — lower priority.
- `api/generate-ideas.js`, `api/generate-tool.js`, `api/generate-prompt.js`,
  `api/cover-letter.js` — still Claude, unknown whether any share
  `analyze-tool.js`'s always-200 bug — not investigated, flagged for a future
  batch if the full `api/` layer needs to move off Anthropic.

## Risks / things to confirm before merge

- Needs `OPENAI_API_KEY` set as a Vercel project env var (this function
  deploys on Vercel, separate from Render where batch-74 already relies on
  it for the Express side). Not verifiable from this environment — confirm
  before deploy.
- This change only affects the Vercel deployment — no Render/Express
  interaction, no DB migration needed.

## Workflow

New branch `batch-76-analyze-tool-openai-fix` off `origin/main`, this plan
saved verbatim as the first commit, implementation as a second commit
(`batch-76: switch analyze-tool.js to OpenAI + fix error forwarding`), then
build/lint check, summary + verification checklist, stop.
