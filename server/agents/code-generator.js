const supabase                        = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// ── Constants ─────────────────────────────────────────────────
const AI_TIMEOUT_MS           = 120_000;           // 120s — was 60s, Render needs headroom
const MAX_FILE_CONTENT_LENGTH = 50_000;
const AI_MODEL                = process.env.CODEGEN_MODEL || 'gpt-4o-mini';

const BLOCKED_PATH_PATTERNS = ['..', '.env', 'node_modules'];
const ALLOWED_PATH_PREFIXES = ['client/', 'server/'];

// ── Helpers ───────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

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
  if (BLOCKED_PATH_PATTERNS.some(p => filePath.includes(p)))   return false;
  if (!ALLOWED_PATH_PREFIXES.some(p => filePath.startsWith(p))) return false;
  return true;
}

function validateAndCleanFiles(files, label) {
  if (!Array.isArray(files)) return [];
  const valid = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || typeof f !== 'object') {
      console.warn(`[CODE GEN] ${label}[${i}] not an object — skipping`); continue;
    }
    if (!f.path || !f.language || !f.content) {
      console.warn(`[CODE GEN] ${label}[${i}] missing path/language/content — skipping`); continue;
    }
    if (!isValidPath(f.path)) {
      console.warn(`[CODE GEN] ${label}[${i}] unsafe path "${f.path}" — skipping`); continue;
    }
    if (typeof f.content !== 'string' || f.content.trim().length === 0) {
      console.warn(`[CODE GEN] ${label}[${i}] empty content — skipping`); continue;
    }
    const content = f.content.length > MAX_FILE_CONTENT_LENGTH
      ? f.content.slice(0, MAX_FILE_CONTENT_LENGTH) + '\n// [TRUNCATED]'
      : f.content;
    valid.push({ path: f.path.trim(), language: f.language.trim(), type: f.type || 'file', content });
  }
  return valid;
}

// ── Per-file prompt builders ───────────────────────────────────

function buildPagePrompt(tool, page) {
  return `You are a senior React developer. Generate ONE complete production-ready React component.

Tool: ${tool.name}
Page: ${page.name || 'Page'} — route: ${page.route || '/'}
Purpose: ${page.purpose || ''}
Components: ${(page.components || []).join(', ')}
Features: ${(page.key_features || []).join(', ')}
State: ${page.state_management || ''}
API Calls: ${(page.api_calls || []).join(', ')}

Rules:
- Tailwind CSS only, dark theme (#0a0a0f bg, #12121a cards, #4f46e5 accent)
- Functional component with hooks — no class components
- Include loading state, error state, and empty state
- Use fetch() for API calls; read token from localStorage('awe_token')
- Export as default function
- VITE_API_URL is from import.meta.env.VITE_API_URL

Return ONLY the complete JSX code. No markdown, no explanation.`;
}

function buildRoutePrompt(tool, endpoint) {
  return `You are a senior Node.js/Express developer. Generate ONE complete production-ready route handler.

Tool: ${tool.name}
Endpoint: ${endpoint.method || 'GET'} ${endpoint.path || '/api/route'}
Purpose: ${endpoint.purpose || ''}
Auth Required: ${endpoint.auth_required ?? true}
Rate Limit: ${endpoint.rate_limit || '100/15min'}
Request Body: ${JSON.stringify(endpoint.request_body || {})}
Response: ${JSON.stringify(endpoint.response || {})}
Validations: ${(endpoint.validation_rules || []).join(', ')}
Error Codes: ${(endpoint.error_codes || []).join(', ')}

Rules:
- Express Router with requireAuth middleware at server/middleware/auth.js
- Supabase client from server/db/supabase.js
- Input validation with express-validator
- try/catch on every async operation — return JSON { success, data/error }
- Proper HTTP status codes (400/401/403/404/429/500)

Return ONLY the complete route handler code. No markdown, no explanation.`;
}

function buildSqlPrompt(tool, dbSchema) {
  return `Generate PostgreSQL SQL for this tool's database schema.

Tool: ${tool.name}
Schema: ${JSON.stringify(dbSchema || {})}

Rules:
- CREATE TABLE IF NOT EXISTS with proper types
- UUID primary keys with gen_random_uuid()
- created_at/updated_at TIMESTAMPTZ DEFAULT now()
- Proper indexes for foreign keys and frequently queried columns
- RLS policies for user data isolation
- updated_at trigger

Return ONLY the SQL. No explanation. No markdown.`;
}

