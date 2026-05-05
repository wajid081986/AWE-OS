'use strict';

/**
 * AWE-OS — Marketing Cron
 *
 * Schedule 1 — Weekly content   : Every Monday 07:00 IST (01:30 UTC)
 *   · Generate blog post for each active tool (if none in last 7 days)
 *   · Send weekly newsletter to all users
 *
 * Schedule 2 — Monthly calendar : 1st of month 09:00 IST (03:30 UTC)
 *   · Placeholder for content-calendar generation (future implementation)
 *
 * Schedule 3 — Weekly report    : Every Friday 17:00 IST (11:30 UTC)
 *   · Aggregate referral + ad performance stats and log structured report
 *
 * Safety    : Per-job overlap guards · structured logging · maybeSingle()
 *             · graceful shutdown · never crashes the server process
 *
 * Registration (in index.js):
 *   const { startMarketingCrons } = require('./crons/marketing-cron');
 *   startMarketingCrons();
 */

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const {
  generateBlogPost,
  generateNewsletter,
} = require('../agents/marketing-agent');

// ── Config ────────────────────────────────────────────────────

// IST = UTC+5:30
// Mon 07:00 IST  = Mon 01:30 UTC
// 1st  09:00 IST = 1st 03:30 UTC
// Fri  17:00 IST = Fri 11:30 UTC
const EXPRESSIONS = Object.freeze({
  weeklyContent:   '30 1 * * 1',
  monthlyCalendar: '30 3 1 * *',
  weeklyReport:    '30 11 * * 5',
});

const AGENT              = 'marketing-cron';
const SEVEN_DAYS_MS      = 7 * 24 * 60 * 60 * 1000;
const BLOG_POST_TYPE     = 'how_to_guide';
const NEWSLETTER_SEGMENT = 'all_users';

// ── State — per-job overlap guards ────────────────────────────

const running = {
  weeklyContent:   false,
  monthlyCalendar: false,
  weeklyReport:    false,
};

let activeTasks = [];

// ── Structured logger ─────────────────────────────────────────

/**
 * Emit a structured JSON log line.
 * Never throws — logging must never interrupt the cron flow.
 *
 * @param {'info'|'warn'|'error'} level
 * @param {string} job
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
function log(level, job, message, data = {}) {
  try {
    const line = JSON.stringify({
      agent:     AGENT,
      job,
      level,
      message,
      ...data,
      timestamp: new Date().toISOString(),
    });
    if (level === 'error') console.error(line);
    else if (level === 'warn')  console.warn(line);
    else console.log(line);
  } catch (_) {
    console.log(`[${AGENT}:${job}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Query helpers ─────────────────────────────────────────────

/**
 * Fetch all active tools.
 *
 * @returns {Promise<object[]>}
 */
async function fetchActiveTools() {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('status', 'live');   // 'live' is the correct published status in this codebase

  if (error) throw Object.assign(
    new Error(`Failed to fetch active tools: ${error.message}`),
    { code: 'FETCH_TOOLS_FAILED', cause: error }
  );

  return data || [];
}

/**
 * Check whether a blog post already exists for a tool
 * within the last 7 days. Uses maybeSingle() — safe when
 * zero or multiple rows exist.
 *
 * @param {string} toolId
 * @param {string} since  ISO timestamp
 * @returns {Promise<boolean>} true if a recent post exists
 */
async function hasRecentBlogPost(toolId, since) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('tool_id', toolId)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();

  if (error) {
    // Non-fatal — if we can't confirm, we skip generation conservatively
    throw Object.assign(
      new Error(`Blog post check failed for tool ${toolId}: ${error.message}`),
      { code: 'BLOG_CHECK_FAILED', cause: error }
    );
  }

  return data !== null;
}

/**
 * Fetch referral stats and active ad stats in parallel.
 *
 * @returns {Promise<{ referralData: object[], adData: object[] }>}
 */
async function fetchReportData() {
  const [referralResult, adResult] = await Promise.allSettled([
    supabase
      .from('referral_program')
      .select('clicks, conversions, total_earned'),
    supabase
      .from('ad_copy')
      .select('id, ctr')
      .eq('status', 'active'),
  ]);

  const referralData =
    referralResult.status === 'fulfilled' && !referralResult.value.error
      ? referralResult.value.data || []
      : [];

  const adData =
    adResult.status === 'fulfilled' && !adResult.value.error
      ? adResult.value.data || []
      : [];

  if (referralResult.status === 'rejected' || referralResult.value?.error) {
    const msg = referralResult.reason?.message || referralResult.value?.error?.message;
    log('warn', 'weeklyReport', 'Referral stats fetch failed — using empty data', { error: msg });
  }

  if (adResult.status === 'rejected' || adResult.value?.error) {
    const msg = adResult.reason?.message || adResult.value?.error?.message;
    log('warn', 'weeklyReport', 'Ad stats fetch failed — using empty data', { error: msg });
  }

  return { referralData, adData };
}

