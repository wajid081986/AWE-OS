const cron                        = require('node-cron');
const { generateAndStoreIdeas }   = require('../agents/idea-pipeline');

// Runs at 00:00 and 12:00 every day
const CRON_EXPRESSION = '0 */12 * * *';

async function executeIdeaRun() {
  const startedAt = new Date().toISOString();
  console.log(`[IDEA CRON] Starting idea generation at ${startedAt}...`);

  try {
    const result = await generateAndStoreIdeas({
      category:        'micro_saas',
      count:           5,
      target_audience: 'solopreneurs',
    });

    if (!result.success) {
      console.warn(`[IDEA CRON] Run returned failure: ${result.error || 'unknown'}`);
    } else if (result.skipped_reason === 'backlog_cap') {
      console.log('[IDEA CRON] Skipped — backlog cap reached (50 pending ideas).');
    } else {
      console.log(
        '[IDEA CRON] Run complete.',
        `generated=${result.generated}`,
        `inserted=${result.inserted}`,
        `skipped=${result.skipped}`,
        `failed=${result.failed}`
      );
    }
  } catch (err) {
    // Must NEVER crash the server process
    console.error(`[IDEA CRON] ERROR: ${err.message}`);
  }

  console.log(`[IDEA CRON] Done at ${new Date().toISOString()}. Next run in 12 hours.`);
}

function startIdeaCron() {
  const task = cron.schedule(CRON_EXPRESSION, executeIdeaRun, { scheduled: true });
  console.log('[IDEA CRON] Registered — runs every 12 hours (00:00, 12:00)');
  return task;
}

const scheduledJob = startIdeaCron();

module.exports = { scheduledJob, startIdeaCron, executeIdeaRun };
