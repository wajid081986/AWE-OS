# Phase 2, Step 3 — Content Strategy Engine — Final Report

## 1. Full contents of `server/services/content-strategy.service.js`

```js
'use strict';

/**
 * AWE-OS — Content Strategy Engine
 *
 * Replaces the weekly cron's blind tool rotation with data-driven topic
 * selection, once there is enough real traffic data to trust. Falls back to
 * the exact old rotation behavior while data accumulates.
 *
 * HARD RULE: performance signals come ONLY from tool_events rows and
 * blog_posts.views. NEVER read tools.usage_count — it's polluted by seeded
 * fakes and getPublicTool()'s unconditional bump on every read.
 */

const supabase = require('../db/supabase');

// ── Data sufficiency gate ────────────────────────────────────────────────
// Below these thresholds, tool_events is either too sparse or too young to
// rank tools by — ranking on it anyway would just be a coin flip dressed up
// as data-driven.
const MIN_TOOL_EVENTS_14D       = 300;
const MIN_TRACKING_AGE_DAYS     = 14;
const RECENT_EVENTS_WINDOW_DAYS = 14;

// ── Ranking windows/thresholds ───────────────────────────────────────────
const BLOG_COVERAGE_WINDOW_DAYS = 30;  // "recent blog coverage" lookback
const HIGH_TRAFFIC_VIEWS_14D    = 50;  // tool_viewed count in the last 14d that counts as "high traffic"
const LOW_POST_VIEWS_THRESHOLD  = 5;   // a covering post below this many views counts as "views ~0"

// Fixed rotation set — also the only content_types the weekly cron has ever
// auto-published with, so ranking picks are restricted to this set to avoid
// producing a content_type the rest of the publish pipeline hasn't been
// exercised against.
const BLOG_POST_TYPES = ['how_to_guide', 'case_study', 'comparison', 'tutorial'];
let blogPostTypeIdx = 0;

function nextRotationPostType() {
  const postType = BLOG_POST_TYPES[blogPostTypeIdx % BLOG_POST_TYPES.length];
  blogPostTypeIdx = (blogPostTypeIdx + 1) % BLOG_POST_TYPES.length;
  return postType;
}

async function fetchActiveTools() {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('status', 'live');
  if (error) throw Object.assign(
    new Error(`Failed to fetch active tools: ${error.message}`),
    { code: 'FETCH_TOOLS_FAILED' }
  );
  return data || [];
}

// ── Gate ──────────────────────────────────────────────────────────────────
async function getDataSufficiency() {
  const since14d = new Date(Date.now() - RECENT_EVENTS_WINDOW_DAYS * 86400000).toISOString();

  const [eventCountRes, oldestEventRes, viewsRes] = await Promise.all([
    supabase.from('tool_events').select('id', { count: 'exact', head: true }).gte('created_at', since14d),
    supabase.from('tool_events').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('blog_posts').select('views'),
  ]);

  if (eventCountRes.error) throw Object.assign(
    new Error(`tool_events count failed: ${eventCountRes.error.message}`), { code: 'TOOL_EVENTS_COUNT_FAILED' }
  );

  const recentEventCount = eventCountRes.count || 0;
  const trackingAgeDays  = oldestEventRes.data?.created_at
    ? (Date.now() - new Date(oldestEventRes.data.created_at).getTime()) / 86400000
    : 0;
  const totalBlogViews = (viewsRes.data || []).reduce((sum, r) => sum + (Number(r.views) || 0), 0);

  return { recentEventCount, trackingAgeDays, totalBlogViews };
}

// ── Per-tool metrics for data-driven ranking ─────────────────────────────
async function getToolMetrics(tools) {
  const toolIds  = tools.map(t => t.id);
  const since14d = new Date(Date.now() - RECENT_EVENTS_WINDOW_DAYS * 86400000).toISOString();

  const [viewEventsRes, postsRes, allPublishedRes] = await Promise.all([
    supabase.from('tool_events').select('tool_id')
      .eq('event_type', 'tool_viewed').gte('created_at', since14d).in('tool_id', toolIds),
    supabase.from('blog_posts').select('tool_id, slug, views, content_type, focus_keyword, created_at')
      .eq('status', 'published').in('tool_id', toolIds).order('created_at', { ascending: false }),
    supabase.from('blog_posts').select('content_type, views').eq('status', 'published'),
  ]);

  if (viewEventsRes.error) throw Object.assign(
    new Error(`tool_events view query failed: ${viewEventsRes.error.message}`), { code: 'TOOL_EVENTS_FAILED' }
  );
  if (postsRes.error) throw Object.assign(
    new Error(`blog_posts query failed: ${postsRes.error.message}`), { code: 'BLOG_POSTS_FAILED' }
  );

  const viewCounts = {};
  for (const row of viewEventsRes.data || []) viewCounts[row.tool_id] = (viewCounts[row.tool_id] || 0) + 1;

  // postsRes is ordered desc by created_at overall, so grouping preserves
  // that order per tool — postsByTool[id][0] is that tool's most recent post.
  const postsByTool = {};
  for (const row of postsRes.data || []) {
    (postsByTool[row.tool_id] ||= []).push(row);
  }

  const viewsByType = {};
  for (const row of allPublishedRes.data || []) {
    if (!row.content_type) continue;
    (viewsByType[row.content_type] ||= []).push(Number(row.views) || 0);
  }
  const avgViewsByType = {};
  for (const type of Object.keys(viewsByType)) {
    const vals = viewsByType[type];
    avgViewsByType[type] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  return { viewCounts, postsByTool, avgViewsByType };
}

function pickWinningPostType(avgViewsByType) {
  let best = null, bestAvg = 0;
  for (const type of BLOG_POST_TYPES) {
    const avg = avgViewsByType[type] || 0;
    if (avg > bestAvg) { bestAvg = avg; best = type; }
  }
  return best || nextRotationPostType(); // no avg-views data yet — rotate rather than guess
}

function pickDifferentPostType(excludeType, avgViewsByType) {
  let best = null, bestAvg = 0;
  for (const type of BLOG_POST_TYPES) {
    if (type === excludeType) continue;
    const avg = avgViewsByType[type] || 0;
    if (avg > bestAvg) { bestAvg = avg; best = type; }
  }
  if (best) return best;
  let candidate = nextRotationPostType();
  if (candidate === excludeType) candidate = nextRotationPostType();
  return candidate;
}

// ── Ranking ───────────────────────────────────────────────────────────────
// Returns a plan item, or null if the tool should be skipped this week
// (already has solid recent coverage).
function rankTool(tool, viewCount14d, posts, avgViewsByType, since30dMs) {
  const mostRecentPost = posts[0] || null;
  const topViewedPost  = posts.reduce((best, p) => (p.views || 0) > (best?.views || 0) ? p : best, null);
  const recentCoverage = mostRecentPost && new Date(mostRecentPost.created_at).getTime() >= since30dMs
    ? mostRecentPost : null;
  const isHighTraffic = viewCount14d >= HIGH_TRAFFIC_VIEWS_14D;

  if (isHighTraffic) {
    const wellCovered = recentCoverage && (recentCoverage.views || 0) >= LOW_POST_VIEWS_THRESHOLD;
    if (wellCovered) return null; // (b) high traffic, recent well-viewed post — already covered

    // (a) high traffic + low/old blog coverage — double down
    const anglePost = topViewedPost || mostRecentPost;
    return {
      tool_id:    tool.id,
      slug:       anglePost?.slug || null,
      post_type:  pickWinningPostType(avgViewsByType),
      angle_hint: anglePost?.focus_keyword
        ? `double down on top-viewed keyword: "${anglePost.focus_keyword}"`
        : (anglePost?.slug ? `double down on top-viewed post: /${anglePost.slug}` : 'no existing coverage — establish first angle'),
      priority: 1,
    };
  }

  if (mostRecentPost) {
    const underperforming = (mostRecentPost.views || 0) < LOW_POST_VIEWS_THRESHOLD;
    if (!underperforming) return null; // decent post exists and traffic isn't high — leave it alone

    // (c) low traffic + posts exist but views ~0 — new angle, different post_type
    return {
      tool_id:    tool.id,
      slug:       mostRecentPost.slug || null,
      post_type:  pickDifferentPostType(mostRecentPost.content_type, avgViewsByType),
      angle_hint: `previous post (${mostRecentPost.content_type}) underperformed at ${mostRecentPost.views} views — retry with a different angle/format`,
      priority: 2,
    };
  }

  // (d) zero-data tool — rotation order, lowest priority
  return {
    tool_id:    tool.id,
    slug:       null,
    post_type:  nextRotationPostType(),
    angle_hint: null,
    priority: 3,
  };
}

// ── Rotation fallback — must stay byte-for-byte identical to the old
// blind-rotation behavior: one post_type per run, applied to every live tool.
async function buildRotationFallbackPlan(rationale, tools) {
  const postType = nextRotationPostType();
  const plan = tools.map((tool, idx) => ({
    tool_id:    tool.id,
    slug:       null,
    post_type:  postType,
    angle_hint: null,
    priority:   idx + 1,
  }));
  return { mode: 'rotation_fallback', rationale, plan };
}

// ── Decision diary ────────────────────────────────────────────────────────
// Best-effort — a logging failure must never break the weekly content run.
async function recordStrategyDecision(mode, rationale, plan) {
  try {
    const cron_run_ref = `weekly-content-${new Date().toISOString()}`;
    const { error } = await supabase.from('strategy_decisions').insert({
      mode, rationale, plan, cron_run_ref,
    });
    if (error) console.error('[CONTENT STRATEGY] Failed to record strategy decision:', error.message);
  } catch (err) {
    console.error('[CONTENT STRATEGY] Unexpected error recording strategy decision:', err?.message || String(err));
  }
}

// ── Entry point ───────────────────────────────────────────────────────────
async function getWeeklyContentPlan() {
  const { recentEventCount, trackingAgeDays, totalBlogViews } = await getDataSufficiency();

  const dataInsufficient = recentEventCount < MIN_TOOL_EVENTS_14D;
  const trackingImmature = trackingAgeDays < MIN_TRACKING_AGE_DAYS;

  if (dataInsufficient || trackingImmature) {
    const tools = await fetchActiveTools();
    const rationale = dataInsufficient
      ? `Only ${recentEventCount} tool_events recorded in the last ${RECENT_EVENTS_WINDOW_DAYS} days (need ${MIN_TOOL_EVENTS_14D}+) — falling back to blind rotation until real traffic accumulates. Lifetime blog views so far: ${totalBlogViews}.`
      : `tool_events tracking is only ${trackingAgeDays.toFixed(1)} days old (need ${MIN_TRACKING_AGE_DAYS}+ days of history) — falling back to blind rotation until the tracking window matures.`;
    const result = await buildRotationFallbackPlan(rationale, tools);
    await recordStrategyDecision(result.mode, result.rationale, result.plan);
    return result;
  }

  const tools = await fetchActiveTools();
  if (tools.length === 0) {
    const result = { mode: 'rotation_fallback', rationale: 'No live tools found — nothing to plan.', plan: [] };
    await recordStrategyDecision(result.mode, result.rationale, result.plan);
    return result;
  }

  const { viewCounts, postsByTool, avgViewsByType } = await getToolMetrics(tools);
  const since30dMs = Date.now() - BLOG_COVERAGE_WINDOW_DAYS * 86400000;

  const ranked = tools
    .map((tool, idx) => ({
      idx,
      item: rankTool(tool, viewCounts[tool.id] || 0, postsByTool[tool.id] || [], avgViewsByType, since30dMs),
    }))
    .filter(r => r.item !== null);

  ranked.sort((a, b) => (a.item.priority - b.item.priority) || (a.idx - b.idx));
  const plan = ranked.map(r => r.item);

  const priority1 = plan.filter(p => p.priority === 1).length;
  const priority2 = plan.filter(p => p.priority === 2).length;
  const priority3 = plan.filter(p => p.priority === 3).length;
  const skipped   = tools.length - plan.length;

  const rationale = `Data-driven mode: ${recentEventCount} tool_events in the last ${RECENT_EVENTS_WINDOW_DAYS} days (>= ${MIN_TOOL_EVENTS_14D}) across ${trackingAgeDays.toFixed(0)} days of tracking. Ranked ${tools.length} live tools — ${priority1} high-traffic/needs-coverage, ${priority2} underperforming retries, ${priority3} zero-data rotation slots, ${skipped} already well covered and skipped.`;

  const result = { mode: 'data_driven', rationale, plan };
  await recordStrategyDecision(result.mode, result.rationale, result.plan);
  return result;
}

module.exports = {
  getWeeklyContentPlan,
  BLOG_POST_TYPES,
};
```