// ── Aggregation helpers ───────────────────────────────────────

/**
 * Aggregate referral rows into summary totals.
 *
 * @param {object[]} rows
 * @returns {{ total_clicks: number, total_conversions: number, total_earned: number }}
 */
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

/**
 * Compute average CTR from active ad rows.
 *
 * @param {object[]} rows
 * @returns {{ active_count: number, avg_ctr: number }}
 */
function aggregateAdStats(rows) {
  const ctrs = rows.map((r) => Number(r.ctr)).filter((v) => Number.isFinite(v));
  const avg_ctr =
    ctrs.length > 0
      ? Math.round((ctrs.reduce((a, b) => a + b, 0) / ctrs.length) * 100) / 100
      : 0;

  return { active_count: rows.length, avg_ctr };
}

// ── Job 1 — Weekly content ────────────────────────────────────

/**
 * For each active tool: generate a blog post if none exists in the last 7 days.
 * Then send the weekly newsletter.
 *
 * Runs tools sequentially — parallel AI calls would hit rate limits.
 *
 * @returns {Promise<void>}
 */
async function executeWeeklyContent() {
  const JOB = 'weeklyContent';

  if (running[JOB]) {
    log('warn', JOB, 'Skipping — previous run still in progress');
    return;
  }

  running[JOB]    = true;
  const startedAt = Date.now();

  log('info', JOB, 'Run starting');

  try {
    const tools = await fetchActiveTools();

    if (tools.length === 0) {
      log('info', JOB, 'No active tools found — skipping blog generation');
    }

    const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    let generated = 0;
    let skipped   = 0;
    let failed    = 0;

    for (const tool of tools) {
      try {
        const alreadyPosted = await hasRecentBlogPost(tool.id, since);

        if (alreadyPosted) {
          skipped++;
          log('info', JOB, 'Blog post skipped — recent post exists', {
            tool_id:   tool.id,
            tool_name: tool.name,
          });
          continue;
        }

        await generateBlogPost(tool.id, BLOG_POST_TYPE, `${tool.name} free online`);
        generated++;

        log('info', JOB, 'Blog post generated', {
          tool_id:   tool.id,
          tool_name: tool.name,
        });
      } catch (err) {
        failed++;
        log('error', JOB, 'Blog post generation failed — skipping tool', {
          tool_id:   tool.id,
          tool_name: tool.name,
          error:     err?.message || String(err),
        });
      }
    }

    log('info', JOB, 'Blog generation complete', { generated, skipped, failed });

    // Newsletter — non-fatal if it fails
    try {
      await generateNewsletter(NEWSLETTER_SEGMENT, {
        tip_of_week: 'Check your latest tools on AWE-OS',
      });
      log('info', JOB, 'Newsletter sent', { segment: NEWSLETTER_SEGMENT });
    } catch (err) {
      log('error', JOB, 'Newsletter generation failed', {
        error: err?.message || String(err),
      });
    }

    log('info', JOB, 'Run complete', { duration_ms: Date.now() - startedAt });
  } catch (err) {
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      stack:       err?.stack   || null,
      duration_ms: Date.now() - startedAt,
    });
  } finally {
    running[JOB] = false;
  }
}

// ── Job 2 — Monthly calendar ──────────────────────────────────

/**
 * Placeholder for content-calendar generation.
 * Logs the target month and tool — ready for implementation.
 *
 * Uses maybeSingle() so zero active tools returns null safely
 * instead of throwing PGRST116.
 *
 * @returns {Promise<void>}
 */
