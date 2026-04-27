const supabase                        = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// ── Constants ──────────────────────────────────────────────────
const AI_TIMEOUT_MS           = 120_000;
const MAX_FILE_CONTENT_LENGTH = 50_000;
const AI_MODEL                = process.env.CODEGEN_MODEL || 'gpt-4o-mini';
const MAX_HEAL_ATTEMPTS       = 3;
const PASS_SCORE              = 85;   // minimum score to accept a file without retry

const BLOCKED_PATH_PATTERNS = ['..', '.env', 'node_modules'];
const ALLOWED_PATH_PREFIXES = ['client/', 'server/'];

// ── FIX 1 — System prompt ──────────────────────────────────────
// Injected as the system role on every OpenAI call so the model
// treats these as hard constraints, not suggestions.
const CODEGEN_SYSTEM_PROMPT = `You are an expert SaaS developer for the AWE-OS platform.
You write complete, production-ready code with zero placeholders.

ABSOLUTE RULES — never break any of these:
1. NEVER import external components — all UI must be inline in the same file
2. ALWAYS use: const token = localStorage.getItem('awe_token')
3. ALWAYS use: import.meta.env.VITE_API_URL as the API base (never hardcode any URL)
4. ALWAYS import axios at the top — never use fetch()
5. ALWAYS wrap every API call in try/catch/finally with setLoading(false) in finally
6. ALWAYS show loading spinner, error message, and empty state in every page
7. ALWAYS use Tailwind dark theme: bg-gray-900 page background, bg-gray-800 cards
8. NEVER hardcode localhost, onrender.com, vercel.app, or any http:// / https:// URL
9. NEVER write placeholder comments: // TODO, // Add logic here, // Handle this
10. For backend: ALWAYS use req.user?.userId (never req.user.id)
11. For backend: ALWAYS const requireAuth = require('../middleware/auth') — never destructure
12. For backend: ALWAYS filter every DB query by user_id for strict data isolation
13. For backend: ALWAYS return { success: true, data } on success; { success: false, message } on failure
14. For SQL: ALWAYS use CREATE TABLE IF NOT EXISTS — never recreate the existing users table

You generate COMPLETE working code. No placeholders. No TODOs. No hollow shells.`;

// ── Helpers ────────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

function callWithTimeout(promise, ms) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => {
      const err    = new Error(`AI generation timed out after ${ms / 1000}s`);
      err.code     = 'AI_TIMEOUT';
      err.status   = 503;
      reject(err);
    }, ms)
  );
  return Promise.race([promise, timer]);
}

function isValidPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (BLOCKED_PATH_PATTERNS.some(p => filePath.includes(p)))    return false;
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

// ── FIX 3 — Comprehensive validator ───────────────────────────
// Returns { score, passed, issues: [{severity, message}], summary }
// Used by the self-healing loop to decide whether to retry.