---

## 2. Full contents of migration 032 (`server/db/migrations/032_strategy_decisions.sql`)

```sql
-- Migration 032: strategy_decisions — content-strategy engine's decision diary
--
-- Phase 2 Step 3 (server/services/content-strategy.service.js) computes a
-- weekly content plan (data_driven or rotation_fallback) and calls
-- recordStrategyDecision() every time getWeeklyContentPlan() runs. This
-- table is that record — it lets us see after the fact which mode the
-- engine picked, why (rationale), and exactly what it planned, without
-- having to parse it back out of agent_logs metadata.

CREATE TABLE IF NOT EXISTS strategy_decisions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode         TEXT NOT NULL CHECK (mode IN ('data_driven', 'rotation_fallback')),
  rationale    TEXT NOT NULL,
  plan         JSONB NOT NULL DEFAULT '[]',
  cron_run_ref TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_decisions_decided_at ON strategy_decisions (decided_at DESC);
```

**Status:** written to disk only. **Not applied** to the live database (no `psql`/Supabase migration command was run), per standing instruction not to take live DB actions without asking first.

**Structural validation performed** (no DB connection): parenthesis-balance check (12 open / 12 close) and statement-split check confirm exactly 2 clean statements (`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`), matching the style of migrations 020 and 028.

