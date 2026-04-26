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
  const safeName   = (page.name || 'Page').replace(/\s+/g, '');
  const apiCalls   = (page.api_calls   || []).join('\n  - ') || 'none';
  const components = (page.components  || []).join(', ')     || 'none';
  const features   = (page.key_features || []).join(', ')    || 'none';

  return `You are a senior React developer at a top-tier company. Generate ONE complete production-ready React page component.

TOOL: ${tool.name}
PAGE: ${page.name || 'Page'} — route: ${page.route || '/'}
PURPOSE: ${page.purpose || ''}
COMPONENTS: ${components}
FEATURES: ${features}
STATE: ${page.state_management || 'useState + useEffect'}
API CALLS:
  - ${apiCalls}

════ MANDATORY REQUIREMENTS — every rule must appear in the output ════

1. IMPORTS (exact lines required at top of file):
   import React, { useState, useEffect } from 'react';
   import axios from 'axios';
   const API = import.meta.env.VITE_API_URL;

2. AUTH (exact lines required — first thing inside component body):
   const token = localStorage.getItem('awe_token');
   if (!token) { window.location.href = '/login'; return null; }
   const headers = { Authorization: \`Bearer \${token}\` };

3. ALL AXIOS CALLS must include the auth headers object:
   await axios.get(\`\${API}/endpoint\`, { headers })
   await axios.post(\`\${API}/endpoint\`, body, { headers })
   await axios.delete(\`\${API}/endpoint\`, { headers })

4. LOADING STATE (required):
   const [loading, setLoading] = useState(true);
   Render: <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

5. ERROR STATE (required):
   const [error, setError] = useState(null);
   Render: <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">{error}</div>

6. EMPTY STATE (required when list/data is empty):
   Render: <div className="text-center py-12 text-gray-400">No items yet. Create your first one!</div>

7. DARK THEME (Tailwind CSS only — no inline styles):
   Page bg: bg-[#0a0a0f]   Cards: bg-[#12121a]   Accent: bg-indigo-600 hover:bg-indigo-700
   Text: text-white / text-gray-300 / text-gray-400   Borders: border-gray-700
   Rounded: rounded-xl   Shadow: shadow-lg   Transitions: transition-all

8. EXPORT (exact line):
   export default function ${safeName}() { ... }

════ STRICTLY FORBIDDEN — will cause build failure or security breach ════
✗ fetch() — use axios only, always
✗ Hardcoded URLs (localhost, onrender.com, vercel.app, or any http:// / https://)
✗ Class components (extends React.Component)
✗ Inline styles (style={{ }})
✗ Any axios/fetch call WITHOUT the Authorization header
✗ Missing any of: loading state, error state, empty state
✗ import.meta.env.REACT_APP_* — use VITE_API_URL only
✗ console.log with token, password, or user PII

Return ONLY the complete JSX file. No markdown fences (\`\`\`), no explanation, no intro text.`;
}

function buildRoutePrompt(tool, endpoint) {
  const validations = (endpoint.validation_rules || []).join('\n  - ') || 'none';
  const errorCodes  = (endpoint.error_codes || []).join(', ') || '400, 401, 404, 500';

  return `You are a senior Node.js/Express developer. Generate ONE complete production-ready Express route file.

TOOL: ${tool.name}
ENDPOINT: ${endpoint.method || 'GET'} ${endpoint.path || '/api/route'}
PURPOSE: ${endpoint.purpose || ''}
AUTH REQUIRED: ${endpoint.auth_required !== false ? 'YES' : 'NO'}
RATE LIMIT: ${endpoint.rate_limit || '100 req / 15 min'}
REQUEST BODY: ${JSON.stringify(endpoint.request_body || {})}
RESPONSE: ${JSON.stringify(endpoint.response || {})}
VALIDATIONS:
  - ${validations}
ERROR CODES: ${errorCodes}

════ MANDATORY REQUIREMENTS ════

1. FILE HEADER — exact imports (copy these lines):
   const express  = require('express');
   const supabase = require('../db/supabase');
   const requireAuth = require('../middleware/auth');
   const router   = express.Router();

2. AUTH MIDDLEWARE — apply on every protected route:
   router.get('/path', requireAuth, async (req, res) => { ... });
   NEVER use: const { requireAuth } = require('../middleware/auth')
   requireAuth is a DEFAULT EXPORT — destructuring it returns undefined.

3. USER ID — read from req.user.userId (this is what requireAuth sets):
   const { userId, email } = req.user;
   NEVER use req.user.id — the field is userId, not id.

4. RESPONSE FORMAT — always this exact shape:
   Success: return res.status(200).json({ success: true, data: result, message: 'Done' });
   Created: return res.status(201).json({ success: true, data: result, message: 'Created' });
   Error:   return res.status(400).json({ success: false, message: 'Reason here' });

5. ERROR HANDLING — wrap every async handler:
   try {
     ...
   } catch (err) {
     console.error('[${tool.name}]', err.message);
     return res.status(500).json({ success: false, message: 'Server error' });
   }

6. SUPABASE QUERIES — always destructure and check error:
   const { data, error } = await supabase.from('table').select('*').eq('user_id', userId);
   if (error) return res.status(400).json({ success: false, message: error.message });
   if (!data)  return res.status(404).json({ success: false, message: 'Not found' });

7. INPUT VALIDATION — validate before touching DB:
   if (!body.fieldName) return res.status(400).json({ success: false, message: 'fieldName is required' });

8. FILE FOOTER — exact line:
   module.exports = router;

════ STRICTLY FORBIDDEN ════
✗ const { requireAuth } = require(...)  — breaks auth silently (it's a default export)
✗ req.user.id — use req.user.userId
✗ Hardcoded secrets, API keys, passwords, or URLs
✗ POST /auth/login route — the global auth system already handles login, never duplicate
✗ Raw SQL strings — Supabase client only
✗ Async handler without try/catch
✗ Missing module.exports = router at the end

Return ONLY the complete .js route file. No markdown fences (\`\`\`), no explanation.`;
}

