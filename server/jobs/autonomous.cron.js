const cron                  = require('node-cron');
const { runAutonomousLoop } = require('../agents/autonomous-agent');

// Runs at 00:00, 06:00, 12:00, 18:00 every day
const CRON_EXPRESSION = '0 */6 * * *';

async function executeScheduledRun() {
  console.log(`[AUTONOMOUS CRON] Scheduled run started at ${new Date().toISOString()}`);

  try {
    const summary = await runAutonomousLoop({ limit: 10, triggered_by: 'cron' });

    if (summary.skipped) {
      console.log(`[AUTONOMOUS CRON] Run skipped — reason: ${summary.reason}`);
    } else {
      console.log(
        '[AUTONOMOUS CRON] Run complete.',
        `processed=${summary.tools_processed}`,
        `plans=${summary.actions_taken.plans_generated}`,
        `scaled=${summary.actions_taken.scaled}`,
        `kill_flagged=${summary.actions_taken.kill_flagged}`,
        `errors=${summary.actions_taken.errors}`,
        `duration=${summary.duration_ms}ms`
      );
    }
  } catch (err) {
    // Catch-all — a fatal error must NEVER crash the server process
    console.error('[AUTONOMOUS CRON] FATAL ERROR:', err.message);
  }

  console.log('[AUTONOMOUS CRON] Run complete. Next run in 6 hours.');
}

/**
 * Register the autonomous cron schedule.
 * Call this once at server startup from index.js.
 * Returns the task instance so tests can stop it.
 */
function startAutonomousCron() {
  const task = cron.schedule(CRON_EXPRESSION, executeScheduledRun, { scheduled: true });
  console.log('[AUTONOMOUS CRON] Registered — runs every 6 hours (00:00, 06:00, 12:00, 18:00)');
  return task;
}

// Export the task so test suites can call task.stop()
const scheduledJob = startAutonomousCron();

module.exports = { scheduledJob, startAutonomousCron, executeScheduledRun };
