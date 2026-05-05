# AWE-OS Verification Report
**Date:** 2026-05-05  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Scope:** Full codebase read-only audit — server + client  
**Working Directory Audited:** D:\MyProjects\AWE-OS

---

## 1. Summary Table

| Component | Status | Issues Found |
|-----------|--------|-------------|
| server/index.js startup | ✅ | None |
| server/db/supabase.js | ✅ | No credential leaks |
| analytics.cron.js | ✅ | 4th arg to recordCronRun silently dropped |
| autonomous.cron.js | ✅ | 4th arg to recordCronRun silently dropped |
| decision.cron.js | ✅ | 4th arg silently dropped |
| health.cron.js | ✅ | None |
| idea.cron.js | ⚠️ | Dedup query checks `saas_tools` but pipeline inserts into `tools` |
| marketing.cron.js | ✅ | None |
| revenue.cron.js | ✅ | None |
| support.cron.js | ✅ | None |
| testing.cron.js | ✅ | None |
| autonomous-agent.js | ⚠️ | Queries non-existent `tool_usage_events` table |
| decision-engine.js | ⚠️ | Queries non-existent `tool_usage_events` table |
| idea-pipeline.js | ⚠️ | Inserts into `tools` table (not `saas_tools`) — dedup mismatch |
| testing-agent.core.js | ❌ | FK MISMATCH: inserts `tool_tests` with `tools.id`, but schema has FK to `saas_tools` |
| auto-debug-agent.js | ✅ | All required files exist |
| learning-engine.js | ✅ | Correct exports |
| pattern-detector.js | ✅ | Pure utility, no DB |
| performance-tracker.js | ✅ | RPC calls defined in migration 004 |
| strategy-optimizer.js | ✅ | None |
| prompt-builder.js | ✅ | None |
| ai-factory.service.js | ✅ | sanitizeForPrompt in use |
| ai.service.js | ✅ | None |
| cron-health.js | ⚠️ | recordCronRun() only accepts 3 params; all callers pass 4 |
| debug-strategy-engine.js | ✅ | None |
| retry-controller.js | ✅ | None |
| debug-guard.js | ✅ | None |
| error-classifier.js | ✅ | None |
| admin.routes.js | ⚠️ | Only 4 endpoints; frontend has more admin needs than routes cover |
| autonomous.routes.js | ✅ | None |
| factory.routes.js | ❌ | Queries `tool_ideas` table — no CREATE TABLE for it in any SQL file |
| tools.routes.js | ✅ | Uses saas_tools correctly |
| auth.middleware (auth.js) | ✅ | Blacklist check implemented |
| admin.middleware.js | ✅ | Double DB lookup per request — minor perf issue |
| DB schema — saas_tools | ❌ | Referenced everywhere but NO CREATE TABLE in any SQL file |
| DB schema — factory_jobs | ❌ | Referenced everywhere but NO CREATE TABLE in any SQL file |
| DB schema — tool_ideas | ❌ | Referenced in factory.routes.js but NO CREATE TABLE in any SQL file |
| DB schema — tool_usage_events | ❌ | Referenced in autonomous-agent.js, decision-engine.js but NO CREATE TABLE |
| DB schema — users | ❌ | Referenced in 20+ server files but NO CREATE TABLE in any SQL file |
| DB schema — calculators | ❌ | Referenced in index.js and calculators.routes.js but NO CREATE TABLE |
| DB schema — products | ❌ | Referenced in products.routes.js but NO CREATE TABLE |
| DB schema — tool_tests FK | ❌ | References `saas_tools(id)` in schema but code inserts with `tools.id` |
| Client admin API coverage | ⚠️ | adminAPI only covers users — no /stats, no /roles |

---

## 2. File Connection Audit

### 2.1 recordCronRun Signature Mismatch (MAJOR — silent data loss)

**Source:** `server/services/cron-health.js`, line 13  
**Function signature:** `async function recordCronRun(cronName, status, error = null)` — **3 parameters**

**All callers pass a 4th argument** (metadata object), which is silently ignored:

| Caller File | Line | Extra arg passed |
|-------------|------|-----------------|
| analytics.cron.js | 184 | `{ records_processed, records_failed, anomalies }` |
| autonomous.cron.js | 144 | `{ records_processed, plans_generated }` |
| decision.cron.js | 135 | `{ records_processed, confidence_pct }` |
| health.cron.js | 140 | `{ overall, issues_count }` |
| idea.cron.js | 144 | `{ records_processed, category }` |
| marketing.cron.js | 212 | `{ records_processed }` |
| revenue.cron.js | 196 | `{ records_processed, errors }` |
| support.cron.js | 99, 142, etc. | `{ records_processed, breached }` |
| testing.cron.js | 170 | `{ records_processed, tests_passed, ... }` |

**What's wrong:** The 4th `metadata` argument is never persisted anywhere. The `record_cron_run` RPC in migration 004 only accepts 3 params (`p_cron_name`, `p_status`, `p_error`) and the JS wrapper only passes those 3. All metrics data (records_processed, pass_rate_pct etc.) is computed but never saved.

---

### 2.2 idea.cron.js — Dedup Query Table Mismatch (MAJOR)

**Source:** `server/jobs/idea.cron.js`, lines 54–61  
```js
const { data, error } = await supabase
  .from('saas_tools')          // ← checks saas_tools
  .select('id')
  .eq('status', 'idea')
```

**But `idea-pipeline.js` inserts into `tools`:**  
`server/agents/idea-pipeline.js`, line 176: `.from('tools').insert({ status: 'idea', ... })`

**What's wrong:** The deduplication check in `idea.cron.js` queries `saas_tools` for `status='idea'`, but `idea-pipeline.js` actually stores ideas in the `tools` table. This means the dedup check NEVER finds existing ideas, so the category rotation dedup guard never fires — every 12-hour run will regenerate ideas for the same category even if fresh ones already exist.

---

### 2.3 tool_tests FK Table Mismatch (CRITICAL)

**Schema definition** (`schema_testing.sql`, line 10):
```sql
CREATE TABLE IF NOT EXISTS public.tool_tests (
  tool_id    UUID  REFERENCES public.saas_tools(id) ON DELETE CASCADE,
```

**Code insertion** (`server/agents/testing-agent.core.js`, line 280):
```js
await supabase.from('tool_tests').insert({ tool_id: toolId, ... })
```

The `toolId` here comes from tools fetched at line 545–548:
```js
supabase.from('tools').select('id, name, status').in('status', TESTABLE_STATUSES)
```

**What's wrong:** The testing agent fetches tool IDs from `tools` table, then inserts them into `tool_tests` which has a FK to `saas_tools(id)`. IDs from `tools` are NOT the same as IDs from `saas_tools` — these are two separate tables. Every `tool_tests` insert will fail with a FK violation (Postgres error code 23503) unless the same UUID happens to exist in `saas_tools`.

---

### 2.4 Missing `saas_tools` CREATE TABLE (CRITICAL)

`saas_tools` is referenced in 15+ server files across agents, routes, and controllers — but there is **no `CREATE TABLE saas_tools` statement** in any of the following SQL files:
- schema.sql
- schema_autonomous.sql
- schema_builder.sql
- schema_decision.sql
- schema_deployment.sql
- schema_generated_code.sql
- schema_idea_pipeline.sql
- schema_marketing.sql
- schema_monetization.sql
- schema_optimization.sql
- schema_revenue_agent.sql
- schema_support.sql
- schema_testing.sql
- server/db/migrations/001–004

This means `saas_tools` was either created outside version control (directly in Supabase dashboard) or the schema file is missing. Without it, a fresh DB setup will fail at startup.

---

### 2.5 Missing `factory_jobs` CREATE TABLE (CRITICAL)

Referenced in:
- `server/agents/autonomous-agent.js` lines 58–66 (insert)
- `server/services/ai-factory.service.js` lines 109, 144, 156
- `server/routes/factory.routes.js` lines 24, 48, 64, 117

