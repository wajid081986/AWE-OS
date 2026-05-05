'use strict';

/**
 * AWE-OS — Support Agent Cron (Enterprise-Grade)
 *
 * Schedule 1 — Every 30 min   : SLA monitor — alert and mark breached tickets
 *   · Priority scoring (hours_remaining / sla_hours) — surfaces most urgent tickets
 *   · Structured breach alerting with ticket metadata
 *
 * Schedule 2 — Daily 02:30 UTC : Auto-close stale tickets (waiting_user > 7 days)
 *   · Batch update with overlap guard
 *
 * Schedule 3 — Sat 20:30 UTC  : Weekly KB article generation + support analytics
 *   · Auto-categorization feedback (logs top 3 categories for the week)
 *   · recordCronRun() telemetry for all jobs
 *
 * Safety    : Per-job overlap guards · structured JSON logging · batch processing
 *             · recordCronRun() telemetry · never crashes the process
 *             · auto-starts on require (registered via bare require() in index.js)
 */

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const {
  generateKnowledgeBaseArticle,
  calculateSupportAnalytics,
} = require('../agents/support-agent');
const { recordCronRun } = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const EXPRESSIONS = Object.freeze({
  slaMonitor:  '*/30 * * * *',
  autoClose:   '30 2 * * *',
  weeklyKB:    '30 20 * * 6',
});

const AGENT              = 'support-cron';
const STALE_DAYS         = 7;             // auto-close tickets idle this many days
const SLA_LOOKAHEAD_MS   = 3_600_000;     // alert for tickets expiring within 1 hour
const PRIORITY_HIGH_PCT  = 0.25;          // priority >= 0.75 = high-priority ticket
const TOP_KB_CATEGORIES  = 3;             // generate KB articles for top N categories
const AUTO_CLOSE_BATCH   = 100;           // max tickets to close per run

// ── State ──────────────────────────────────────────────────────────────────────
const running = { slaMonitor: false, autoClose: false, weeklyKB: false };
let activeTasks = [];

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

// ── Priority scoring ───────────────────────────────────────────────────────────
function computeSLAPriority(ticket) {
  if (!ticket.sla_deadline) return 0;
  const now         = Date.now();
  const deadline    = new Date(ticket.sla_deadline).getTime();
  const remainingMs = deadline - now;

  if (remainingMs <= 0) return 1.0;   // already breached — maximum priority

  // Normalise: 1h remaining = priority 0.9, 24h remaining = ~0.04
  return Math.min(1.0, SLA_LOOKAHEAD_MS / Math.max(remainingMs, 1));
}

