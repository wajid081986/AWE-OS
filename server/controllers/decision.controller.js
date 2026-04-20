const { evaluateTool, evaluateAllTools } = require('../agents/decision-engine');
const supabase = require('../db/supabase');

const UUID_REGEX_CTRL = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// UUID v4 regex — reused from validateEvent.js pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/decision/:tool_id
 * Query params: ?dry_run=true
 *
 * Evaluates a single tool and returns the decision.
 * Returns 404 if tool doesn't exist, 422 if status is not evaluable.
 */
async function getDecision(req, res) {
  const { tool_id } = req.params;

  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({
      success: false,
      error:   'tool_id must be a valid UUID v4',
      code:    'INVALID_TOOL_ID',
    });
  }

  const dry_run = req.query.dry_run === 'true';

  try {
    const result = await evaluateTool(tool_id, { dry_run });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[decision.controller] getDecision | tool_id=${tool_id}:`, err.message);

    // Map known engine error codes to appropriate HTTP responses
    const statusMap = {
      TOOL_NOT_FOUND:    404,
      INVALID_STATUS:    422,
      MANUAL_OVERRIDE:   423,
      EVALUATION_FAILED: 500,
    };

    const httpStatus = statusMap[err.code] || 500;

    return res.status(httpStatus).json({
      success: false,
      // 4xx errors are safe to expose; mask internal 5xx messages
      error: httpStatus < 500 ? err.message : 'Evaluation failed — check server logs',
      code:  err.code || 'EVALUATION_FAILED',
    });
  }
}

/**
 * GET /api/decision
 * Query params: ?dry_run=true  ?limit=50
 *
 * Runs the decision engine over all live/scaling tools.
 * Partial failures are included in the response errors array,
 * not surfaced as HTTP 500, so the batch always completes.
 */
async function getAllDecisions(req, res) {
  const dry_run = req.query.dry_run === 'true';
  const limit   = parseInt(req.query.limit) || 50;

  try {
    const result = await evaluateAllTools({ dry_run, limit });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[decision.controller] getAllDecisions:', err.message);

    return res.status(500).json({
      success: false,
      error:   'Batch evaluation failed — check server logs',
      code:    err.code || 'EVALUATION_FAILED',
    });
  }
}

/**
 * POST /api/decision/approve
 * Body: { tool_id }
 * Sets tool status = 'live' and clears manual_override.
 */
async function approveDecision(req, res) {
  const { tool_id } = req.body;
  if (!UUID_REGEX_CTRL.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID' });
  }
  try {
    const { error } = await supabase
      .from('tools')
      .update({ status: 'live', manual_override: false })
      .eq('id', tool_id);
    if (error) throw error;
    return res.json({ success: true, message: 'Tool approved — status set to live' });
  } catch (err) {
    console.error('[decision.controller] approveDecision:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to approve tool', code: 'EVALUATION_FAILED' });
  }
}

/**
 * POST /api/decision/reject
 * Body: { tool_id }
 * Sets tool status = 'killed' and manual_override = true.
 */
async function rejectDecision(req, res) {
  const { tool_id } = req.body;
  if (!UUID_REGEX_CTRL.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID' });
  }
  try {
    const { error } = await supabase
      .from('tools')
      .update({ status: 'killed', manual_override: true })
      .eq('id', tool_id);
    if (error) throw error;
    return res.json({ success: true, message: 'Tool rejected — status set to killed' });
  } catch (err) {
    console.error('[decision.controller] rejectDecision:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to reject tool', code: 'EVALUATION_FAILED' });
  }
}

module.exports = { getDecision, getAllDecisions, approveDecision, rejectDecision };
