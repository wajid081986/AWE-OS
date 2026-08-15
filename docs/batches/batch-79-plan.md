# Batch 79 Plan — Migrate `tools.routes.js`'s public `/:slug/run` execution path to OpenAI

**Scope:** `server/routes/tools.routes.js` — the raw Anthropic client
(L9, L13) and its one call site (L169, inside `POST /:slug/run`). This is
the **only Claude call site outside `/admin/*`** — every real site visitor
hits it when running any AI-Factory-generated prompt-tool. Deploys on
Render (Express server), same as batch-78.

## Fresh re-verification (this session, before changing anything)

Re-read the current file top-to-bottom to confirm the inventory's claims,
no drift:

- **L9**: `const Anthropic = require('@anthropic-ai/sdk');`
- **L12-13**: both clients are already module-scope singletons —
  `const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });` and
  `const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });`
- **L169-173** (inside `POST /:slug/run`, L121-187): the only call site —
  ```js
  const message = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages:   [{ role: 'user', content: prompt }],
  }, { timeout: AI_CALL_TIMEOUT_MS });
  const result = message.content[0]?.text || 'No response generated.';
  ```
- **L68-73** (`POST /resume/ai-summary`, already OpenAI): confirms a
  working local pattern in this same file —
  ```js
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', messages: [...], max_tokens: 120, temperature: 0.72,
  }, { timeout: AI_CALL_TIMEOUT_MS });
  const summary = completion.choices[0]?.message?.content?.trim();
  ```
- **Error handling at the route level** (L183-186): generic
  `catch (err) { console.error('[/run] error:', err.message); res.status(500).json({ success: false, error: err.message }); }`
  — provider-agnostic, forwards `err.message` regardless of SDK. No
  special-casing of Anthropic-shaped errors anywhere in this route.
- `grep -n anthropic server/routes/tools.routes.js` confirms exactly 3
  matches (L9, L13, L169) — nothing else in the file references the
  Anthropic client, and it isn't exported, so removing it is fully
  file-local.
- `grep -rl "@anthropic-ai/sdk" server/` confirms it's still required by
  `admin-content-intelligence.js`, `admin-content.js`,
  `admin-traffic-alerts.js`, `admin-traffic.js`, `admin-weekly-report.js`,
  and `landing-page-generator.service.js` — **not removing the package**,
  same as batch-78's rule (cleanup only after every batch in the
  migration is done). `ANTHROPIC_API_KEY` stays required for those.

## Client-pattern choice: reuse the local raw-`openai`-client pattern (L12/L68), not `ai.service.js`'s `callOpenAI()`

Going with the **local pattern already in this file**, not importing
`callOpenAI()` from `ai.service.js`. Reasoning:

- The instruction to "preserve the existing try/catch, timeout, and
  error-forwarding behavior **exactly**" is easiest to satisfy with the
  local pattern: swapping `anthropic.messages.create(...)` for
  `openai.chat.completions.create(...)` inside the *same* try/catch,
  with the *same* `{ timeout: AI_CALL_TIMEOUT_MS }` second-arg option the
  OpenAI SDK already accepts (proven at L68-73 in this very file), is a
  pure substitution — the outer `catch (err) { ...err.message...
  res.status(500)... }` doesn't need to change at all.
- `callOpenAI()` (`ai.service.js:32`) throws errors shaped with
  `err.code`/`err.status` (`AI_TIMEOUT`/504, `AI_UNAVAILABLE`/503) that
  the route's current catch block ignores entirely (`err.message` only →
  always 500). Adopting `callOpenAI()` here would mean either (a) losing
  that status-code information silently, which defeats the point of
  switching, or (b) changing the catch block to branch on `err.status`,
  which is a **behavior change** beyond what this batch asked for
  ("preserve... exactly"). The local pattern avoids that fork entirely.
- Consistency: this file already has two working OpenAI patterns to pick
  from (module-scope `openai` client, `AI_CALL_TIMEOUT_MS` constant) —
  reusing them for the second call site removes the file's *inconsistency*
  (mixed providers) without introducing a *new* cross-file dependency.

## Model choice: `gpt-4o-mini`

Current model is `claude-haiku-4-5-20251001` — the fast/cheap tier.
`gpt-4o-mini` is the correct target by two independent, agreeing signals:

1. Batch-78's established mapping (`docs/batches/batch-78-plan.md`):
   Haiku-tier calls → `gpt-4o-mini`, Sonnet-tier calls → `gpt-4o`.
