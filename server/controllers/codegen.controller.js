const {
  generateToolCode,
  getGeneratedCode,
  approveGeneratedCode,
  rejectGeneratedCode,
} = require('../agents/code-generator');

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
 * Triggers AI code generation for an approved plan. Code saved to DB only.
 */
async function generateCode(req, res) {
  // Code generation can take several minutes — extend socket timeout so
  // Render / nginx don't close the connection before we finish.
  req.setTimeout(180_000);
  res.setTimeout(180_000);

  const { tool_id } = req.params;
  const force = req.body?.force === true || req.query.force === 'true';

  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({
      success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID',
    });
  }

  let partialFiles = 0;
  try {
    const result = await generateToolCode(tool_id, force);
    partialFiles = result.files_done || 0;
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[codegen.controller] generateCode:', err.message);

    // If we timed out but some files were saved, tell the client so it can retry
    if (err.code === 'AI_TIMEOUT') {
      return res.status(503).json({
        success:         false,
        error:           'Generation timed out — retry to continue from saved progress',
        code:            'AI_TIMEOUT',
        partial:         partialFiles > 0,
        files_generated: partialFiles,
      });
    }

    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Code generation failed — check server logs',
      code:    err.code || 'UNKNOWN',
      ...(err.tip && { tip: err.tip }),
    });
  }
}

/**
 * GET /api/codegen/:tool_id
 * Returns the latest generated code record including all file contents.
 */
async function getCode(req, res) {
  const { tool_id } = req.params;

  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({
      success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_TOOL_ID',
    });
  }

  try {
    const code = await getGeneratedCode(tool_id);
    if (!code) {
      return res.status(404).json({
        success: false,
        error:   'No generated code found for this tool. Generate code first.',
        code:    'NOT_FOUND',
      });
    }
    return res.json({ success: true, data: code });
  } catch (err) {
    console.error('[codegen.controller] getCode:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch generated code', code: 'UNKNOWN' });
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
   const supabase = require('../db/supabase');
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

module.exports = { generateCode, getCode, getAllCodes, approveCode, rejectCode };

