# AWE-OS — Full System Audit & Fixes Summary

**Date:** 2026-05-04  
**Engineer:** Principal Software Architect / SRE Audit  
**Scope:** Complete server codebase — all agents, crons, services, middleware, routes

---

## PHASE 1 — CRITICAL (Production-Breaking)

### CRITICAL-01 — Autonomous Pipeline Broken: Wrong Module Import
**File:** `server/agents/autonomous-agent.js:5`  
**Root cause:** `testing-agent.js` was deleted and replaced with `testing-agent.core.js`, but the import was never updated. Every autonomous run that attempted to test an idea-status tool would throw `MODULE_NOT_FOUND` and crash the entire batch.  
**Fix:** Changed `require('./testing-agent')` → `require('./testing-agent.core')`

---

### CRITICAL-02 — Supabase Service Role Key Leaked to Logs
**File:** `server/db/supabase.js:4-6`  
**Root cause:** Three debug `console.log` lines printed `SUPABASE_URL` and the first 20 characters of `SUPABASE_SERVICE_ROLE_KEY` to stdout on every server startup. Any log aggregator (Vercel, Railway, Datadog) would permanently store this sensitive fragment.  
**Fix:** Removed all debug log lines. Replaced the entire file with a clean, minimal Supabase client initialization with no credential exposure.  
**Action required:** Rotate your `SUPABASE_SERVICE_ROLE_KEY` in Supabase dashboard since it was logged to stdout.

---

### CRITICAL-03 — Four Cron Jobs Never Started
**File:** `server/index.js:36-41`  
**Root cause:**  
- `autonomous.cron.js` exports `startAutonomousCron()` with "no top-level side effects", but `index.js` only did `require('./jobs/autonomous.cron')` without calling the function.  
- `idea.cron.js` — same pattern, never started.  
- `marketing.cron.js` — not even `require`d in `index.js` at all.  
- `testing.cron.js` — not even `require`d in `index.js` at all.  

**Impact:** The entire autonomous AI factory, idea generation, marketing content, and tool testing pipelines were completely non-functional.  
**Fix:** Changed bare `require()` calls to proper import + invocation pattern in `app.listen` callback:
```js
const { startAutonomousCron } = require('./jobs/autonomous.cron');
const { startIdeaCron }       = require('./jobs/idea.cron');
const { startMarketingCrons } = require('./jobs/marketing.cron');
const { startTestingCron }    = require('./jobs/testing.cron');
// ... inside app.listen callback:
startAutonomousCron();
startIdeaCron();
startMarketingCrons();
startTestingCron();
```

---

### CRITICAL-04 — `isRunning` Lock Permanently Stuck on Unexpected Exception
**File:** `server/agents/autonomous-agent.js:395-513`  
**Root cause:** `isRunning = true` was set before the `try/finally` block. If `getRunsToday()` or `createRunRecord()` threw an unexpected exception, the `finally` block was never reached, leaving `isRunning = true` permanently. The autonomous agent would then skip every subsequent cron fire (every 6 hours).  
**Fix:** Restructured the entire function body into a single `try { ... } finally { isRunning = false; }` block, ensuring the lock is always released regardless of which code path exits.

---

### CRITICAL-05 — SIGTERM Handler Calls `process.exit(1)` After Clean Shutdown
**File:** `server/index.js:173-176`  
**Root cause:** A raw `setTimeout(() => process.exit(1), 10_000)` was set but never cleared. Even when `server.close()` succeeded and called `process.exit(0)`, the timeout would fire 10 seconds later with exit code 1, triggering restart loops in PM2/systemd.  
**Fix:** Added `forceExit.unref()` and `clearTimeout(forceExit)` inside the `server.close()` success callback.

---

## PHASE 2 — MAJOR (Feature-Breaking)

### MAJOR-01 — Marketing Pipeline: Wrong Tool Status Filter
**File:** `server/jobs/marketing.cron.js:98`  
**Root cause:** `fetchActiveTools()` queried `.eq('status', 'active')`. The tool lifecycle in this codebase uses `'live'` as the published status — `'active'` does not exist. Every marketing run fetched 0 tools, meaning no blog posts or newsletters were ever generated.  
**Fix:** Changed `.eq('status', 'active')` → `.eq('status', 'live')`

---

### MAJOR-02 — Password Reset: Email Never Sent
**File:** `server/routes/auth.js:127-162`  
**Root cause:** The reset token was generated and stored in the DB, but the email link was assigned to a variable and then discarded with `void resetLink`. There was also no `/reset-password` route to consume the token.  
**Fix:**  
1. Added Resend email integration with clear fallback logging when `RESEND_API_KEY` is not configured.  
2. In development, the reset link is printed to console.  
3. Added a new `POST /api/auth/reset-password` route that validates the token, checks expiry, updates the password, and clears the token.  
4. Applied `resetLimiter` (5 attempts/hour) to both `/forgot-password` and `/reset-password`.