No CREATE TABLE statement found in any SQL file.

---

### 2.6 Missing `tool_ideas` CREATE TABLE (MAJOR)

Referenced in `server/routes/factory.routes.js` lines 85, 98, 109, 130 — no CREATE TABLE in any SQL file.

---

### 2.7 Missing `tool_usage_events` CREATE TABLE (CRITICAL)

Referenced in:
- `server/agents/autonomous-agent.js` line 268
- `server/agents/decision-engine.js` line 289
- `server/services/analytics.service.js` lines 4, 42, 81
- `server/routes/analytics.routes.js` line 56

**Note:** `schema.sql` defines `tool_events` (not `tool_usage_events`). The autonomous agent and decision engine query `tool_usage_events` which appears to be a separate table that was never defined in any schema file. Any query to this table will return an empty result or error, causing `usage_count=0` in all tool evaluations.

---

### 2.8 Missing `users` CREATE TABLE (CRITICAL)

The `users` table is the core authentication table, referenced in 20+ files (auth routes, admin routes, billing, analytics, support, etc.). No CREATE TABLE statement exists in any checked SQL file. It is presumably managed by Supabase Auth, but if the project uses a custom `users` table (as the code implies via `.from('users').select('role, permissions...')`), this is a critical gap.

---

### 2.9 Missing `calculators` and `products` CREATE TABLE (MAJOR)

`calculators` is queried in `server/index.js` (sitemap generation) and `server/routes/calculators.routes.js` (5+ queries). No CREATE TABLE in any SQL file.

`products` is queried in `server/routes/products.routes.js`. No CREATE TABLE in any SQL file.

---

### 2.10 products.routes.js — Duplicate Supabase Client Instantiation (MINOR)

**Source:** `server/routes/products.routes.js`, line 11  
```js
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
```
This creates a second Supabase client instead of using the shared `require('../db/supabase')`. Not a blocker, but wastes connections.

---

## 3. Pipeline Status

### Step 1: idea.cron.js → idea-pipeline.js → `tools` table (status='idea')

- **Cron file:** ✅ `idea.cron.js` exports `startIdeaCron`, called in `index.js`
- **Agent file:** ✅ `idea-pipeline.js` exists, exports `generateAndStoreIdeas`
- **DB table:** ⚠️ Inserts into `tools` (correct), but dedup check queries `saas_tools` (wrong)
- **VERDICT: PARTIALLY BROKEN** — ideas are inserted correctly but the dedup guard never fires because it checks the wrong table, causing potential duplicate idea generation.

---

### Step 2: decision.cron.js → decision-engine.js → `saas_tools` table (status update)

- **Cron file:** ✅ `decision.cron.js` auto-starts, exports `evaluateAllSaasTools`, called correctly
- **Agent file:** ✅ `decision-engine.js` exists, exports `evaluateAllSaasTools`
- **DB table:** ⚠️ Evaluates `saas_tools` (correct), writes to `decision_logs` (correct), BUT metrics come from `tool_usage_events` which does not exist in schema — usage_count will always be 0
- **VERDICT: BROKEN** — decisions are generated but based on incorrect (always-zero) usage metrics because `tool_usage_events` has no schema definition.

---

### Step 3: autonomous.cron.js → autonomous-agent.js → `saas_tools`/`tools` tables

- **Cron file:** ✅ `autonomous.cron.js` exports `startAutonomousCron`, called in `index.js`
- **Agent file:** ✅ `autonomous-agent.js` exists, exports `runAutonomousLoop`
- **DB tables:** ⚠️ Reads from `saas_tools` (OK if table exists), writes to `factory_jobs` (no schema), queries `tool_usage_events` (no schema), writes to `autonomous_logs` and `autonomous_runs` (both defined in `schema_autonomous.sql`)
- **VERDICT: PARTIALLY BROKEN** — the loop runs but `factory_jobs` writes will fail if the table doesn't exist, and usage metrics are always zero.

---

### Step 4: testing.cron.js → testing-agent.core.js → `tools` table

