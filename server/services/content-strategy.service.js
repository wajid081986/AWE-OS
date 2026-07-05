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
      keyword:    anglePost?.focus_keyword || null,
      angle_hint: anglePost?.focus_keyword
        ? `double down on top-viewed keyword: "${anglePost.focus_keyword}"`
        : (anglePost?.slug ? `double down on top-viewed post: /${anglePost.slug}` : 'no existing coverage — establish first angle'),
      priority: 1,
    };
  }

  if (mostRecentPost) {
    const underperforming = (mostRecentPost.views || 0) < LOW_POST_VIEWS_THRESHOLD;
    if (!underperforming) return null; // decent post exists and traffic isn't high — leave it alone

    // (c) low traffic + posts exist but views ~0 — new angle, different post_type.
    // No keyword: the whole point is to try something other than what's
    // already underperforming, so there's no "winning" keyword to target.
    return {
      tool_id:    tool.id,
      slug:       mostRecentPost.slug || null,
      post_type:  pickDifferentPostType(mostRecentPost.content_type, avgViewsByType),
      keyword:    null,
      angle_hint: `previous post (${mostRecentPost.content_type}) underperformed at ${mostRecentPost.views} views — retry with a different angle/format`,
      priority: 2,
    };
  }

  // (d) zero-data tool — rotation order, lowest priority
  return {
    tool_id:    tool.id,
    slug:       null,
    post_type:  nextRotationPostType(),
    keyword:    null,
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
    keyword:    null,
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
