# AWE-OS — Jobs Upgrade Summary

**Date:** 2026-05-04  
**Scope:** All 9 files in `server/jobs/`  
**Result:** 9/9 files upgraded · 9/9 pass `node --check`

---

## Upgrade Categories Applied to Every File

| # | Category | What Changed |
|---|---|---|
| 1 | Structured JSON logging | All `console.log/warn/error` replaced with `log(level, message, data)` emitting JSON lines `{agent, level, message, ...data, ts}`. Never throws. |
| 2 | Overlap guard | `isRunning` flag wrapped in `try/finally` so lock is always released even on unexpected throws |
| 3 | `recordCronRun()` telemetry | Every exit path (success, skipped, error) records to `cron_health` table via RPC |
| 4 | Named constants | No magic numbers — `BATCH_SIZE`, `RETRY_DELAYS_MS`, `STALE_DAYS`, etc. at file top |
| 5 | No top-level side effects | All four explicit-start crons (`analytics`, `autonomous`, `idea`, `marketing`, `testing`) remain inert until `startXxx()` is called. Auto-start crons (`decision`, `health`, `revenue`, `support`) preserve their `require`-side-effect registration pattern. |
| 6 | Graceful shutdown | `stopXxxCron()` exported; `activeTask` reference tracked; stops cron without crashing |
| 7 | `Promise.allSettled()` | Parallel queries (`marketing` report data, `analytics` anomaly counts) use `allSettled` — one failure never blocks the other |
| 8 | Batch processing | `analytics.cron.js` upserts in `BATCH_SIZE=50` chunks; `support.cron.js` auto-close limited to `AUTO_CLOSE_BATCH=100` |
| 9 | Input validation / error classification | Agent-return null guards, `maybeSingle()` for single-row queries, structured error logging with `code` field |
| 10 | `withRetry()` / execution budgets | Exponential backoff retry helpers in `analytics` and `revenue`; `Promise.race` budget caps in `autonomous` (10 min) and `testing` (15 min) |

---

## Per-File Enhancements

### `analytics.cron.js`
- **30-day window** on event queries (prevents unbounded table scan)
- **`withRetry(fn, label)`** with 1s/5s/15s delays for all DB calls
- **Batch upsert** (`BATCH_SIZE=50`) with per-batch error isolation
- **Traffic anomaly detection** — alerts when today's usage > 2× 7-day average
- **`recordCronRun()`** with `records_processed`, `records_failed`, `anomalies` metrics

### `autonomous.cron.js`
- **Circuit breaker** — opens after 3 consecutive failures; resets after 30 min; logs state transitions
- **10-minute execution budget** via `Promise.race` — prevents runaway agent from blocking the event loop
- **Metrics extraction** — logs `tools_processed`, `plans_generated`, `scaled`, `kill_flagged`, `errors`
- **`recordCronRun()`** with processed/plans metrics

### `decision.cron.js`
- **Same-day dedup guard** — `lastRunDate` prevents duplicate evaluations if cron fires twice
- **Decision cache** — `Map<tool_id, {decision, score, ts}>` tracks last run's decisions; detects how many tools changed decision vs prior run (`decisions_changed_vs_cache`)
- **Confidence scoring** — `(decisioned / total_evaluated) × 100` logged as `confidence_pct`
- **Reasoning chain logging** — top 5 individual decisions (tool_id, decision, score, reason) logged at `info` for observability

### `health.cron.js`
- **Per-service latency thresholds** — `LATENCY_WARN_MS=500`, `LATENCY_ERROR_MS=2000`; each service assessed individually via `assessService(name, data)`
- **Recovery hints** — hardcoded per-service recovery advice logged at `error` level when a service is down
- **No emoji** — all `console.log` emoji removed; status communicated via `level` and `overall` field
- **`recordCronRun()`** with `overall` and `issues_count`

