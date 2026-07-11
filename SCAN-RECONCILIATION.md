# Opportunity Scan — Reconciliation Report (2026-07-05)

Read-only. No DB writes, no migration apply, no code edits were performed to produce this report.

## 1. Which environment did "flag is unset" refer to?

**Local environment only — and it was under-qualified when written.**

`SCAN-BUGREPORT.md` §2 says "`MARKETING_INTELLIGENCE_ENABLED` is currently unset in
this environment" with no explicit scope. Checking now:

- This agent runs on your local machine (`D:\MyProjects\AWE-OS`), not on Render. It has
  no access to the Render dashboard, Render's env var store, or Render logs.
- `printenv | grep MARKETING_INTELLIGENCE` in the local shell: **not set.**
- `server/.env` exists locally (not read — credential file, per standing instruction) but
  even if the flag lived there, a local `.env` file is never read by a Render deployment;
  Render uses its own dashboard-configured env vars, entirely independent of this repo's
  local `.env`.
- The original claim was actually inferred from the **absence of expected DB activity**
  (zero `agent_logs` rows, `run_count: 0`) and generalized into "the flag is unset,"
  without ever checking Render's actual env var value — because this agent has no way to
  check that. That inference step was the flaw: absence of execution evidence in the DB
  was treated as equivalent to "flag off," when it's also consistent with "flag on, cron
  registered, just hasn't hit its 02:00 UTC trigger time yet."

**Conclusion: the "unset" claim was, at best, a statement about the local machine, and at
worst an unverified guess dressed up as fact. It was never a claim about Render
production, because this agent has no channel to observe Render production's env vars
directly.**

## 2. Reconciling with the production Render logs

The two log lines you quoted are real, exact strings from the committed codebase — not
paraphrases:

- `server/jobs/marketing.cron.js:677`:
  `log('info', 'startup', 'Opportunity scan cron registered', { opportunityScan: EXPRESSIONS.opportunityScan });`
  where `EXPRESSIONS.opportunityScan = '0 2 * * *'` (`marketing.cron.js:56`). This is
  inside `startOpportunityScanCron()`.
- `server/index.js:411`:
  `` console.info(`[SERVER] opportunity-scan-cron started (schedule: ${EXPRESSIONS.opportunityScan})`) ``

Critically, `startOpportunityScanCron()` is **only ever called** from `server/index.js:407-412`,
gated by:

```js
if (process.env.MARKETING_INTELLIGENCE_ENABLED === 'true') {
  ...
  startOpportunityScanCron()
  console.info(`[SERVER] opportunity-scan-cron started ...`)
} else {
  console.info("[SERVER] Opportunity scan NOT registered (MARKETING_INTELLIGENCE_ENABLED != 'true')")
}
```

There is no other code path that produces either log line. **If both lines appeared in
production Render logs, `MARKETING_INTELLIGENCE_ENABLED` was `'true'` in the Render
production process that emitted them.** This is a direct code-structural fact, not an
inference.

This code is already on `main` (commit `3b31710`, confirmed `git rev-parse HEAD
origin/main` both resolve to `9b885fa`, with `3b31710` in that history) — so it is what
Render deploys from, and it's consistent with your logs.

**Net reconciliation:** the two claims aren't actually contradictory once split by
environment — local dev machine: unset; Render production: `'true'` per your logs
(unverified by me directly, but the log content is only producible under that
condition). The earlier report's error was stating "unset" without that qualifier, which
reads as a global claim it wasn't entitled to make.

**What "registered/started" does *not* prove:** it proves the cron was *scheduled*, not
that it has *fired*. `cron.schedule('0 2 * * *', ...)` only invokes `executeOpportunityScan()`
at 02:00 UTC daily. Zero `agent_logs` "Opportunity scan run started/complete" entries and
`run_count: 0` are fully consistent with "flag turned on today, registered, hasn't hit
02:00 UTC yet" — which is a materially different (and much less concerning) situation
than "the feature is dead / gated off."

## 3. Live read-only SELECTs — not run

I did not run any SELECTs against the live database. This agent has no DB credentials
loaded in this session (confirmed: `MARKETING_INTELLIGENCE_ENABLED` and any Supabase keys
are not in the local shell env, and I won't open `server/.env` to get them — see standing
instruction). Per the same standing instruction, live-DB checks (even read-only) require
asking first rather than just doing them, so I'm stopping here for that step rather than
improvising a connection.

**To get §3 data (cron_health row, agent_logs entries, live signal counts for all 5
detectors), tell me which you'd prefer:**
- You run the SELECTs (via Supabase SQL editor or `psql`) and paste the output back, or
- You explicitly authorize using the existing `server/.env` Supabase credentials for a
  read-only script, and how you'd like that run (I write it, you review before executing,
  or you run it yourself).

I can supply the exact SELECT statements for cron_health, agent_logs, and each detector's
signal query on request — just confirm which path above.

## 3b. Did migration 033's pre-seed INSERT create the 14:19 row?

**No — not as observed, and the timing lines up with a manual edit, not the migration.**