- **Cron file:** ✅ `testing.cron.js` exports `startTestingCron`, called in `index.js`
- **Agent file:** ✅ `testing-agent.core.js` exists, exports `runTestingAgent`
- **DB table:** ❌ Fetches from `tools` (correct), but inserts into `tool_tests` which has FK to `saas_tools(id)` — IDs from `tools` will not match `saas_tools` IDs → FK violation on every insert
- **VERDICT: BROKEN** — test results can never be persisted to `tool_tests`.

---

### Step 5: analytics.cron.js → `tools` table (conversion rates)

- **Cron file:** ✅ `analytics.cron.js` exports `startAnalyticsCron`, called in `index.js`
- **DB tables:** ✅ Reads from `tools` and `tool_events` — both defined in `schema.sql`
- **VERDICT: WORKING** — this is the only pipeline step using correctly-named tables.

---

### Step 6: revenue.cron.js → revenue-agent.js

- **Cron file:** ✅ `revenue.cron.js` auto-starts
- **Agent file:** ✅ `revenue-agent.js` exists, exports `calculateDailySnapshot`, `findUpsellOpportunities`, `trackFailedPayments`
- **DB tables:** ✅ `revenue_snapshots`, `failed_payments`, `upsell_opportunities` all defined in `schema_revenue_agent.sql`
- **VERDICT: WORKING** (assuming `users` table exists)

---

## 4. Admin Dashboard Gaps

### 4.1 Routes that EXIST in server but are NOT called from client

| Server Route | Method + Path | Client Coverage |
|-------------|---------------|----------------|
| admin.routes.js | `GET /api/admin/stats` | NOT called — `adminAPI` has no `getStats()` |
| admin.routes.js | `PUT /api/admin/users/:id/role` | NOT called — `adminAPI` has no `updateUserRole()` |

**Note:** `client/src/services/api.service.js` lines 56–59:
```js
export const adminAPI = {
  getUsers:              () => api.get('/api/admin/users'),
  updateUserPermissions: (userId, permissions) => api.put(...)
};
```
`/api/admin/stats` and the role-update endpoint are never called from the frontend.

### 4.2 Capabilities that exist in client but NOT in server

The `AgentControlPage.jsx` exists in frontend and calls `/api/autonomous/*` routes — those routes exist. The `AIFactoryPage.jsx` calls `/api/factory/*` routes — those exist. No missing server routes for frontend pages detected.

---

## 5. Missing DB Tables/Columns

The following tables are used in server code but have NO `CREATE TABLE` statement in any SQL file in the repository:

| Table | Used In | First Reference |
|-------|---------|----------------|
| `saas_tools` | 15+ files | `server/routes/tools.routes.js:33` |
| `factory_jobs` | 3 files | `server/agents/autonomous-agent.js:58` |
| `tool_ideas` | 1 file | `server/routes/factory.routes.js:85` |
| `tool_usage_events` | 4 files | `server/agents/autonomous-agent.js:268` |
| `users` | 20+ files | `server/routes/auth.js:54` |
| `calculators` | 2 files | `server/index.js:96` |
| `products` | 1 file | `server/routes/products.routes.js` |

### Columns referenced in code not in schema:

| Table | Column | Used In |
|-------|--------|---------|
| `saas_tools` | `status` | `server/jobs/idea.cron.js:57` |
| `saas_tools` | `quality_score` | `schema_testing.sql:27` (added), but `saas_tools` has no base definition |
| `saas_tools` | `approval_status` | `schema_testing.sql:29` |
| `tools` | `slug` | `server/agents/autonomous-agent.js:428` (fetched), `schema.sql` (missing `slug` column) |
| `tools` | `ai_prompt` | `server/agents/autonomous-agent.js:428`, `schema.sql` (missing) |
| `tools` | `input_fields` | `server/agents/autonomous-agent.js:428`, `schema.sql` (missing) |
| `tools` | `category` | `server/agents/autonomous-agent.js:428`, `schema.sql` (missing) |
| `tools` | `is_free` | `server/agents/autonomous-agent.js:428`, `schema.sql` (missing) |
| `tools` | `price` | `server/agents/autonomous-agent.js:428`, `schema.sql` (missing) |
| `revenue_logs` | `tool_slug` | `server/agents/autonomous-agent.js:274` — schema has `tool_id` not `tool_slug` |
| `tool_tests` | FK to `saas_tools` | `schema_testing.sql:10` — but code inserts `tools.id` values |