function buildSqlPrompt(tool, dbSchema) {
  return `You are a senior PostgreSQL/Supabase DBA. Generate the complete database schema SQL for this tool.

TOOL: ${tool.name}
SCHEMA: ${JSON.stringify(dbSchema || {})}

════ MANDATORY REQUIREMENTS ════

1. TABLE CREATION — always use IF NOT EXISTS:
   CREATE TABLE IF NOT EXISTS table_name (
     id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
     updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
   );

2. THE "users" TABLE ALREADY EXISTS — never create it.
   Only create NEW tables specific to this tool.

3. INDEXES — always use IF NOT EXISTS:
   CREATE INDEX IF NOT EXISTS idx_table_user_id    ON table_name(user_id);
   CREATE INDEX IF NOT EXISTS idx_table_created_at ON table_name(created_at DESC);

4. ROW LEVEL SECURITY — required for every new table:
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users access own data"
     ON table_name FOR ALL
     USING (user_id = auth.uid());

5. UPDATED_AT TRIGGER — use CREATE OR REPLACE:
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = now(); RETURN NEW; END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER update_table_name_updated_at
     BEFORE UPDATE ON table_name
     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

6. COLUMN TYPES:
   - Text fields:   TEXT NOT NULL  (never VARCHAR)
   - Money:         NUMERIC(10,2) NOT NULL
   - Counters:      INTEGER DEFAULT 0 NOT NULL
   - JSON data:     JSONB NOT NULL DEFAULT '[]'
   - Enums:         TEXT CHECK (col IN ('a','b','c')) DEFAULT 'a' NOT NULL
   - Flags:         BOOLEAN DEFAULT false NOT NULL

════ STRICTLY FORBIDDEN ════
✗ CREATE TABLE users — it already exists; never recreate or alter it
✗ DROP TABLE — never use destructive DDL
✗ CREATE TABLE without IF NOT EXISTS
✗ CREATE INDEX without IF NOT EXISTS
✗ VARCHAR — use TEXT
✗ Nullable required columns (always add NOT NULL with a default)
✗ Foreign keys without ON DELETE CASCADE or ON DELETE SET NULL

Return ONLY the SQL statements. No markdown fences (\`\`\`), no explanation, no comments.`;
}

// ── Post-generation code validator ────────────────────────────
// Checks AI output for known anti-patterns before saving to DB.
// Returns { score: 0-100, issues: { critical, high, medium }, passed: bool }

