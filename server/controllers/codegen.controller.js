const {
  generateToolCode,
  getGeneratedCode,
  approveGeneratedCode,
  rejectGeneratedCode,
} = require('../agents/code-generator');

const supabase = require('../db/supabase');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HTTP_STATUS = {
  NOT_FOUND:           404,
  INVALID_STATUS:      422,
  NO_APPROVED_PLAN:    422,
  DUPLICATE_BUILD:     409,
  INVALID_CODE_OUTPUT: 500,
  AI_UNAVAILABLE:      503,
  AI_TIMEOUT:          503,
  DB_ERROR:            500,
  PARSE_ERROR:         500,
};

function httpFor(err) {
  return HTTP_STATUS[err.code] || (err.status >= 400 && err.status < 600 ? err.status : 500);
}

function isSafe4xx(err) {
  const s = httpFor(err);
  return s >= 400 && s < 500;
}

/**
 * POST /api/codegen/generate/:tool_id
 * Responds immediately with 202 — generation runs in background.
 */
async function generateCode(req, res) {
  const { tool_id } = req.params;
  const force = req.body?.force === true || req.query.force === 'true';

  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({
      success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID',
    });
  }

  // Pre-flight: approved plan must exist
  const { data: plan } = await supabase
    .from('builder_plans')
    .select('id')
    .eq('tool_id', tool_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return res.status(422).json({
      success: false,
      error:   'No approved plan found. Approve a plan in the Builder Panel first.',
      code:    'NO_APPROVED_PLAN',
    });
  }

  // Pre-flight: duplicate check (skip when force=true)
  if (!force) {
    const { data: existing } = await supabase
      .from('generated_code')
      .select('id, status')
      .eq('plan_id', plan.id)
      .not('status', 'in', '("rejected","failed")')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error:   `Code already generated for this plan (id=${existing.id}, status=${existing.status}). Check the Code Viewer.`,
        code:    'DUPLICATE_BUILD',
        tip:     'Pass force=true to regenerate',
      });
    }
  }

  // Respond immediately — client polls GET /api/codegen/:tool_id for progress
  res.status(202).json({
    success:   true,
    message:   'Code generation started in background',
    plan_id:   plan.id,
    status:    'generating',
    check_url: `/api/codegen/${tool_id}`,
  });

  // Fire-and-forget — runs after response is flushed
  setImmediate(async () => {
    try {
      console.log(`[CODE GEN] Background generation started — tool_id=${tool_id}`);
      await generateToolCode(tool_id, force);
      console.log(`[CODE GEN] Background generation complete — tool_id=${tool_id}`);
    } catch (err) {
      console.error(`[CODE GEN] Background generation failed — tool_id=${tool_id}:`, err.message);
    }
  });
}

/**
 * GET /api/codegen/:tool_id
 * Returns generation status + code data. Safe to poll during generation.
 */
async function getCodeStatus(req, res) {
  const { tool_id } = req.params;

  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({
      success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID',
    });
  }

  try {
    const { data: plan } = await supabase
      .from('builder_plans')
      .select('id, status')
      .eq('tool_id', tool_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan) {
      return res.status(404).json({
        success: false, error: 'No approved plan found', code: 'NOT_FOUND',
      });
    }

    const code = await getGeneratedCode(tool_id);

    return res.json({
      success:  true,
      plan_id:  plan.id,
      status:   code?.status || 'not_started',
      data:     code || null,
    });
  } catch (err) {
    console.error('[codegen.controller] getCodeStatus:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch code status', code: 'UNKNOWN' });
  }
}

/**
 * POST /api/codegen/:code_id/approve
 * Body: { reviewer_notes? }
 * Human approves code — tool is marked 'live'.
 */
async function approveCode(req, res) {
  const { code_id } = req.params;
  const { reviewer_notes } = req.body || {};

  if (!UUID_REGEX.test(code_id)) {
    return res.status(400).json({
      success: false, error: 'code_id must be a valid UUID v4', code: 'INVALID_CODE_ID',
    });
  }

  try {
    const result = await approveGeneratedCode(code_id, reviewer_notes || null);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[codegen.controller] approveCode:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to approve code',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * POST /api/codegen/:code_id/reject
 * Body: { reviewer_notes? }
 * Human rejects code — tool stays 'building', regeneration is allowed.
 */
async function rejectCode(req, res) {
  const { code_id } = req.params;
  const { reviewer_notes } = req.body || {};

  if (!UUID_REGEX.test(code_id)) {
    return res.status(400).json({
      success: false, error: 'code_id must be a valid UUID v4', code: 'INVALID_CODE_ID',
    });
  }

  try {
    const result = await rejectGeneratedCode(code_id, reviewer_notes || null);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[codegen.controller] rejectCode:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to reject code',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * GET /api/codegen
 * Returns all generated code records (summary, no file contents)
 */
async function getAllCodes(req, res) {
  try {
    const { data, error } = await supabase
      .from('generated_code')
      .select('id, tool_id, tool_name, status, total_files, generation_ms, ai_model, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[codegen.controller] getAllCodes:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch code records', code: 'UNKNOWN' });
  }
}

module.exports = { generateCode, getCodeStatus, getAllCodes, approveCode, rejectCode };