function validateGeneratedCode(code, type) {
  const issues = [];

  if (type === 'frontend' || type === 'page') {
    if (!code.includes('awe_token'))
      issues.push({ severity: 'CRITICAL', message: 'Missing awe_token auth — use localStorage.getItem("awe_token")' });
    if (!code.includes('import axios') && !code.includes("require('axios')"))
      issues.push({ severity: 'CRITICAL', message: 'Missing axios import — never use fetch()' });
    if (/localhost:/.test(code))
      issues.push({ severity: 'CRITICAL', message: 'Hardcoded localhost URL found' });
    if (/getItem\(['"]token['"]\)/.test(code))
      issues.push({ severity: 'CRITICAL', message: "Wrong token key — must use 'awe_token' not 'token'" });
    if (!code.includes('VITE_API_URL'))
      issues.push({ severity: 'CRITICAL', message: 'Missing VITE_API_URL — hardcoded or absent API base' });
    if (/https?:\/\/([\w-]+\.onrender\.com|[\w-]+\.vercel\.app)/.test(code))
      issues.push({ severity: 'CRITICAL', message: 'Hardcoded deployment URL (onrender/vercel)' });

    if (!code.includes('try {'))
      issues.push({ severity: 'HIGH', message: 'No try/catch error handling' });
    if (!code.includes('setLoading') && !code.includes('loading'))
      issues.push({ severity: 'HIGH', message: 'No loading state' });
    if (!code.includes('useEffect'))
      issues.push({ severity: 'HIGH', message: 'No useEffect data fetching' });
    if (code.includes('fetch('))
      issues.push({ severity: 'HIGH', message: 'fetch() used — replace with axios' });

    if (code.includes("from '../components/"))
      issues.push({ severity: 'MEDIUM', message: 'Importing external components — inline all UI instead' });
    if (/\/\/ TODO|\/\/ Add |\/\/ Handle/.test(code))
      issues.push({ severity: 'MEDIUM', message: 'Placeholder comments found (TODO / Add / Handle)' });
    if (!code.includes('bg-gray'))
      issues.push({ severity: 'MEDIUM', message: 'Missing dark theme Tailwind classes (bg-gray-*)' });
  }

  if (type === 'backend' || type === 'route') {
    if (!code.includes('req.user?.userId') && !code.includes('req.user.userId'))
      issues.push({ severity: 'CRITICAL', message: 'Unsafe user access — use req.user?.userId' });
    if (/req\.user\.id\b/.test(code))
      issues.push({ severity: 'CRITICAL', message: 'req.user.id used — must be req.user?.userId' });
    if (/\{\s*requireAuth/.test(code))
      issues.push({ severity: 'CRITICAL', message: 'requireAuth destructured — it is a default export, use: require("../middleware/auth")' });

    if (!code.includes('try {'))
      issues.push({ severity: 'CRITICAL', message: 'No try/catch in async handler' });
    if (!code.includes('requireAuth'))
      issues.push({ severity: 'HIGH', message: 'Missing requireAuth middleware' });
    if (!code.includes('user_id'))
      issues.push({ severity: 'HIGH', message: 'No user_id filter — data isolation missing' });
    if (!code.includes('success: true'))
      issues.push({ severity: 'HIGH', message: 'Non-standard response format (need { success: true })' });
    if (!code.includes('module.exports'))
      issues.push({ severity: 'HIGH', message: 'Missing module.exports = router' });
  }

  if (type === 'sql' || type === 'database') {
    if (/CREATE TABLE\s+(?!IF NOT EXISTS)\s*users/.test(code))
      issues.push({ severity: 'CRITICAL', message: 'Recreating users table — it already exists, forbidden' });
    if (/CREATE TABLE\s+(?!IF NOT EXISTS)/.test(code))
      issues.push({ severity: 'HIGH', message: 'CREATE TABLE without IF NOT EXISTS' });
    if (!code.includes('ROW LEVEL SECURITY') && !code.includes('RLS'))
      issues.push({ severity: 'MEDIUM', message: 'Missing RLS policy' });
    if (!code.includes('updated_at'))
      issues.push({ severity: 'LOW', message: 'Missing updated_at trigger' });
    if (/CREATE INDEX\s+ON/.test(code) && !/CREATE INDEX IF NOT EXISTS/.test(code))
      issues.push({ severity: 'MEDIUM', message: 'CREATE INDEX without IF NOT EXISTS' });
  }

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const highCount     = issues.filter(i => i.severity === 'HIGH').length;
  const mediumCount   = issues.filter(i => i.severity === 'MEDIUM').length;
  const lowCount      = issues.filter(i => i.severity === 'LOW').length;

  const score = Math.max(0,
    100 - (criticalCount * 25) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2)
  );

  return {
    score,
    passed: criticalCount === 0 && score >= PASS_SCORE,
    issues,
    summary: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
  };
}

// ── FIX 2 — Self-healing generation loop ──────────────────────
// Generates code, validates it, and retries with the fix context
// automatically until quality score >= PASS_SCORE or maxAttempts reached.

function buildFixPrompt(originalPrompt, brokenCode, issues) {
  return `${originalPrompt}

IMPORTANT: Your previous attempt had these issues that MUST be fixed:
${issues.map((issue, n) => `${n + 1}. [${issue.severity}] ${issue.message}`).join('\n')}

The broken code started like this:
\`\`\`
${brokenCode.slice(0, 1000)}...
\`\`\`

Fix ALL issues listed above and return the complete corrected file.
Do not repeat the same mistakes. Apply every rule from the system prompt.`;
}

async function generateWithSelfHealing(prompt, fileType, maxAttempts = MAX_HEAL_ATTEMPTS) {
  let attempt   = 0;
  let lastCode  = '';
  let lastIssues = [];

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`[CODE GEN] Attempt ${attempt}/${maxAttempts}`);

    const promptToUse = attempt === 1
      ? prompt
      : buildFixPrompt(prompt, lastCode, lastIssues);

    let code;
    try {
      code = await callWithTimeout(
        callOpenAI(promptToUse, {
          model:        AI_MODEL,
          temperature:  attempt === 1 ? 0.1 : 0.05,
          max_tokens:   4000,
          timeout:      AI_TIMEOUT_MS,
          systemPrompt: CODEGEN_SYSTEM_PROMPT,
        }),
        AI_TIMEOUT_MS
      );
    } catch (err) {
      if (attempt < maxAttempts) {
        console.warn(`[CODE GEN] Attempt ${attempt} failed (${err.code}) — retrying`);
        await delay(2000);
        continue;
      }
      throw err;
    }

    const validation = validateGeneratedCode(code, fileType);
    console.log(`[CODE GEN] Quality: ${validation.score}/100 | Issues: ${validation.issues.length}`);

    if (validation.score >= PASS_SCORE) {
      console.log(`[CODE GEN] ✅ Passed on attempt ${attempt}`);
      return { code, validation, attempts: attempt };
    }

    lastCode   = code;
    lastIssues = validation.issues;
    console.warn(`[CODE GEN] ⚠️  Score ${validation.score} < ${PASS_SCORE} — retrying`);

    if (attempt < maxAttempts) await delay(2000);
  }

  // Return best-effort result after exhausting attempts
  console.error(`[CODE GEN] ❌ Max attempts (${maxAttempts}) reached — saving best effort`);
  const finalValidation = validateGeneratedCode(lastCode, fileType);
  return { code: lastCode, validation: finalValidation, attempts: attempt };
}

// ── Per-file prompt builders ───────────────────────────────────
// These are USER prompts — the system prompt (CODEGEN_SYSTEM_PROMPT)
// carries the absolute rules so these can focus on the file-specific spec.

function buildPagePrompt(tool, page) {
  const safeName   = (page.name || 'Page').replace(/\s+/g, '');
  const apiCalls   = (page.api_calls    || []).join('\n  - ') || 'none';
  const components = (page.components   || []).join(', ')     || 'none';
  const features   = (page.key_features || []).join(', ')     || 'none';

  return `Generate ONE complete React page component for the AWE-OS platform.

TOOL: ${tool.name}
PAGE: ${page.name || 'Page'} — route: ${page.route || '/'}
PURPOSE: ${page.purpose || ''}
FEATURES: ${features}
COMPONENTS NEEDED: ${components}
STATE: ${page.state_management || 'useState + useEffect'}
API CALLS:
  - ${apiCalls}

REQUIRED STRUCTURE:
\`\`\`
import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;

export default function ${safeName}() {
  const token = localStorage.getItem('awe_token');
  if (!token) { window.location.href = '/login'; return null; }
  const headers = { Authorization: \`Bearer \${token}\` };

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(\`\${API}/...\`, { headers });
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
  if (error)   return <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">{error}</div>;
  if (!data.length) return <div className="text-center py-12 text-gray-400">No items yet.</div>;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* full implementation here */}
    </div>
  );
}
\`\`\`

Build the COMPLETE implementation — not this skeleton. Every feature from the list above must be working.
All UI must be inline (no external component imports).
Use bg-gray-900 page, bg-gray-800 cards, indigo-600 buttons.

Return ONLY the JSX file. No markdown fences, no explanation.`;
}

function buildRoutePrompt(tool, endpoint) {
  const validations = (endpoint.validation_rules || []).join('\n  - ') || 'none';
  const errorCodes  = (endpoint.error_codes || []).join(', ')          || '400, 401, 404, 500';

  return `Generate ONE complete Express route file for the AWE-OS platform.

TOOL: ${tool.name}
ENDPOINT: ${endpoint.method || 'GET'} ${endpoint.path || '/api/route'}
PURPOSE: ${endpoint.purpose || ''}
AUTH REQUIRED: ${endpoint.auth_required !== false ? 'YES' : 'NO'}
REQUEST BODY: ${JSON.stringify(endpoint.request_body || {})}
RESPONSE: ${JSON.stringify(endpoint.response || {})}
VALIDATIONS:
  - ${validations}
ERROR CODES: ${errorCodes}

REQUIRED FILE STRUCTURE:
\`\`\`
const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.${(endpoint.method || 'GET').toLowerCase()}('${endpoint.path || '/'}', requireAuth, async (req, res) => {
  const { userId, email } = req.user;   // requireAuth sets req.user = { userId, email, jti }
  try {
    // validate input
    // query supabase with .eq('user_id', userId)
    // return res.status(200).json({ success: true, data: result, message: '...' });
  } catch (err) {
    console.error('[${tool.name}]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
\`\`\`

Build the COMPLETE implementation. Never use req.user.id — always req.user?.userId.
Never add a POST /auth/login route — global auth handles it.
Always filter Supabase queries with .eq('user_id', userId).

Return ONLY the .js route file. No markdown fences, no explanation.`;
}

function buildSqlPrompt(tool, dbSchema) {
  return `Generate the complete PostgreSQL schema for this AWE-OS tool.

TOOL: ${tool.name}
SCHEMA SPEC: ${JSON.stringify(dbSchema || {})}

REQUIRED PATTERNS (copy these exactly):

  -- Tables
  CREATE TABLE IF NOT EXISTS table_name (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- Indexes (IF NOT EXISTS required)
  CREATE INDEX IF NOT EXISTS idx_table_user_id    ON table_name(user_id);
  CREATE INDEX IF NOT EXISTS idx_table_created_at ON table_name(created_at DESC);

  -- RLS (required for every new table)
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users access own data" ON table_name FOR ALL USING (user_id = auth.uid());

  -- updated_at trigger (use CREATE OR REPLACE)
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  CREATE TRIGGER update_table_name_updated_at
    BEFORE UPDATE ON table_name FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

RULES:
- NEVER create or alter the users table — it already exists
- TEXT not VARCHAR, JSONB not JSON, NUMERIC(10,2) for money
- Every column must have NOT NULL with a sensible default

Return ONLY the SQL. No markdown fences, no explanation.`;
}

// ── Partial progress save ──────────────────────────────────────

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

// ── FIX 4 — Chunked generation with self-healing ───────────────
// One file per OpenAI call, self-heals up to MAX_HEAL_ATTEMPTS times.
// Saves to DB after every file — no work lost on timeout.

async function generateChunked(tool, plan, codeId) {
  const pages     = plan.ui_plan?.pages     || [];
  const endpoints = plan.api_plan?.endpoints || [];

  const frontendFiles  = [];
  const backendFiles   = [];
  const fileReports    = [];          // tracks per-file quality for FIX 5 report
  const total = pages.length + endpoints.length;
  let done = 0;

  // ── Frontend pages ─────────────────────────────────────────
  for (const page of pages) {
    const pageName = page.name || 'Page';
    try {
      const { code: rawCode, validation, attempts } = await generateWithSelfHealing(
        buildPagePrompt(tool, page),
        'frontend'
      );

      console.log(`[CODE GEN] "${pageName}": score ${validation.score}/100 in ${attempts} attempt(s)`);
      fileReports.push({ name: pageName, type: 'page', score: validation.score, issues: validation.issues.length, attempts });

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

  // ── Backend routes ─────────────────────────────────────────
  for (const endpoint of endpoints) {
    const epLabel = `${endpoint.method || 'GET'} ${endpoint.path || '/'}`;
    try {
      const { code: rawCode, validation, attempts } = await generateWithSelfHealing(
        buildRoutePrompt(tool, endpoint),
        'backend'
      );

      console.log(`[CODE GEN] "${epLabel}": score ${validation.score}/100 in ${attempts} attempt(s)`);
      fileReports.push({ name: epLabel, type: 'route', score: validation.score, issues: validation.issues.length, attempts });

      const safePath = (endpoint.path || '/route').replace(/[^a-zA-Z0-9/-]/g, '').replace(/\//g, '-').replace(/^-/, '');
      const filePath = `server/routes/${safePath || 'route'}.routes.js`;
      const fileObj  = { path: filePath, language: 'javascript', type: 'route', content: rawCode };
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

  // ── SQL ────────────────────────────────────────────────────
  let dbSql = null;
  try {
    const { code: sqlCode, validation, attempts } = await generateWithSelfHealing(
      buildSqlPrompt(tool, plan.db_schema),
      'sql'
    );
    dbSql = sqlCode;
    fileReports.push({ name: 'schema.sql', type: 'sql', score: validation.score, issues: validation.issues.length, attempts });
    console.log(`[CODE GEN] ✓ SQL generated: score ${validation.score}/100`);
  } catch (err) {
    console.warn('[CODE GEN] ✗ SQL generation failed (non-fatal):', err.message);
  }

  const partial = done < total;
  return { frontendFiles, backendFiles, dbSql, done, total, partial, fileReports };
}

// ── Public API ─────────────────────────────────────────────────

async function generateToolCode(tool_id, force = false) {
  // ── 1. Validate preconditions ─────────────────────────────
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

  const { data: existing } = await supabase
    .from('generated_code')
    .select('id, status')
    .eq('plan_id', plan.id)
    .not('status', 'in', '("rejected","failed")')
    .maybeSingle();

  if (existing && !force) {
    const err = new Error(
      `Code already generated for this plan (id=${existing.id}, status=${existing.status}). Check the Code Viewer.`
    );
    err.code = 'DUPLICATE_BUILD'; err.status = 409; err.tip = 'Pass force=true to regenerate'; throw err;
  }

  if (existing && force) {
    await supabase.from('generated_code').delete().eq('plan_id', plan.id);
    console.log(`[CODE GEN] Force regenerating plan_id=${plan.id}, deleted existing record ${existing.id}`);
  }

  // ── 2. Create DB record ──────────────────────────────────
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

  // ── 3. Chunked self-healing generation ───────────────────
  console.log(`[CODE GEN] Starting generation: "${tool.name}" | plan_id: ${plan.id}`);
  const start = Date.now();

  let frontendFiles = [], backendFiles = [], dbSql = null, done = 0, total = 0, fileReports = [];

  try {
    ({ frontendFiles, backendFiles, dbSql, done, total, fileReports } =
      await generateChunked(tool, plan, codeId));
  } catch (err) {
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

  // ── FIX 5 — Quality report ────────────────────────────────
  const scores = fileReports.map(f => f.score);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const qualityReport = {
    tool_name:             tool.name,
    total_files:           totalFiles,
    avg_quality_score:     avgScore,
    files:                 fileReports,
    ready_for_deployment:  avgScore >= 80,
    generated_at:          new Date().toISOString(),
  };

  console.log('[CODE GEN] Final Report:', JSON.stringify(qualityReport, null, 2));
  console.log(`[CODE GEN] ${done}/${total} files in ${genMs}ms — avg score: ${avgScore}/100 — status: ${finalStatus}`);

  // ── 4. Save final result ─────────────────────────────────
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
      quality_report: qualityReport,
      avg_score:      avgScore,
    })
    .eq('id', codeId);

  if (updateErr) {
    console.error(`[CODE GEN] DB save failed: ${updateErr.message}`);
    const err = new Error('Failed to save generated code to database');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  console.log(`[CODE GEN] Saved → code_id: ${codeId}`);

  // ── 5. Log route mounting instructions ──────────────────
  if (backendFiles.length > 0) {
    const toolSlug = tool.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    console.log('\n[CODE GEN] ══════════════════════════════════════════════');
    console.log(`[CODE GEN] ROUTE MOUNTING INSTRUCTIONS — "${tool.name}"`);
    console.log('[CODE GEN] Add to server/index.js:');
    backendFiles.forEach(f => {
      const routeFile = f.path.replace('server/', './');
      const varName   = routeFile
        .replace('./routes/', '')
        .replace('.routes.js', '')
        .replace(/[-/]([a-z])/g, (_, c) => c.toUpperCase()) + 'Router';
      console.log(`[CODE GEN]   const ${varName} = require('${routeFile}');`);
      console.log(`[CODE GEN]   app.use('/api/${toolSlug}', ${varName});`);
    });
    console.log('[CODE GEN] ══════════════════════════════════════════════\n');
  }

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
    avg_score:      avgScore,
    partial,
    status:         finalStatus,
    quality_report: qualityReport,
    message:        partial
      ? `Partial generation: ${done}/${total} files (avg score: ${avgScore}/100). Retry to complete.`
      : `Code ready for review — avg quality score: ${avgScore}/100`,
  };
}

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
