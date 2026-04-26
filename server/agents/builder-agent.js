const supabase                    = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// ── Valid status transitions ──────────────────────────────────
// Keyed by current status → Set of allowed next statuses.
// Enforcing this prevents nonsensical state jumps (e.g. completed → pending_review).
const VALID_TRANSITIONS = {
  pending_review: new Set(['approved', 'rejected']),
  approved:       new Set(['in_progress']),
  in_progress:    new Set(['completed', 'partial']),
  partial:        new Set(['in_progress', 'completed']),  // can retry from partial
  rejected:       new Set([]),    // terminal — create a new plan instead
  completed:      new Set([]),    // terminal
};

// ── Prompt builder ────────────────────────────────────────────

function buildPrompt(tool) {
  return `You are a world-class Senior Full-Stack Engineer and SaaS Architect with 15+ years of experience building production-grade micro-SaaS products used by millions.

Your task is to generate an ULTRA-DETAILED, PRODUCTION-READY technical build plan for this micro-SaaS tool:

Tool Name: ${tool.name}
Description: ${tool.description || 'Not provided'}
Problem Solved: ${tool.idea_metadata?.problem_solved || 'Not provided'}
Target Audience: ${tool.idea_metadata?.target_audience || 'Not provided'}
Monetization Model: ${tool.idea_metadata?.monetization || 'Not provided'}
Category: ${tool.idea_metadata?.category || 'Not provided'}
Complexity: ${tool.idea_metadata?.complexity || 'Medium'}

STRICT REQUIREMENTS — Every plan MUST include ALL of these:
1. Every page must have minimum 5 components and 6 key features
2. API must include ALL CRUD + auth + payment + export + analytics endpoints
3. DB schema must have proper types, indexes, foreign keys, RLS policies, triggers
4. Must include PDF/export functionality where relevant
5. Must include Razorpay payment integration (Indian market — INR pricing)
6. Must include email notifications via Nodemailer
7. Must include rate limiting, input validation, error handling on every endpoint
8. Tech stack must list all npm packages with exact versions
9. Must include security best practices (helmet, cors, xss, rate-limit)
10. Must include MVP scope and future roadmap

Return ONLY a valid JSON object with this EXACT structure.
No markdown. No explanation. No code fences. Just raw JSON:

{
  "ui_plan": {
    "pages": [
      {
        "name": "Page name",
        "route": "/route",
        "purpose": "Detailed description of what this page does and why",
        "components": [
          "Component1 — what it does",
          "Component2 — what it does",
          "Component3 — what it does",
          "Component4 — what it does",
          "Component5 — what it does"
        ],
        "key_features": [
          "Feature 1 — full detail",
          "Feature 2 — full detail",
          "Feature 3 — full detail",
          "Feature 4 — full detail",
          "Feature 5 — full detail",
          "Feature 6 — full detail"
        ],
        "state_management": "What state this page manages and how",
        "api_calls": ["GET /api/endpoint1", "POST /api/endpoint2"]
      }
    ],
    "design_system": "Dark theme, color palette, typography, spacing, responsive breakpoints",
    "auth_flow": "How authentication works across all pages",
    "global_components": ["Navbar", "Sidebar", "Toast", "Modal", "LoadingSpinner", "ErrorBoundary"]
  },
  "api_plan": {
    "base_url": "/api/toolname",
    "middleware": ["authMiddleware", "rateLimiter", "inputValidator", "errorHandler", "requestLogger"],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/resource",
        "purpose": "Detailed description of what this endpoint does",
        "auth_required": true,
        "rate_limit": "10 requests per minute",
        "request_body": {
          "field1": "string — description and validation rules",
          "field2": "number — description and validation rules"
        },
        "response": {
          "success": "boolean",
          "data": "object — full description",
          "message": "string"
        },
        "error_codes": [
          "400 — validation failed",
          "401 — unauthorized",
          "403 — forbidden",
          "404 — not found",
          "429 — rate limit exceeded",
          "500 — server error"
        ],
        "validation_rules": ["field1 required min 3 chars", "field2 must be positive"]
      }
    ],
    "webhooks": ["Razorpay payment.captured", "Razorpay subscription.activated", "Razorpay subscription.cancelled"],
    "external_services": ["Razorpay — INR payments and subscriptions", "Nodemailer + Gmail SMTP — transactional emails", "Supabase Storage — file uploads"]
  },
  "db_schema": {
    "tables": [
      {
        "name": "table_name",
        "purpose": "What this table stores and why",
        "columns": [
          { "name": "id", "type": "UUID", "primary": true, "nullable": false, "default": "gen_random_uuid()" },
          { "name": "user_id", "type": "UUID", "nullable": false, "foreign_key": "users.id", "on_delete": "CASCADE" },
          { "name": "name", "type": "TEXT", "nullable": false, "validation": "max 255 chars" },
          { "name": "amount", "type": "NUMERIC(10,2)", "nullable": false },
          { "name": "status", "type": "TEXT", "nullable": false, "default": "'pending'", "check": "IN ('pending','active','cancelled','completed')" },
          { "name": "metadata", "type": "JSONB", "nullable": true },
          { "name": "created_at", "type": "TIMESTAMPTZ", "nullable": false, "default": "now()" },
          { "name": "updated_at", "type": "TIMESTAMPTZ", "nullable": false, "default": "now()" }
        ],
        "indexes": [
          "CREATE INDEX ON table_name(user_id)",
          "CREATE INDEX ON table_name(status)",
          "CREATE INDEX ON table_name(created_at DESC)"
        ],
        "rls_policies": [
          "SELECT — users can only read their own rows",
          "INSERT — users can only insert their own rows",
          "UPDATE — users can only update their own rows",
          "DELETE — users can only delete their own rows"
        ]
      }
    ],
    "triggers": [
      "updated_at auto-update trigger on all tables",
      "audit_log trigger for sensitive operations"
    ],
    "views": [
      "dashboard_summary — aggregated stats for the main dashboard",
      "revenue_summary — total revenue per user per month"
    ]
  },
  "tech_stack": {
    "frontend": ["React 18", "Vite", "Tailwind CSS", "React Query v5", "React Hook Form", "Zod", "React Router v6", "Recharts", "React-PDF", "Axios"],
    "backend": ["Node.js 20", "Express 4", "JWT", "Bcryptjs", "Helmet", "CORS", "Express Rate Limit", "Express Validator", "Multer", "Winston Logger"],
    "database": ["Supabase PostgreSQL", "Supabase Storage", "Supabase RLS", "Supabase Realtime"],
    "payments": ["Razorpay — INR payments, subscriptions, webhook verification"],
    "email": ["Nodemailer + Gmail SMTP — welcome, invoice, payment confirmation emails"],
    "pdf": ["PDFKit — server-side PDF generation and download"],
    "packages": [
      "razorpay@^2.9.0",
      "nodemailer@^6.9.0",
      "pdfkit@^0.14.0",
      "jsonwebtoken@^9.0.0",
      "bcryptjs@^2.4.3",
      "helmet@^7.1.0",
      "cors@^2.8.5",
      "express-rate-limit@^7.1.0",
      "express-validator@^7.0.1",
      "winston@^3.11.0",
      "multer@^1.4.5",
      "uuid@^9.0.0",
      "dotenv@^16.3.0",
      "zod@^3.22.0"
    ],
    "devtools": ["ESLint", "Prettier", "Nodemon", "Jest", "Supertest"]
  },
  "security_plan": {
    "authentication": "JWT access token (15min expiry) + refresh token (7 days) stored in httpOnly cookie",
    "authorization": "Role-based access — admin, premium, free — enforced on every endpoint",
    "input_validation": "express-validator on all POST/PUT/PATCH endpoints — sanitize and validate",
    "rate_limiting": "100 req/15min globally — 5 req/min on auth endpoints — 10 req/min on payment endpoints",
    "data_protection": "Supabase RLS enforced — users can NEVER access other users data",
    "payment_security": "Razorpay webhook signature verification using crypto.createHmac",
    "headers": "Helmet.js — sets XSS, CSRF, clickjacking, HSTS, content-type protection headers",
    "logging": "Winston — log all requests, errors, payment events — never log passwords or card data"
  },
  "monetization_plan": {
    "free_tier": "List exact free features with hard limits — e.g. max 5 items, no export, watermark on PDF",
    "premium_tier": "List exact premium features — no limits, PDF export, priority support, advanced analytics",
    "pricing_inr": {
      "monthly": 199,
      "yearly": 1499
    },
    "razorpay_setup": {
      "plan_ids": ["create via Razorpay dashboard"],
      "webhook_events": ["payment.captured", "payment.failed", "subscription.activated", "subscription.cancelled", "subscription.completed"],
      "signature_verification": "crypto.createHmac('sha256', secret).update(body).digest('hex')"
    }
  },
  "estimated_hours": 45,
  "complexity_level": "medium",
  "implementation_notes": "Start with auth system first, then core CRUD, then payment integration, then PDF generation. Use environment variables for all secrets. Test webhook locally using Razorpay test mode.",
  "mvp_scope": "Auth (register/login) + Core CRUD + Basic UI + Razorpay payment — ship in 2 weeks",
  "future_enhancements": [
    "Team collaboration features",
    "API access for developers",
    "White-label option",
    "Mobile app (React Native)",
    "Advanced analytics dashboard",
    "Zapier/webhook integrations"
  ]
}`;
}