---

## 3. Exact diff of `server/jobs/marketing.cron.js` — old rotation loop vs new `plan[]` iteration

```diff
--- a/server/jobs/marketing.cron.js
+++ b/server/jobs/marketing.cron.js
@@ -31,6 +31,7 @@ const { generateBlogPost, generateNewsletter } = require('../agents/marketing-ag
 const { recordCronRun } = require('../services/cron-health');
 const { logToAgentLogs } = require('../db/agent-logger');
 const { postTweet }      = require('../services/twitter.service');
+const { getWeeklyContentPlan, BLOG_POST_TYPES } = require('../services/content-strategy.service');
 
 // agent_name under which all three scheduled jobs log — matches the single
 // "Marketing Agent" card in the admin dashboard (agents.routes.js AGENT_HANDLERS.marketing)
@@ -52,9 +53,6 @@ const SEVEN_DAYS_MS      = 7 * 24 * 60 * 60 * 1000;
 const NEWSLETTER_SEGMENT = 'all_users';
 const LOW_CTR_THRESHOLD  = 1.5;    // percent — warn if engagement below this
 
-// A/B test: rotate blog post types each weekly run
-const BLOG_POST_TYPES = ['how_to_guide', 'case_study', 'comparison', 'tutorial'];
-
 // Social post retry queue — root cause of a failed post (e.g. CreditsDepleted)
 // is usually account-level, not transient, so backoff is deliberately long.
 const SOCIAL_QUEUE_MAX_ATTEMPTS  = 5;
@@ -66,7 +64,6 @@ const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
 // ── State ──────────────────────────────────────────────────────────────────────
 const running = { weeklyContent: false, monthlyCalendar: false, weeklyReport: false, socialQueueRetry: false };
 let activeTasks      = [];
-let blogPostTypeIdx  = 0;    // rotates through BLOG_POST_TYPES
 let lastWeekAvgCtr   = null; // updated by weeklyReport — used for engagement prediction
 
 // ── Logger ─────────────────────────────────────────────────────────────────────
@@ -211,17 +208,12 @@ async function executeWeeklyContent() {
 
   running[JOB] = true;
   const startedAt  = Date.now();
-  const postType   = BLOG_POST_TYPES[blogPostTypeIdx % BLOG_POST_TYPES.length];
-  blogPostTypeIdx  = (blogPostTypeIdx + 1) % BLOG_POST_TYPES.length;
 
   log('info', JOB, 'Run starting', {
-    post_type:       postType,
-    ab_variant:      blogPostTypeIdx,
     predicted_ctr:   lastWeekAvgCtr,
     engagement_risk: lastWeekAvgCtr !== null && lastWeekAvgCtr < LOW_CTR_THRESHOLD,
   });
   await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly content run started', {
-    post_type: postType,
     triggered_by: 'cron',
   });
 
@@ -233,26 +225,35 @@ async function executeWeeklyContent() {
   }
 
   try {
-    const tools = await fetchActiveTools();
+    const { mode, rationale, plan } = await getWeeklyContentPlan();
+    log('info', JOB, 'Content strategy plan selected', { mode, rationale, plan_size: plan.length });
+    await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly content plan selected', { mode, rationale, plan });
 
-    if (tools.length === 0) {
-      log('info', JOB, 'No active tools — skipping blog generation');
+    const tools     = await fetchActiveTools();
+    const toolsById = new Map(tools.map(t => [t.id, t]));
+
+    if (plan.length === 0) {
+      log('info', JOB, 'No planned topics this run — skipping blog generation');
     }
 
     const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
     let generated = 0, skipped = 0, failed = 0, published = 0, tweeted = 0, queuedTweets = 0, failedTweets = 0;
 
-    for (const tool of tools) {
+    for (const item of plan) {
+      const tool = toolsById.get(item.tool_id);
+      if (!tool) { skipped++; continue; } // plan item stale (tool no longer live) — defensive skip
+
       try {
         const alreadyPosted = await hasRecentBlogPost(tool.id, since);
         if (alreadyPosted) {
           skipped++;
           continue;
         }
-        const post = await generateBlogPost(tool.id, postType, `${tool.name} free online`, { autoPublish: true });
+        const targetKeyword = item.angle_hint ? `${tool.name} ${item.angle_hint}` : `${tool.name} free online`;
+        const post = await generateBlogPost(tool.id, item.post_type, targetKeyword, { autoPublish: true });
         generated++;
         log('info', JOB, 'Blog post generated', {
-          tool_id: tool.id, tool_name: tool.name, post_type: postType, status: post.status,
+          tool_id: tool.id, tool_name: tool.name, post_type: item.post_type, status: post.status,
         });
 
         if (post.status === 'published' && post.live_url) {
@@ -291,7 +292,7 @@ async function executeWeeklyContent() {
     }
 
     log('info', JOB, 'Blog generation complete', {
-      generated, published, tweeted, queued_tweets: queuedTweets, failed_tweets: failedTweets, skipped, failed, post_type: postType,
+      generated, published, tweeted, queued_tweets: queuedTweets, failed_tweets: failedTweets, skipped, failed,
     });
 
     // Weekend-aware newsletter delivery
@@ -312,11 +313,11 @@ async function executeWeeklyContent() {
     log('info', JOB, 'Run complete', { duration_ms });
     await recordCronRun('marketing-weekly-content', 'success', null, { records_processed: generated });
     await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly content run complete', {
-      generated, published, tweeted, queued_tweets: queuedTweets, failed_tweets: failedTweets,
+      mode, generated, published, tweeted, queued_tweets: queuedTweets, failed_tweets: failedTweets,
       skipped, failed, newsletter_sent: newsletterSent, duration_ms,
     });
     return {
-      skipped: false, post_type: postType,
+      skipped: false, mode,
       generated, published, tweeted, queued_tweets: queuedTweets, failed_tweets: failedTweets,
       blog_skipped: skipped, failed,
       newsletter_sent: newsletterSent, duration_ms,
```

