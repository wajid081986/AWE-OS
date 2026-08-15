# Batch 81 — admin-content.js: Anthropic → OpenAI Migration (JSON mode)

## Scope

`server/routes/admin-content.js` — 7 call sites, all Marketing Agent
content-generation endpoints, all currently on `claude-sonnet-4-20250514`:

1. `POST /seo-keywords-claude` (L34, max_tokens 1400)
2. `POST /blog-writer-claude` (L72, max_tokens 2800)
3. `POST /landing-page-claude` (L130, max_tokens 3500)
4. `POST /social-blast-claude` (L189, max_tokens 3000)
5. `POST /backlink-content-claude` (L264, max_tokens 900)
6. `POST /outreach-email-claude` (L304, max_tokens 800)
7. `POST /schedule-intelligence` (L342, max_tokens 800)

Line numbers re-confirmed against current file — match the inventory.

## Research findings

- **`getAnthropic()`/`extractJson()` are local, not shared.** Confirmed via
  grep: `admin-content.js` and `admin-traffic.js` each define their own
  copy, exactly as batch-80 found for the other 3 files. Nothing shared
  between admin-content.js and admin-traffic.js — this batch touches
  admin-content.js only, with zero effect on admin-traffic.js.
- **Structural difference from batch-80's 5 sites:** all 7 call sites here
  use Claude's separate `system` field alongside `messages: [{role:'user',...}]`.
  The 5 sites batch-80 migrated never used a `system` param — their full
  prompt was already a single user-role string, so batch-80 had nothing to
  merge. Here, the natural OpenAI mapping is `messages: [{role:'system',
  content: <system prompt>}, {role:'user', content: <user prompt>}]` —
  preserves the existing system/user split faithfully rather than
  collapsing it into one message.
- **No existing `response_format` usage anywhere in the codebase** (grepped
  all of `server/`) — this will be the first use of OpenAI JSON mode in
  this repo. `openai` package is `^6.34.0`, which supports
  `response_format: { type: 'json_object' }`.
- OpenAI's JSON mode requires the word "json" to appear somewhere in the
  messages, or the API rejects the call. Every one of the 7 prompts
  already contains "Return ONLY valid JSON" — no prompt text needs to
  change to satisfy this.
- `@anthropic-ai/sdk` stays in `package.json` — still required by
  `admin-traffic.js` and `landing-page-generator.service.js`.

## Behavior change: `response_format: { type: 'json_object' }`

This is **not** pure substitution — flagging clearly per your instruction.

- **What it does:** OpenAI's Chat Completions API, when given
  `response_format: { type: 'json_object' }`, constrains decoding so the
  output is *guaranteed* to be syntactically valid JSON (not guaranteed to
  match our specific schema shape/field names — that's still steered by
  the prompt only, same as today).
- **Why here and not batch-74–80:** those batches were pure
  provider substitution (same reliance on prompt instructions for JSON,
  just swapping the model). You flagged in the original inventory that
  GPT-4o-tier models are less reliable than Claude at prompt-only "return
  ONLY JSON" compliance — occasional markdown fences, leading/trailing
  prose, or truncated JSON. `admin-content.js` has the largest and most
  complex schemas of any batch so far (`landing-page-claude` alone has 8
  top-level fields including 3 nested arrays of objects), so this is where
  that risk is highest.
- **What stays the same:** `extractJson()` is left in place unchanged as a
  defense-in-depth fallback (strips fences / regex-extracts the `{...}`
  block) — cheap insurance even though JSON mode should make the
  fence-stripping path dead code in practice. Response shape, field names,
  and error handling (`try { extractJson(raw) } catch { result = ... }`)
  are all unchanged.
- **Requirement:** `response_format` is added to every one of the 7
  `chat.completions.create()` calls, since every one of the 7 endpoints
  parses the raw text as JSON today.

## Model choice (per-site, not blanket)