Migration 033's INSERT (`server/db/migrations/033_opportunity_detector.sql:50-51`):
```sql
INSERT INTO cron_health (cron_name) VALUES ('marketing-opportunity-scan')
ON CONFLICT (cron_name) DO NOTHING;
```
only sets `cron_name`. Every other column falls back to its table default from migration
004 (`server/db/migrations/004*.sql:83-93`):
```sql
last_run_at TIMESTAMPTZ DEFAULT NULL,
last_status TEXT CHECK (...) DEFAULT NULL,
run_count   INTEGER NOT NULL DEFAULT 0,
```
So migration 033's INSERT, by itself, would leave `last_run_at = NULL` and
`last_status = NULL` — not `last_run_at: 2026-07-05T14:19:38 UTC` and
`last_status: 'unknown'`. Something else (a manual `UPDATE`) had to run afterward to
produce those exact values.

**Timing check:** the commit that added migration 033, `3b31710`, has author/commit
timestamp `2026-07-05 19:50:17 +05:30` → **`2026-07-05 14:20:17 UTC`**. The `cron_health`
row's `last_run_at` is `14:19:38 UTC` — **39 seconds earlier** than the commit. This is
close enough to suggest the manual row edit happened in the same working session as
writing/committing migration 033 (e.g. hand-seeding/testing the row in Supabase Studio
while building the feature, moments before committing the code) — but it's a
circumstantial match against the *commit* timestamp, not proof of the actual `psql`/SQL-editor
*execution* timestamp, since you apply migrations manually and I have no log of exactly
when that happened. If you recall applying migration 033 (or hand-editing the row) around
that time, this confirms it; if not, treat this as suggestive, not conclusive.

## 3c. The constraint test-write — what I can and can't tell you

I don't have the exact string or exact timestamp. That test happened in the session
*before* the one that produced `SCAN-BUGREPORT.md`, per the retained memory note, and
neither that memory nor `SCAN-BUGREPORT.md` recorded the literal string written or a
timestamp — only "an arbitrary string... succeeded with no constraint violation." Context
from that earlier session was cleared and isn't recoverable by me now.

What I *can* say from what was preserved: the note states the write "succeeded with no
constraint violation," which is presented as evidence the CHECK constraint from migration
004 is absent on the live table. I have not re-verified this and was told not to test it
via UPDATE/INSERT/DELETE here, so I'm not attempting to re-derive it. If you need the
exact before/after values, that only exists in Supabase's own history (if `updated_at` was
touched) — I can't reconstruct it from the repo or memory.

One honest caveat: I can't distinguish "last_status was already `'unknown'` before that
test-write" from "the test-write is what set it to `'unknown'`" using anything available
to me now — both memory and the bug report are silent on the value immediately prior to
the write. If this matters, the only way to resolve it is Supabase's audit/history for
that row, if you have it enabled, or your own recollection of what you saw before running
the test.

## 5. Does the 14:19 row predate the production cron registration/startup?

**Yes, almost certainly.** The registration/startup log lines can only be emitted by a
Render process running code from commit `3b31710` or later. That commit didn't exist
until `14:20:17 UTC`, and pushing + Render's build/deploy pipeline takes at least low
single-digit minutes beyond that before a new process could even start and emit a startup
log. The `cron_health` row's `last_run_at = 14:19:38 UTC` is *before* the commit even
landed, let alone before any deploy of it could have started. So the 14:19 row cannot be
the product of the production cron registration/startup you saw in the Render logs — it
predates the existence of the code that produces those log lines. This reinforces §3b:
the row is a manual/local artifact from the build session, unrelated to any live
production firing.

## 6. Predicted detector counts

**Not available — requires the live signal data from §3, which wasn't queried.** I'm not
substituting stale numbers or a guess. Once you choose a path in §3 (paste output, or
authorize a read-only script), I can compute per-detector predicted hits:
- `detectStaleQueue`: pending `social_post_queue` items > 5, or any permanent failure in 7d
- `detectNewsletterPileup`: >2 drafts with 0 sent in 30d
- `detectToolTrafficNoCoverage`: ≥20 tool views in 14d with no post in last 30d
- `detectPostDecay`: ≥10 early views collapsing to ≤`POST_DECAY_MAX_RECENT_VIEWS` recent views
- `detectDataGateProgress`: always fires informationally (`recentEventCount` vs
  `DATA_GATE_TARGET_EVENTS` over 14d)

## Summary

| Question | Answer |
|---|---|
| Was the "unset" claim about local or Render? | Local only; never actually checked against Render, wording didn't say so |
| Does that contradict the Render logs? | No — different environments; production flag is `'true'` per your logs (log lines are only producible under that condition) |
| Does "registered/started" mean it ran? | No — only means scheduled; 02:00 UTC trigger hasn't necessarily fired yet |
| Did migration 033 create the 14:19 row's values? | No — its INSERT would leave `last_run_at`/`last_status` NULL; a later manual UPDATE set them |
| Does 14:19 UTC line up with migration 033? | Within 39s of the `3b31710` commit timestamp — suggestive of same work session, not proof of exact apply time |
| Constraint test-write details (exact string/time/prior value) | Not recoverable — lost with prior session's context, never recorded |
| Does 14:19 row predate prod cron registration? | Yes — predates the very existence of the deployable code |
| Detector counts | Pending live data — needs your go-ahead per §3 |

No fixes applied, no migration run, no code changed.