### Why the `rotation_fallback` path is byte-for-byte the old behavior

| | Old code | New code (in `rotation_fallback` mode) |
|---|---|---|
| Tool selection | `fetchActiveTools()` — all `tools` where `status='live'`, no filtering | `buildRotationFallbackPlan()` calls the identical `fetchActiveTools()` query (same table, same filter, same file — copied verbatim into the service) and maps every returned tool into a plan item, in the same order |
| post_type | One rotating value picked **once per run** from `BLOG_POST_TYPES`, applied to every tool | `buildRotationFallbackPlan()` calls `nextRotationPostType()` **once**, and assigns that same single value to every plan item — identical one-postType-per-run semantics |
| Rotation index | Module-level `blogPostTypeIdx` in `marketing.cron.js`, incremented once per run | Module-level `blogPostTypeIdx` in `content-strategy.service.js` (moved, not duplicated — it was the only consumer), same increment-once-per-run semantics |
| Per-tool skip guard | `hasRecentBlogPost(tool.id, since)` inside the loop, `since` = 7 days | Unchanged — same call, same `since`, still inside the loop in `marketing.cron.js` |
| generateBlogPost args | `generateBlogPost(tool.id, postType, \`${tool.name} free online\`, { autoPublish: true })` | `generateBlogPost(tool.id, item.post_type, targetKeyword, { autoPublish: true })` where `targetKeyword` falls back to the identical `\`${tool.name} free online\`` whenever `item.angle_hint` is null — and in `rotation_fallback` mode every plan item's `angle_hint` is hardcoded `null`, so `targetKeyword` is always the old string |
| Tweet / enqueue / sleep flow | Unchanged | Untouched — same code, unmoved |

