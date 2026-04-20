const supabase                        = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// ── Constants ─────────────────────────────────────────────────
const AI_TIMEOUT_MS          = 60_000;
const MAX_FILE_CONTENT_LENGTH = 50_000;
const AI_MODEL                = process.env.CODEGEN_MODEL || 'gpt-4o-mini';

const BLOCKED_PATH_PATTERNS = ['..', '.env', 'node_modules'];
const ALLOWED_PATH_PREFIXES = ['client/', 'server/'];

// ── Helpers ───────────────────────────────────────────────────

function callWithTimeout(promise, ms) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => {
      const err = new Error(`AI generation timed out after ${ms / 1000}s`);
      err.code   = 'AI_TIMEOUT';
      err.status = 503;
      reject(err);
    }, ms)
  );
  return Promise.race([promise, timer]);
}

function isValidPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (BLOCKED_PATH_PATTERNS.some(p => filePath.includes(p)))  return false;
  if (!ALLOWED_PATH_PREFIXES.some(p => filePath.startsWith(p))) return false;
  return true;
}

function validateAndCleanFiles(files, label) {
  if (!Array.isArray(files)) return [];

  const valid = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    if (!f || typeof f !== 'object') {
      console.warn(`[CODE GEN] ${label}[${i}] not an object — skipping`);
      continue;
    }
    if (!f.path || !f.language || !f.content) {
      console.warn(`[CODE GEN] ${label}[${i}] missing path/language/content — skipping`);
      continue;
    }
    if (!isValidPath(f.path)) {
      console.warn(`[CODE GEN] ${label}[${i}] unsafe path "${f.path}" — skipping`);
      continue;
    }
    if (typeof f.content !== 'string' || f.content.trim().length === 0) {
      console.warn(`[CODE GEN] ${label}[${i}] empty content — skipping`);
      continue;
    }

    // Truncate oversized files rather than rejecting to preserve as much as possible
    const content = f.content.length > MAX_FILE_CONTENT_LENGTH
      ? f.content.slice(0, MAX_FILE_CONTENT_LENGTH) + '\n// [TRUNCATED — content exceeded 50,000 chars]'
      : f.content;

    valid.push({
      path:     f.path.trim(),
      language: f.language.trim(),
      type:     f.type || 'file',
      content,
    });
  }
  return valid;
}