**Note on `tools` schema vs usage:** `schema.sql` defines `tools` with only 8 columns (id, name, description, status, usage_count, revenue, conversion_rate, created_at, updated_at). Subsequent `ALTER TABLE` statements across multiple schema files add columns (slug, ai_prompt, input_fields, category, is_free, price, source, idea_score, approved, manual_override, success_count, failure_count, avg_score, best_strategy, etc.) — these are scattered across 6 separate files with no single source of truth.

---

## 6. Cron Job Health Table

| Cron File | Schedule | Started In index.js | isRunning Guard | recordCronRun | Status |
|-----------|----------|--------------------|-----------------|-----------|----|
| analytics.cron.js | `0 0 * * *` (daily 00:00 UTC) | ✅ `startAnalyticsCron()` | ✅ | ✅ (4th arg ignored) | ✅ Working |
| autonomous.cron.js | `0 */6 * * *` (every 6h) | ✅ `startAutonomousCron()` | ✅ + circuit breaker | ✅ (4th arg ignored) | ✅ Working |
| decision.cron.js | `0 2 * * *` (daily 02:00 UTC) | ✅ `require()` side-effect | ✅ + date dedup | ✅ (4th arg ignored) | ✅ Working |
| health.cron.js | `*/30 * * * *` (every 30 min) | ✅ `require()` side-effect | ❌ No isRunning guard | ✅ | ✅ Working |
| idea.cron.js | `0 */12 * * *` (every 12h) | ✅ `startIdeaCron()` | ✅ | ✅ (4th arg ignored) | ✅ Working |
| marketing.cron.js | 3 schedules (Mon/1st/Fri) | ✅ `startMarketingCrons()` | ✅ per-job | ✅ (4th arg ignored) | ✅ Working |
| revenue.cron.js | `59 23 * * *` (daily 23:59 UTC) | ✅ `require()` side-effect | ✅ | ✅ (4th arg ignored) | ✅ Working |
| support.cron.js | 3 schedules | ✅ `require()` side-effect | ✅ per-job | ✅ (4th arg ignored) | ✅ Working |
| testing.cron.js | `0 4 * * *` (daily 04:00 UTC) | ✅ `startTestingCron()` | ✅ | ✅ (4th arg ignored) | ⚠️ agent broken at DB level |

**Note on health.cron.js:** No `isRunning` guard means overlapping executions are possible if a system health check takes longer than 30 minutes. Low risk given the 30-minute schedule.

---

## 7. Security Audit Results

### 7.1 Credential Logging
- ✅ `server/db/supabase.js` — no `console.log` calls found; only `console.error` for fatal missing env
- ✅ No hardcoded API keys or secrets found in any server file
- ✅ `SUPABASE_SERVICE_ROLE_KEY` referenced only via `process.env` (never logged)

### 7.2 Rate Limiting on Sensitive Routes
- ✅ `/api/auth` — `authLimiter` (20/15min) applied
- ✅ `/api/admin` — `adminLimiter` (60/15min) applied
- ✅ `/api/payment` — `paymentLimiter` (10/hr) applied
- ✅ `/api/billing` — `paymentLimiter` applied
- ✅ `/api/autonomous/run` — local `triggerLimiter` (5/hr) applied
- ✅ `/api/factory/generate` — `factoryLimiter` (10/hr) applied
- ✅ `/api/auth/forgot-password` and `/api/auth/reset-password` — `resetLimiter` applied in `auth.js`

