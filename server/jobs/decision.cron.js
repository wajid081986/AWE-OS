const cron                      = require('node-cron');
const { evaluateAllSaasTools }  = require('../agents/decision-engine');

// Runs once daily at 02:00 — after the autonomous cron finishes publishing tools
const CRON_EXPRESSION = '0 2 * * *';

async function executeDecisionRun() {
  console.log(`[DECISION CRON] Batch evaluation started at ${new Date().toISOString()}`);

  try {
    const result = await evaluateAllSaasTools({ dry_run: false });

    console.log(
      '[DECISION CRON] Complete.',
      `evaluated=${result.total_evaluated}`,
      `scale=${result.summary.scale}`,
      `kill=${result.summary.kill}`,
      `improve=${result.summary.improve}`,
      `observe=${result.summary.observe}`,
      `errors=${result.errors.length}`
    );
  } catch (err) {
    // Must NEVER crash the server process
    console.error('[DECISION CRON] FATAL ERROR:', err.message);
  }

  console.log(`[DECISION CRON] Done at ${new Date().toISOString()}. Next run in 24 hours.`);
}

function startDecisionCron() {
  const task = cron.schedule(CRON_EXPRESSION, executeDecisionRun, { scheduled: true });
  console.log('[DECISION CRON] Registered — runs daily at 02:00');
  return task;
}

const scheduledJob = startDecisionCron();

module.exports = { scheduledJob, startDecisionCron, executeDecisionRun };