function validateGeneratedCode(content, type) {
  const issues = { critical: [], high: [], medium: [] };
  let score = 100;

  if (type === 'frontend') {
    if (!content.includes('axios')) {
      issues.critical.push('Missing axios import — never use fetch()');
      score -= 30;
    }
    if (!content.includes('awe_token')) {
      issues.critical.push('Auth token not read from localStorage("awe_token")');
      score -= 25;
    }
    if (!content.includes('VITE_API_URL') && !content.includes('import.meta.env')) {
      issues.critical.push('API URL hardcoded or missing — must use import.meta.env.VITE_API_URL');
      score -= 20;
    }
    if (/https?:\/\/(localhost|[\w-]+\.onrender\.com|[\w-]+\.vercel\.app)/.test(content)) {
      issues.critical.push('Hardcoded absolute URL found — remove all http/https URLs');
      score -= 20;
    }
    if (content.includes('fetch(')) {
      issues.high.push('fetch() used — replace with axios');
      score -= 15;
    }
    if (!/loading/.test(content)) {
      issues.high.push('Missing loading state (useState for loading)');
      score -= 10;
    }
    if (!/\berror\b/.test(content)) {
      issues.medium.push('Missing error state (useState for error)');
      score -= 5;
    }
    if (!content.includes('export default function')) {
      issues.medium.push('Missing default function export');
      score -= 5;
    }
  }

  if (type === 'backend') {
    if (/\{\s*requireAuth/.test(content)) {
      issues.critical.push('requireAuth destructured — it is a default export, use: require("../middleware/auth")');
      score -= 35;
    }
    if (/req\.user\.id\b/.test(content) && !/req\.user\.userId/.test(content)) {
      issues.critical.push('req.user.id used — the correct field is req.user.userId');
      score -= 25;
    }
    if (/https?:\/\/(localhost|[\w-]+\.onrender\.com|[\w-]+\.vercel\.app)/.test(content)) {
      issues.critical.push('Hardcoded absolute URL in backend route');
      score -= 20;
    }
    if (!content.includes('try') || !content.includes('catch')) {
      issues.high.push('Missing try/catch error handling in async handler');
      score -= 15;
    }
    if (!content.includes('module.exports')) {
      issues.high.push('Missing module.exports = router');
      score -= 15;
    }
    if (/router\.(get|post|put|patch|delete)\(/.test(content) && !content.includes('requireAuth')) {
      issues.high.push('Route handler registered without requireAuth middleware');
      score -= 10;
    }
  }

  score = Math.max(0, score);
  const passed = issues.critical.length === 0 && score >= 60;
  return { score, issues, passed };
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
      let rawCode = await generateWithRetry(() =>
        callWithTimeout(
          callOpenAI(buildPagePrompt(tool, page), {
            model: AI_MODEL, temperature: 0.2, max_tokens: 3000, timeout: AI_TIMEOUT_MS,
          }),
          AI_TIMEOUT_MS
        )
      );

      // Validate quality — retry once if critical issues found
      let validation = validateGeneratedCode(rawCode, 'frontend');
      console.log(`[CODE GEN] Quality "${pageName}": ${validation.score}/100`);
      if (!validation.passed && validation.issues.critical.length > 0) {
        console.warn(`[CODE GEN] Critical issues in "${pageName}" — retrying with fix prompt`);
        const fixPrompt = buildPagePrompt(tool, page) +
          `\n\nFIX THESE CRITICAL ISSUES FROM YOUR PREVIOUS ATTEMPT (all must be resolved):\n` +
          validation.issues.critical.map(i => `- ${i}`).join('\n') +
          `\n\nGenerate the fully corrected file. No explanation.`;
        await delay(2000);
        rawCode = await callWithTimeout(
          callOpenAI(fixPrompt, { model: AI_MODEL, temperature: 0.1, max_tokens: 3000, timeout: AI_TIMEOUT_MS }),
          AI_TIMEOUT_MS
        );
        validation = validateGeneratedCode(rawCode, 'frontend');
        console.log(`[CODE GEN] Retry quality "${pageName}": ${validation.score}/100`);
      }

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
      let rawCode = await generateWithRetry(() =>
        callWithTimeout(
          callOpenAI(buildRoutePrompt(tool, endpoint), {
            model: AI_MODEL, temperature: 0.2, max_tokens: 3000, timeout: AI_TIMEOUT_MS,
          }),
          AI_TIMEOUT_MS
        )
      );

      // Validate quality — retry once if critical issues found
      let validation = validateGeneratedCode(rawCode, 'backend');
      console.log(`[CODE GEN] Quality "${epLabel}": ${validation.score}/100`);
      if (!validation.passed && validation.issues.critical.length > 0) {
        console.warn(`[CODE GEN] Critical issues in "${epLabel}" — retrying with fix prompt`);
        const fixPrompt = buildRoutePrompt(tool, endpoint) +
          `\n\nFIX THESE CRITICAL ISSUES FROM YOUR PREVIOUS ATTEMPT (all must be resolved):\n` +
          validation.issues.critical.map(i => `- ${i}`).join('\n') +
          `\n\nGenerate the fully corrected file. No explanation.`;
        await delay(2000);
        rawCode = await callWithTimeout(
          callOpenAI(fixPrompt, { model: AI_MODEL, temperature: 0.1, max_tokens: 3000, timeout: AI_TIMEOUT_MS }),
          AI_TIMEOUT_MS
        );
        validation = validateGeneratedCode(rawCode, 'backend');
        console.log(`[CODE GEN] Retry quality "${epLabel}": ${validation.score}/100`);
      }

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

  // ── 5. Log route mounting instructions ───────────────────
  if (backendFiles.length > 0) {
    const toolSlug = tool.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    console.log('\n[CODE GEN] ══════════════════════════════════════════════');
    console.log(`[CODE GEN] ROUTE MOUNTING INSTRUCTIONS — "${tool.name}"`);
    console.log('[CODE GEN] Add these lines to server/index.js:');
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
