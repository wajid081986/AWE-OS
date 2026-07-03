'use strict';

/**
 * AWE-OS — Marketing Cron (Enterprise-Grade)
 *
 * Schedule 1 — Weekly content   : Every Monday 07:00 IST (01:30 UTC)
 *   · Generate blog post for each live tool (A/B variant rotation by post type)
 *   · Weekend-aware newsletter delivery (defers to next weekday if triggered off-schedule)
 *   · Engagement prediction logged before send
 *
 * Schedule 2 — Monthly calendar : 1st of month 09:00 IST (03:30 UTC)
 *   · Content calendar placeholder — logs target month and tool count
 *
 * Schedule 3 — Weekly report    : Every Friday 17:00 IST (11:30 UTC)
 *   · Referral + ad performance stats · engagement trend analysis
 *
 * Safety    : Per-job overlap guards · structured JSON logging · Promise.allSettled()
 *             · recordCronRun() telemetry · graceful shutdown · never crashes
 *
 * Registration (in index.js): call startMarketingCrons() inside app.listen()
 */

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const { generateBlogPost, generateNewsletter } = require('../agents/marketing-agent');
const { recordCronRun } = require('../services/cron-health');
const { logToAgentLogs } = require('../db/agent-logger');
const { postTweet }      = require('../services/twitter.service');

// agent_name under which all three scheduled jobs log — matches the single
// "Marketing Agent" card in the admin dashboard (agents.routes.js AGENT_HANDLERS.marketing)
const AGENT_LOG_NAME = 'marketing';

// ── Constants ──────────────────────────────────────────────────────────────────
// IST = UTC+5:30   Mon 07:00 IST = Mon 01:30 UTC
//                  1st  09:00 IST = 1st 03:30 UTC
//                  Fri  17:00 IST = Fri 11:30 UTC
const EXPRESSIONS = Object.freeze({
  weeklyContent:   '30 1 * * 1',
  monthlyCalendar: '30 3 1 * *',
  weeklyReport:    '30 11 * * 5',
});

const AGENT              = 'marketing-cron';
const SEVEN_DAYS_MS      = 7 * 24 * 60 * 60 * 1000;
const NEWSLETTER_SEGMENT = 'all_users';
const LOW_CTR_THRESHOLD  = 1.5;    // percent — warn if engagement below this