---

### MAJOR-03 — `getDebugStrategy()` Ignores Score Parameter
**File:** `server/services/debug-strategy-engine.js:3-9`  
**Root cause:** The function accepted `score` as a parameter but never used it. All `UNKNOWN` error-type tools always received `'optimize_fix'` regardless of their actual quality score.  
**Fix:** Added score-based branching for `UNKNOWN` errors: score < 30 → `rebuild_full`, score < 60 → `optimize_fix`, else → `sanitize_and_retry`.

---

### MAJOR-04 — Debug Agent: No Row Limit on `fetchAndLockTools`
**File:** `server/agents/auto-debug-agent.js:80-112`  
**Root cause:** No `.limit()` on the bulk update. With many failed tools, all of them could be locked to `debugging` simultaneously, causing the agent to run for hours sequentially.  
**Fix:** Added `const DEBUG_BATCH_SIZE = 20` and `.limit(DEBUG_BATCH_SIZE)`.

---

### MAJOR-05 — Debug Agent: Blocking In-Process Sleep (up to 30s per tool)
**File:** `server/agents/auto-debug-agent.js:282-290`  
**Root cause:** `await sleep(retry.delayMs)` was called inside the tool processing loop. With exponential backoff up to 30 seconds and a 20-tool batch, the agent could block for up to 600 seconds.  
**Fix:** Moved backoff scheduling to the database: added `next_retry_at` timestamp to the `tools` table update, and the `fetchAndLockTools` query filters `.or('next_retry_at.is.null,next_retry_at.lte.NOW()')` to skip tools still in their backoff window. The `sleep()` helper was removed entirely.

---

### MAJOR-06 — Admin Middleware: No Guard on `req.user`
**File:** `server/middleware/admin.middleware.js:8`  
**Root cause:** `req.user.userId` was accessed without first checking that `req.user` exists. If `requireAdmin` was called without `requireAuth`, this would throw an unhandled TypeError and return 500 instead of 401.  
**Fix:** Added `if (!req.user?.userId) return res.status(401).json(...)` guard before the DB query.

---

## PHASE 3 — SECURITY

### SEC-01 — No Rate Limiting on Admin Routes
**File:** `server/index.js:127`  
**Fix:** Added `adminLimiter` (60 req / 15 min) to `app.use('/api/admin', adminLimiter, adminRoutes)`.

### SEC-02 — No Rate Limiting on Password Reset Endpoints
**File:** `server/routes/auth.js`  
**Fix:** Added `resetLimiter` (5 req / 1 hour) applied to both `/forgot-password` and `/reset-password`.

### SEC-03 — Prompt Injection in AI Factory
**File:** `server/services/ai-factory.service.js`  
**Root cause:** `category` and `idea` from user input were interpolated directly into OpenAI prompts without sanitization.  
**Fix:** Added `sanitizeForPrompt(value, maxLength)` that strips backticks, backslashes, newlines, and truncates to a safe length. Applied to all user-controlled inputs before prompt construction.

### SEC-04 — `parseJSONResponse` Only Stripped One Fence Layer
**File:** `server/services/ai.service.js`  
**Root cause:** The regex only matched `^```...^```$`. Any text before or after the fence block caused a parse failure.  
**Fix:** Rewrote with a three-attempt extraction strategy: (1) match fenced block, (2) direct parse of candidate, (3) find first `{` or `[` and parse from there. Removed mixed-language comments (`// YAHAN LOG ADD KIYA`).

---

## PHASE 4 — PERFORMANCE

### PERF-01 — Analytics Cron: Unbounded Table Scan
**File:** `server/jobs/analytics.cron.js:85-99`  
**Root cause:** `fetchEventsForTools()` fetched all `tool_viewed`/`tool_used` events ever recorded with no date range filter. As the platform grows, this becomes a full table scan at midnight.  
**Fix:** Added 30-day time window: `.gte('created_at', thirtyDaysAgo)`.

### PERF-02 — AI Factory: No Retry on Transient Failures
**File:** `server/services/ai-factory.service.js`  
**Root cause:** Single `callOpenAI()` call. Rate limit (429), timeout, or network error caused the entire factory job to fail immediately.  
**Fix:** Added `callWithRetry()` with exponential backoff (2s, 4s, 8s + jitter) for 429 and timeout errors. Applied to both `generateToolConfig` and `generateToolIdeas`.

---

## PHASE 5 — AI SYSTEM & MONITORING