// ── Retry wrapper ─────────────────────────────────────────────

async function generateWithRetry(fn, retries = 1) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.log('[CODE GEN] Retrying generation…');
      await delay(3000);
      return generateWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

// ── Partial progress save ─────────────────────────────────────

async function savePartialProgress(codeId, frontendFiles, backendFiles) {
  try {
    await supabase
      .from('generated_code')
      .update({
        frontend_files: frontendFiles,
        backend_files:  backendFiles,
        total_files:    frontendFiles.length + backendFiles.length,
        status:         'generating',
      })
      .eq('id', codeId);
  } catch (err) {
    console.warn('[CODE GEN] Partial save failed (non-fatal):', err.message);
  }
}

// ── Chunked generation ────────────────────────────────────────
// Generates one file at a time — each call is short enough for Render free tier.
// Saves progress to DB after every file so partial work is never lost.

async function generateChunked(tool, plan, codeId) {
  const pages     = plan.ui_plan?.pages     || [];
  const endpoints = plan.api_plan?.endpoints || [];
  const toolName  = tool.name;

  const frontendFiles = [];
  const backendFiles  = [];
  const total = pages.length + endpoints.length;
  let done = 0;

  // ── Frontend pages ────────────────────────────────────────
  for (const page of pages) {
    const pageName = page.name || 'Page';
    try {
      const rawCode = await generateWithRetry(() =>
        callWithTimeout(
          callOpenAI(buildPagePrompt(tool, page), {
            model: AI_MODEL, temperature: 0.2, max_tokens: 3000, timeout: AI_TIMEOUT_MS,
          }),
          AI_TIMEOUT_MS
        )
      );

      // Derive file path from page name
      const safeName  = pageName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      const filePath  = `client/src/pages/${safeName}.jsx`;
      const fileObj   = { path: filePath, language: 'jsx', type: 'page', content: rawCode };
      const validated = validateAndCleanFiles([fileObj], 'frontend');
      if (validated.length > 0) frontendFiles.push(validated[0]);

      done++;
      console.log(`[CODE GEN] ✓ Page "${pageName}" (${done}/${total})`);
    } catch (err) {
      console.warn(`[CODE GEN] ✗ Page "${pageName}" failed — skipping:`, err.message);
    }

    await savePartialProgress(codeId, frontendFiles, backendFiles);
    await delay(2000);
  }

  // ── Backend routes ────────────────────────────────────────
  for (const endpoint of endpoints) {
    const epLabel = `${endpoint.method || 'GET'} ${endpoint.path || '/'}`;
    try {
      const rawCode = await generateWithRetry(() =>
        callWithTimeout(
          callOpenAI(buildRoutePrompt(tool, endpoint), {
            model: AI_MODEL, temperature: 0.2, max_tokens: 3000, timeout: AI_TIMEOUT_MS,
          }),
          AI_TIMEOUT_MS
        )
      );

      // Derive a safe file path from endpoint path
      const safePath  = (endpoint.path || '/route').replace(/[^a-zA-Z0-9/-]/g, '').replace(/\//g, '-').replace(/^-/, '');
      const filePath  = `server/routes/${safePath || 'route'}.routes.js`;
      const fileObj   = { path: filePath, language: 'javascript', type: 'route', content: rawCode };
      const validated = validateAndCleanFiles([fileObj], 'backend');
      if (validated.length > 0) backendFiles.push(validated[0]);

      done++;
      console.log(`[CODE GEN] ✓ Route "${epLabel}" (${done}/${total})`);
    } catch (err) {
      console.warn(`[CODE GEN] ✗ Route "${epLabel}" failed — skipping:`, err.message);
    }

    await savePartialProgress(codeId, frontendFiles, backendFiles);
    await delay(2000);
  }

  // ── SQL ───────────────────────────────────────────────────
  let dbSql = null;
  try {
    dbSql = await generateWithRetry(() =>
      callWithTimeout(
        callOpenAI(buildSqlPrompt(tool, plan.db_schema), {
          model: AI_MODEL, temperature: 0.1, max_tokens: 1000, timeout: AI_TIMEOUT_MS,
        }),
        AI_TIMEOUT_MS
      )
    );
    console.log('[CODE GEN] ✓ SQL generated');
  } catch (err) {
    console.warn('[CODE GEN] ✗ SQL generation failed (non-fatal):', err.message);
  }

  const partial = done < total;
  return { frontendFiles, backendFiles, dbSql, done, total, partial };
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Generate production-ready code for an approved tool, one file at a time.
 * Saves partial progress to DB after each file — no work lost on timeout.
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
    const err = new Error('No approved plan found. Approve a plan in the Builder Panel first.');
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

  // ── 2. Create pending DB record ───────────────────────────
  const { data: record, error: insertErr } = await supabase
    .from('generated_code')
    .insert({ tool_id, plan_id: plan.id, tool_name: tool.name, status: 'generating' })
    .select('id')
    .single();

  if (insertErr) {
    const err = new Error('Failed to create generation record');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  const codeId = record.id;

  // ── 3. Chunked generation ─────────────────────────────────
  console.log(`[CODE GEN] Starting chunked generation for: ${tool.name} | plan_id: ${plan.id}`);
  const start = Date.now();

  let frontendFiles = [], backendFiles = [], dbSql = null, done = 0, total = 0;

  try {
    ({ frontendFiles, backendFiles, dbSql, done, total } = await generateChunked(tool, plan, codeId));
  } catch (err) {
    // Mark failed if chunked generation itself crashes (not individual file failures)
    await supabase.from('generated_code').update({ status: 'failed' }).eq('id', codeId);
    console.error(`[CODE GEN] Fatal error for "${tool.name}": ${err.message}`);
    err.code   = err.code   || 'AI_UNAVAILABLE';
    err.status = err.status || 503;
    throw err;
  }

  const totalFiles  = frontendFiles.length + backendFiles.length;
  const genMs       = Date.now() - start;
  const partial     = done < total;
  const finalStatus = totalFiles === 0 ? 'failed' : partial ? 'partial_ready' : 'ready_for_review';

  if (totalFiles === 0) {
    await supabase.from('generated_code').update({ status: 'failed' }).eq('id', codeId);
    const err = new Error('AI returned no valid files after validation');
    err.code = 'INVALID_CODE_OUTPUT'; err.status = 500; throw err;
  }

  console.log(`[CODE GEN] ${done}/${total} files in ${genMs}ms — status: ${finalStatus}`);

  // ── 4. Save final result ──────────────────────────────────
  const { error: updateErr } = await supabase
    .from('generated_code')
    .update({
      frontend_files: frontendFiles,
      backend_files:  backendFiles,
      db_sql:         typeof dbSql === 'string' ? dbSql : null,
      total_files:    totalFiles,
      generation_ms:  genMs,
      ai_model:       AI_MODEL,
      status:         finalStatus,
    })
    .eq('id', codeId);

  if (updateErr) {
    console.error(`[CODE GEN] DB save failed: ${updateErr.message}`);
    const err = new Error('Failed to save generated code to database');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  console.log(`[CODE GEN] Saved → code_id: ${codeId}`);

  return {
    success:        true,
    tool_id,
    tool_name:      tool.name,
    code_id:        codeId,
    total_files:    totalFiles,
    frontend_files: frontendFiles.length,
    backend_files:  backendFiles.length,
    has_sql:        Boolean(dbSql),
    generation_ms:  genMs,
    files_done:     done,
    files_total:    total,
    partial,
    status:         finalStatus,
    message:        partial
      ? `Partial generation: ${done}/${total} files. Retry to complete.`
      : 'Code ready for review in dashboard',
  };
}

/**
 * Fetch the latest generated code record for a tool, including all file contents.
 * @param {string} tool_id
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
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewer_notes: reviewer_notes || null })
    .eq('id', code_id);

  if (approveErr) throw approveErr;

  const { error: toolErr } = await supabase
    .from('tools')
    .update({ status: 'live' })
    .eq('id', codeRecord.tool_id);

  if (toolErr) {
    console.error(`[CODE GEN] Failed to set tool status=live: ${toolErr.message}`);
  } else {
    console.log(`[CODE GEN] Tool "${codeRecord.tool_name}" approved → live`);
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
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewer_notes: reviewer_notes || null })
    .eq('id', code_id);

  if (rejectErr) throw rejectErr;

  console.log(`[CODE GEN] Code rejected for "${codeRecord.tool_name}". Tool stays 'building' — can regenerate.`);
  return { success: true, tool_id: codeRecord.tool_id, can_regenerate: true };
}

module.exports = {
  generateToolCode,
  getGeneratedCode,
  approveGeneratedCode,
  rejectGeneratedCode,
};
