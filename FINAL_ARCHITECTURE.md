# AWE-OS — Final Architecture Reference

**Date:** 2026-05-05  
**Status:** Production-ready (post enterprise hardening)

---

## System Overview

AWE-OS is an autonomous AI SaaS platform that discovers, builds, tests, deploys, and iterates on micro-SaaS tools with minimal human intervention. The system runs entirely on Express + Supabase + OpenAI, with a React/Vite admin control centre.

---

## Infrastructure Stack

| Layer | Technology |
|-------|-----------|
| API server | Node.js / Express 4 |
| Database | Supabase (PostgreSQL 15) |
| AI | OpenAI GPT-4o-mini (tool generation + idea pipeline) |
| Job queues | BullMQ + ioredis (Redis) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT + bcryptjs (custom users table + Supabase auth) |
| Storage | AWS S3 (file/product uploads) |
| Email | Resend |
| Payments | Razorpay |

---

## Database Schema (Post-Migration 007)

### Core pipeline tables

| Table | Purpose |
|-------|---------|
| `tools` | Pipeline tracking — ideas through build → test → live |
| `saas_tools` | Published product catalog — what customers see |
| `tool_tests` | Test run results (FK → tools.id) |
| `tool_usage_events` | Per-slug usage tracking (decision engine input) |
| `tool_ideas` | Idea staging area (factory.routes.js) |
| `factory_jobs` | AI factory job log |

### Learning / debugging tables

| Table | Purpose |
|-------|---------|
| `autonomous_logs` | Every autonomous pipeline action |
| `autonomous_runs` | Per-run summaries |
| `decision_logs` | Decision engine verdicts per tool |
| `builder_plans` | Build plan metadata |

### Infrastructure tables

| Table | Purpose |
|-------|---------|
| `users` | Custom user accounts (separate from auth.users) |
| `cron_health` | Cron telemetry + staleness detection |
| `pipeline_metrics` | Per-cron time-series telemetry (observability) |
| `failed_jobs` | BullMQ dead-letter persistence |
| `revenue_logs` | Revenue records (tool_id FK + tool_slug TEXT) |
| `token_blacklist` | Invalidated JWT tokens |

### Status constraints on `tools`

Valid values: `idea | building | testing | live | scaling | needs_fix | failed | debugging | failed_permanent | killed`

**Enforced at two levels:**
1. JS middleware: `state-machine.service.js` → `validateStatusTransition()`
2. DB trigger: `trg_validate_tool_status` (migration 007)

### Dual-table architecture

`tools` (pipeline table) and `saas_tools` (product catalog) are **separate tables** with separate UUID spaces. They are linked by `tools.saas_tool_id FK → saas_tools.id`. Every insert to `tool_tests` uses the `tools.id` FK (not saas_tools).

---

## Cron Job Registry

| File | Cron ID | Schedule | Start pattern |
|------|---------|----------|---------------|
| `analytics.cron.js` | `analytics-cron` | Daily 11:30 PM UTC | Explicit (`startAnalyticsCron()`) |
| `autonomous.cron.js` | `autonomous-cron` | Every 6 hrs | Explicit |
| `decision.cron.js` | `decision-cron` | Daily 1:00 AM UTC | Auto (top-level) |
| `health.cron.js` | `health-cron` | Every 30 min | Auto |
| `idea.cron.js` | `idea-cron` | Every 12 hrs (00:00, 12:00) | Explicit |
| `marketing.cron.js` | `marketing-weekly-content` / `marketing-weekly-report` / `marketing-monthly-calendar` | Weekly Mon 7AM / Mon 9AM / 1st of month | Explicit |
| `retention.cron.js` | `retention-cron` | Daily 03:00 UTC | Explicit |
| `revenue.cron.js` | `revenue-cron` | Daily 11:59 PM UTC | Auto |
| `support.cron.js` | `support-sla-monitor` / `support-auto-close` / `support-weekly-kb` | Every 30 min / Daily 2AM / Sun 8AM | Explicit |
| `testing.cron.js` | `testing-cron` | Daily midnight UTC | Explicit |

**All crons share:**
- `isRunning` overlap guard + `try/finally { isRunning = false }`
- `recordCronRun(cronName, status, error, metadata)` → `cron_health` + `pipeline_metrics`
- Structured JSON logging (no emoji in log output)
- Never throws — catch-all prevents process crash

---

## Background Job Queues (BullMQ)

```
queue.service.js
├── ideaQueue  ("idea-generation")   — 3 retries, backoff: 1s/5s/15s
├── buildQueue ("tool-building")     — 3 retries, backoff: 1s/5s/15s
└── testQueue  ("tool-testing")      — 3 retries, backoff: 1s/5s/15s
```

Failed jobs (after 3 attempts) are persisted to `failed_jobs` table by `persistFailedJob()`.

Requires Redis. Set `REDIS_URL` in `.env`.

---

## Autonomous Pipeline Flow

```
idea-cron (12h)
  → idea-pipeline.generateAndStoreIdeas()
  → INSERT tools (status='idea')
  → duplicate-detector.service.js blocks name/description dupes

autonomous-cron (6h)
  → fetchToolsNeedingAttention()
  → for each tool: generateAIToolConfig() → upsert saas_tools
  → decision engine: SCALE / KILL / IMPROVE / OBSERVE
    (reads tool_usage_events + revenue_logs by tool_slug)

testing-cron (daily)
  → testing-agent.core.js fetches tools (status='building')
  → runs tests → updates tools.status → inserts tool_tests
  → regression check vs previous pass rate

auto-debug-agent
  → triggered when status='needs_fix'
  → writes status='debugging' → 'failed_permanent' on exhaustion
```