// ── Plan structure validator ───────────────────────────────────

function validatePlan(plan) {
  const missing = [];
  if (!plan.ui_plan      || typeof plan.ui_plan !== 'object')  missing.push('ui_plan');
  if (!plan.api_plan     || typeof plan.api_plan !== 'object') missing.push('api_plan');
  if (!plan.db_schema    || typeof plan.db_schema !== 'object') missing.push('db_schema');
  if (!plan.tech_stack   || typeof plan.tech_stack !== 'object') missing.push('tech_stack');

  if (missing.length > 0) {
    const err = new Error(`AI plan is missing required fields: ${missing.join(', ')}`);
    err.code   = 'PARSE_ERROR';
    err.status = 500;
    throw err;
  }

  if (!['low', 'medium', 'high'].includes(plan.complexity_level)) {
    plan.complexity_level = 'medium'; // safe default
  }
  if (!plan.estimated_hours || plan.estimated_hours <= 0) {
    plan.estimated_hours = 40; // safe default
  }

  return plan;
}

// ── Single-file prompt builders ──────────────────────────────

function buildPageCodePrompt(page, toolName) {
  return `You are a senior React developer. Generate production-ready JSX for one page.

Tool: ${toolName}
Page: ${page.name || 'Unnamed'} (route: ${page.route || '/'})
Purpose: ${page.purpose || ''}
Components: ${(page.components || []).join(', ')}
Key Features: ${(page.key_features || []).join(', ')}
State: ${page.state_management || ''}
API Calls: ${(page.api_calls || []).join(', ')}

Rules:
- Tailwind CSS only, dark theme
- Include loading state, error state, empty state
- Use fetch() for API calls with Authorization header
- Export as default function
- Return ONLY the JSX code, no explanation`;
}

