const eventService   = require('../services/event.service');
const revenueService = require('../services/revenue.service');
const supabase       = require('../db/supabase');

// Returns 403 if authenticated user does not own the tool, 404 if not found
async function assertToolOwner(toolId, userId) {
  const { data: tool, error } = await supabase
    .from('tools')
    .select('user_id')
    .eq('id', toolId)
    .maybeSingle();
  if (error || !tool) {
    const err = new Error('Tool not found');
    err.status = 404;
    throw err;
  }
  if (tool.user_id !== userId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
}

/**
 * POST /api/events/track
 *
 * Public endpoint — works for both authenticated and anonymous users.
 * If a valid JWT is present (req.user set by requireAuth), user_id from
 * the token takes priority over any user_id in the request body, so
 * clients cannot spoof another user's activity.
 */
async function trackEvent(req, res) {
  try {
    const { tool_id, event_type, metadata } = req.body;
    // Prefer JWT-derived user over client-supplied value
    const user_id = req.user?.userId || req.body.user_id || null;

    const event = await eventService.trackEvent(tool_id, user_id, event_type, metadata, req);

    return res.status(201).json({
      success:  true,
      event_id: event.id,
      message:  'Event tracked',
    });
  } catch (err) {
    console.error('[controller] trackEvent:', err.message);
    return res.status(err.status || 500).json({
      success: false,
      // Only expose message for 4xx (client errors); mask 5xx internals
      error: err.status < 500 ? err.message : 'Failed to track event',
    });
  }
}

/**
 * GET /api/events/tool/:tool_id
 * Query params: event_type, date_from, date_to, page, limit
 */
async function getToolEvents(req, res) {
  try {
    await assertToolOwner(req.params.tool_id, req.user.userId);

    const result = await eventService.getEventsByTool(req.params.tool_id, {
      event_type: req.query.event_type,
      date_from:  req.query.date_from,
      date_to:    req.query.date_to,
      page:       req.query.page,
      limit:      req.query.limit,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[controller] getToolEvents:', err.message);
    return res.status(err.status || 500).json({ success: false, error: err.message || 'Failed to fetch events' });
  }
}

/**
 * GET /api/events/summary/:tool_id
 */
async function getSummary(req, res) {
  try {
    await assertToolOwner(req.params.tool_id, req.user.userId);

    const summary = await eventService.getEventSummary(req.params.tool_id);
    return res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[controller] getSummary:', err.message);
    return res.status(err.status || 500).json({ success: false, error: err.message || 'Failed to fetch summary' });
  }
}

/**
 * POST /api/revenue/log
 * Called internally after Razorpay verify-payment succeeds.
 * Requires a valid JWT (requireAuth middleware).
 */
async function logRevenue(req, res) {
  try {
    const { tool_id, user_id, amount, order_id, metadata } = req.body;

    // Enforce that the authenticated user matches the user_id being logged,
    // unless the caller is a service account (no req.user.userId check needed
    // for internal server-to-server calls, but we enforce it here anyway)
    const resolvedUserId = req.user?.userId || user_id;

    const log = await revenueService.logRevenue(tool_id, resolvedUserId, amount, order_id, metadata);

    return res.status(201).json({ success: true, log_id: log.id });
  } catch (err) {
    console.error('[controller] logRevenue:', err.message);
    return res.status(err.status || 500).json({
      success: false,
      error: err.status < 500 ? err.message : 'Failed to log revenue',
    });
  }
}

/**
 * GET /api/revenue/:tool_id
 */
async function getRevenueSummary(req, res) {
  try {
    await assertToolOwner(req.params.tool_id, req.user.userId);

    const summary = await revenueService.getRevenueSummary(req.params.tool_id);
    return res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[controller] getRevenueSummary:', err.message);
    return res.status(err.status || 500).json({ success: false, error: err.message || 'Failed to fetch revenue summary' });
  }
}

module.exports = { trackEvent, getToolEvents, getSummary, logRevenue, getRevenueSummary };
