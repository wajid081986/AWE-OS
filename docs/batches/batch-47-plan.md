# Batch 47 — Humanize Pipeline Reliability Fix

**Branch:** `batch-47-humanize-reliability`

## Scope

Fix the root cause of the 2026-08-06 "Humanize All" bulk run failing on
14/56 Published Posts. Falls under the CLAUDE.md §3b carve-out's "unless a
bug blocks integration" exception for `humanizer.js`/`index.js`, plus
additive/bugfix changes to `admin-blog.js`, and one narrow addition to
`server/index.js` (route-scoped socket-timeout override) mirroring the
existing precedent for `/api/codegen/generate` and
`/api/admin/video-agent/generate`.

Root cause (code-confirmed; no live Render log access this session):
- Client's global axios timeout is 60s; there was no server-side route
  timeout override for `/api/admin/blog/humanize/*`.
- `/humanize/:id` sent a post's entire body through one gpt-4o call
  (no chunking) plus two more sequential OpenAI calls with no per-call
  timeout or retry — on longer posts this can exceed both timeouts.
- The bulk loop's `catch { failed++ }` discarded the actual error, so
  failures were undiagnosable without opening devtools.

Two units, built and verified sequentially:

1. **Timeout + retry** — SDK-level timeout/retry on every OpenAI call in
   the humanizer, a route-scoped socket-timeout override on the server,
   and a client-side per-call timeout + retry-with-backoff wrapper that
   also surfaces the real error instead of swallowing it.
2. **Chunking** — split long posts into groups of paragraphs before
   humanizing, so no single OpenAI call ever carries a whole long
   article (bounds latency and token-limit risk independent of the
   timeout fix in unit 1).

## Files modified

- `server/core/content-studio/humanizer.js` — each of the 3
  `openai.chat.completions.create()` calls gets `{ timeout: 90_000,
  maxRetries: 3 }` (SDK's built-in exponential backoff on 429/5xx/network
  errors). No prompt or behavior change.
- `server/index.js` — one additive route-scoped timeout override:
  `app.use('/api/admin/blog/humanize', (req,res,next) => {
  req.setTimeout(180_000); res.setTimeout(180_000); next() })`, placed
  before the `/api/admin/blog` router mount. Matches the existing
  pattern for codegen/video-agent. No other route affected.
- `client/src/modules/admin/blog/BlogAssistant.jsx` (`PublishedPostsTab`
  only, per §3b) — new `HUMANIZE_TIMEOUT_MS` (180s) passed per-call
  instead of relying on the shared 60s axios default; new `withRetry()`
  helper (3 attempts, exponential backoff) wraps `openHumanize`,
  `saveHumanize`, and both calls inside `runBulkHumanize`; the bulk
  loop's catch block now logs the real error per failed post instead of
  a bare `failed++`.
- `server/routes/admin-blog.js` — new `humanizeParagraphsChunked()`
  helper (groups of 6 paragraphs per OpenAI call, each chunk's
  `§§P<n>§§` markers scoped locally so a bad chunk fails independently,
  never guesses). `POST /humanize/:id` and the `/generate` auto-humanize
  hook now call this instead of `contentStudio.humanize()` directly.
  Response shape unchanged except `analysis`/`improvements` (unused by
  the UI) are dropped since they don't merge meaningfully across
  chunks.

## Risks

- Chunked scores (`beforeHumanization`, `afterHumanization`, etc.) are
  now an average across chunks rather than one holistic pass — fine for
  the AI-likelihood-estimate badge, but not a single coherent
  assessment for very long posts.
- Retry-with-backoff on the client means a genuinely failing post now
  takes longer (up to ~3x, plus 2s/4s backoff) before showing as failed
  in the bulk run, versus failing fast before.
- Still no live confirmation that timeout was the failure mode for all
  14 posts — this fix addresses every plausible cause raised (timeout,
  no retry, no chunking) but isn't verified against actual Render error
  text.

## Verification

`node --check` on all touched server files after each unit; `npm run
build` (vite) on the client after unit 1 (BlogAssistant.jsx). No
`.env`/live-credential access — no live OpenAI/Supabase calls made
during this batch. Retrying the 14 failed posts and confirming DB
persistence is a live production action left to the user (Published
Posts → "Humanize All (14)").
