# Opportunity Scan — Live Signal Check (2026-07-05)

Read-only. All queries below are `SELECT` (or `count/head:true`, which is also a
read-only count). No `insert`/`update`/`delete`/`upsert` was issued anywhere in this
check. No code was modified, no migration applied, nothing committed or pushed. The
script used to run these queries (`server/_tmp_live_signal_check.js`, using the existing
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` from `server/.env`, per your explicit
authorization) was deleted immediately after running — it never touched the repo history.

Queries were derived directly from the live code, not guessed:
`server/services/opportunity-detector.service.js` (fetch/detect functions + thresholds)
and `server/jobs/marketing.cron.js` (cron_health / agent_logs write sites, to know what
to read back).

Run timestamp: `2026-07-05T17:44:58.145Z`. **`fetch_errors: []`** — every query
succeeded, nothing degraded.

---

## cron_health — `marketing-opportunity-scan`

| Column | Value |
|---|---|
| last_run_at | `2026-07-05T14:19:38.943135+00:00` |
| last_status | `unknown` |
| last_error | `null` |
| last_meta | `null` |
| run_count | `0` |
| error_count | `0` |
| updated_at | `2026-07-05T14:19:38.943135+00:00` |

Unchanged from prior findings (`SCAN-RECONCILIATION.md` §3b/§5): `run_count: 0` and
`last_status: 'unknown'` remain structurally inconsistent with `record_cron_run()` ever
having been called for this cron — that RPC always sets `run_count >= 1` and
`last_status` to `'success'`/`'error'` only. Still reads as the same pre-existing manual
artifact, not a new run.

## agent_logs — opportunity scan entries

**Query:** `agent_logs` where `agent_name = 'marketing'` and `message ILIKE '%Opportunity%'`, newest first, limit 50.

**Result: 0 rows.**

Every real invocation of `executeOpportunityScan()` logs `'Opportunity scan run started'`
and (on completion) `'Opportunity scan run complete'` via `logToAgentLogs('marketing', ...)`
(`marketing.cron.js:559,615,627`). Zero matches means the job has still never actually
executed, as of this check — consistent with "registered but the 02:00 UTC trigger
hasn't fired since being enabled," not new evidence either way on whether the flag is on
in production.

---

## Detector-by-detector

### 1. `detectStaleQueue`
**Query purpose:** pending `social_post_queue` count; permanently-failed count in the last 7 days.
**Signal:** `pendingCount: 0`, `recentFailedPermanentCount: 0`
**Threshold:** fires unless `pendingCount <= 5 && recentFailedPermanentCount === 0`
**Comparison:** `0 <= 5` → true, and `0 === 0` → true → skip condition met.
**Predicted: NO FIRE** (0 recommendations)

### 2. `detectNewsletterPileup`
**Query purpose:** draft newsletter count; sent-in-last-30-days count.
**Signal:** `draftCount: 0`, `sentInWindowCount: 0`
**Threshold:** fires unless `draftCount <= 2 || sentInWindowCount > 0`
**Comparison:** `0 <= 2` → true → skip condition met.
**Predicted: NO FIRE** (0 recommendations)

### 3. `detectToolTrafficNoCoverage`
**Query purpose:** per live tool, `tool_viewed` events in last 14 days; whether a published post referencing that tool exists in the last 30 days.
**Signal:** 17 live tools, **every one at `view_count_14d: 0`**, all with `has_recent_post: true`.
**Threshold:** fires per tool unless `view_count_14d < 20 || has_recent_post`.
**Comparison:** every tool has `0 < 20` → true → skip condition met for all 17 (doubly so, since `has_recent_post` is also true for all of them).
**Predicted: NO FIRE** for any tool (0 recommendations)

### 4. `detectPostDecay`
**Query purpose:** published posts with `published_at` ≥28 days ago (old enough for both windows); matching `blog_view_snapshots` rows (need ≥2 per post to compare early vs. recent).
**Signal:** `eligiblePosts: 0`, `withEnoughSnapshots: 0`, `signals: []`
**Threshold:** fires per post if `early_views >= 10 && recent_views <= 1`.
**Comparison:** no posts old enough (or none with sufficient snapshot history) to even evaluate — loop body never runs.
**Predicted: NO FIRE** (0 recommendations) — note this isn't "checked and passed," it's "nothing eligible to check yet," consistent with `blog_view_snapshots` being a brand-new table with little/no history.

### 5. `detectDataGateProgress`
**Query purpose:** count of `tool_events` rows in the last 14 days (any type, no tool filter).
**Signal:** `recentEventCount: 3`
**Threshold:** none to skip — this detector **always** emits one informational recommendation.
**Comparison:** `pct = round(3 / 300 * 100) = 1%`
**Predicted: FIRES** — 1 recommendation, `DATA_GATE_PROGRESS`, "Data-driven content gate: 1% of the way there" (3 of 300 tool_events in the last 14 days).

---

## Total predicted recommendations this run: **1**

Only `DATA_GATE_PROGRESS` fires (it's unconditional/informational). The other four
detectors' live signals are all below their thresholds — genuinely nothing to flag right
now, not a fetch failure (recall `fetch_errors: []`, so this isn't the "degraded silently
into 0" failure mode the earlier visibility fixes were guarding against).

One caveat outside this check's scope: whether that 1 recommendation actually gets
**inserted** on a real run also depends on the `recommendations` table's existing
`status = 'open'` rows for this week's `dedupe_key` (`data_gate_progress:<ISO-week>`) —
`executeOpportunityScan()` skips inserting if a matching open dedupe key already exists.
I did not query the `recommendations` table (wasn't in the authorized list for this
check), so "fires" here means the detector's own logic produces the object, not a
guarantee it lands as a new row if one already exists open for this week.

## fetch_errors

```json
[]
```

No degraded signals. All five detectors' inputs were read successfully.

Report only — no fixes, no migration, no code changes, no commit/push.