Net effect: in `rotation_fallback` mode, the sequence of `generateBlogPost()` calls (tool order, post_type, target_keyword) is identical to before. The only observable differences are additive logging (`mode`, `rationale`, `plan` in `agent_logs`) and a `strategy_decisions` diary row — no change to what gets generated, published, or tweeted.

---

## 4. Diff summary of dashboard changes

### Backend — `server/agents/marketing-agent.js` (`getMarketingDashboard()`)
- Added `lastStrategyDecision` as a 10th parallel query in the existing `Promise.all` batch: `supabase.from('strategy_decisions').select('mode, rationale, plan, decided_at').order('decided_at', { ascending: false }).limit(1).maybeSingle()`.
- Follows the exact same graceful-degradation pattern already used for `social_post_queue` (migration 028) — if `strategy_decisions` (migration 032) doesn't exist yet, Supabase returns an `error` field rather than throwing, so `lastStrategyDecision.data` is simply `undefined`/`null`.
- Added `content_strategy` key to the returned dashboard object: `null` if no decision row exists yet, otherwise `{ mode, rationale, decided_at, top_topics: plan.slice(0, 3) }`.
- **9 lines added, 1 line changed** (destructuring list).

### Frontend — `client/src/modules/admin/agents/AgentControlPage.jsx` (`MarketingAgentCard`)
- Added `const cs = data?.content_strategy` alongside the existing `wc`/`sq`/`nl` derived values.
- Added one new panel (rendered only `expanded && cs`) between the "last run" status lines and the "Recent newsletters" list: a mode badge (green `data-driven` / yellow `rotation fallback`), the rationale text, and a bulleted list of the first 3 planned topics (`post_type · priority N — angle_hint`).
- No new API call — reuses the existing `/api/marketing/dashboard` fetch already wired into this card's `load()`.
- **20 lines added**, no existing lines removed.

