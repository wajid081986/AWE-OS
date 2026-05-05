# AWE-OS — Fixes Round 2 (Post-Verification Audit)

**Date:** 2026-05-05  
**Based on:** VERIFICATION_REPORT.md  
**All changes verified:** `node --check` passed on every modified JS file  

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `server/db/migrations/005_saas_tools_and_missing_tables.sql` | New | Creates 4 missing tables + revenue_logs column |
| `server/db/migrations/006_schema_fixes.sql` | New | Fixes FK, constraint, RPC signature, tool columns |
| `server/services/cron-health.js` | Modified | Added 4th `metadata` param to `recordCronRun()` |
| `server/jobs/idea.cron.js` | Modified | Dedup query table: `saas_tools` → `tools` (one line) |
| `server/jobs/health.cron.js` | Modified | Added `isRunning` guard + `finally { isRunning = false }` |

---

## Migration 005 — `005_saas_tools_and_missing_tables.sql`

### What it creates

**`saas_tools`** — The published product catalog. Used by 15+ server files but had NO CREATE TABLE in version control. This was the most critical missing piece — without it, fresh DB setup fails the autonomous agent, admin dashboard, factory routes, and tools API.

Columns: `id, name, slug, description, category, ai_prompt, input_fields, is_free, price, is_published, quality_score, approval_status, created_at, updated_at`

Indexes on: `slug`, `is_published`, `category`, `created_at DESC`

Auto-update trigger on `updated_at`.

---

**`users`** — Custom public user accounts (separate from Supabase auth.users). Referenced by 20+ server files for auth, admin, billing, support.

Columns: `id, email, password_hash, role, permissions, is_premium, subscription_status, password_reset_token, password_reset_expires, created_at, updated_at`

Role CHECK constraint: `user | admin`. Subscription status CHECK: `free | active | cancelled | expired`.

---

**`factory_jobs`** — AI factory job log. The autonomous agent's `logFactoryJob()` inserts here on every tool config generation attempt. Was completely missing.

Columns: `id, status, category, input_prompt, generated_tool_id, error_message, completed_at, created_at`

Soft reference to `saas_tools` (no FK — avoids cascade complexity when jobs fail before tool is created).

---

**`tool_usage_events`** — Per-slug usage tracking for published tools. The autonomous agent and decision engine query this by `tool_slug` to compute `usage_count` for the SCALE/KILL/IMPROVE decision tree. Without this table, every tool evaluation used `usage_count=0`, causing the decision engine to classify almost all tools as "kill" immediately.

Columns: `id, tool_slug, user_id, session_id, event_type, metadata, created_at`

Compound index on `(tool_slug, created_at DESC)` for the count query pattern.

---

**`revenue_logs.tool_slug`** — Added TEXT column. The autonomous agent queries `revenue_logs` by `tool_slug` (from saas_tools) but the table only had `tool_id` (FK to tools pipeline table — different UUID space). All revenue lookups were returning 0. Adding `tool_slug` enables slug-based lookups without breaking the existing `tool_id` FK.

---

## Migration 006 — `006_schema_fixes.sql`

### Fix 1 — `tool_tests` FK: `saas_tools` → `tools`

**Root cause:** `schema_testing.sql` defined `tool_tests.tool_id REFERENCES saas_tools(id)`. But `testing-agent.core.js` fetches tool IDs from the `tools` table (pipeline table) and inserts them into `tool_tests`. Since `tools` and `saas_tools` are separate tables with separate UUID spaces, every test result insert generated a FK violation (Postgres error 23503) — no test results were ever persisted.

**Fix:** Dropped `tool_tests_tool_id_fkey` and added `tool_tests_tool_id_tools_fkey` referencing `tools(id) ON DELETE CASCADE`.

---

### Fix 2 — `tools` STATUS constraint: add missing values

**Root cause:** `schema.sql` defined `CHECK (status IN ('idea','building','live','scaling','killed'))`. But agents actively write: `testing` (testing-agent), `needs_fix` (testing-agent), `failed` (testing-agent), `debugging` (auto-debug-agent), `failed_permanent` (auto-debug-agent). Every write of these values violated the constraint — the UPDATE silently failed, leaving tools stuck in wrong states.

**Fix:** Dropped `tools_status_check` and re-added `tools_status_check_v2` with all valid values:
`idea | building | testing | live | scaling | needs_fix | failed | debugging | failed_permanent | killed`

---

### Fix 3 — `record_cron_run` RPC: added `p_meta JSONB` parameter

**Root cause:** The PostgreSQL RPC only accepted 3 parameters (`p_cron_name`, `p_status`, `p_error`). All 9 cron jobs were passing a 4th metadata argument (records_processed, anomalies, pass_rate_pct, etc.) that was silently dropped — rich telemetry was never stored.