function buildPrompt(tool, plan) {
  return `You are a Senior Full-Stack Engineer.
Generate complete, production-ready code for this micro-SaaS tool.

Tool Name: ${tool.name}
Description: ${tool.description || 'Not provided'}

TECH STACK (follow exactly):
- Frontend: React (Vite), Tailwind CSS, Axios
- Backend: Node.js, Express, Supabase
- Auth: JWT (token in localStorage as 'awe_token')
- API Base: process.env.VITE_API_URL

BUILD PLAN:
UI Plan: ${JSON.stringify(plan.ui_plan)}
API Plan: ${JSON.stringify(plan.api_plan)}
DB Schema: ${JSON.stringify(plan.db_schema)}

RULES:
- Use functional React components with hooks only
- Use Tailwind CSS only (no other UI libraries)
- Every API route must validate JWT via middleware
- Every async function must have try/catch with appropriate HTTP status codes
- Add a JSDoc comment to every exported function
- Follow RESTful conventions for all endpoints
- Supabase client is at server/db/supabase.js (already configured)
- JWT secret is process.env.JWT_SECRET
- Auth middleware is at server/middleware/auth.js (use requireAuth)

Return ONLY this exact JSON object — no explanation, no markdown fences:
{
  "frontend_files": [
    {
      "path": "client/src/pages/ToolName.jsx",
      "language": "jsx",
      "type": "page",
      "content": "full complete file content here"
    }
  ],
  "backend_files": [
    {
      "path": "server/routes/toolname.routes.js",
      "language": "javascript",
      "type": "route",
      "content": "full complete file content here"
    },
    {
      "path": "server/controllers/toolname.controller.js",
      "language": "javascript",
      "type": "controller",
      "content": "full complete file content here"
    }
  ],
  "db_sql": "-- SQL to create this tool's tables\\nCREATE TABLE IF NOT EXISTS..."
}

CRITICAL: Every file content must be complete, working code.
DO NOT use placeholder comments like '// add logic here' or '// TODO'.
The code must be ready to copy-paste into the project and run.`;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Generate production-ready code for an approved tool and save it to DB.
 * Code is stored in Supabase — never written to disk.
 *
 * @param {string} tool_id - UUID of the tool in 'building' status
 * @returns {Promise<GenerationResult>}
 */
async function generateToolCode(tool_id) {
  // ── 1. Validate preconditions ──────────────────────────────
  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('id, name, description, status')
    .eq('id', tool_id)
    .maybeSingle();

  if (toolErr) {
    const err = new Error('Database error fetching tool');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }
  if (!tool) {
    const err = new Error(`Tool not found: ${tool_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }
  if (tool.status !== 'building') {
    const err = new Error(
      `Tool "${tool.name}" has status="${tool.status}". Only tools with status='building' can have code generated.`
    );
    err.code = 'INVALID_STATUS'; err.status = 422; throw err;
  }

  // Fetch the approved build plan
  const { data: plan, error: planErr } = await supabase
    .from('builder_plans')
    .select('id, tool_id, ui_plan, api_plan, db_schema, tech_stack, status')
    .eq('tool_id', tool_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planErr) {
    const err = new Error('Database error fetching build plan');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }
  if (!plan) {
    const err = new Error(
      'No approved plan found. Approve a plan in the Builder Panel first.'
    );
    err.code = 'NO_APPROVED_PLAN'; err.status = 422; throw err;
  }

  // Guard against duplicate active generation
  const { data: existing } = await supabase
    .from('generated_code')
    .select('id, status')
    .eq('plan_id', plan.id)
    .not('status', 'in', '("rejected","failed")')
    .maybeSingle();

  if (existing) {
    const err = new Error(
      `Code already generated for this plan (id=${existing.id}, status=${existing.status}). Check the Code Viewer.`
    );
    err.code = 'DUPLICATE_BUILD'; err.status = 409; throw err;
  }

  // ── 2. Create pending record ──────────────────────────────
  const { data: record, error: insertErr } = await supabase
    .from('generated_code')
    .insert({
      tool_id,
      plan_id:   plan.id,
      tool_name: tool.name,
      status:    'generating',
    })
    .select('id')
    .single();

  if (insertErr) {
    const err = new Error('Failed to create generation record');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  const codeId = record.id;

  // ── 3–5. Call AI + validate ──────────────────────────────
  console.log(`[CODE GEN] Starting for: ${tool.name} | plan_id: ${plan.id}`);
  const start = Date.now();

  let parsed;
  try {
    const prompt   = buildPrompt(tool, plan);
    const aiRaw    = await callWithTimeout(
      callOpenAI(prompt, { model: AI_MODEL, temperature: 0.3, max_tokens: 4000 }),
      AI_TIMEOUT_MS
    );
    const duration = Date.now() - start;
    console.log(`[CODE GEN] AI responded in ${duration}ms`);

    parsed = parseJSONResponse(aiRaw);
    parsed._duration = duration;
  } catch (aiErr) {
    // Update record to 'failed' so UI can show the error state
    await supabase
      .from('generated_code')
      .update({ status: 'failed' })
      .eq('id', codeId);

    console.error(`[CODE GEN] AI error for "${tool.name}": ${aiErr.message}`);
    aiErr.code   = aiErr.code   || 'AI_UNAVAILABLE';
    aiErr.status = aiErr.status || 503;
    throw aiErr;
  }

  const frontendFiles = validateAndCleanFiles(parsed.frontend_files, 'frontend');
  const backendFiles  = validateAndCleanFiles(parsed.backend_files,  'backend');
  const totalFiles    = frontendFiles.length + backendFiles.length;

  if (totalFiles === 0) {
    await supabase.from('generated_code').update({ status: 'failed' }).eq('id', codeId);
    const err = new Error('AI returned no valid files after path validation');
    err.code   = 'INVALID_CODE_OUTPUT';
    err.status = 500;
    throw err;
  }

  console.log(`[CODE GEN] Validated ${totalFiles} files successfully (${frontendFiles.length} frontend, ${backendFiles.length} backend)`);

  // ── 6. Save to DB ──────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from('generated_code')
    .update({
      frontend_files: frontendFiles,
      backend_files:  backendFiles,
      db_sql:         typeof parsed.db_sql === 'string' ? parsed.db_sql : null,
      total_files:    totalFiles,
      generation_ms:  parsed._duration,
      ai_model:       AI_MODEL,
      status:         'ready_for_review',
    })
    .eq('id', codeId);

  if (updateErr) {
    console.error(`[CODE GEN] DB save failed: ${updateErr.message}`);
    const err = new Error('Failed to save generated code to database');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  console.log(`[CODE GEN] Saved to DB: code_id = ${codeId}`);

  return {
    success:        true,
    tool_id,
    tool_name:      tool.name,
    code_id:        codeId,
    total_files:    totalFiles,
    frontend_files: frontendFiles.length,
    backend_files:  backendFiles.length,
    has_sql:        Boolean(parsed.db_sql),
    generation_ms:  parsed._duration,
    status:         'ready_for_review',
    message:        'Code ready for review in dashboard',
  };
}

/**
 * Fetch the latest generated code record for a tool, including all file contents.
 * @param {string} tool_id
 * @returns {Promise<object|null>}
 */
async function getGeneratedCode(tool_id) {
  const { data, error } = await supabase
    .from('generated_code')
    .select('*')
    .eq('tool_id', tool_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/**
 * Human approves generated code — marks tool as 'live'.
 * @param {string} code_id
 * @param {string} [reviewer_notes]
 */
async function approveGeneratedCode(code_id, reviewer_notes = null) {
  const { data: codeRecord, error: fetchErr } = await supabase
    .from('generated_code')
    .select('id, tool_id, tool_name, status')
    .eq('id', code_id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!codeRecord) {
    const err = new Error(`Code record not found: ${code_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }

  const { error: approveErr } = await supabase
    .from('generated_code')
    .update({
      status:         'approved',
      reviewed_at:    new Date().toISOString(),
      reviewer_notes: reviewer_notes || null,
    })
    .eq('id', code_id);

  if (approveErr) throw approveErr;

  // Promote tool to 'live' only after human explicitly approves
  const { error: toolErr } = await supabase
    .from('tools')
    .update({ status: 'live' })
    .eq('id', codeRecord.tool_id);

  if (toolErr) {
    console.error(`[CODE GEN] Failed to set tool status=live: ${toolErr.message}`);
  } else {
    console.log(`[CODE GEN] Tool ${codeRecord.tool_name} approved → live`);
  }

  return { success: true, tool_id: codeRecord.tool_id, status: 'live' };
}

/**
 * Human rejects generated code — tool stays 'building' so code can be regenerated.
 * @param {string} code_id
 * @param {string} [reviewer_notes]
 */
async function rejectGeneratedCode(code_id, reviewer_notes = null) {
  const { data: codeRecord, error: fetchErr } = await supabase
    .from('generated_code')
    .select('id, tool_id, tool_name, status')
    .eq('id', code_id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!codeRecord) {
    const err = new Error(`Code record not found: ${code_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }

  const { error: rejectErr } = await supabase
    .from('generated_code')
    .update({
      status:         'rejected',
      reviewed_at:    new Date().toISOString(),
      reviewer_notes: reviewer_notes || null,
    })
    .eq('id', code_id);

  if (rejectErr) throw rejectErr;

  // Tool stays 'building' — intentionally no status change here
  console.log(`[CODE GEN] Code rejected for "${codeRecord.tool_name}". Tool stays 'building' — can regenerate.`);

  return { success: true, tool_id: codeRecord.tool_id, can_regenerate: true };
}

module.exports = {
  generateToolCode,
  getGeneratedCode,
  approveGeneratedCode,
  rejectGeneratedCode,
};
