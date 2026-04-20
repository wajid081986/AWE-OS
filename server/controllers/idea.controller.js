const supabase = require('../db/supabase');
const {
  generateAndStoreIdeas,
  approveAndPlanIdea,
  ignoreIdea: ignoreIdeaPipeline,
} = require('../agents/idea-pipeline');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HTTP_STATUS = {
  NOT_FOUND:       404,
  INVALID_STATUS:  422,
  ALREADY_APPROVED: 422,
  RATE_LIMITED:    429,
  DB_ERROR:        500,
  PARSE_ERROR:     500,
  AI_UNAVAILABLE:  503,
};

function httpFor(err) {
  return HTTP_STATUS[err.code] || (err.status < 600 ? err.status : 500) || 500;
}

// ── Existing routes ───────────────────────────────────────────

/**
 * POST /api/ideas/generate
 * Body: { category?, count?, target_audience? }
 * Triggers a manual AI idea generation run.
 */
async function generateIdeas(req, res) {
  const {
    category        = 'micro_saas',
    count           = 5,
    target_audience = 'solopreneurs',
  } = req.body || {};

  try {
    const result = await generateAndStoreIdeas({ category, count, target_audience });
    const status = result.success ? 200 : 500;
    return res.status(status).json({ success: result.success, data: result });
  } catch (err) {
    console.error('[idea.controller] generateIdeas:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   err.message,
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * GET /api/ideas
 * Returns all tools that originated as AI ideas (source='ai').
 */
async function getIdeas(req, res) {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .eq('source', 'ai')
      .order('idea_score', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[idea.controller] getIdeas:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch ideas', code: 'UNKNOWN' });
  }
}

// ── New routes ────────────────────────────────────────────────

/**
 * GET /api/ideas/pending
 * Returns AI-generated ideas awaiting human review, ordered by score DESC.
 */
async function getPendingIdeas(req, res) {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, description, status, source, idea_score, approved, approved_at, idea_metadata, created_at')
      .eq('source', 'ai')
      .eq('approved', false)
      .eq('status', 'idea')
      .order('idea_score', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[idea.controller] getPendingIdeas:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch pending ideas', code: 'UNKNOWN' });
  }
}

/**
 * POST /api/ideas/approve
 * Body: { tool_id, auto_generate_plan? }
 * Human approves an AI idea — triggers build plan generation.
 */
async function approveIdea(req, res) {
  const { tool_id, auto_generate_plan } = req.body || {};

  if (!tool_id) {
    return res.status(400).json({ success: false, error: 'tool_id is required', code: 'MISSING_TOOL_ID' });
  }
  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID' });
  }

  const opts = typeof auto_generate_plan === 'boolean' ? { auto_generate_plan } : {};

  try {
    const result = await approveAndPlanIdea(tool_id, opts);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[idea.controller] approveIdea:', err.message);
    const status = httpFor(err);
    return res.status(status).json({
      success: false,
      error:   err.message,
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * POST /api/ideas/ignore
 * Body: { tool_id }
 * Human ignores an AI idea — sets status to 'killed'.
 */
async function ignoreIdea(req, res) {
  const { tool_id } = req.body || {};

  if (!tool_id) {
    return res.status(400).json({ success: false, error: 'tool_id is required', code: 'MISSING_TOOL_ID' });
  }
  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID' });
  }

  try {
    const result = await ignoreIdeaPipeline(tool_id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[idea.controller] ignoreIdea:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   err.message,
      code:    err.code || 'UNKNOWN',
    });
  }
}

module.exports = { generateIdeas, getIdeas, getPendingIdeas, approveIdea, ignoreIdea };