// ── Job 1 — SLA Monitor ────────────────────────────────────────────────────────
async function executeSLAMonitor() {
  const JOB = 'slaMonitor';
  if (running[JOB]) { log('warn', JOB, 'Skipping — previous run still in progress'); return; }

  running[JOB] = true;
  const startedAt = Date.now();

  try {
    const oneHourFromNow = new Date(Date.now() + SLA_LOOKAHEAD_MS).toISOString();

    const { data: atRisk, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, sla_deadline, priority, category, status')
      .lt('sla_deadline', oneHourFromNow)
      .not('status', 'in', '(resolved,closed,spam)')
      .eq('sla_breached', false);

    if (error) {
      log('error', JOB, 'SLA query failed', { error: error.message });
      await recordCronRun('support-sla-monitor', 'error', error.message);
      return;
    }

    if (!atRisk || atRisk.length === 0) {
      log('info', JOB, 'No SLA-at-risk tickets', { duration_ms: Date.now() - startedAt });
      await recordCronRun('support-sla-monitor', 'success', null, { records_processed: 0 });
      return;
    }

    const now = Date.now();

    // Score and sort — highest priority first
    const scored = atRisk
      .map(t => ({ ...t, sla_priority: computeSLAPriority(t) }))
      .sort((a, b) => b.sla_priority - a.sla_priority);

    log('warn', JOB, 'SLA-at-risk tickets detected', {
      count:       scored.length,
      high_priority: scored.filter(t => t.sla_priority >= PRIORITY_HIGH_PCT).length,
    });

    // Log breach alerts for high-priority tickets
    for (const t of scored.filter(t => t.sla_priority >= PRIORITY_HIGH_PCT)) {
      log('warn', JOB, 'SLA breach imminent', {
        ticket_id:     t.id,
        ticket_number: t.ticket_number,
        sla_deadline:  t.sla_deadline,
        sla_priority:  Number(t.sla_priority.toFixed(3)),
        category:      t.category   || null,
        status:        t.status     || null,
      });
    }

    // Mark already-breached tickets
    const breached = atRisk.filter(t => new Date(t.sla_deadline).getTime() < now);
    if (breached.length > 0) {
      const { error: updErr } = await supabase
        .from('support_tickets')
        .update({ sla_breached: true })
        .in('id', breached.map(t => t.id));

      if (updErr) {
        log('error', JOB, 'SLA breach update failed', { error: updErr.message, count: breached.length });
      } else {
        log('warn', JOB, 'SLA breaches marked', { count: breached.length });
      }
    }

    await recordCronRun('support-sla-monitor', 'success', null, {
      records_processed: atRisk.length,
      breached:          breached.length,
    });
  } catch (err) {
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun('support-sla-monitor', 'error', err?.message || String(err));
  } finally {
    running[JOB] = false;
  }
}

// ── Job 2 — Auto-close ─────────────────────────────────────────────────────────
async function executeAutoClose() {
  const JOB = 'autoClose';
  if (running[JOB]) { log('warn', JOB, 'Skipping — previous run still in progress'); return; }

  running[JOB] = true;
  const startedAt = Date.now();
  log('info', JOB, 'Auto-close run starting', { stale_days: STALE_DAYS });

  try {
    const staleThreshold = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();

    const { data: stale, error: fetchErr } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('status', 'waiting_user')
      .lt('updated_at', staleThreshold)
      .limit(AUTO_CLOSE_BATCH);

    if (fetchErr) {
      log('error', JOB, 'Fetch stale tickets failed', { error: fetchErr.message });
      await recordCronRun('support-auto-close', 'error', fetchErr.message);
      return;
    }

    if (!stale || stale.length === 0) {
      log('info', JOB, 'No stale tickets to close', { duration_ms: Date.now() - startedAt });
      await recordCronRun('support-auto-close', 'success', null, { records_processed: 0 });
      return;
    }

    const { error: updErr } = await supabase
      .from('support_tickets')
      .update({
        status:           'closed',
        resolution_notes: `Auto-closed: No user response in ${STALE_DAYS} days`,
        resolved_by:      'system',
        resolved_at:      new Date().toISOString(),
      })
      .in('id', stale.map(t => t.id));

    if (updErr) {
      log('error', JOB, 'Auto-close update failed', { error: updErr.message });
      await recordCronRun('support-auto-close', 'error', updErr.message);
      return;
    }

    log('info', JOB, 'Auto-close complete', { closed: stale.length, duration_ms: Date.now() - startedAt });
    await recordCronRun('support-auto-close', 'success', null, { records_processed: stale.length });
  } catch (err) {
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun('support-auto-close', 'error', err?.message || String(err));
  } finally {
    running[JOB] = false;
  }
}

// ── Job 3 — Weekly KB + analytics ─────────────────────────────────────────────
async function executeWeeklyKB() {
  const JOB = 'weeklyKB';
  if (running[JOB]) { log('warn', JOB, 'Skipping — previous run still in progress'); return; }

  running[JOB] = true;
  const startedAt    = Date.now();
  const sevenDaysAgo = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  log('info', JOB, 'Weekly KB + analytics run starting');

  try {
    const { data: recentTickets, error: ticketsErr } = await supabase
      .from('support_tickets')
      .select('category')
      .gte('created_at', sevenDaysAgo);

    if (ticketsErr) {
      log('error', JOB, 'Ticket category fetch failed', { error: ticketsErr.message });
      await recordCronRun('support-weekly-kb', 'error', ticketsErr.message);
      return;
    }

    // Aggregate category counts (auto-categorization feedback)
    const categoryCounts = (recentTickets || []).reduce((acc, t) => {
      if (t.category) acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_KB_CATEGORIES);

    log('info', JOB, 'Top support categories this week', {
      categories: topCategories.map(([cat, count]) => ({ category: cat, ticket_count: count })),
      total_tickets: recentTickets?.length ?? 0,
    });

    // Generate KB article per top category
    let kbGenerated = 0, kbFailed = 0;
    for (const [category] of topCategories) {
      try {
        const article = await generateKnowledgeBaseArticle(category, null);
        if (article) {
          kbGenerated++;
          log('info', JOB, 'KB article generated', { category });
        } else {
          log('info', JOB, 'KB article skipped — insufficient data', { category });
        }
      } catch (kbErr) {
        kbFailed++;
        log('error', JOB, 'KB article generation failed', { category, error: kbErr?.message || String(kbErr) });
      }
    }

    // Refresh analytics
    try {
      await calculateSupportAnalytics();
      log('info', JOB, 'Support analytics refreshed');
    } catch (analyticsErr) {
      log('error', JOB, 'Support analytics refresh failed', { error: analyticsErr?.message || String(analyticsErr) });
    }

    log('info', JOB, 'Weekly KB + analytics complete', {
      kb_generated: kbGenerated,
      kb_failed:    kbFailed,
      duration_ms:  Date.now() - startedAt,
    });

    await recordCronRun('support-weekly-kb', 'success', null, {
      records_processed: kbGenerated,
      top_categories:    topCategories.map(([c]) => c),
    });
  } catch (err) {
    log('error', JOB, 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun('support-weekly-kb', 'error', err?.message || String(err));
  } finally {
    running[JOB] = false;
  }
}

// ── Scheduler — auto-starts on require ────────────────────────────────────────
function startSupportCrons() {
  for (const [label, expr] of Object.entries(EXPRESSIONS)) {
    if (!cron.validate(expr)) throw new Error(`[${AGENT}] Invalid cron expression for "${label}": "${expr}"`);
  }

  activeTasks = [
    cron.schedule(EXPRESSIONS.slaMonitor, executeSLAMonitor, { scheduled: true, timezone: 'UTC' }),
    cron.schedule(EXPRESSIONS.autoClose,  executeAutoClose,  { scheduled: true, timezone: 'UTC' }),
    cron.schedule(EXPRESSIONS.weeklyKB,   executeWeeklyKB,   { scheduled: true, timezone: 'UTC' }),
  ];

  log('info', 'startup', 'All support crons registered', {
    slaMonitor: EXPRESSIONS.slaMonitor,
    autoClose:  EXPRESSIONS.autoClose,
    weeklyKB:   EXPRESSIONS.weeklyKB,
  });

  return activeTasks;
}

function stopSupportCrons() {
  for (const task of activeTasks) task.stop();
  activeTasks = [];
  log('info', 'shutdown', 'All support cron tasks stopped');
}

const scheduledJobs = startSupportCrons();

module.exports = {
  scheduledJobs,
  startSupportCrons,
  stopSupportCrons,
  executeSLAMonitor,
  executeAutoClose,
  executeWeeklyKB,
};