**Fix:** Added `last_meta JSONB DEFAULT NULL` column to `cron_health`. Updated `record_cron_run` RPC to accept `p_meta JSONB DEFAULT NULL` and store it. The DEFAULT NULL means existing 3-arg callers continue working without modification.

---

### Fix 4 — `tools` table missing columns

**Root cause:** `schema.sql` only defined 9 columns for `tools`. But `testing-agent.core.js` fetches `slug, ai_prompt, input_fields, category, success_count, failure_count, avg_score, best_strategy, last_used_at` — these columns were scattered across 6 separate schema files with no single canonical definition. Fresh DB setup running only `schema.sql` would have a broken `tools` table.

**Fix:** Added all missing columns via `ALTER TABLE IF NOT EXISTS`: `slug, ai_prompt, input_fields, category, is_free, price, source, idea_score, approved, manual_override, success_count, failure_count, avg_score, best_strategy, last_used_at, debug_meta, saas_tool_id`.

---

### Fix 5 — `tool_ideas` table

**Root cause:** `factory.routes.js` performs 5 queries against `tool_ideas` — no CREATE TABLE existed.

**Fix:** Created `tool_ideas` table with `id, name, description, category, source, status, idea_score, created_at`. Status CHECK: `pending | approved | rejected | building`.

---

## Code Fix 1 — `server/services/cron-health.js`

Added 4th parameter `metadata = null` to `recordCronRun()`:

```js
// Before:
async function recordCronRun(cronName, status, error = null)

// After:
async function recordCronRun(cronName, status, error = null, metadata = null)
```

The RPC call now passes `p_meta: metadata ? JSON.parse(JSON.stringify(metadata)) : null` — using JSON round-trip to strip any non-serialisable values before sending to Supabase.

No changes needed to the 9 cron files — they were already passing the 4th argument correctly.

---

## Code Fix 2 — `server/jobs/idea.cron.js`

Changed dedup query from `saas_tools` to `tools` (one-line fix):

```js
// Before:
const { data, error } = await supabase.from('saas_tools')...

// After:
const { data, error } = await supabase.from('tools')...
```

**Root cause:** Ideas are inserted into the `tools` table (pipeline table) by `idea-pipeline.js`. The dedup check was querying `saas_tools` (the published product table), which never contains `status='idea'` rows — so the check always returned `false`, generating duplicates on every 12-hour run.

---

## Code Fix 3 — `server/jobs/health.cron.js`

Added `isRunning` overlap guard — the only cron file that was missing it:

```js
// Added at module level:
let isRunning = false;

// Added at top of executeHealthCheck():
if (isRunning) {
  log('warn', 'Skipping — previous health check still in progress');
  return;
}
isRunning = true;
// ...
} finally {
  isRunning = false;
}
```

---

## What Was NOT Changed (and why)

### `prompt-builder.js` — kept as-is
The file is dead code (no imports), but it doesn't break anything. Deleting it could surprise someone expecting to use it. Left in place — wire it into agents when needed.

### Admin dashboard (`/api/admin/stats` and role endpoint) — already connected
The VERIFICATION_REPORT incorrectly stated these were uncalled. Investigation showed:
- `AdminPage.jsx` line 43: `api.get('/api/admin/stats')` ✅
- `UserManager.jsx` line 127: `api.put('/api/admin/users/${user.id}/role', { role })` ✅

Both endpoints are called directly via `api` in the component files — the `adminAPI` object in `api.service.js` is just a helper export, not the only caller. No fix needed.

### `products.routes.js` duplicate Supabase client — deferred
Creates a second `createClient()` instead of using the shared instance. Minor performance issue only — deferred.

### `admin.middleware.js` double DB lookup — deferred
`requireAdmin` performs a live DB query on every admin request. Acceptable for now; cache could be added later.

---

## Action Required (Manual Steps)

Run migrations in Supabase SQL Editor **in order**:

```
1. schema.sql              (base tools/tool_events/revenue_logs tables)
2. schema_autonomous.sql   (autonomous_logs, autonomous_runs)
3. schema_decision.sql     (decision_logs)
4. schema_builder.sql      (builder_plans, etc.)
5. schema_testing.sql      (tool_tests — NOW references tools not saas_tools)
6. ...other schema files...
7. migrations/001_token_blacklist.sql
8. migrations/002_event_summary_rpc.sql
9. migrations/003_tools_saas_tool_id.sql
10. migrations/004_learning_rpcs_and_cron_health.sql
11. migrations/005_saas_tools_and_missing_tables.sql   ← NEW
12. migrations/006_schema_fixes.sql                    ← NEW
```

**Note on execution order:** Migration 005 must run before 006 (006 ALTERs tables 005 creates). Migration 003 adds a FK from `tools.saas_tool_id` to `saas_tools(id)` — so either run 005 first, or ensure `saas_tools` exists before running 003.