function buildRouteCodePrompt(route, toolName) {
  return `You are a senior Node.js/Express developer. Generate one production-ready API route handler.

Tool: ${toolName}
Endpoint: ${route.method || 'GET'} ${route.path || '/api/route'}
Purpose: ${route.purpose || ''}
Auth Required: ${route.auth_required ?? true}
Rate Limit: ${route.rate_limit || '100/15min'}
Request Body: ${JSON.stringify(route.request_body || {})}
Response Shape: ${JSON.stringify(route.response || {})}
Error Codes: ${(route.error_codes || []).join(', ')}
Validation: ${(route.validation_rules || []).join(', ')}

Rules:
- Express Router syntax
- Use express-validator for input validation
- Proper try/catch with console.error
- Return JSON with { success, data/error }
- Return ONLY the route handler code, no explanation`;
}

// ── generateSingleFile ────────────────────────────────────────
// Generates code for one page or API route with 120s timeout.

async function generateSingleFile(fileSpec, type, toolName) {
  const prompt = type === 'page'
    ? buildPageCodePrompt(fileSpec, toolName)
    : buildRouteCodePrompt(fileSpec, toolName);

  const code = await callOpenAI(prompt, { temperature: 0.2, timeout: 120_000, max_tokens: 4000 });
  return {
    type,
    name:  type === 'page' ? fileSpec.name : `${fileSpec.method} ${fileSpec.path}`,
    route: fileSpec.route || fileSpec.path || null,
    code,
  };
}

