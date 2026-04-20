const supabase = require('../db/supabase');

const VALID_EVENT_TYPES = new Set([
  'tool_viewed',
  'tool_used',
  'resume_generated',
  'payment_success',
  'user_signup',
  'tool_shared',
  'feature_clicked',
]);

/**
 * Track a single event for a tool.
 *
 * Increments tools.usage_count atomically via DB function when
 * event_type === 'tool_used' — avoids read-then-write race conditions.
 *
 * @param {string}  tool_id    - UUID of the tool
 * @param {string|null} user_id - UUID of user, or null for anonymous
 * @param {string}  event_type - Must be in VALID_EVENT_TYPES
 * @param {object}  metadata   - Arbitrary JSONB payload
 * @param {object}  req        - Express request (for ip/user-agent)
 * @returns {object} Saved event row
 */
async function trackEvent(tool_id, user_id, event_type, metadata = {}, req = {}) {
  if (!VALID_EVENT_TYPES.has(event_type)) {
    const err = new Error(`Invalid event_type: ${event_type}`);
    err.status = 400;
    throw err;
  }

  // x-forwarded-for is set by Render's proxy layer
  const ip_address = (req.headers?.['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || null;
  const user_agent = req.headers?.['user-agent'] || null;

  const { data: event, error } = await supabase
    .from('tool_events')
    .insert({
      tool_id,
      user_id: user_id || null,
      event_type,
      metadata,
      ip_address,
      user_agent,
    })
    .select()
    .single();

  if (error) {
    console.error('[event.service] insert failed:', error.message);
    throw error;
  }

  // Atomic increment — no race condition vs. SELECT + UPDATE pattern
  if (event_type === 'tool_used') {
    const { error: rpcErr } = await supabase.rpc('increment_usage_count', { p_tool_id: tool_id });
    if (rpcErr) console.error('[event.service] usage_count increment failed:', rpcErr.message);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Event] ${event_type} | tool=${tool_id} | user=${user_id ?? 'anon'}`);
  } else {
    console.log(JSON.stringify({ level: 'info', event: 'tracked', event_type, tool_id, ts: new Date().toISOString() }));
  }

  return event;
}

/**
 * Return paginated events for a tool with optional filters.
 *
 * @param {string} tool_id
 * @param {object} filters - { event_type, date_from, date_to, page, limit }
 * @returns {{ events, total, page, limit, pages }}
 */
async function getEventsByTool(tool_id, { event_type, date_from, date_to, page = 1, limit = 50 } = {}) {
  // Cap limit to prevent huge payloads
  const safeLimit = Math.min(Number(limit) || 50, 200);
  const safePage  = Math.max(Number(page) || 1, 1);

  let query = supabase
    .from('tool_events')
    .select('*', { count: 'exact' })
    .eq('tool_id', tool_id)
    .order('created_at', { ascending: false })
    .range((safePage - 1) * safeLimit, safePage * safeLimit - 1);

  if (event_type) query = query.eq('event_type', event_type);
  if (date_from)  query = query.gte('created_at', date_from);
  if (date_to)    query = query.lte('created_at', date_to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    events: data,
    total:  count,
    page:   safePage,
    limit:  safeLimit,
    pages:  Math.ceil(count / safeLimit),
  };
}

/**
 * Return aggregate summary for a tool:
 * - count per event_type
 * - conversion_rate and revenue from tools table
 * - last-7-day daily event trend
 *
 * Note: for very high event volumes this should be replaced with
 * a Supabase RPC that does the GROUP BY in Postgres.
 *
 * @param {string} tool_id
 * @returns {object} summary object
 */
async function getEventSummary(tool_id) {
  // Fetch only the event_type column — minimal data transfer
  const { data: events, error: eventsErr } = await supabase
    .from('tool_events')
    .select('event_type, created_at')
    .eq('tool_id', tool_id);

  if (eventsErr) throw eventsErr;

  // Aggregate counts
  const summary = {};
  for (const row of events) {
    summary[row.event_type] = (summary[row.event_type] || 0) + 1;
  }

  // Build last-7-day trend (initialise every day to 0 first)
  const trendMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  for (const row of events) {
    if (new Date(row.created_at) >= cutoff) {
      const day = row.created_at.slice(0, 10);
      if (trendMap[day] !== undefined) trendMap[day]++;
    }
  }

  const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  // Pull authoritative revenue + conversion_rate from the tools row
  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('revenue, conversion_rate')
    .eq('id', tool_id)
    .maybeSingle();

  if (toolErr) throw toolErr;

  return {
    tool_id,
    summary,
    conversion_rate: tool?.conversion_rate ?? 0,
    revenue:         tool?.revenue ?? 0,
    trend: { last_7_days: trend },
  };
}

module.exports = { trackEvent, getEventsByTool, getEventSummary, VALID_EVENT_TYPES };
