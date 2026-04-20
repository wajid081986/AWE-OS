const cron     = require('node-cron');
const supabase = require('../db/supabase');

/**
 * Recalculate conversion_rate for every 'live' tool.
 *
 * Formula: (tool_used count / tool_viewed count) * 100
 * We use all-time counts rather than a rolling window so the rate
 * reflects steady-state behaviour, not short-term spikes.
 *
 * This is intentionally sequential (not Promise.all) so a single
 * failing tool doesn't abort updates for the rest.
 */
async function recalculateConversionRates() {
  const startedAt = new Date().toISOString();
  console.log(`[Cron] analytics start — ${startedAt}`);

  const { data: tools, error: toolsErr } = await supabase
    .from('tools')
    .select('id, name')
    .eq('status', 'live');

  if (toolsErr) {
    console.error('[Cron] Failed to fetch tools:', toolsErr.message);
    return { updated: 0, failed: 0, error: toolsErr.message };
  }

  if (!tools.length) {
    console.log('[Cron] No live tools found — nothing to update');
    return { updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed  = 0;

  for (const tool of tools) {
    try {
      const { data: events, error: eventsErr } = await supabase
        .from('tool_events')
        .select('event_type')
        .eq('tool_id', tool.id)
        .in('event_type', ['tool_viewed', 'tool_used']);

      if (eventsErr) throw eventsErr;

      const viewed = events.filter(e => e.event_type === 'tool_viewed').length;
      const used   = events.filter(e => e.event_type === 'tool_used').length;
      // Guard division-by-zero: if no views yet, rate is 0
      const rate   = viewed > 0 ? Number(((used / viewed) * 100).toFixed(2)) : 0;

      const { error: updateErr } = await supabase
        .from('tools')
        .update({ conversion_rate: rate })
        .eq('id', tool.id);

      if (updateErr) throw updateErr;

      console.log(`[Cron] ${tool.name}: ${used} used / ${viewed} viewed = ${rate}%`);
      updated++;
    } catch (err) {
      console.error(`[Cron] Failed for tool "${tool.name}" (${tool.id}):`, err.message);
      failed++;
    }
  }

  const result = { updated, failed, durationMs: Date.now() - new Date(startedAt).getTime() };
  console.log(`[Cron] analytics done —`, JSON.stringify(result));
  return result;
}

/**
 * Register the cron schedule.
 * Call this once at server startup from index.js.
 * Schedule: every day at 00:00 server time.
 */
function startAnalyticsCron() {
  cron.schedule('0 0 * * *', () => {
    recalculateConversionRates().catch((err) => {
      console.error('[Cron] Unhandled error in analytics cron:', err.message);
    });
  });

  console.log('[Cron] analytics.cron registered — runs daily at midnight');
}

module.exports = { startAnalyticsCron, recalculateConversionRates };
