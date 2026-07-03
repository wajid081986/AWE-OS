'use strict';

const supabase                    = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');
const { sendEmail }               = require('../services/email.service');

// ── Helpers ───────────────────────────────────────────────────

function safe(n)    { return isNaN(Number(n)) ? 0 : Number(n); }
function round2(n)  { return Math.round(safe(n) * 100) / 100; }
function divSafe(a, b) { return b > 0 ? round2(a / b) : 0; }

function maskEmail(email) {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

const UPSELL_SUBJECTS = {
  free_to_paid: "You're getting a lot out of AWE-OS — here's an upgrade offer",
  re_engage:    'We miss you — a re-engagement offer from AWE-OS',
  cross_sell:   'Unlock the full AWE-OS tool suite',
};

function buildUpsellEmailHtml(opp) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;line-height:1.5;">
      <p>Hi,</p>
      <p>${opp.ai_message}</p>
      <p>
        <a href="https://www.awe-os.com/pricing"
           style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
          View Plans
        </a>
      </p>
      <p style="color:#888;font-size:12px;">You're receiving this because you're an AWE-OS user. This is a one-time offer email for this opportunity.</p>
    </div>
  `;
}

// ── generateRevenueInsights ───────────────────────────────────

async function generateRevenueInsights(metrics) {
  const prompt = `You are a SaaS Revenue Analyst.
Analyze these metrics and provide insights.

Revenue Data:
- Daily Revenue: ₹${metrics.daily_revenue}
- Monthly Revenue: ₹${metrics.monthly_revenue}
- MRR: ₹${metrics.mrr}
- Total Transactions: ${metrics.total_transactions}
- Failed Transactions: ${metrics.failed_txns}
- Active Subscribers: ${metrics.active_subscribers}
- Churn Rate: ${metrics.churn_rate}%
- Avg Order Value: ₹${metrics.avg_order_value}
- LTV: ₹${metrics.ltv}

Return ONLY this exact JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence business summary",
  "trend": "growing",
  "health_score": 75,
  "risks": [
    "Specific risk 1",
    "Specific risk 2"
  ],
  "opportunities": [
    "Specific opportunity 1",
    "Specific opportunity 2"
  ],
  "top_priority": "Most important action right now",
  "revenue_forecast_30d": 5000
}