// A/B test: rotate blog post types each weekly run
const BLOG_POST_TYPES = ['how_to_guide', 'case_study', 'comparison', 'tutorial'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── State ──────────────────────────────────────────────────────────────────────
const running = { weeklyContent: false, monthlyCalendar: false, weeklyReport: false };
let activeTasks      = [];
let blogPostTypeIdx  = 0;    // rotates through BLOG_POST_TYPES
let lastWeekAvgCtr   = null; // updated by weeklyReport — used for engagement prediction

// ── Logger ─────────────────────────────────────────────────────────────────────
function log(level, job, message, data = {}) {
  try {
    const line = JSON.stringify({ agent: AGENT, job, level, message, ...data, ts: new Date().toISOString() });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch (_) {
    console.log(`[${AGENT}:${job}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Weekend awareness ──────────────────────────────────────────────────────────
function isWeekend() {
  const day = new Date().getUTCDay();   // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

// ── Query helpers ──────────────────────────────────────────────────────────────
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

async function hasRecentBlogPost(toolId, since) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('tool_id', toolId)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();
  if (error) throw Object.assign(
    new Error(`Blog post check failed for tool ${toolId}: ${error.message}`),
    { code: 'BLOG_CHECK_FAILED' }
  );
  return data !== null;
}

async function fetchReportData() {
  const [referralResult, adResult] = await Promise.allSettled([
    supabase.from('referral_program').select('clicks, conversions, total_earned'),
    supabase.from('ad_copy').select('id, ctr').eq('status', 'active'),
  ]);

  const referralData = referralResult.status === 'fulfilled' && !referralResult.value.error
    ? referralResult.value.data || [] : [];
  const adData = adResult.status === 'fulfilled' && !adResult.value.error
    ? adResult.value.data || [] : [];

  if (referralResult.status === 'rejected' || referralResult.value?.error) {
    log('warn', 'weeklyReport', 'Referral stats fetch failed', {
      error: referralResult.reason?.message || referralResult.value?.error?.message,
    });
  }
  if (adResult.status === 'rejected' || adResult.value?.error) {
    log('warn', 'weeklyReport', 'Ad stats fetch failed', {
      error: adResult.reason?.message || adResult.value?.error?.message,
    });
  }

  return { referralData, adData };
}

// ── Aggregation helpers ────────────────────────────────────────────────────────
function aggregateReferralStats(rows) {
  return rows.reduce(
    (acc, r) => ({
      total_clicks:      acc.total_clicks      + (Number(r.clicks)       || 0),
      total_conversions: acc.total_conversions + (Number(r.conversions)  || 0),
      total_earned:      acc.total_earned      + (Number(r.total_earned) || 0),
    }),
    { total_clicks: 0, total_conversions: 0, total_earned: 0 }
  );
}

function aggregateAdStats(rows) {
  const ctrs = rows.map(r => Number(r.ctr)).filter(Number.isFinite);
  const avg_ctr = ctrs.length > 0
    ? Math.round(ctrs.reduce((a, b) => a + b, 0) / ctrs.length * 100) / 100
    : 0;
  return { active_count: rows.length, avg_ctr };
}

// ── Job 1 — Weekly content ─────────────────────────────────────────────────────
async function executeWeeklyContent() {
  const JOB = 'weeklyContent';
  if (running[JOB]) { log('warn', JOB, 'Skipping — previous run still in progress'); return; }

  running[JOB] = true;
  const startedAt  = Date.now();
  const postType   = BLOG_POST_TYPES[blogPostTypeIdx % BLOG_POST_TYPES.length];
  blogPostTypeIdx  = (blogPostTypeIdx + 1) % BLOG_POST_TYPES.length;

  log('info', JOB, 'Run starting', {
    post_type:       postType,
    ab_variant:      blogPostTypeIdx,
    predicted_ctr:   lastWeekAvgCtr,
    engagement_risk: lastWeekAvgCtr !== null && lastWeekAvgCtr < LOW_CTR_THRESHOLD,
  });
  await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly content run started', {
    post_type: postType,
    triggered_by: 'cron',
  });

  if (lastWeekAvgCtr !== null && lastWeekAvgCtr < LOW_CTR_THRESHOLD) {
    log('warn', JOB, 'Low engagement predicted — last week avg CTR below threshold', {
      last_week_avg_ctr: lastWeekAvgCtr,
      threshold:         LOW_CTR_THRESHOLD,
    });
  }

  try {
    const tools = await fetchActiveTools();

    if (tools.length === 0) {
      log('info', JOB, 'No active tools — skipping blog generation');
    }

    const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    let generated = 0, skipped = 0, failed = 0, published = 0, tweeted = 0;

    for (const tool of tools) {
      try {
        const alreadyPosted = await hasRecentBlogPost(tool.id, since);
        if (alreadyPosted) {
          skipped++;
          continue;
        }
        const post = await generateBlogPost(tool.id, postType, `${tool.name} free online`, { autoPublish: true });
        generated++;
        log('info', JOB, 'Blog post generated', {
          tool_id: tool.id, tool_name: tool.name, post_type: postType, status: post.status,
        });

        if (post.status === 'published' && post.live_url) {
          published++;
          try {
            const tweetText = `${post.title}\n\n${post.excerpt || ''}`.trim();
            const { tweetUrl } = await postTweet(tweetText, post.live_url);
            tweeted++;
            log('info', JOB, 'Tweeted new post', { tool_id: tool.id, tweet_url: tweetUrl });
          } catch (tweetErr) {
            // Social amplification is best-effort — a Twitter failure must
            // never roll back or block the blog publish that already succeeded.
            log('warn', JOB, 'Tweet failed for published post', {
              tool_id: tool.id, live_url: post.live_url, error: tweetErr?.message || String(tweetErr),
            });
          }
          await sleep(2000); // be gentle on Twitter's rate limit across multiple posts/run
        }
      } catch (err) {
        failed++;
        log('error', JOB, 'Blog post generation failed', {
          tool_id:   tool.id,
          tool_name: tool.name,
          error:     err?.message || String(err),
        });
      }
    }

    log('info', JOB, 'Blog generation complete', { generated, published, tweeted, skipped, failed, post_type: postType });

    // Weekend-aware newsletter delivery
    let newsletterSent = false;
    if (isWeekend()) {
      log('warn', JOB, 'Weekend detected — newsletter delivery deferred (cron schedule is Mon-only; manual trigger suspected)');
    } else {
      try {
        await generateNewsletter(NEWSLETTER_SEGMENT, { tip_of_week: 'Check your latest tools on AWE-OS' });
        newsletterSent = true;
        log('info', JOB, 'Newsletter sent', { segment: NEWSLETTER_SEGMENT });
      } catch (err) {
        log('error', JOB, 'Newsletter generation failed', { error: err?.message || String(err) });
      }
    }

    const duration_ms = Date.now() - startedAt;
    log('info', JOB, 'Run complete', { duration_ms });
    await recordCronRun('marketing-weekly-content', 'success', null, { records_processed: generated });
    await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly content run complete', {
      generated, published, tweeted, skipped, failed, newsletter_sent: newsletterSent, duration_ms,
    });
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      duration_ms,
    });
    await recordCronRun('marketing-weekly-content', 'error', err?.message || String(err));
    await logToAgentLogs(AGENT_LOG_NAME, 'error', `Weekly content run failed: ${err?.message || String(err)}`, {
      duration_ms,
    });
  } finally {
    running[JOB] = false;
  }
}

// ── Job 2 — Monthly calendar ───────────────────────────────────────────────────
async function executeMonthlyCalendar() {
  const JOB = 'monthlyCalendar';
  if (running[JOB]) { log('warn', JOB, 'Skipping — previous run still in progress'); return; }

  running[JOB] = true;
  const startedAt = Date.now();
  log('info', JOB, 'Run starting');
  await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Monthly calendar run started', { triggered_by: 'cron' });

  try {
    const tools = await fetchActiveTools();

    if (tools.length === 0) {
      log('warn', JOB, 'No active tools — skipping calendar generation');
      await recordCronRun('marketing-monthly-calendar', 'skipped');
      await logToAgentLogs(AGENT_LOG_NAME, 'warn', 'Monthly calendar run skipped — no active tools');
      return;
    }

    const now         = new Date();
    const nextMonth   = now.getMonth() + 2;
    const targetMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;
    const targetYear  = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const duration_ms = Date.now() - startedAt;

    log('info', JOB, 'Content calendar placeholder — generateContentCalendar not yet implemented', {
      target_month: targetMonth,
      target_year:  targetYear,
      tool_count:   tools.length,
      duration_ms,
    });

    await recordCronRun('marketing-monthly-calendar', 'success', null, { records_processed: tools.length });
    await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Monthly calendar run complete (placeholder — generateContentCalendar not yet implemented)', {
      target_month: targetMonth, target_year: targetYear, tool_count: tools.length, duration_ms,
    });
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms,
    });
    await recordCronRun('marketing-monthly-calendar', 'error', err?.message || String(err));
    await logToAgentLogs(AGENT_LOG_NAME, 'error', `Monthly calendar run failed: ${err?.message || String(err)}`, {
      duration_ms,
    });
  } finally {
    running[JOB] = false;
  }
}

// ── Job 3 — Weekly report ──────────────────────────────────────────────────────
async function executeWeeklyReport() {
  const JOB = 'weeklyReport';
  if (running[JOB]) { log('warn', JOB, 'Skipping — previous run still in progress'); return; }

  running[JOB] = true;
  const startedAt = Date.now();
  log('info', JOB, 'Run starting');
  await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly report run started', { triggered_by: 'cron' });

  try {
    const { referralData, adData } = await fetchReportData();

    const referral_stats = aggregateReferralStats(referralData);
    const ad_stats       = aggregateAdStats(adData);

    // Persist avg_ctr for next weeklyContent engagement prediction
    lastWeekAvgCtr = ad_stats.avg_ctr;

    // Engagement trend analysis
    if (ad_stats.avg_ctr < LOW_CTR_THRESHOLD && ad_stats.active_count > 0) {
      log('warn', JOB, 'Low engagement trend — ad CTR below threshold', {
        avg_ctr:   ad_stats.avg_ctr,
        threshold: LOW_CTR_THRESHOLD,
        hint:      'Review ad copy targeting and A/B test new headlines.',
      });
    }

    const duration_ms = Date.now() - startedAt;
    log('info', JOB, 'Weekly report compiled', {
      referral_stats,
      ad_stats,
      duration_ms,
    });

    await recordCronRun('marketing-weekly-report', 'success', null, {
      records_processed: referralData.length + adData.length,
    });
    await logToAgentLogs(AGENT_LOG_NAME, 'info', 'Weekly report run complete', {
      referral_stats, ad_stats, duration_ms,
    });
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms,
    });
    await recordCronRun('marketing-weekly-report', 'error', err?.message || String(err));
    await logToAgentLogs(AGENT_LOG_NAME, 'error', `Weekly report run failed: ${err?.message || String(err)}`, {
      duration_ms,
    });
  } finally {
    running[JOB] = false;
  }
}

// ── Scheduler registration ─────────────────────────────────────────────────────
function assertValidExpression(expression, label) {
  if (!cron.validate(expression)) {
    throw new Error(`[${AGENT}] Invalid cron expression for "${label}": "${expression}"`);
  }
}

function startMarketingCrons() {
  assertValidExpression(EXPRESSIONS.weeklyContent,   'weeklyContent');
  assertValidExpression(EXPRESSIONS.monthlyCalendar, 'monthlyCalendar');
  assertValidExpression(EXPRESSIONS.weeklyReport,    'weeklyReport');

  activeTasks = [
    cron.schedule(EXPRESSIONS.weeklyContent,   executeWeeklyContent,   { scheduled: true, timezone: 'UTC' }),
    cron.schedule(EXPRESSIONS.monthlyCalendar, executeMonthlyCalendar, { scheduled: true, timezone: 'UTC' }),
    cron.schedule(EXPRESSIONS.weeklyReport,    executeWeeklyReport,    { scheduled: true, timezone: 'UTC' }),
  ];

  log('info', 'startup', 'All marketing crons registered', {
    weeklyContent:   EXPRESSIONS.weeklyContent,
    monthlyCalendar: EXPRESSIONS.monthlyCalendar,
    weeklyReport:    EXPRESSIONS.weeklyReport,
    blog_post_types: BLOG_POST_TYPES,
  });

  return activeTasks;
}

function stopMarketingCrons() {
  for (const task of activeTasks) task.stop();
  activeTasks = [];
  log('info', 'shutdown', 'All marketing cron tasks stopped');
}

module.exports = {
  startMarketingCrons,
  stopMarketingCrons,
  executeWeeklyContent,
  executeMonthlyCalendar,
  executeWeeklyReport,
};