### AI-01 — Missing Supabase RPCs for Learning Engine
**File:** New: `server/db/migrations/004_learning_rpcs_and_cron_health.sql`  
**Root cause:** `performance-tracker.js` called `supabase.rpc('increment_tool_success')` and `supabase.rpc('increment_tool_failure')` but these RPCs did not exist in any schema file. Every learning tracking call silently returned `{ tracked: false }`.  
**Fix:** Created both RPCs using `CREATE OR REPLACE FUNCTION` with running-average score calculation. Added `next_retry_at` column. Ensured all learning columns (`success_count`, `failure_count`, `avg_score`, `best_strategy`, `last_used_at`, `debug_meta`, `saas_tool_id`) exist on the `tools` table.

### AI-02 — Cron Health Monitoring: No Visibility into Missed Runs
**File:** New: `server/services/cron-health.js`, `server/db/migrations/004_learning_rpcs_and_cron_health.sql`  
**Root cause:** No mechanism existed to detect when a cron job silently stopped running.  
**Fix:**  
- Created `cron_health` table to track last run, status, and error for every cron job.  
- Created `record_cron_run()` Supabase RPC.  
- Created `cron-health.js` service with `recordCronRun()` and `checkCronHealth()` functions.  
- Wired `recordCronRun` into analytics cron and autonomous cron.  
- `checkCronHealth()` runs inside the health cron every 30 minutes and logs OVERDUE alerts if any cron has missed 2× its expected interval.  
- Pre-seeded all 13 known cron job names into `cron_health` so "never ran" state is detectable.

---

## GENERAL HOUSEKEEPING

### ENV-01 — `.env.example` Was Deleted, Not Recreated
**File:** New: `server/.env.example`  
**Fix:** Recreated with placeholder values and documentation for all 17 required/optional environment variables including the new `RESEND_API_KEY` and `EMAIL_FROM`.

### ENV-02 — Required ENV Check Was Non-Fatal
**File:** `server/index.js:47-52`  
**Root cause:** Missing required ENV vars only printed a `console.warn`. The server would continue starting and crash at first DB/API call.  
**Fix:** Changed to `process.exit(1)` on missing required vars. Moved `RAZORPAY_*` keys to optional (warns but doesn't crash, allowing payment-free development).

---

## ACTION REQUIRED (Manual Steps)

These changes cannot be applied automatically — you must do them:

1. **Rotate `SUPABASE_SERVICE_ROLE_KEY`** — It was logged to stdout for every server startup. Go to Supabase dashboard → Settings → API → Regenerate service role key, then update `.env`.

2. **Run migration `004`** in Supabase SQL editor:  
   Copy `server/db/migrations/004_learning_rpcs_and_cron_health.sql` and execute in Supabase → SQL Editor.

3. **Configure email** for password reset — add `RESEND_API_KEY` and `EMAIL_FROM` to `.env`. Sign up at resend.com (free tier available).

4. **Consider rotating** your AWS credentials, OpenAI API key, and Razorpay keys — not because they were committed to git (`.gitignore` correctly excludes `.env`), but as a precaution if your server logs have ever been shared or aggregated.

---

## FILES CHANGED

| File | Change |
|---|---|
| `server/db/supabase.js` | Removed credential debug logs |
| `server/agents/autonomous-agent.js` | Fixed import path + lock/finally restructure |
| `server/index.js` | Fixed cron registration, SIGTERM, rate limiters, ENV check |
| `server/jobs/autonomous.cron.js` | Added cron health recording |
| `server/jobs/analytics.cron.js` | Added 30-day time window + cron health recording |
| `server/jobs/marketing.cron.js` | Fixed `status='active'` → `status='live'` |
| `server/jobs/health.cron.js` | Added cron health monitoring + overdue detection |
| `server/routes/auth.js` | Added `/reset-password` route + Resend integration + rate limiting |
| `server/middleware/admin.middleware.js` | Added `req.user` null guard |
| `server/services/debug-strategy-engine.js` | Fixed score-based strategy selection |
| `server/services/retry-controller.js` | Added `nextRetryAt` timestamp field |
| `server/services/ai-factory.service.js` | Added prompt sanitization + retry logic |
| `server/services/ai.service.js` | Improved `parseJSONResponse` robustness |
| `server/agents/auto-debug-agent.js` | Added batch limit, removed blocking sleep, added `next_retry_at` |
| `server/db/migrations/004_learning_rpcs_and_cron_health.sql` | New: RPCs + cron health table |
| `server/services/cron-health.js` | New: cron health recording service |
| `server/.env.example` | Recreated with all required/optional vars documented |
| `FIXES_SUMMARY.md` | This file |