trend must be exactly one of: growing, stable, declining
Base everything on actual numbers provided.`;

  try {
    const raw = await callOpenAI(prompt, { max_tokens: 800, temperature: 0.3 });
    return parseJSONResponse(raw);
  } catch (err) {
    console.error('[REVENUE AGENT] AI insights failed:', err.message);
    return {
      summary: 'AI analysis unavailable. Review metrics manually.',
      trend: 'stable',
      health_score: 50,
      risks: [],
      opportunities: [],
      top_priority: 'Run snapshot again to generate insights.',
      revenue_forecast_30d: 0,
    };
  }
}

// ── checkRevenueAlerts ────────────────────────────────────────

async function checkRevenueAlerts(metrics, yesterdayRevenue) {
  const alerts = [];
  const today = new Date().toISOString().split('T')[0];

  const addAlert = async (alert_type, severity, title, message, data = {}, action_required = false, suggested_action = '') => {
    // Skip duplicate alerts created today
    const { data: existing } = await supabase
      .from('revenue_alerts')
      .select('id')
      .eq('alert_type', alert_type)
      .gte('created_at', `${today}T00:00:00`)
      .limit(1);

    if (existing && existing.length > 0) return;

    const { data: inserted } = await supabase
      .from('revenue_alerts')
      .insert({ alert_type, severity, title, message, data, action_required, suggested_action })
      .select()
      .single();

    if (inserted) {
      alerts.push(inserted);
      console.log(`[REVENUE AGENT] Alert created: ${alert_type}`);
    }
  };

  // ALERT 1 — Revenue Drop (compare to yesterday)
  if (yesterdayRevenue > 0 && metrics.daily_revenue < yesterdayRevenue * 0.5) {
    const drop = round2(((yesterdayRevenue - metrics.daily_revenue) / yesterdayRevenue) * 100);
    await addAlert(
      'revenue_drop', 'critical',
      `Revenue dropped ${drop}%`,
      `Today's revenue ₹${metrics.daily_revenue} is ${drop}% below yesterday's ₹${yesterdayRevenue}.`,
      { today: metrics.daily_revenue, yesterday: yesterdayRevenue, drop_pct: drop },
      true, 'Check for payment gateway issues or traffic drops.'
    );
  }

  // ALERT 2 — Churn Spike
  if (safe(metrics.churn_rate) > 20) {
    await addAlert(
      'churn_spike', 'warning',
      `High churn rate detected: ${metrics.churn_rate}%`,
      `Monthly churn rate has exceeded 20%. ${metrics.churned_users} users churned this period.`,
      { churn_rate: metrics.churn_rate, churned_users: metrics.churned_users },
      true, 'Run upsell campaigns and check for product issues.'
    );
  }

  // ALERT 3 — Payment Failure Surge
  if (metrics.successful_txns > 0 && metrics.failed_txns > metrics.successful_txns * 0.3) {
    const failRate = round2((metrics.failed_txns / (metrics.failed_txns + metrics.successful_txns)) * 100);
    await addAlert(
      'payment_failure_surge', 'critical',
      `${failRate}% payment failure rate`,
      `${metrics.failed_txns} failed vs ${metrics.successful_txns} successful transactions today.`,
      { failed: metrics.failed_txns, successful: metrics.successful_txns, rate: failRate },
      true, 'Check Razorpay dashboard for gateway issues.'
    );
  }

  // ALERT 4 — Revenue Milestones
  const milestones = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  for (const milestone of milestones) {
    if (safe(metrics.total_revenue) >= milestone && safe(yesterdayRevenue) < milestone) {
      await addAlert(
        'milestone_reached', 'info',
        `🎉 Revenue milestone: ₹${milestone.toLocaleString('en-IN')}`,
        `Total revenue crossed ₹${milestone.toLocaleString('en-IN')}. Current total: ₹${metrics.total_revenue}.`,
        { milestone, total_revenue: metrics.total_revenue }
      );
      break; // Only one milestone alert at a time
    }
  }

  // ALERT 5 — MRR Growth (compare to last month's snapshot)
  if (metrics.monthly_revenue > 0) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const { data: lastSnapshot } = await supabase
      .from('revenue_snapshots')
      .select('monthly_revenue')
      .lte('snapshot_date', oneMonthAgo.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    const lastMonthRev = safe(lastSnapshot?.monthly_revenue);
    if (lastMonthRev > 0 && metrics.monthly_revenue > lastMonthRev * 1.2) {
      const growth = round2(((metrics.monthly_revenue - lastMonthRev) / lastMonthRev) * 100);
      await addAlert(
        'mrr_growth', 'info',
        `MRR growing ${growth}% month over month`,
        `Monthly revenue ₹${metrics.monthly_revenue} vs last month ₹${lastMonthRev}. Keep it up!`,
        { growth_pct: growth, current: metrics.monthly_revenue, previous: lastMonthRev }
      );
    }
  }

  return alerts;
}

// ── calculateDailySnapshot ────────────────────────────────────

async function calculateDailySnapshot() {
  console.log('[REVENUE AGENT] Calculating snapshot...');
  const today = new Date().toISOString().split('T')[0];

  // STEP 1 — Today's successful transactions
  const { data: todayLogs = [], error: todayErr } = await supabase
    .from('revenue_logs')
    .select('amount, user_id, tool_id, status, created_at, order_id')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  if (todayErr) console.error('[REVENUE AGENT] Today logs error:', todayErr.message);

  const successToday = (todayLogs || []).filter(r => r.status === 'success');
  const failedToday  = (todayLogs || []).filter(r => r.status === 'failed');

  const daily_revenue       = round2(successToday.reduce((s, r) => s + safe(r.amount), 0));
  const total_transactions  = successToday.length;
  const failed_txns         = failedToday.length;
  const avg_order_value     = divSafe(daily_revenue, total_transactions);

  console.log(`[REVENUE AGENT] Daily revenue: ₹${daily_revenue}`);

  // STEP 2 — Weekly revenue
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weekLogs = [] } = await supabase
    .from('revenue_logs')
    .select('amount')
    .eq('status', 'success')
    .gte('created_at', weekAgo);
  const weekly_revenue = round2((weekLogs || []).reduce((s, r) => s + safe(r.amount), 0));

  // STEP 3 — Monthly revenue
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: monthLogs = [] } = await supabase
    .from('revenue_logs')
    .select('amount')
    .eq('status', 'success')
    .gte('created_at', monthAgo);
  const monthly_revenue = round2((monthLogs || []).reduce((s, r) => s + safe(r.amount), 0));

  // STEP 4 — Total revenue (all time)
  const { data: allLogs = [] } = await supabase
    .from('revenue_logs')
    .select('amount, user_id')
    .eq('status', 'success');
  const total_revenue = round2((allLogs || []).reduce((s, r) => s + safe(r.amount), 0));

  // STEP 5 — MRR / ARR
  const mrr = monthly_revenue;
  const arr = round2(mrr * 12);

  // STEP 6 — LTV
  const uniqueUsers = new Set((allLogs || []).map(r => r.user_id).filter(Boolean));
  const ltv = divSafe(total_revenue, uniqueUsers.size);

  // STEP 7 — Churn
  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: lastMonthPayers = [] } = await supabase
    .from('revenue_logs')
    .select('user_id')
    .eq('status', 'success')
    .gte('created_at', twoMonthsAgo)
    .lt('created_at', monthAgo);

  const lastMonthUserSet  = new Set((lastMonthPayers || []).map(r => r.user_id).filter(Boolean));
  const thisMonthUserSet  = new Set((monthLogs || []).map(r => r.user_id).filter(Boolean));
  const churned_users     = [...lastMonthUserSet].filter(uid => !thisMonthUserSet.has(uid)).length;
  const churn_rate        = round2(divSafe(churned_users * 100, lastMonthUserSet.size));

  // STEP 7b — Active & new subscribers
  const { data: premiumUsers = [] } = await supabase
    .from('users')
    .select('id, created_at')
    .eq('is_premium', true);

  const active_subscribers = (premiumUsers || []).length;
  const newSubCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const new_subscribers    = (premiumUsers || []).filter(u => u.created_at >= newSubCutoff).length;

  // STEP 8 — Revenue by tool
  const toolRevenueMap = {};
  for (const log of (allLogs || [])) {
    if (!log.tool_id) continue;
    if (!toolRevenueMap[log.tool_id]) toolRevenueMap[log.tool_id] = { revenue: 0, transactions: 0 };
    toolRevenueMap[log.tool_id].revenue      += safe(log.amount);
    toolRevenueMap[log.tool_id].transactions += 1;
  }

  // Fetch tool names for the map
  const toolIds = Object.keys(toolRevenueMap);
  let toolNameMap = {};
  if (toolIds.length > 0) {
    const { data: toolRows = [] } = await supabase
      .from('tools')
      .select('id, name')
      .in('id', toolIds);
    (toolRows || []).forEach(t => { toolNameMap[t.id] = t.name; });
  }

  const revenue_by_tool = Object.entries(toolRevenueMap).map(([tool_id, v]) => ({
    tool_id,
    tool_name:    toolNameMap[tool_id] || 'Unknown',
    revenue:      round2(v.revenue),
    transactions: v.transactions,
  })).sort((a, b) => b.revenue - a.revenue);

  const metrics = {
    daily_revenue, weekly_revenue, monthly_revenue, total_revenue,
    total_transactions, successful_txns: total_transactions, failed_txns,
    avg_order_value,
    active_subscribers, new_subscribers, churned_users, churn_rate,
    mrr, arr, ltv,
  };

  // STEP 9 — AI insights
  const ai_insights = await generateRevenueInsights(metrics);

  // STEP 10 — Upsert snapshot
  const snapshotPayload = {
    snapshot_date:      today,
    daily_revenue,      weekly_revenue,  monthly_revenue, total_revenue,
    total_transactions, successful_txns: total_transactions, failed_txns,
    avg_order_value,    active_subscribers, new_subscribers,
    churned_users,      churn_rate,
    mrr, arr, ltv,
    revenue_by_tool,
    ai_insights,
  };

  const { data: snapshot, error: upsertErr } = await supabase
    .from('revenue_snapshots')
    .upsert(snapshotPayload, { onConflict: 'snapshot_date' })
    .select()
    .single();

  if (upsertErr) console.error('[REVENUE AGENT] Snapshot upsert error:', upsertErr.message);

  // STEP 11 — Get yesterday's revenue for alert comparison
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: ySnap } = await supabase
    .from('revenue_snapshots')
    .select('daily_revenue')
    .eq('snapshot_date', yesterday)
    .single();
  const yesterdayRevenue = safe(ySnap?.daily_revenue);

  await checkRevenueAlerts({ ...metrics, total_revenue }, yesterdayRevenue);

  console.log(`[REVENUE AGENT] Snapshot saved: daily=₹${daily_revenue} mrr=₹${mrr} churn=${churn_rate}%`);
  return snapshot || snapshotPayload;
}

// ── findUpsellOpportunities ───────────────────────────────────

async function findUpsellOpportunities() {
  console.log('[REVENUE AGENT] Finding upsell opportunities...');
  const opportunities = [];

  // STEP 1 — High-usage free users
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: highUsageEvents = [] } = await supabase
    .from('tool_events')
    .select('user_id, tool_id, count:user_id')
    .gte('created_at', monthAgo);

  // Count events per user
  const userEventCounts = {};
  for (const row of (highUsageEvents || [])) {
    userEventCounts[row.user_id] = (userEventCounts[row.user_id] || 0) + 1;
  }

  // Find users with >10 events who are not premium
  const highUsageUserIds = Object.entries(userEventCounts)
    .filter(([, count]) => count > 10)
    .map(([uid]) => uid);

  if (highUsageUserIds.length > 0) {
    const { data: freeUsers = [] } = await supabase
      .from('users')
      .select('id, email')
      .in('id', highUsageUserIds)
      .eq('is_premium', false);

    for (const user of (freeUsers || []).slice(0, 20)) {
      const eventCount = userEventCounts[user.id] || 0;
      const score = Math.min(95, 80 + Math.floor(eventCount / 5));
      opportunities.push({
        user_id:          user.id,
        user_email:       maskEmail(user.email),
        real_email:       user.email,
        opportunity_type: 'free_to_paid',
        current_plan:     'free',
        suggested_plan:   'premium',
        suggested_price:  999.00,
        reason:           `User has ${eventCount} tool interactions in the last 30 days`,
        score,
        ai_message:       `You've been using AWE-OS tools ${eventCount} times this month. Upgrade to Premium to unlock unlimited access and advanced features for just ₹999.`,
        status:           'identified',
      });
    }
  }

  // STEP 2 — Churned users (paid 30-60 days ago, nothing recently)
  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldPayers = [] } = await supabase
    .from('revenue_logs')
    .select('user_id, amount')
    .eq('status', 'success')
    .gte('created_at', twoMonthsAgo)
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const { data: recentPayers = [] } = await supabase
    .from('revenue_logs')
    .select('user_id')
    .eq('status', 'success')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const recentPayerSet = new Set((recentPayers || []).map(r => r.user_id));
  const churnedPayers  = (oldPayers || []).filter(r => !recentPayerSet.has(r.user_id));

  for (const payer of churnedPayers.slice(0, 10)) {
    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', payer.user_id)
      .single();

    if (!userRow) continue;
    opportunities.push({
      user_id:          payer.user_id,
      user_email:       maskEmail(userRow.email),
      real_email:       userRow.email,
      opportunity_type: 're_engage',
      current_plan:     'free',
      suggested_plan:   'premium',
      suggested_price:  799.00,
      reason:           `Was a paying customer (₹${payer.amount}) but lapsed 30-60 days ago`,
      score:            65,
      ai_message:       `We miss you! Come back and continue building with AWE-OS. Special re-engagement offer: ₹799 for 3 months Premium.`,
      status:           'identified',
    });
  }

  // STEP 3 — Single-tool premium users (cross-sell)
  const { data: premiumPayments = [] } = await supabase
    .from('revenue_logs')
    .select('user_id, tool_id')
    .eq('status', 'success');

  const userToolMap = {};
  for (const r of (premiumPayments || [])) {
    if (!userToolMap[r.user_id]) userToolMap[r.user_id] = new Set();
    userToolMap[r.user_id].add(r.tool_id);
  }

  const singleToolUsers = Object.entries(userToolMap)
    .filter(([, tools]) => tools.size === 1)
    .slice(0, 10);

  for (const [user_id] of singleToolUsers) {
    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', user_id)
      .single();

    if (!userRow) continue;
    opportunities.push({
      user_id,
      user_email:       maskEmail(userRow.email),
      real_email:       userRow.email,
      opportunity_type: 'cross_sell',
      current_plan:     'premium',
      suggested_plan:   'premium_plus',
      suggested_price:  1499.00,
      reason:           'Paying for 1 tool — opportunity to expand to full suite',
      score:            55,
      ai_message:       `You're already getting great results. Try our full tool suite for just ₹1,499/month and multiply your revenue streams.`,
      status:           'identified',
    });
  }

  // STEP 4 — Save opportunities (skip existing ones for same user+type), then
  // email only the newly-identified ones — re-running this job daily must
  // never re-email a user for an opportunity we already told them about.
  let saved = 0, emailed = 0, emailFailed = 0;
  for (const opp of opportunities) {
    const { data: exists } = await supabase
      .from('upsell_opportunities')
      .select('id')
      .eq('user_id', opp.user_id)
      .eq('opportunity_type', opp.opportunity_type)
      .eq('status', 'identified')
      .limit(1);

    if (exists && exists.length > 0) continue;

    const { real_email, ...oppForInsert } = opp;
    await supabase.from('upsell_opportunities').insert(oppForInsert);
    saved++;

    if (real_email) {
      try {
        await sendEmail({
          to:      real_email,
          subject: UPSELL_SUBJECTS[opp.opportunity_type] || 'A special offer from AWE-OS',
          html:    buildUpsellEmailHtml(opp),
        });
        emailed++;
      } catch (err) {
        emailFailed++;
        console.error(`[REVENUE AGENT] Upsell email failed | user_id=${opp.user_id}:`, err.message);
      }
    }
  }

  const byType = opportunities.reduce((acc, o) => {
    acc[o.opportunity_type] = (acc[o.opportunity_type] || 0) + 1;
    return acc;
  }, {});

  const estimatedRevenue = opportunities.reduce((s, o) => s + safe(o.suggested_price), 0);

  console.log(`[REVENUE AGENT] Upsells found: ${opportunities.length} (saved ${saved} new, emailed ${emailed}, email failures ${emailFailed})`);

  return {
    total_found:          opportunities.length,
    by_type:              byType,
    top_opportunities:    opportunities.sort((a, b) => b.score - a.score).slice(0, 5),
    estimated_revenue:    round2(estimatedRevenue),
    emails_sent:          emailed,
    emails_failed:        emailFailed,
  };
}

