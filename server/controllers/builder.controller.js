const {
  generateBuildPlan,
  getPlan,
  getAllPlans,
  updatePlanStatus,
} = require('../agents/builder-agent');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set([
  'pending_review', 'approved', 'rejected', 'in_progress', 'completed',
]);

// Map agent error codes to HTTP status codes
const HTTP_STATUS = {
  TOOL_NOT_FOUND:      404,
  PLAN_NOT_FOUND:      404,
  INVALID_STATUS:      422,
  INVALID_TRANSITION:  422,
  PLAN_EXISTS:         409,
  AI_UNAVAILABLE:      503,
  PARSE_ERROR:         500,
  SAVE_FAILED:         500,
};

function httpFor(err) {
  return HTTP_STATUS[err.code] || (err.status < 600 ? err.status : 500);
}

function isSafe4xx(err) {
  const s = httpFor(err);
  return s >= 400 && s < 500;
}

/**
 * POST /api/builder/generate
 * Body: { tool_id }
 */
async function generatePlan(req, res) {
  const { tool_id } = req.body;

  if (!tool_id) {
    return res.status(400).json({ success: false, error: 'tool_id is required', code: 'MISSING_TOOL_ID' });
  }
  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID' });
  }

  try {
    const result = await generateBuildPlan(tool_id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[builder.controller] generatePlan:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to generate plan — check server logs',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * GET /api/builder/plan/:plan_id
 */
async function getPlanHandler(req, res) {
  const { plan_id } = req.params;

  if (!UUID_REGEX.test(plan_id)) {
    return res.status(400).json({ success: false, error: 'plan_id must be a valid UUID v4', code: 'INVALID_PLAN_ID' });
  }

  try {
    const plan = await getPlan(plan_id);
    return res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[builder.controller] getPlan:', err.message);
    return res.status(httpFor(err)).json({ success: false, error: err.message, code: err.code });
  }
}

/**
 * GET /api/builder/plans
 * Query: ?status=pending_review
 */
async function getAllPlansHandler(req, res) {
  const { status } = req.query;

  if (status && !VALID_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      error:   `Invalid status filter. Must be one of: ${[...VALID_STATUSES].join(', ')}`,
      code:    'INVALID_STATUS',
    });
  }

  try {
    const plans = await getAllPlans(status || null);
    return res.json({ success: true, data: plans, count: plans.length });
  } catch (err) {
    console.error('[builder.controller] getAllPlans:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch plans', code: 'UNKNOWN' });
  }
}

/**
 * PATCH /api/builder/plan/:plan_id/status
 * Body: { status, reviewer_notes? }
 */
async function updateStatus(req, res) {
  const { plan_id } = req.params;
  const { status, reviewer_notes } = req.body;

  if (!UUID_REGEX.test(plan_id)) {
    return res.status(400).json({ success: false, error: 'plan_id must be a valid UUID v4', code: 'INVALID_PLAN_ID' });
  }
  if (!status) {
    return res.status(400).json({ success: false, error: 'status is required', code: 'MISSING_STATUS' });
  }
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      error:   `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}`,
      code:    'INVALID_STATUS',
    });
  }

  try {
    const updated = await updatePlanStatus(plan_id, status, reviewer_notes);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[builder.controller] updateStatus:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to update plan status',
      code:    err.code || 'UNKNOWN',
    });
  }
}

module.exports = { generatePlan, getPlanHandler, getAllPlansHandler, updateStatus };