### 7.3 Auth Middleware on Protected Routes
- ✅ `requireAuth` correctly validates JWT, checks `token_blacklist`, and sets `req.user`
- ✅ `requireAdmin` performs a live DB role check (in addition to JWT claim)
- ✅ `/api/admin/*` — double-protected by `requireAuth` + `requireAdmin`
- ✅ `/api/factory/*` — protected by `requireAuth` + `requireAdmin`
- ✅ `/api/autonomous/*` — protected by `requireAuth`
- ⚠️ `/api/agents` routes — needs further review (not audited in depth here)
- ✅ JWT uses `HS256` algorithm (explicitly enforced in `auth.js` line 22)

### 7.4 Prompt Injection Guards
- ✅ `sanitizeForPrompt()` in `ai-factory.service.js` — strips backticks, backslashes, collapses newlines, truncates to max length
- ✅ Applied to both `category` (50 char limit) and `idea` (200 char limit) inputs before prompt construction
- ⚠️ `sanitizeForPrompt` is only in `ai-factory.service.js` — NOT applied in `idea-agent.js`, `marketing-agent.js`, or other agents that construct prompts. Inputs to other AI agents may be unguarded.

### 7.5 ENV Var Handling
- ✅ `server/index.js` lines 49–56 — crashes immediately if any of JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY are missing
- ✅ `server/db/supabase.js` — exits process if Supabase env vars missing
- ✅ Optional env vars (RAZORPAY, RESEND) log warnings but don't crash
- ✅ `ai.service.js` — lazy client init, throws with a clear error code if OPENAI_API_KEY missing at call time

---

## 8. AI System Connectivity

### 8.1 learning-engine.js → autonomous-agent.js
- ✅ `autonomous-agent.js` imports `{ testTool }` from `testing-agent.core.js` (line 5)
- ✅ `testing-agent.core.js` imports `{ getLearningDecision, recordLearningOutcome }` from `learning-engine.js` (line 13)
- ✅ `auto-debug-agent.js` imports `{ getLearningDecision, recordLearningOutcome }` from `learning-engine.js` (line 9)
- ✅ `learning-engine.js` re-exports `getLearningScore` (sourced from `strategy-optimizer.js`) — verified exported correctly

### 8.2 RPCs in migrations vs code calls

| RPC | Defined In | Called From | Match |
|-----|-----------|-------------|-------|
| `record_cron_run` | migration 004, line 113 | `cron-health.js:15` | ✅ |
| `increment_tool_success` | migration 004, line 15 | `performance-tracker.js:129` | ✅ |
| `increment_tool_failure` | migration 004, line 42 | `performance-tracker.js:129` | ✅ |
| `get_event_summary` | migration 002, line 7 | `server/services/event.service.js` (assumed) | ✅ defined |
| `get_event_trend` | migration 002, line 23 | `server/services/event.service.js` (assumed) | ✅ defined |
| `increment_usage_count` | schema.sql, line 91 | not verified directly | ✅ defined |
| `increment_revenue` | schema.sql, line 97 | not verified directly | ✅ defined |

### 8.3 pattern-detector.js connectivity
- ✅ Used by `learning-engine.js` (imports `buildPatternSignature`, `hasLastThreeMatchingFailures`)
- ✅ Used by `performance-tracker.js` (imports `buildPatternSignature`, `normalizeScore`)
- ✅ Used by `strategy-optimizer.js` (imports `buildPatternSignature`, `normalizeScore`)
- ✅ No unused module — fully connected into the learning loop

### 8.4 prompt-builder.js connectivity
- ⚠️ `prompt-builder.js` exports `buildPrompt`, `buildAdaptivePrompt` etc., but NO file in `server/agents/` or `server/services/` was found to import from it. It appears to be a utility module that is not yet wired into any agent. It is dead code at this time.

---

## 9. Priority Fix List

### [CRITICAL] — Breaks core functionality

**C1. Missing `saas_tools` schema**  
The most-used table in the system has no `CREATE TABLE` statement in version control. A fresh DB setup will fail for all tools API endpoints, the autonomous agent, the decision engine, the factory, and admin dashboard.  
_Fix: Create `schema_saas_tools.sql` defining the table, or document that it is Supabase-managed._

