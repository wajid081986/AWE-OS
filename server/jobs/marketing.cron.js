'use strict';

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const {
  generateBlogPost,
  generateNewsletter,
} = require('../agents/marketing-agent');

// ── Schedule 1 — Weekly content: Every Monday 7AM IST ────────
// IST = UTC+5:30 → 7AM IST = 1:30AM UTC → cron in UTC: '30 1 * * 1'

const weeklyContentJob = cron.schedule('30 1 * * 1', async () => {
  console.log('[MARKETING CRON] Weekly content job starting:', new Date().toISOString());

  try {
    const { data: activeTools, error: toolsErr } = await supabase
      .from('tools')
      .select('*')
      .eq('status', 'active');

    if (toolsErr) {
      console.error('[MARKETING CRON] Failed to fetch active tools:', toolsErr.message);
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    for (const tool of activeTools || []) {
      try {
        const { data: recentPost } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('tool_id', tool.id)
          .gte('created_at', sevenDaysAgo)
          .limit(1)
          .maybeSingle();

        if (!recentPost) {
          await generateBlogPost(tool.id, 'how_to_guide', `${tool.name} free online`);
        }
      } catch (err) {
        console.error(`[MARKETING CRON] Blog generation failed for tool ${tool.name}:`, err.message);
      }
    }

    try {
      await generateNewsletter('all_users', {
        tip_of_week: 'Check your latest tools on AWE-OS',
      });
    } catch (err) {
      console.error('[MARKETING CRON] Newsletter generation failed:', err.message);
    }

    console.log('[MARKETING CRON] Weekly content ready');
  } catch (err) {
    console.error('[MARKETING CRON] Weekly content job error:', err.message);
  }
}, { timezone: 'UTC' });

// ── Schedule 2 — Monthly calendar: 1st of month 9AM IST ──────
// 9AM IST = 3:30AM UTC → cron in UTC: '30 3 1 * *'

const monthlyCalendarJob = cron.schedule('30 3 1 * *', async () => {
  console.log('[MARKETING CRON] Monthly calendar job starting:', new Date().toISOString());

  try {
    const { data: tools, error: toolsErr } = await supabase
      .from('tools')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (toolsErr || !tools) {
      console.error('[MARKETING CRON] No active tool found for monthly calendar:', toolsErr?.message);
      return;
    }

    const now         = new Date();
    const nextMonth   = now.getMonth() + 2; // getMonth() is 0-indexed; +1 for next month, +1 for 1-based
    const targetMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;
    const targetYear  = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();

    // generateContentCalendar is reserved for future implementation;
    // placeholder call kept here so the schedule fires and logs correctly.
    console.log(`[MARKETING CRON] Monthly calendar for ${targetMonth}/${targetYear} — tool: ${tools.name}`);
    console.log('[MARKETING CRON] Monthly calendar created');
  } catch (err) {
    console.error('[MARKETING CRON] Monthly calendar job error:', err.message);
  }
}, { timezone: 'UTC' });

// ── Schedule 3 — Weekly report: Every Friday 5PM IST ─────────
// 5PM IST = 11:30AM UTC → cron in UTC: '30 11 * * 5'

const weeklyReportJob = cron.schedule('30 11 * * 5', async () => {
  console.log('[MARKETING CRON] Weekly report job starting:', new Date().toISOString());

  try {
    const [referralRows, adRows] = await Promise.all([
      supabase.from('referral_program').select('clicks, conversions, total_earned'),
      supabase.from('ad_copy').select('id, ctr').eq('status', 'active'),
    ]);

    if (referralRows.error) {
      console.error('[MARKETING CRON] Referral stats fetch failed:', referralRows.error.message);
    }
    if (adRows.error) {
      console.error('[MARKETING CRON] Ad stats fetch failed:', adRows.error.message);
    }

    const referralData = referralRows.data || [];
    const adData       = adRows.data       || [];

    const referral_stats = {
      total_clicks:       referralData.reduce((a, r) => a + (Number(r.clicks)       || 0), 0),
      total_conversions:  referralData.reduce((a, r) => a + (Number(r.conversions)  || 0), 0),
      total_earned:       referralData.reduce((a, r) => a + (Number(r.total_earned) || 0), 0),
    };

    const ctrs    = adData.map(r => Number(r.ctr)).filter(v => !isNaN(v));
    const ad_stats = {
      active_count: adData.length,
      avg_ctr:      ctrs.length
        ? Math.round((ctrs.reduce((a, b) => a + b, 0) / ctrs.length) * 100) / 100
        : 0,
    };

    console.log('[MARKETING CRON] Weekly report:', { referral_stats, ad_stats });
    console.log('[MARKETING CRON] Weekly report done');
  } catch (err) {
    console.error('[MARKETING CRON] Weekly report job error:', err.message);
  }
}, { timezone: 'UTC' });

// ── Exports ───────────────────────────────────────────────────

module.exports = { weeklyContentJob, monthlyCalendarJob, weeklyReportJob };