---

## Circuit Breaker

The autonomous cron tracks consecutive failures:
- Opens after `CB_FAILURE_THRESHOLD = 3` consecutive failures
- Resets after `CB_RESET_MS = 30 minutes`
- While open: skips run, logs warning, records telemetry

The observability dashboard also reads `failure_rate` from `pipeline_metrics` and shows an alert banner if it exceeds `ALERT_FAILURE_RATE_THRESHOLD` (default 20%). A separate banner shows when failure rate exceeds 50% (circuit breaker territory).

---

## AI Cost Control

- `OPENAI_DAILY_TOKEN_LIMIT` (default 500,000 tokens/day)
- The idea pipeline is the primary OpenAI consumer — configure this limit to cap daily spend.
- Tokens are tracked via OpenAI usage response headers and compared against the daily limit before each generation run.

---

## Security Layers

| Layer | Implementation |
|-------|---------------|
| Auth | JWT (HS256) with token blacklist table |
| Admin guard | `requireAuth` + `requireAdmin` middleware on all `/api/admin/*` |
| Permission matrix | `permissions.js` — `requirePermission('capability')` or `requireRole('admin')` |
| Request tracing | `request-id.js` — `X-Request-ID` on every request/response |
| Rate limiting | `express-rate-limit` on API routes (existing) |
| Input validation | `zod` (v3.22) — already installed, used in event validation |
| State machine | `state-machine.service.js` (JS) + `trg_validate_tool_status` (DB trigger) |

---

## Data Retention Policy

Run by `retention.cron.js` daily at 03:00 UTC:

| Table | Retention |
|-------|-----------|
| `pipeline_metrics` | 30 days |
| `autonomous_logs` | 90 days |
| `tool_usage_events` | 90 days |
| `failed_jobs` (resolved) | 14 days after resolution |

---

## Frontend — Admin Control Centre

**Path:** `client/src/modules/admin/agents/AgentControlPage.jsx`

| Tab | Content |
|-----|---------|
| Overview | Agent cards with trigger buttons, last-run info |
| Ideas | Pending/all ideas, approve/reject/build actions |
| Revenue | Revenue metrics and snapshots |
| Health | System health + service latency |
| Content | Marketing content generation |
| Support | SLA tickets, auto-close, KB generation |
| Optimization | Performance optimization runs |
| Decisions | Decision engine verdicts per tool |
| **Pipeline** | **Observability: success rate, failure rate, avg build time, per-cron breakdown, BullMQ queue stats, circuit breaker alert, retention trigger** |

The Pipeline tab polls `/api/admin/pipeline-metrics` and `/api/admin/queue-stats` every 30 seconds. Falls back gracefully — disconnected state shown in ConnectionBadge if both fail.

---

## Migration Execution Order

```
schema.sql
schema_autonomous.sql
schema_decision.sql
schema_builder.sql
schema_testing.sql
...other schema files...
migrations/001_token_blacklist.sql
migrations/002_event_summary_rpc.sql
migrations/003_tools_saas_tool_id.sql
migrations/004_learning_rpcs_and_cron_health.sql
migrations/005_saas_tools_and_missing_tables.sql
migrations/006_schema_fixes.sql
migrations/007_enterprise_hardening.sql   ← Latest
```

---

## Environment Variables

See `server/.env.example` for the full annotated list. Key additions in this round:

```
REDIS_URL                       # BullMQ / ioredis connection
PIPELINE_MAX_TRIGGERS_PER_MIN   # Per-admin rate limit (default: 5)
OPENAI_DAILY_TOKEN_LIMIT        # AI cost cap (default: 500000)
ALERT_FAILURE_RATE_THRESHOLD    # Dashboard alert threshold (default: 0.20)
CIRCUIT_BREAKER_THRESHOLD       # Auto-pause threshold (default: 0.50)
```

---

## Key File Index

```
server/
├── db/migrations/007_enterprise_hardening.sql  ← pipeline_metrics, failed_jobs, state machine trigger
├── services/
│   ├── queue.service.js            ← BullMQ queues (idea/build/test)
│   ├── state-machine.service.js    ← Status transition validator
│   ├── duplicate-detector.service.js ← Idea deduplication (Dice similarity)
│   ├── cron-health.js              ← recordCronRun() telemetry RPC
│   └── ai.service.js               ← OpenAI client
├── middleware/
│   ├── permissions.js              ← Role-based permission matrix
│   ├── request-id.js               ← X-Request-ID tracing header
│   └── admin.middleware.js         ← requireAuth / requireAdmin
├── jobs/
│   ├── retention.cron.js           ← Daily data purge (03:00 UTC)
│   ├── autonomous.cron.js          ← Main pipeline (circuit breaker)
│   ├── testing.cron.js             ← Test runner + regression detection
│   └── ...8 other cron files
└── routes/
    └── admin.routes.js             ← /pipeline-metrics /queue-stats /retention/trigger

client/src/modules/admin/agents/
└── AgentControlPage.jsx            ← 9-tab control centre (+ Pipeline tab)
```