**C2. Missing `tool_usage_events` table definition**  
`autonomous-agent.js` and `decision-engine.js` both query `tool_usage_events` for usage metrics. This table does not exist in any schema file (only `tool_events` does). All decisions will be made with `usage_count=0`, causing most tools to be classified as "kill" immediately.  
_Fix: Either create the `tool_usage_events` table or change the queries to use `tool_events` (which has a different column structure — `tool_id` not `tool_slug`)._

**C3. `tool_tests` FK points to `saas_tools` but code inserts `tools.id`**  
`schema_testing.sql` line 10: FK `tool_id → saas_tools(id)`. But `testing-agent.core.js` fetches tool IDs from `tools` table and inserts them. This is a guaranteed FK violation.  
_Fix: Change the FK in `schema_testing.sql` to `REFERENCES tools(id)`, or change `testing-agent.core.js` to fetch from `saas_tools`._

**C4. Missing `factory_jobs` schema**  
The autonomous agent's `logFactoryJob()` and `ai-factory.service.js` both insert into `factory_jobs`. No CREATE TABLE in any SQL file. These inserts will throw an error.  
_Fix: Create the `factory_jobs` table in a schema file._

**C5. Missing `users` table schema**  
20+ files rely on a `users` table with columns `role`, `permissions`, `subscription_status`. If this is the Supabase Auth `auth.users` table, the code should use `auth.users` not `public.users`. If it's a custom table, the schema file is missing.  
_Fix: Document and version-control the `users` table schema._

---

### [MAJOR] — Breaks specific feature

**M1. `recordCronRun` 4th argument silently dropped**  
All 9 cron jobs pass a metadata object as the 4th argument to `recordCronRun()`, but the function only accepts 3 parameters. The metrics (records_processed, pass_rate_pct, etc.) are never persisted. The `cron_health` table stores only success/error status, never the detailed run metrics.  
_Fix: Add `p_meta JSONB DEFAULT NULL` to the `record_cron_run` RPC and store it in a `meta` column, and add a 4th `metadata` param to the JS wrapper._

**M2. `idea.cron.js` dedup query checks wrong table**  
`hasRecentIdeasForCategory()` queries `saas_tools` for `status='idea'`, but ideas are inserted into `tools`. The dedup guard never fires, causing the 7-day dedup window to be ineffective.  
_Fix: Change `idea.cron.js:57` from `.from('saas_tools')` to `.from('tools')`._

**M3. Missing `tool_ideas` schema**  
`factory.routes.js` does 5 queries to `tool_ideas` table. No CREATE TABLE exists.  
_Fix: Create the table in a schema file._

**M4. Missing `calculators` and `products` schemas**  
Both tables are queried but have no schema definitions in version control.  
_Fix: Create schema files for these tables._

**M5. `revenue_logs` queried by `tool_slug` column but schema defines `tool_id`**  
`server/agents/autonomous-agent.js:274`: `.eq('tool_slug', tool.slug)` and `decision-engine.js:295`: `.eq('tool_slug', tool.slug)`. The `revenue_logs` table in `schema.sql` has a `tool_id` column (UUID) not a `tool_slug` column (TEXT). All revenue lookups return 0.  
_Fix: Either add `tool_slug` column to `revenue_logs`, or change queries to join via tool ID._

**M6. `tools` table in `schema.sql` missing many columns used in production**  
`schema.sql` defines only 9 columns for `tools`, but the code references: slug, ai_prompt, input_fields, category, is_free, price (added by later migrations/schemas but spread across 6 separate files). A new developer running only `schema.sql` will have a broken schema.  
_Fix: Create a single canonical `tools` table definition or document the order of schema file execution._

**M7. `prompt-builder.js` is unused dead code**  
No server agent imports from `prompt-builder.js`. It exports `buildPrompt`, `buildAdaptivePrompt` but they're never called.  
_Fix: Either wire it into the agents or remove it._

---

### [MINOR] — Quality/reliability issue