---

## 5. Grep proof

**No reference to `tools.usage_count` (or any `usage_count` read) in the new service** — the only match is the file's own header comment explicitly forbidding it:
```
$ grep -n "usage_count" server/services/content-strategy.service.js
11: * blog_posts.views. NEVER read tools.usage_count — it's polluted by seeded
```
No code path in the file touches `usage_count`.

**No LLM/OpenAI/ai.service call anywhere in the ranking logic:**
```
$ grep -inE "openai|ai\.service|ai-service|anthropic|require\(.*ai.*\)|generateBlogPost|llm" server/services/content-strategy.service.js
(no matches — exit code 1)
```
Confirms the ranking (`rankTool`, `pickWinningPostType`, `pickDifferentPostType`, the sufficiency gate) is pure deterministic arithmetic over Supabase query results — no model call, and the file doesn't even import `generateBlogPost` (that stays in `marketing.cron.js`, called with the service's plan output).

**Data sufficiency thresholds are named constants at the top of the file** (lines 18–23, immediately after the single `require`):
```js
const MIN_TOOL_EVENTS_14D       = 300;
const MIN_TRACKING_AGE_DAYS     = 14;
const RECENT_EVENTS_WINDOW_DAYS = 14;
```
(Ranking thresholds `BLOG_COVERAGE_WINDOW_DAYS`, `HIGH_TRAFFIC_VIEWS_14D`, `LOW_POST_VIEWS_THRESHOLD` immediately follow, lines 26–28.)

---

## 6. What mode will the engine run in **today** (2026-07-05)?

Ran the actual gate query (read-only `SELECT`/`count`, no writes) against the live Supabase database:

```json
{
  "recentEventCount": 3,
  "trackingAgeDays": 0.46,
  "totalBlogViews": 2,
  "dataInsufficient": true,
  "trackingImmature": true,
  "resultingMode": "rotation_fallback"
}
```

**Mode: `rotation_fallback`** — both gate conditions fail: only 3 `tool_events` rows in the last 14 days (need 300+), and the oldest `tool_events` row is only ~0.46 days old (need 14+ days of tracking history).

Since `dataInsufficient` is checked first, the exact rationale string that will be logged to `agent_logs` and written to `strategy_decisions.rationale` today is:

```
Only 3 tool_events recorded in the last 14 days (need 300+) — falling back to blind rotation until real traffic accumulates. Lifetime blog views so far: 2.
```

This is consistent with the marketing pipeline sync history — the `tools` table was only synced from 2→17 live tools on 2026-07-03, so `tool_events`/`blog_posts` traffic data genuinely hasn't accumulated yet. The engine correctly refuses to trust it and falls back to the exact pre-existing rotation behavior, as designed.