2. This file's own `/resume/ai-summary` endpoint (L69) already uses
   `gpt-4o-mini` — same tier, same file, zero ambiguity.

No Sonnet-tier call exists in this file, so there's no `gpt-4o` case to
weigh here.

## Changes

### `server/routes/tools.routes.js`

1. Delete L9: `const Anthropic = require('@anthropic-ai/sdk');`
2. Delete L13: `const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });`
3. Replace L169-174:
   ```js
   const message = await anthropic.messages.create({
     model:      'claude-haiku-4-5-20251001',
     max_tokens: 1024,
     messages:   [{ role: 'user', content: prompt }],
   }, { timeout: AI_CALL_TIMEOUT_MS });
   const result = message.content[0]?.text || 'No response generated.';
   ```
   with:
   ```js
   const completion = await openai.chat.completions.create({
     model:      'gpt-4o-mini',
     max_tokens: 1024,
     messages:   [{ role: 'user', content: prompt }],
   }, { timeout: AI_CALL_TIMEOUT_MS });
   const result = completion.choices[0]?.message?.content || 'No response generated.';
   ```
4. Nothing else in `POST /:slug/run` changes — field validation, prompt
   templating, admin preview bypass, usage-count update, and the
   try/catch/response shape are all untouched.

No other route in the file is touched (`/resume/ai-summary` already uses
OpenAI and isn't in scope; all `supabase`/CRUD routes are unrelated).

## Out of scope (unchanged from the inventory / explicit constraints)

- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, the 5
  competing status-writing code paths — untouched.
- `factory.routes.js`, the `tools` table schema — untouched.
- Any `admin-*.js` file, `landing-page-generator.service.js` — separate,
  later batches (still on Anthropic, package/env var stay required).
- The thin-content backlog item — unrelated, deferred.
- Removing `@anthropic-ai/sdk` from `server/package.json` or
  `ANTHROPIC_API_KEY` from env — happens only after every batch in this
  migration is complete; still needed by the files listed above.

## Risks / things to confirm before merge

- **This is the highest-testing-priority call site in the whole
  migration** — it's the only one a real, unauthenticated site visitor
  hits directly, for every published AI-Factory prompt-tool. Build/syntax
  verification (`node --check server/routes/tools.routes.js`) is not
  sufficient proof this works.
- **Post-deploy checklist (must be done against a real deployment, not
  just this diff):**
  1. Run a real, already-published prompt-tool from the public `/tools/
     :slug` page (not admin preview) and confirm it returns a real,
     coherent OpenAI-generated result — not just a 200 status.
  2. Confirm `usage_count`/`last_used_at` still increments on success
     (unchanged code path, but worth eyeballing once live).
  3. Confirm the admin-preview bypass (`Bearer` token, `isAdmin: true`)
     still runs an **unapproved** tool end-to-end post-migration — this
     path is what batch-78's regression test exercised for the generation
     side; this batch needs the same test run against `/run` specifically.
  4. Force a failure (e.g. temporarily bad `OPENAI_API_KEY` locally, or
     an oversized prompt) and confirm the existing `catch` still returns
     `{ success: false, error: <message> }` with a real, non-empty
     message — not a swallowed/empty error.
  5. Confirm `{{field}}` prompt-templating still works correctly for a
     tool with multiple `input_fields` — unrelated to the provider swap,
     but the highest-value regression check for real user-submitted
     tools.
- Model-cost note: `gpt-4o-mini` is materially cheaper than
  `claude-haiku-4-5-20251001` per token — a cost decrease here, not an
  increase (opposite of batch-78's `gpt-4o` upgrades). Worth noting since
  this is the highest-volume call site in the whole migration (every
  public tool run).
- No live API calls during implementation — build/syntax verification
  only (`node --check server/routes/tools.routes.js`), consistent with
  batch-77/78's precedent. Live verification happens post-deploy per the
  checklist above.
- Working tree note: `docs/backlog.md` (uncommitted edit) and
  `growth-os-sdd.md` (untracked) are pre-existing local changes from a
  prior session, unrelated to this batch — left untouched, not committed
  as part of this batch's commits.

## Workflow

This plan is the first commit on `batch-79-tools-routes-openai-migration`
(branched from the tip of the merged `batch-78-ai-service-openai-migration`
branch — content-identical to `origin/main` post-PR#37-merge, just missing
the merge commit marker itself; no divergence). Implementation lands as a
second commit (`batch-79: migrate tools.routes.js /:slug/run to OpenAI`),
followed by syntax verification, then a summary + human verification
checklist, then stop — **pending your confirmation below before any file
is edited.**