// ── generateCodeChunked ───────────────────────────────────────
// Generates code one file at a time so no single call exceeds
// Render's response window. Saves partial results after each file.

async function generateCodeChunked(plan, planId) {
  const pages     = plan.ui_plan?.pages     || [];
  const endpoints = plan.api_plan?.endpoints || [];
  const toolName  = plan.tool_name || 'Unknown Tool';

  const results = [];
  let done = 0;
  const total = pages.length + endpoints.length;

  // ── Frontend pages ────────────────────────────────────────
  for (const page of pages) {
    try {
      const file = await generateWithRetry(
        () => generateSingleFile(page, 'page', toolName)
      );
      results.push(file);
      done++;
      console.log(`[BUILDER] Generated page "${page.name}" (${done}/${total})`);
    } catch (err) {
      console.warn(`[BUILDER] Page "${page.name}" failed — skipping:`, err.message);
    }

    // Save progress after each file so nothing is lost on crash
    if (planId && results.length > 0) {
      await supabase
        .from('builder_plans')
        .update({ generated_files: results, files_done: done, files_total: total, status: 'in_progress' })
        .eq('id', planId);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // ── Backend routes ────────────────────────────────────────
  for (const route of endpoints) {
    try {
      const file = await generateWithRetry(
        () => generateSingleFile(route, 'route', toolName)
      );
      results.push(file);
      done++;
      console.log(`[BUILDER] Generated route "${route.method} ${route.path}" (${done}/${total})`);
    } catch (err) {
      console.warn(`[BUILDER] Route "${route.method} ${route.path}" failed — skipping:`, err.message);
    }

    if (planId && results.length > 0) {
      await supabase
        .from('builder_plans')
        .update({ generated_files: results, files_done: done, files_total: total, status: 'in_progress' })
        .eq('id', planId);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return { results, done, total };
}

// ── callAIWithRetry ───────────────────────────────────────────
// Used for plan generation (big JSON). 120s timeout, 2 attempts.

async function callAIWithRetry(prompt) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw  = await callOpenAI(prompt, { temperature: 0.3, timeout: 120_000 });
      const plan = parseJSONResponse(raw);
      return validatePlan(plan);
    } catch (err) {
      if (attempt === 2) throw err;
      console.warn(`[BUILDER AGENT] Attempt ${attempt} failed (${err.code}) — retrying…`);
    }
  }
}

// ── generateWithRetry ─────────────────────────────────────────
// Generic retry wrapper for any async generation function.
// Waits 3s between attempts so Render/OpenAI rate limits recover.

async function generateWithRetry(fn, retries = 1) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.log('[BUILDER] Retrying generation…');
      await new Promise(r => setTimeout(r, 3000));
      return generateWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Generate and persist a full build plan for a tool in 'idea' status.
 *
 * Status flow:
 *   tools.status stays 'idea' until plan is APPROVED by human reviewer.
 *   After approval (updatePlanStatus → 'approved'), tool moves to 'building'.
 *
 * @param {string} tool_id - UUID of the tool to plan
 * @returns {Promise<BuildPlanResult>}
 */
async function generateBuildPlan(tool_id) {
  // ── 1. Fetch and validate tool ───────────────────────────────
  const { data: tool, error: fetchErr } = await supabase
    .from('tools')
    .select('*')
    .eq('id', tool_id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[BUILDER AGENT] DB fetch error:', fetchErr.message);
    const err = new Error('Database error while fetching tool');
    err.status = 500; err.code = 'SAVE_FAILED'; throw err;
  }
  if (!tool) {
    const err = new Error(`Tool not found: ${tool_id}`);
    err.status = 404; err.code = 'TOOL_NOT_FOUND'; throw err;
  }
  if (tool.status !== 'idea') {
    const err = new Error(`Tool "${tool.name}" has status="${tool.status}". Only tools with status='idea' can be planned.`);
    err.status = 422; err.code = 'INVALID_STATUS'; throw err;
  }

  // ── 2. Prevent duplicate plans ───────────────────────────────
  // The partial unique index (WHERE status != 'rejected') enforces this at
  // DB level, but we check here for a friendlier error message.
  const { data: existing } = await supabase
    .from('builder_plans')
    .select('id, status')
    .eq('tool_id', tool_id)
    .neq('status', 'rejected')
    .maybeSingle();

  if (existing) {
    const err = new Error(`A plan already exists for "${tool.name}" (plan_id=${existing.id}, status=${existing.status})`);
    err.status = 409; err.code = 'PLAN_EXISTS'; throw err;
  }

  // ── 3. Call AI ───────────────────────────────────────────────
  console.log(`[BUILDER AGENT] Generating plan for: ${tool.name}`);
  const aiStart = Date.now();

  const plan = await callAIWithRetry(buildPrompt(tool));

  console.log(`[BUILDER AGENT] AI responded in ${Date.now() - aiStart}ms`);

  // ── 4. Save to builder_plans ─────────────────────────────────
  const { data: saved, error: saveErr } = await supabase
    .from('builder_plans')
    .insert({
      tool_id,
      tool_name:       tool.name,
      category:        tool.idea_metadata?.category || null,
      ui_plan:         plan.ui_plan,
      api_plan:        plan.api_plan,
      db_schema:       plan.db_schema,
      tech_stack:      plan.tech_stack,
      estimated_hours: plan.estimated_hours,
      complexity_level: plan.complexity_level,
      status:          'pending_review',
      version:         1,
    })
    .select()
    .single();

  if (saveErr) {
    console.error('[BUILDER AGENT] DB save failed:', saveErr.message);
    const err = new Error('Failed to save build plan');
    err.status = 500; err.code = 'SAVE_FAILED'; throw err;
  }

  console.log(`[BUILDER AGENT] Plan saved → plan_id: ${saved.id}`);

  return {
    success:    true,
    tool_id:    tool.id,
    tool_name:  tool.name,
    plan_id:    saved.id,
    plan:       {
      ui_plan:             plan.ui_plan,
      api_plan:            plan.api_plan,
      db_schema:           plan.db_schema,
      tech_stack:          plan.tech_stack,
      estimated_hours:     plan.estimated_hours,
      complexity_level:    plan.complexity_level,
      implementation_notes: plan.implementation_notes,
    },
    status:     'pending_review',
    created_at: saved.created_at,
  };
}

/**
 * Fetch a single build plan by ID.
 * @param {string} plan_id
 */
async function getPlan(plan_id) {
  const { data, error } = await supabase
    .from('builder_plans')
    .select('*')
    .eq('id', plan_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error(`Plan not found: ${plan_id}`);
    err.status = 404; err.code = 'PLAN_NOT_FOUND'; throw err;
  }
  return data;
}

/**
 * Fetch all build plans, optionally filtered by status.
 * @param {string|null} statusFilter
 */
async function getAllPlans(statusFilter = null) {
  let query = supabase
    .from('builder_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Update a plan's status with an optional reviewer note.
 *
 * Enforces transition rules — prevents nonsensical state changes.
 * Side effect: when plan moves to 'approved', tool.status → 'building'.
 *
 * @param {string} plan_id
 * @param {string} newStatus
 * @param {string} [reviewer_notes]
 */
async function updatePlanStatus(plan_id, newStatus, reviewer_notes = null) {
  const plan = await getPlan(plan_id);
  const allowed = VALID_TRANSITIONS[plan.status];

  if (!allowed || !allowed.has(newStatus)) {
    const err = new Error(
      `Invalid transition: ${plan.status} → ${newStatus}. Allowed: ${[...(allowed || [])].join(', ') || 'none'}`
    );
    err.status = 422; err.code = 'INVALID_TRANSITION'; throw err;
  }

  const updates = {
    status:         newStatus,
    reviewer_notes: reviewer_notes || plan.reviewer_notes,
    reviewed_at:    new Date().toISOString(),
  };

  const { data: updated, error: updateErr } = await supabase
    .from('builder_plans')
    .update(updates)
    .eq('id', plan_id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // When approved, move the tool from 'idea' to 'building'
  if (newStatus === 'approved') {
    const { error: toolErr } = await supabase
      .from('tools')
      .update({ status: 'building' })
      .eq('id', plan.tool_id);

    if (toolErr) {
      console.error('[BUILDER AGENT] Failed to update tool status to building:', toolErr.message);
    }
  }

  console.log(`[BUILDER AGENT] Status updated: ${plan.status} → ${newStatus} | plan_id: ${plan_id}`);

  return updated;
}

/**
 * Generate actual code files for an approved plan, one file at a time.
 * Saves partial progress after each file — never loses work on timeout.
 *
 * Status flow: approved → in_progress → (partial saves) → completed | partial
 *
 * @param {string} plan_id
 * @returns {Promise<{ success, plan_id, files_done, files_total, status }>}
 */
async function generateCode(plan_id) {
  const plan = await getPlan(plan_id);

  if (!['approved', 'in_progress', 'partial'].includes(plan.status)) {
    const err = new Error(
      `Plan "${plan_id}" has status="${plan.status}". Must be approved, in_progress, or partial to generate code.`
    );
    err.status = 422; err.code = 'INVALID_STATUS'; throw err;
  }

  // Mark as in_progress
  await supabase
    .from('builder_plans')
    .update({ status: 'in_progress' })
    .eq('id', plan_id);

  console.log(`[BUILDER AGENT] Code generation started for plan: ${plan_id}`);
  const start = Date.now();

  let done = 0, total = 0, finalStatus = 'completed';

  try {
    const result = await generateCodeChunked(plan, plan_id);
    done  = result.done;
    total = result.total;

    // Partial if some files failed
    finalStatus = done < total ? 'partial' : 'completed';

    await supabase
      .from('builder_plans')
      .update({ status: finalStatus, files_done: done, files_total: total })
      .eq('id', plan_id);

    console.log(`[BUILDER AGENT] Code generation ${finalStatus}: ${done}/${total} files in ${Date.now() - start}ms`);
  } catch (err) {
    // Unexpected failure — mark partial so it can be retried
    console.error('[BUILDER AGENT] Code generation crashed:', err.message);
    await supabase
      .from('builder_plans')
      .update({ status: 'partial' })
      .eq('id', plan_id);
    finalStatus = 'partial';
  }

  return { success: true, plan_id, files_done: done, files_total: total, status: finalStatus };
}

module.exports = { generateBuildPlan, getPlan, getAllPlans, updatePlanStatus, generateCode };
