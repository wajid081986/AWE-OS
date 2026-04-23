'use strict';

const cron = require('node-cron');
const {
  calculateDailySnapshot,
  findUpsellOpportunities,
  trackFailedPayments,
} = require('../agents/revenue-agent');

// Daily at 11:59 PM
const CRON_EXPRESSION = '59 23 * * *';

async function executeDailyRevenue() {
  const start = Date.now();
  console.log(`[REVENUE CRON] Daily analysis starting at ${new Date().toISOString()}`);

  try {
    const snapshot = await calculateDailySnapshot();
    console.log(`[REVENUE CRON] Daily: ₹${snapshot.daily_revenue} | MRR: ₹${snapshot.mrr} | Churn: ${snapshot.churn_rate}%`);
  } catch (err) {
    console.error('[REVENUE CRON] calculateDailySnapshot failed:', err.message);
  }

  try {
    const upsells = await findUpsellOpportunities();
    console.log(`[REVENUE CRON] Upsells found: ${upsells.total_found} (est. ₹${upsells.estimated_revenue})`);
  } catch (err) {
    console.error('[REVENUE CRON] findUpsellOpportunities failed:', err.message);
  }

  try {
    const failed = await trackFailedPayments();
    console.log(`[REVENUE CRON] Failed payments: ${failed.total_failed} (₹${failed.total_amount_lost} lost)`);
  } catch (err) {
    console.error('[REVENUE CRON] trackFailedPayments failed:', err.message);
  }

  console.log(`[REVENUE CRON] Analysis complete in ${Date.now() - start}ms`);
}

function startRevenueCron() {
  const task = cron.schedule(CRON_EXPRESSION, executeDailyRevenue, { scheduled: true });
  console.log('[REVENUE CRON] Registered — runs daily at 23:59');
  return task;
}

const scheduledJob = startRevenueCron();

module.exports = { scheduledJob, startRevenueCron, executeDailyRevenue };
