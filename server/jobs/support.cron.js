'use strict';

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const {
  generateKnowledgeBaseArticle,
  calculateSupportAnalytics,
} = require('../agents/support-agent');

// ── Schedule 1 — Every 30 min: SLA Monitor ───────────────────────────────────

const slaMonitorJob = cron.schedule('*/30 * * * *', async () => {
  try {
    const oneHourFromNow = new Date(Date.now() + 3600000).toISOString();

    const { data: atRisk, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, sla_deadline')
      .lt('sla_deadline', oneHourFromNow)
      .not('status', 'in', '(resolved,closed,spam)')
      .eq('sla_breached', false);

    if (error) {
      console.error('[SUPPORT CRON] SLA query error:', error.message);
      return;
    }
    if (!atRisk || atRisk.length === 0) return;

    console.log('[SUPPORT CRON] SLA at risk:', atRisk.length, 'tickets');

    // Mark tickets whose deadline has already passed as breached
    const now        = new Date();
    const toBreached = atRisk.filter(t => new Date(t.sla_deadline) < now);

    if (toBreached.length > 0) {
      const { error: updErr } = await supabase
        .from('support_tickets')
        .update({ sla_breached: true })
        .in('id', toBreached.map(t => t.id));

      if (updErr) console.error('[SUPPORT CRON] SLA breach update error:', updErr.message);
    }
  } catch (err) {
    console.error('[SUPPORT CRON] SLA monitor error:', err.message);
  }
});

// ── Schedule 2 — Daily 8AM IST (2:30 AM UTC): Auto-close stale tickets ───────
// IST = UTC+5:30 → 8:00 AM IST = 02:30 AM UTC

const autoCloseJob = cron.schedule('30 2 * * *', async () => {
  console.log('[SUPPORT CRON] Auto-close job starting:', new Date().toISOString());

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

    const { data: stale, error: fetchErr } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('status', 'waiting_user')
      .lt('updated_at', sevenDaysAgo);

    if (fetchErr) {
      console.error('[SUPPORT CRON] Auto-close fetch error:', fetchErr.message);
      return;
    }
    if (!stale || stale.length === 0) {
      console.log('[SUPPORT CRON] Auto-closed: 0');
      return;
    }

    const { error: updErr } = await supabase
      .from('support_tickets')
      .update({
        status:           'closed',
        resolution_notes: 'Auto-closed: No user response in 7 days',
        resolved_by:      'system',
        resolved_at:      new Date().toISOString(),
      })
      .in('id', stale.map(t => t.id));

    if (updErr) {
      console.error('[SUPPORT CRON] Auto-close update error:', updErr.message);
      return;
    }

    console.log('[SUPPORT CRON] Auto-closed:', stale.length);
  } catch (err) {
    console.error('[SUPPORT CRON] Auto-close error:', err.message);
  }
});

// ── Schedule 3 — Weekly Sunday 2AM IST (Sat 20:30 UTC): KB + Analytics ───────
// IST = UTC+5:30 → Sun 2:00 AM IST = Sat 20:30 PM UTC

const weeklyKBJob = cron.schedule('30 20 * * 6', async () => {
  console.log('[SUPPORT CRON] Weekly KB + analytics job starting:', new Date().toISOString());

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

    // Fetch categories from last 7 days (GROUP BY emulated in JS)
    const { data: recentTickets, error: ticketsErr } = await supabase
      .from('support_tickets')
      .select('category')
      .gte('created_at', sevenDaysAgo);

    if (ticketsErr) {
      console.error('[SUPPORT CRON] Weekly KB fetch error:', ticketsErr.message);
      return;
    }

    const categoryCounts = (recentTickets || []).reduce((acc, t) => {
      if (t.category) acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Generate KB article per top category
    for (const category of topCategories) {
      try {
        const article = await generateKnowledgeBaseArticle(category, null);
        if (!article) {
          console.log('[SUPPORT CRON] KB skipped (not enough data):', category);
        }
      } catch (kbErr) {
        console.error('[SUPPORT CRON] KB generation error for', category + ':', kbErr.message);
      }
    }

    // Refresh today's analytics
    await calculateSupportAnalytics();

    console.log('[SUPPORT CRON] Weekly KB + analytics done');
  } catch (err) {
    console.error('[SUPPORT CRON] Weekly job error:', err.message);
  }
});

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = { slaMonitorJob, autoCloseJob, weeklyKBJob };
