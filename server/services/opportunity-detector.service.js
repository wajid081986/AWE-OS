'use strict';

/**
 * AWE-OS — Opportunity Detector (Phase 3, Step 1 — shadow mode)
 *
 * Reads existing signals and returns recommendation objects. EXECUTES
 * NOTHING — suggested_action is machine-readable for a FUTURE executor step;
 * nothing consumes it yet. Entire feature is gated behind the
 * MARKETING_INTELLIGENCE_ENABLED env flag (checked by the cron, not here).
 *
 * HARD RULE: signals come ONLY from tool_events, blog_posts.views,
 * strategy_decisions, social_post_queue, newsletters, cron_health. NEVER
 * read tools.usage_count — see content-strategy.service.js for why.
 *
 * Shape: fetchXxx() functions do the (impure) Supabase reads and always
 * degrade to a safe empty value on error — a missing table/column must
 * never crash the run. detectXxx(data) functions are pure — given the
 * pre-fetched data, decide whether a recommendation fires.
 */

const supabase = require('../db/supabase');

// ── Thresholds (named constants) ─────────────────────────────────────────
const STALE_QUEUE_PENDING_THRESHOLD      = 5;
const STALE_QUEUE_LOOKBACK_DAYS          = 7;

const NEWSLETTER_PILEUP_DRAFT_THRESHOLD  = 2;
const NEWSLETTER_PILEUP_LOOKBACK_DAYS    = 30;

const TOOL_TRAFFIC_WINDOW_DAYS           = 14;
const TOOL_TRAFFIC_VIEW_THRESHOLD        = 20;
const TOOL_TRAFFIC_DEFAULT_POST_TYPE     = 'how_to_guide';
const BLOG_COVERAGE_WINDOW_DAYS          = 30;

const POST_DECAY_EARLY_WINDOW_DAYS       = 14; // "first 14 days" since publish
const POST_DECAY_RECENT_WINDOW_DAYS      = 14; // "last 14 days" vs now
const POST_DECAY_MIN_EARLY_VIEWS         = 10; // had *some* traction early on
const POST_DECAY_MAX_RECENT_VIEWS        = 1;  // ~0 views recently

// Mirrors content-strategy.service.js's MIN_TOOL_EVENTS_14D — this detector
// only reports progress toward that gate, it never re-decides the gate itself.
const DATA_GATE_TARGET_EVENTS            = 300;
const DATA_GATE_WINDOW_DAYS              = 14;

const DEFAULT_EXPIRY_DAYS                = 14;