// ── trackFailedPayments ───────────────────────────────────────

async function trackFailedPayments() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: failed = [], error } = await supabase
    .from('revenue_logs')
    .select('id, user_id, tool_id, amount, order_id, created_at')
    .eq('status', 'failed')
    .gte('created_at', sevenDaysAgo);

  if (error) {
    console.error('[REVENUE AGENT] Failed payments fetch error:', error.message);
    return { total_failed: 0, total_amount_lost: 0, retry_scheduled: 0, resolved_today: 0 };
  }

  const totalAmountLost = round2((failed || []).reduce((s, r) => s + safe(r.amount), 0));
  let newTracked = 0;

  for (const f of (failed || [])) {
    // Check if already tracked
    const { data: existing } = await supabase
      .from('failed_payments')
      .select('id, retry_count')
      .eq('razorpay_order_id', f.order_id || f.id)
      .single();

    if (existing) {
      // Update retry count and schedule next retry
      const retryCount = (existing.retry_count || 0) + 1;
      const retryDays  = retryCount === 1 ? 1 : retryCount === 2 ? 3 : retryCount === 3 ? 7 : null;
      const next_retry_at = retryDays
        ? new Date(Date.now() + retryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabase
        .from('failed_payments')
        .update({
          retry_count:   retryCount,
          last_retry_at: new Date().toISOString(),
          next_retry_at: next_retry_at || existing.next_retry_at,
          resolved:      retryCount > 3 ? false : existing.resolved,
        })
        .eq('id', existing.id);
    } else {
      // Insert new failed payment record
      const { data: toolRow } = await supabase
        .from('tools')
        .select('name')
        .eq('id', f.tool_id)
        .single();

      const { data: userRow } = await supabase
        .from('users')
        .select('email')
        .eq('id', f.user_id)
        .single();

      await supabase.from('failed_payments').insert({
        user_id:           f.user_id,
        user_email:        maskEmail(userRow?.email || ''),
        tool_id:           f.tool_id,
        tool_name:         toolRow?.name || 'Unknown',
        amount:            safe(f.amount),
        razorpay_order_id: f.order_id || null,
        failure_reason:    'Payment failed — see Razorpay dashboard',
        next_retry_at:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      newTracked++;
    }
  }

  // Count resolved today
  const todayStart = new Date().toISOString().split('T')[0];
  const { count: resolvedToday = 0 } = await supabase
    .from('failed_payments')
    .select('id', { count: 'exact', head: true })
    .eq('resolved', true)
    .gte('resolved_at', `${todayStart}T00:00:00`);

  return {
    total_failed:      failed.length,
    total_amount_lost: totalAmountLost,
    retry_scheduled:   newTracked,
    resolved_today:    resolvedToday || 0,
  };
}

// ── getRevenueDashboard ───────────────────────────────────────

async function getRevenueDashboard() {
  // Latest snapshot
  const { data: snapshot } = await supabase
    .from('revenue_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  // Unread alerts
  const { data: alerts = [] } = await supabase
    .from('revenue_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(20);

  // Upsell count
  const { count: upsellCount = 0 } = await supabase
    .from('upsell_opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'identified');

  // Failed payment count
  const { count: failedCount = 0 } = await supabase
    .from('failed_payments')
    .select('id', { count: 'exact', head: true })
    .eq('resolved', false);

  const s = snapshot || {};

  return {
    current: {
      daily:   round2(safe(s.daily_revenue)),
      weekly:  round2(safe(s.weekly_revenue)),
      monthly: round2(safe(s.monthly_revenue)),
      total:   round2(safe(s.total_revenue)),
      mrr:     round2(safe(s.mrr)),
      arr:     round2(safe(s.arr)),
      ltv:     round2(safe(s.ltv)),
    },
    transactions: {
      today:        safe(s.total_transactions),
      success_rate: s.total_transactions > 0
        ? round2((safe(s.successful_txns) / (safe(s.successful_txns) + safe(s.failed_txns))) * 100)
        : 100,
      avg_value: round2(safe(s.avg_order_value)),
    },
    subscribers: {
      active:         safe(s.active_subscribers),
      churn_rate:     round2(safe(s.churn_rate)),
      new_this_month: safe(s.new_subscribers),
    },
    top_tools:            s.revenue_by_tool || [],
    ai_insights:          s.ai_insights || {},
    unread_alerts:        alerts || [],
    upsell_count:         upsellCount || 0,
    failed_payment_count: failedCount || 0,
    last_snapshot:        s.snapshot_date || null,
  };
}

// ── getRevenueHistory ─────────────────────────────────────────

async function getRevenueHistory(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('revenue_snapshots')
    .select('snapshot_date, daily_revenue, mrr, total_transactions, churn_rate')
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.error('[REVENUE AGENT] History fetch error:', error.message);
    throw new Error(error.message);
  }
  return data || [];
}

// ── acknowledgeAlert ──────────────────────────────────────────

async function acknowledgeAlert(alert_id) {
  const { data, error } = await supabase
    .from('revenue_alerts')
    .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
    .eq('id', alert_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  calculateDailySnapshot,
  generateRevenueInsights,
  findUpsellOpportunities,
  trackFailedPayments,
  checkRevenueAlerts,
  getRevenueDashboard,
  getRevenueHistory,
  acknowledgeAlert,
};