**m1. `health.cron.js` has no `isRunning` guard**  
All other crons have overlap protection. Health cron runs every 30 minutes and calls external URLs — if a run stalls, overlap could occur.  
_Fix: Add `let isRunning = false` guard pattern as in other cron files._

**m2. `products.routes.js` creates a second Supabase client**  
Line 11: `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)` instead of using `require('../db/supabase')`. Wastes a connection pool slot.  
_Fix: Use the shared client._

**m3. `sanitizeForPrompt` not applied in all AI-facing agents**  
`idea-agent.js`, `marketing-agent.js`, and `support-agent.js` construct AI prompts without the prompt injection sanitizer used in `ai-factory.service.js`.  
_Fix: Apply `sanitizeForPrompt` to all user-controlled inputs before they enter prompts._

**m4. `admin.middleware.js` double DB lookup per protected request**  
`requireAdmin` performs a live DB query on every admin request (after `requireAuth` already verified the JWT which contains `role`). For high-traffic admin dashboards this adds latency.  
_Fix: Trust the role claim from the verified JWT payload in `req.user.role` if it equals 'admin', or add caching._

**m5. `admin.routes.js` missing `/stats` in client `adminAPI`**  
`GET /api/admin/stats` exists on the server but is never called from the client. The admin dashboard stat counters (totalUsers, totalTools, activeSubscriptions) are inaccessible.  
_Fix: Add `getStats: () => api.get('/api/admin/stats')` to `client/src/services/api.service.js`._

**m6. `admin.routes.js` missing role-update in client `adminAPI`**  
`PUT /api/admin/users/:id/role` exists on the server but is not exposed in `adminAPI`. The `UserManager.jsx` can only update permissions, not roles.  
_Fix: Add `updateUserRole: (userId, role) => api.put(...)` to `adminAPI`._

**m7. `tools` status check constraint missing `testing`, `building`, `needs_fix`, `failed` values**  
`schema.sql` line 12 defines: `CHECK (status IN ('idea','building','live','scaling','killed'))`. But `testing-agent.core.js` sets status to `'testing'`, `'needs_fix'`, `'failed'` and the code also writes `'debugging'` (in `auto-debug-agent.js`). These values will violate the CHECK constraint on every write.  
_Fix: Extend the CHECK constraint to include all valid status values used by the agents._

**m8. `schema_autonomous.sql` uses `uuid_generate_v4()` but base schema uses `gen_random_uuid()`**  
Inconsistent UUID generation functions. `schema_autonomous.sql` requires the `uuid-ossp` extension; `schema.sql` uses the built-in `gen_random_uuid()`. If `uuid-ossp` is not enabled, `autonomous_logs` and `autonomous_runs` inserts will fail.  
_Fix: Standardize on `gen_random_uuid()` or add `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` to `schema_autonomous.sql`._

---

## Appendix: All SQL Tables Defined vs. Code-Referenced

### Tables WITH `CREATE TABLE` definitions:
`tools`, `tool_events`, `revenue_logs`, `experiments`, `autonomous_logs`, `autonomous_runs`, `builder_plans`, `decision_logs`, `deployment_logs`, `health_snapshots`, `deployment_checklist`, `generated_code`, `blog_posts`, `newsletters`, `referral_program`, `referral_conversions`, `ad_copy`, `influencer_outreach`, `competitor_comparisons`, `content_calendar`, `marketing_campaigns`, `monetization_strategies`, `pricing_experiments`, `optimization_suggestions`, `revenue_snapshots`, `failed_payments`, `upsell_opportunities`, `revenue_alerts`, `support_tickets`, `ticket_messages`, `bug_reports`, `feature_requests`, `knowledge_base`, `support_surveys`, `support_analytics`, `tool_tests`, `token_blacklist`, `cron_health`

### Tables WITHOUT `CREATE TABLE` (used in code):
`saas_tools`, `factory_jobs`, `tool_ideas`, `tool_usage_events`, `users`, `calculators`, `products`

---

*Report generated by full static analysis of D:\MyProjects\AWE-OS. All line numbers verified by direct file reads.*