function expiresAt(days = DEFAULT_EXPIRY_DAYS) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function daysAgoIso(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

// ── Data fetch helpers (impure — degrade to a safe empty value on error) ──

async function fetchSocialQueueSignal() {
  try {
    const since = daysAgoIso(STALE_QUEUE_LOOKBACK_DAYS);
    const [pendingRes, failedRes] = await Promise.all([
      supabase.from('social_post_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      // created_at is the closest available timestamp to "became permanently
      // failed" — social_post_queue has no separate failed_at column.
      supabase.from('social_post_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed_permanent').gte('created_at', since),
    ]);
    if (pendingRes.error || failedRes.error) return null;
    return {
      pendingCount:               pendingRes.count || 0,
      recentFailedPermanentCount: failedRes.count  || 0,
    };
  } catch (err) {
    console.error('[OPPORTUNITY DETECTOR] fetchSocialQueueSignal failed:', err?.message || String(err));
    return null;
  }
}

async function fetchNewsletterSignal() {
  try {
    const since = daysAgoIso(NEWSLETTER_PILEUP_LOOKBACK_DAYS);
    const [draftRes, sentRes] = await Promise.all([
      supabase.from('newsletters').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('newsletters').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', since),
    ]);
    if (draftRes.error || sentRes.error) return null;
    return {
      draftCount:        draftRes.count || 0,
      sentInWindowCount: sentRes.count  || 0,
    };
  } catch (err) {
    console.error('[OPPORTUNITY DETECTOR] fetchNewsletterSignal failed:', err?.message || String(err));
    return null;
  }
}

async function fetchToolTrafficSignals() {
  try {
    const { data: tools, error: toolsErr } = await supabase.from('tools').select('id, name').eq('status', 'live');
    if (toolsErr || !tools || tools.length === 0) return [];

    const toolIds  = tools.map(t => t.id);
    const since14d = daysAgoIso(TOOL_TRAFFIC_WINDOW_DAYS);
    const since30d = daysAgoIso(BLOG_COVERAGE_WINDOW_DAYS);

    const [eventsRes, postsRes] = await Promise.all([
      supabase.from('tool_events').select('tool_id').eq('event_type', 'tool_viewed').gte('created_at', since14d).in('tool_id', toolIds),
      supabase.from('blog_posts').select('tool_id').eq('status', 'published').gte('published_at', since30d).in('tool_id', toolIds),
    ]);
    if (eventsRes.error) return [];

    const viewCounts = {};
    for (const row of eventsRes.data || []) viewCounts[row.tool_id] = (viewCounts[row.tool_id] || 0) + 1;
    const coveredToolIds = new Set((postsRes.data || []).map(r => r.tool_id));

    return tools.map(t => ({
      tool_id:         t.id,
      tool_name:       t.name,
      view_count_14d:  viewCounts[t.id] || 0,
      has_recent_post: coveredToolIds.has(t.id),
    }));
  } catch (err) {
    console.error('[OPPORTUNITY DETECTOR] fetchToolTrafficSignals failed:', err?.message || String(err));
    return [];
  }
}

// Picks the snapshot row whose captured_at is closest to targetMs.
function nearestSnapshot(rows, targetMs) {
  let best = null, bestDiff = Infinity;
  for (const row of rows) {
    const diff = Math.abs(new Date(row.captured_at).getTime() - targetMs);
    if (diff < bestDiff) { bestDiff = diff; best = row; }
  }
  return best;
}

async function fetchPostDecaySignals() {
  try {
    const minAgeDays = POST_DECAY_EARLY_WINDOW_DAYS + POST_DECAY_RECENT_WINDOW_DAYS;
    const cutoff = daysAgoIso(minAgeDays);

    const { data: posts, error: postsErr } = await supabase
      .from('blog_posts')
      .select('id, title, published_at')
      .eq('status', 'published')
      .lte('published_at', cutoff);
    if (postsErr || !posts || posts.length === 0) return [];

    const postIds = posts.map(p => p.id);
    const { data: snapshots, error: snapErr } = await supabase
      .from('blog_view_snapshots')
      .select('blog_post_id, views, captured_at')
      .in('blog_post_id', postIds)
      .order('captured_at', { ascending: true });
    // Table may not have any history yet (feature just turned on) — that's
    // expected, not an error; just nothing to detect this run.
    if (snapErr || !snapshots || snapshots.length === 0) return [];

    const snapshotsByPost = {};
    for (const row of snapshots) (snapshotsByPost[row.blog_post_id] ||= []).push(row);

    const results = [];
    for (const post of posts) {
      const rows = snapshotsByPost[post.id];
      if (!rows || rows.length < 2) continue; // not enough history yet for this post

      const publishedMs  = new Date(post.published_at).getTime();
      const day14Target   = publishedMs + POST_DECAY_EARLY_WINDOW_DAYS * 86400000;
      const recentTarget  = Date.now() - POST_DECAY_RECENT_WINDOW_DAYS * 86400000;

      const day14Snapshot  = nearestSnapshot(rows, day14Target);
      const recentSnapshot = nearestSnapshot(rows, recentTarget);
      const latestSnapshot = rows[rows.length - 1];
      if (!day14Snapshot || !recentSnapshot) continue;

      results.push({
        blog_post_id: post.id,
        title:        post.title,
        early_views:  day14Snapshot.views,
        recent_views: Math.max(0, latestSnapshot.views - recentSnapshot.views),
      });
    }
    return results;
  } catch (err) {
    console.error('[OPPORTUNITY DETECTOR] fetchPostDecaySignals failed:', err?.message || String(err));
    return [];
  }
}

async function fetchDataGateSignal() {
  try {
    const since = daysAgoIso(DATA_GATE_WINDOW_DAYS);
    const { count, error } = await supabase.from('tool_events').select('id', { count: 'exact', head: true }).gte('created_at', since);
    if (error) return null;
    return { recentEventCount: count || 0 };
  } catch (err) {
    console.error('[OPPORTUNITY DETECTOR] fetchDataGateSignal failed:', err?.message || String(err));
    return null;
  }
}

// Daily-cron snapshot of every published post's current views — the time
// series that fetchPostDecaySignals() (and future trend analysis) reads.
async function snapshotBlogViews() {
  try {
    const { data: posts, error } = await supabase.from('blog_posts').select('id, views').eq('status', 'published');
    if (error) { console.error('[OPPORTUNITY DETECTOR] snapshotBlogViews query failed:', error.message); return { snapshotted: 0 }; }
    if (!posts || posts.length === 0) return { snapshotted: 0 };

    const rows = posts.map(p => ({ blog_post_id: p.id, views: p.views || 0 }));
    const { error: insertErr } = await supabase.from('blog_view_snapshots').insert(rows);
    if (insertErr) {
      console.error('[OPPORTUNITY DETECTOR] snapshotBlogViews insert failed:', insertErr.message);
      return { snapshotted: 0, error: insertErr.message };
    }
    return { snapshotted: rows.length };
  } catch (err) {
    console.error('[OPPORTUNITY DETECTOR] snapshotBlogViews unexpected error:', err?.message || String(err));
    return { snapshotted: 0, error: err?.message || String(err) };
  }
}

// ISO-8601-style "year-week" key — good enough to rotate a dedupe_key once
// per calendar week without needing day-of-week gating in the cron itself.
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Pure detectors — data in, recommendation objects out ─────────────────

function detectStaleQueue(signal) {
  if (!signal) return [];
  const { pendingCount, recentFailedPermanentCount } = signal;
  if (pendingCount <= STALE_QUEUE_PENDING_THRESHOLD && recentFailedPermanentCount === 0) return [];

  return [{
    detector: 'STALE_QUEUE',
    risk:     'low',
    title:    'Social post queue needs attention',
    detail:   `Social post queue has ${pendingCount} pending item(s) (threshold ${STALE_QUEUE_PENDING_THRESHOLD}) and ${recentFailedPermanentCount} permanently failed post(s) in the last ${STALE_QUEUE_LOOKBACK_DAYS} days.`,
    evidence: {
      pending_count: pendingCount,
      recent_failed_permanent_count: recentFailedPermanentCount,
      pending_threshold: STALE_QUEUE_PENDING_THRESHOLD,
      lookback_days: STALE_QUEUE_LOOKBACK_DAYS,
    },
    suggested_action: { type: 'notify_admin' },
    dedupe_key: 'stale_queue',
    expires_at: expiresAt(3),
  }];
}

function detectNewsletterPileup(signal) {
  if (!signal) return [];
  const { draftCount, sentInWindowCount } = signal;
  if (draftCount <= NEWSLETTER_PILEUP_DRAFT_THRESHOLD || sentInWindowCount > 0) return [];

  return [{
    detector: 'NEWSLETTER_PILEUP',
    risk:     'low',
    title:    'Newsletter drafts piling up with no recent sends',
    detail:   `${draftCount} newsletter draft(s) exist (threshold ${NEWSLETTER_PILEUP_DRAFT_THRESHOLD}) but 0 were sent in the last ${NEWSLETTER_PILEUP_LOOKBACK_DAYS} days.`,
    evidence: {
      draft_count: draftCount,
      sent_in_window: sentInWindowCount,
      draft_threshold: NEWSLETTER_PILEUP_DRAFT_THRESHOLD,
      lookback_days: NEWSLETTER_PILEUP_LOOKBACK_DAYS,
    },
    suggested_action: { type: 'notify_admin' },
    dedupe_key: 'newsletter_pileup',
    expires_at: expiresAt(7),
  }];
}

function detectToolTrafficNoCoverage(signals) {
  if (!Array.isArray(signals)) return [];
  const recs = [];
  for (const s of signals) {
    if (s.view_count_14d < TOOL_TRAFFIC_VIEW_THRESHOLD || s.has_recent_post) continue;

    recs.push({
      detector: 'TOOL_TRAFFIC_NO_COVERAGE',
      risk:     'medium',
      title:    `${s.tool_name} has traffic but no recent blog coverage`,
      detail:   `${s.tool_name} received ${s.view_count_14d} tool_viewed events in the last ${TOOL_TRAFFIC_WINDOW_DAYS} days (threshold ${TOOL_TRAFFIC_VIEW_THRESHOLD}) with no published post in the last ${BLOG_COVERAGE_WINDOW_DAYS} days.`,
      evidence: {
        tool_id: s.tool_id,
        tool_name: s.tool_name,
        view_count_14d: s.view_count_14d,
        view_threshold: TOOL_TRAFFIC_VIEW_THRESHOLD,
        coverage_window_days: BLOG_COVERAGE_WINDOW_DAYS,
      },
      suggested_action: { type: 'generate_blog_post', params: { tool_id: s.tool_id, post_type: TOOL_TRAFFIC_DEFAULT_POST_TYPE } },
      dedupe_key: `tool_traffic_no_coverage:${s.tool_id}`,
      expires_at: expiresAt(14),
    });
  }
  return recs;
}

function detectPostDecay(signals) {
  if (!Array.isArray(signals)) return [];
  const recs = [];
  for (const s of signals) {
    if (s.early_views < POST_DECAY_MIN_EARLY_VIEWS || s.recent_views > POST_DECAY_MAX_RECENT_VIEWS) continue;

    recs.push({
      detector: 'POST_DECAY',
      risk:     'medium',
      title:    `"${s.title}" traffic has decayed`,
      detail:   `Post earned ${s.early_views} views in its first ${POST_DECAY_EARLY_WINDOW_DAYS} days but only ${s.recent_views} in the last ${POST_DECAY_RECENT_WINDOW_DAYS} days.`,
      evidence: {
        blog_post_id: s.blog_post_id,
        early_views: s.early_views,
        recent_views: s.recent_views,
        early_window_days: POST_DECAY_EARLY_WINDOW_DAYS,
        recent_window_days: POST_DECAY_RECENT_WINDOW_DAYS,
        min_early_views: POST_DECAY_MIN_EARLY_VIEWS,
        max_recent_views: POST_DECAY_MAX_RECENT_VIEWS,
      },
      suggested_action: { type: 'refresh_blog_post', params: { blog_post_id: s.blog_post_id } },
      dedupe_key: `post_decay:${s.blog_post_id}`,
      expires_at: expiresAt(14),
    });
  }
  return recs;
}

function detectDataGateProgress(signal) {
  if (!signal) return [];
  const { recentEventCount } = signal;
  const pct  = Math.min(100, Math.round((recentEventCount / DATA_GATE_TARGET_EVENTS) * 100));
  const week = isoWeekKey(new Date());

  return [{
    detector: 'DATA_GATE_PROGRESS',
    risk:     'low',
    title:    `Data-driven content gate: ${pct}% of the way there`,
    detail:   `${recentEventCount} of ${DATA_GATE_TARGET_EVENTS} tool_events recorded in the last ${DATA_GATE_WINDOW_DAYS} days — the weekly content engine switches from rotation fallback to data-driven mode once this gate is met.`,
    evidence: {
      recent_event_count: recentEventCount,
      target_events: DATA_GATE_TARGET_EVENTS,
      window_days: DATA_GATE_WINDOW_DAYS,
      percent: pct,
    },
    suggested_action: {},
    dedupe_key: `data_gate_progress:${week}`,
    expires_at: expiresAt(7),
  }];
}

// Wraps a detector call so a bug in one detector can never take down the
// others, or the run as a whole.
function safeDetect(fn, arg) {
  try {
    return fn(arg) || [];
  } catch (err) {
    console.error(`[OPPORTUNITY DETECTOR] ${fn.name} threw:`, err?.message || String(err));
    return [];
  }
}

// ── Entry point ────────────────────────────────────────────────────────────
async function runDetectors() {
  const [socialQueueSignal, newsletterSignal, toolTrafficSignals, postDecaySignals, dataGateSignal] = await Promise.all([
    fetchSocialQueueSignal(),
    fetchNewsletterSignal(),
    fetchToolTrafficSignals(),
    fetchPostDecaySignals(),
    fetchDataGateSignal(),
  ]);

  return [
    ...safeDetect(detectStaleQueue,            socialQueueSignal),
    ...safeDetect(detectNewsletterPileup,       newsletterSignal),
    ...safeDetect(detectToolTrafficNoCoverage,  toolTrafficSignals),
    ...safeDetect(detectPostDecay,              postDecaySignals),
    ...safeDetect(detectDataGateProgress,       dataGateSignal),
  ];
}

module.exports = {
  runDetectors,
  snapshotBlogViews,
  // Exported individually for testability — pure functions, safe to unit test in isolation.
  detectStaleQueue,
  detectNewsletterPileup,
  detectToolTrafficNoCoverage,
  detectPostDecay,
  detectDataGateProgress,
};
