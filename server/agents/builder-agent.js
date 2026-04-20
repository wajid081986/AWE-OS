const supabase                    = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// ── Valid status transitions ──────────────────────────────────
// Keyed by current status → Set of allowed next statuses.
// Enforcing this prevents nonsensical state jumps (e.g. completed → pending_review).
const VALID_TRANSITIONS = {
  pending_review: new Set(['approved', 'rejected']),
  approved:       new Set(['in_progress']),
  in_progress:    new Set(['completed']),
  rejected:       new Set([]),    // terminal — create a new plan instead
  completed:      new Set([]),    // terminal
};

// ── Prompt builder ────────────────────────────────────────────

function buildPrompt(tool) {
  return `You are a Senior Full-Stack Engineer.
Generate a complete technical build plan for this micro-SaaS tool:

Tool Name: ${tool.name}
Description: ${tool.description || 'Not provided'}
Problem Solved: ${tool.problem_solved || 'Not provided'}
Target Audience: ${tool.target_audience || 'Not provided'}
Monetization: ${tool.monetization || 'Not provided'}

Return ONLY a valid JSON object with this exact structure:
{
  "ui_plan": {
    "pages": [
      {
        "name": "Page name",
        "route": "/route",
        "purpose": "What this page does",
        "components": ["Component1", "Component2"],
        "key_features": ["feature1", "feature2"]
      }
    ],
    "design_notes": "Dark theme, minimal, responsive..."
  },
  "api_plan": {
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/toolname/action",
        "purpose": "What it does",
        "auth_required": true,
        "request_body": { "field": "type" },
        "response": { "field": "type" }
      }
    ]
  },
  "db_schema": {
    "tables": [
      {
        "name": "table_name",
        "columns": [
          { "name": "id", "type": "UUID", "primary": true },
          { "name": "field", "type": "TEXT", "nullable": false }
        ]
      }
    ]
  },
  "tech_stack": {
    "frontend": ["React", "Tailwind CSS"],
    "backend": ["Node.js", "Express"],
    "database": ["Supabase"],
    "packages": ["package1", "package2"]
  },
  "estimated_hours": 40,
  "complexity_level": "medium",
  "implementation_notes": "Key things to watch out for..."
}

Return ONLY the JSON. No explanation. No markdown fences.`;
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

// ── callAIWithRetry ───────────────────────────────────────────
// Retries the OpenAI call + JSON parse exactly once.
// Two attempts total — balances reliability vs. cost.

async function callAIWithRetry(prompt) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw  = await callOpenAI(prompt, { temperature: 0.3 });
      const plan = parseJSONResponse(raw);
      return validatePlan(plan);
    } catch (err) {
      if (attempt === 2) throw err;   // second failure → propagate
      console.warn(`[BUILDER AGENT] Attempt ${attempt} failed (${err.code}) — retrying…`);
    }
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
    .select('id, name, description, status, problem_solved, target_audience, monetization, category')
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
      category:        tool.category || null,
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

module.exports = { generateBuildPlan, getPlan, getAllPlans, updatePlanStatus };