Batch-80 kept `gpt-4o-mini` even for Sonnet-sourced prompts because those
5 sites were low-stakes internal analytics (reports/recovery-plans seen
only by the admin). `admin-content.js` is different: several endpoints
generate **actual public-facing content** (blog articles, landing pages,
social posts published to real platforms), where output quality/coherence
matters more than an internal report blurb. Splitting by stakes and
schema complexity rather than blanket-upgrading:

| Endpoint | max_tokens | Output | Model | Why |
|---|---|---|---|---|
| `seo-keywords-claude` | 1400 | 5 keyword objects, internal research input | `gpt-4o-mini` | Small, structured, not published verbatim |
| `blog-writer-claude` | 2800 | Full public blog article + FAQ | **`gpt-4o`** | Published content; coherence across sections/word count matters |
| `landing-page-claude` | 3500 | Full public landing page (8 fields, 3 nested arrays) | **`gpt-4o`** | Largest schema + published, conversion-focused copy |
| `social-blast-claude` | 3000 | 6 distinct platform voices in one JSON payload | **`gpt-4o`** | Highest schema complexity (6 sub-objects, each a different voice/constraint) — most exposed to mini dropping/blending fields |
| `backlink-content-claude` | 900 | Short directory listing copy | `gpt-4o-mini` | Small, low stakes |
| `outreach-email-claude` | 800 | Subject + body, 2 fields | `gpt-4o-mini` | Small, simple schema |
| `schedule-intelligence` | 800 | 3 scheduling suggestions | `gpt-4o-mini` | Small, internal scheduling logic only |

Net: 3 of 7 on `gpt-4o` (the public-content, large-schema sites), 4 of 7
on `gpt-4o-mini` (small/internal sites) — open to adjusting if you'd
rather keep everything on mini for cost, or push more sites to `gpt-4o`.

## Changes per call site (repeated 7x)

1. `const Anthropic = require('@anthropic-ai/sdk')` → `const OpenAI = require('openai')`
2. `getAnthropic()` → `getOpenAI()` (same shape as batch-74–80: env-check,
   `err.status = 503`, lazy per-call instantiation, just `OPENAI_API_KEY`)
3. Per route:
   ```js
   // before
   const msg = await client.messages.create({
     model: 'claude-sonnet-4-20250514',
     max_tokens: N,
     system: SYSTEM_PROMPT,
     messages: [{ role: 'user', content: USER_PROMPT }]
   }, { timeout: AI_CALL_TIMEOUT_MS })
   const raw = msg.content[0]?.text || ''

   // after
   const completion = await client.chat.completions.create({
     model: MODEL, // per table above
     max_tokens: N,
     response_format: { type: 'json_object' },
     messages: [
       { role: 'system', content: SYSTEM_PROMPT },
       { role: 'user', content: USER_PROMPT }
     ]
   }, { timeout: AI_CALL_TIMEOUT_MS })
   const raw = completion.choices?.[0]?.message?.content || ''
   ```
4. `extractJson()`, `requireAdmin()`, `AI_CALL_TIMEOUT_MS`, all fallback
   objects on parse failure, and every response shape (`res.json({success:true, ...})`)
   stay byte-for-byte unchanged.
5. No prompt text changes — the JSON schema descriptions in each `system`
   string stay as-is (they already say "Return ONLY valid JSON").

## Explicitly not touched

- `admin-traffic.js` — separate batch, still needs the duplicate-route
  dedupe decision
- `landing-page-generator.service.js`
- `@anthropic-ai/sdk` dependency — still required by the two files above
- `tools.status`, `builder-agent.js`, `code-generator.js`,
  `idea-pipeline.js`, `PipelineOrchestrator`, `testing-agent`, or any of
  the 5 competing status-writing code paths

## Verification

- `npm run build` (or equivalent) for syntax verification
- No live API calls — build/syntax check only, per instruction
- Deploys on Render after merge, per established workflow

## Risk

Low-medium. Internal-only endpoints (`requireAuth` + `requireAdmin`), but
this batch carries two real (not pure-substitution) changes at once:
JSON-mode enforcement and a 3-site model upgrade to `gpt-4o`. Both are
flagged above for explicit sign-off before implementation.