### `idea.cron.js`
- **Category rotation** — 6-category `CATEGORY_ROTATION` array; index incremented each run (micro_saas → b2b_tools → developer_tools → automation → ai_powered → productivity → repeat)
- **Deduplication guard** — skips generation if `saas_tools` already has `status='idea'` entries for that category within 7 days (fail-open on DB error)
- **Quality scoring** — warns if `avg_quality_score < MIN_QUALITY_SCORE (60)`
- **`recordCronRun()`** with category and inserted count

### `marketing.cron.js`
- **A/B blog post type rotation** — `BLOG_POST_TYPES = ['how_to_guide', 'case_study', 'comparison', 'tutorial']`; rotates each Monday run
- **Engagement prediction** — last week's avg CTR from `executeWeeklyReport()` stored in `lastWeekAvgCtr`; logged as `predicted_ctr` and `engagement_risk` at run start; warns if below `LOW_CTR_THRESHOLD=1.5%`
- **Weekend-aware newsletter** — detects weekend via `getUTCDay()`; logs deferral instead of sending (safety net if schedule is changed)
- **`recordCronRun()`** for all three jobs (`marketing-weekly-content`, `marketing-weekly-report`, `marketing-monthly-calendar`)

### `revenue.cron.js`
- **MRR/ARR growth rate** — compares current MRR to `previousMRR`; logs `growth_pct`, `arr_current`, `arr_previous`; warns if growth < −10%
- **Revenue anomaly detection** — maintains 7-run history; alerts if daily revenue drops > 50% from recent average
- **Churn prediction** — tracks `consecutiveFailRuns`; warns after 3 consecutive runs with failed payments
- **`withRetry()`** with 1s/5s delays for each sub-task
- **Partial-success handling** — if 1–2 of 3 sub-tasks fail, records `success`; if all 3 fail, records `error`
- **`recordCronRun()`** with `records_processed` and `errors`

### `support.cron.js`
- **Full structural rewrite** — replaced inline `cron.schedule(...)` closures with named `executeSLAMonitor`, `executeAutoClose`, `executeWeeklyKB` functions with per-job overlap guards
- **SLA priority scoring** — `computeSLAPriority(ticket)` returns 0–1 based on `(lookahead_ms / remaining_ms)`; tickets sorted by score; high-priority tickets (≥ 0.75) get individual breach-imminent log entries
- **Auto-categorization feedback** — logs top 3 ticket categories by volume for the week with counts
- **Batch limit** — auto-close limited to `AUTO_CLOSE_BATCH=100` tickets per run
- **`recordCronRun()`** for all three jobs (`support-sla-monitor`, `support-auto-close`, `support-weekly-kb`)
- **`startSupportCrons()` / `stopSupportCrons()`** exported for graceful shutdown and tests

### `testing.cron.js`
- **15-minute execution budget** via `Promise.race` — testing agent can be slow; hard cap prevents blocking
- **Regression detection** — compares current `pass_rate_pct` to `prevRun.pass_rate_pct`; warns if drop ≥ `REGRESSION_DROP_PCT=10%`
- **Coverage gap analysis** — warns if fewer tools tested than previous run; surfaces error-prone tool categories
- **Previous-run state** — `prevRun.{pass_rate_pct, tools_tested}` updated after each successful run
- **`recordCronRun()`** with `tests_run`, `tests_passed`, `tests_failed`, `pass_rate_pct`; status is `error` only if all tests failed

---

## Files Changed

| File | Lines | Status |
|---|---|---|
| `server/jobs/analytics.cron.js` | 206 | Upgraded |
| `server/jobs/autonomous.cron.js` | 131 | Upgraded |
| `server/jobs/decision.cron.js` | 146 | Full rewrite |
| `server/jobs/health.cron.js` | 118 | Full rewrite |
| `server/jobs/idea.cron.js` | 150 | Upgraded |
| `server/jobs/marketing.cron.js` | 258 | Upgraded |
| `server/jobs/revenue.cron.js` | 179 | Full rewrite |
| `server/jobs/support.cron.js` | 245 | Full rewrite |
| `server/jobs/testing.cron.js` | 176 | Upgraded |
