'use strict';

const cron                  = require('node-cron');
const { checkSystemHealth } = require('../agents/deployment-agent');
const { recordCronRun, checkCronHealth } = require('../services/cron-health');

// Expected cron intervals in MINUTES — used for overdue detection (2× interval = alert)
const CRON_INTERVALS = {
  'analytics-cron':             24 * 60,
  'autonomous-cron':            6  * 60,
  'idea-cron':                  12 * 60,
  'marketing-weekly-content':   7  * 24 * 60,
  'marketing-weekly-report':    7  * 24 * 60,
  'testing-cron':               24 * 60,
  'decision-cron':              24 * 60,
  'health-cron':                30,
  'revenue-cron':               24 * 60,
  'support-sla-monitor':        30,
  'support-auto-close':         24 * 60,
  'support-weekly-kb':          7  * 24 * 60,
};

// Every 30 minutes
const CRON_EXPRESSION = '*/30 * * * *';

async function executeHealthCheck() {
  console.log(`[HEALTH CRON] Starting health check at ${new Date().toISOString()}`);

  try {
    const health = await checkSystemHealth();

    if (health.overall === 'down') {
      console.error('[HEALTH CRON] 🚨 SYSTEM DOWN!');
      health.issues.forEach(issue => {
        console.error(`[HEALTH CRON]   [${issue.severity?.toUpperCase()}] ${issue.service}: ${issue.message}`);
        console.error(`[HEALTH CRON]   Fix: ${issue.fix}`);
      });
    } else if (health.issues_count > 0 || health.issues?.length > 0) {
      console.warn(`[HEALTH CRON] ⚠️ Issues detected (${health.issues?.length || 0})`);
      health.issues.forEach(issue => {
        console.warn(`[HEALTH CRON]   [${issue.severity?.toUpperCase()}] ${issue.service}: ${issue.message}`);
        if (issue.fix) console.warn(`[HEALTH CRON]   Fix: ${issue.fix}`);
      });
    } else {
      console.log('[HEALTH CRON] ✅ All systems healthy');
      console.log(`[HEALTH CRON]   Backend:  ${health.backend?.status}  (${health.backend?.latency_ms}ms)`);
      console.log(`[HEALTH CRON]   Frontend: ${health.frontend?.status} (${health.frontend?.latency_ms}ms)`);
      console.log(`[HEALTH CRON]   Database: ${health.database?.status} (${health.database?.latency_ms}ms)`);
    }

    console.log(`[HEALTH CRON] Check complete: overall=${health.overall}. Next run in 30 minutes.`);

    // Check whether any cron job has gone overdue
    await checkCronHealth(CRON_INTERVALS);
    await recordCronRun('health-cron', 'success');
  } catch (err) {
    console.error('[HEALTH CRON] FATAL ERROR — check failed:', err.message);
    await recordCronRun('health-cron', 'error', err.message);
  }
}

function startHealthCron() {
  const task = cron.schedule(CRON_EXPRESSION, executeHealthCheck, { scheduled: true });
  console.log('[HEALTH CRON] Registered — runs every 30 minutes');
  return task;
}

const scheduledJob = startHealthCron();

module.exports = { scheduledJob, startHealthCron, executeHealthCheck };