async function executeMonthlyCalendar() {
  const JOB = 'monthlyCalendar';

  if (running[JOB]) {
    log('warn', JOB, 'Skipping — previous run still in progress');
    return;
  }

  running[JOB]    = true;
  const startedAt = Date.now();

  log('info', JOB, 'Run starting');

  try {
    // Fetch ALL active tools — not just one — so the calendar
    // can eventually cover the full tool portfolio.
    const tools = await fetchActiveTools();

    if (tools.length === 0) {
      log('warn', JOB, 'No active tools found — skipping calendar generation');
      return;
    }

    const now         = new Date();
    const nextMonth   = now.getMonth() + 2;   // getMonth() is 0-indexed; +1 next, +1 1-based
    const targetMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;
    const targetYear  = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();

    log('info', JOB, 'Content calendar target computed', {
      target_month: targetMonth,
      target_year:  targetYear,
      tool_count:   tools.length,
    });

    // TODO: implement generateContentCalendar(tools, targetMonth, targetYear)
    // Placeholder — logs intent so the schedule fires and is observable.
    log('info', JOB, 'generateContentCalendar — not yet implemented; placeholder fired', {
      target_month: targetMonth,
      target_year:  targetYear,
      duration_ms:  Date.now() - startedAt,
    });
  } catch (err) {
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      stack:       err?.stack   || null,
      duration_ms: Date.now() - startedAt,
    });
  } finally {
    running[JOB] = false;
  }
}

// ── Job 3 — Weekly report ─────────────────────────────────────

/**
 * Aggregate referral + ad performance stats and emit a structured report log.
 * Uses Promise.allSettled() so one failing query never blocks the other.
 *
 * @returns {Promise<void>}
 */
async function executeWeeklyReport() {
  const JOB = 'weeklyReport';

  if (running[JOB]) {
    log('warn', JOB, 'Skipping — previous run still in progress');
    return;
  }

  running[JOB]    = true;
  const startedAt = Date.now();

  log('info', JOB, 'Run starting');

  try {
    const { referralData, adData } = await fetchReportData();

    const referral_stats = aggregateReferralStats(referralData);
    const ad_stats       = aggregateAdStats(adData);

    log('info', JOB, 'Weekly report compiled', {
      referral_stats,
      ad_stats,
      duration_ms: Date.now() - startedAt,
    });
  } catch (err) {
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      stack:       err?.stack   || null,
      duration_ms: Date.now() - startedAt,
    });
  } finally {
    running[JOB] = false;
  }
}

// ── Scheduler registration ────────────────────────────────────

/**
 * Validate a cron expression and throw clearly if invalid.
 *
 * @param {string} expression
 * @param {string} label
 */
function assertValidExpression(expression, label) {
  if (!cron.validate(expression)) {
    throw new Error(`[${AGENT}] Invalid cron expression for "${label}": "${expression}"`);
  }
}

/**
 * Register all three marketing cron schedules.
 * Call ONCE from index.js at server startup.
 *
 * @returns {import('node-cron').ScheduledTask[]} Array of tasks (for shutdown / tests)
 */
function startMarketingCrons() {
  assertValidExpression(EXPRESSIONS.weeklyContent,   'weeklyContent');
  assertValidExpression(EXPRESSIONS.monthlyCalendar, 'monthlyCalendar');
  assertValidExpression(EXPRESSIONS.weeklyReport,    'weeklyReport');

  const weeklyContentJob = cron.schedule(
    EXPRESSIONS.weeklyContent,
    executeWeeklyContent,
    { scheduled: true, timezone: 'UTC' }
  );

  const monthlyCalendarJob = cron.schedule(
    EXPRESSIONS.monthlyCalendar,
    executeMonthlyCalendar,
    { scheduled: true, timezone: 'UTC' }
  );

  const weeklyReportJob = cron.schedule(
    EXPRESSIONS.weeklyReport,
    executeWeeklyReport,
    { scheduled: true, timezone: 'UTC' }
  );

  activeTasks = [weeklyContentJob, monthlyCalendarJob, weeklyReportJob];

  log('info', 'startup', 'All marketing crons registered', {
    weeklyContent:   EXPRESSIONS.weeklyContent,
    monthlyCalendar: EXPRESSIONS.monthlyCalendar,
    weeklyReport:    EXPRESSIONS.weeklyReport,
  });

  return activeTasks;
}

/**
 * Stop all active marketing cron tasks.
 * Safe to call even if startMarketingCrons() was never called.
 */
function stopMarketingCrons() {
  for (const task of activeTasks) {
    task.stop();
  }
  activeTasks = [];
  log('info', 'shutdown', 'All marketing cron tasks stopped');
}

// ── Exports ───────────────────────────────────────────────────
//
// No top-level side effects.
// startMarketingCrons() is called exclusively by index.js.
// Individual execute* functions are exported for integration tests.

module.exports = {
  startMarketingCrons,
  stopMarketingCrons,
  executeWeeklyContent,
  executeMonthlyCalendar,
  executeWeeklyReport,
};
