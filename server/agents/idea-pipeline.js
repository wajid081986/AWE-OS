const { generateIdeas }    = require('./idea-agent');
const { generateBuildPlan } = require('./builder-agent');
const supabase              = require('../db/supabase');

// ── Elite production constants ────────────────────────────────
const MAX_IDEAS_PER_RUN    = 5;
const MIN_VIABILITY_SCORE  = 50;    // quality filter
const MAX_PENDING_IDEAS    = 50;    // total idea backlog cap
const MAX_GENERATIONS_PER_HOUR = 2; // rate limit (in-memory)
const SIMILARITY_WORD_MIN_LEN   = 3;
const SIMILARITY_OVERLAP_THRESHOLD = 2; // shared keywords = similar

// ── In-memory rate limiter ────────────────────────────────────
// Resets on server restart — intentional (cron cadence is 12h anyway)
const _generationTimestamps = [];

function enforceRateLimit() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  // Prune old entries
  while (_generationTimestamps.length && _generationTimestamps[0] < oneHourAgo) {
    _generationTimestamps.shift();
  }
  if (_generationTimestamps.length >= MAX_GENERATIONS_PER_HOUR) {
    const err = new Error(
      `Rate limit: max ${MAX_GENERATIONS_PER_HOUR} idea generations per hour. Try again later.`
    );
    err.code   = 'RATE_LIMITED';
    err.status = 429;
    throw err;
  }
  _generationTimestamps.push(Date.now());
}

// ── Similarity check (basic keyword overlap) ──────────────────
function isSimilarToExisting(newName, existingNames) {
  const newWords = newName
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter(w => w.length > SIMILARITY_WORD_MIN_LEN);

  for (const existing of existingNames) {
    const existingWords = existing
      .toLowerCase()
      .split(/[\s\-_]+/)
      .filter(w => w.length > SIMILARITY_WORD_MIN_LEN);

    const overlap = newWords.filter(w => existingWords.includes(w));
    if (overlap.length >= SIMILARITY_OVERLAP_THRESHOLD) {
      return true;
    }
  }
  return false;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Generate ideas via AI and persist non-duplicate, high-quality ones.
 *
 * Elite guards applied:
 *   1. Rate limit   — max 2 generations/hour (in-memory)
 *   2. Score filter — skip ideas with viability_score < 50
 *   3. Backlog cap  — skip if 50+ pending ideas already in DB
 *   4. Dedup        — case-insensitive exact name match
 *   5. Similarity   — skip if 2+ shared keywords with existing tool
 *
 * @param {{ category?, count?, target_audience? }} options
 * @returns {Promise<GenerationSummary>}
 */
async function generateAndStoreIdeas(options = {}) {
  const {
    category        = 'micro_saas',
    count           = 5,
    target_audience = 'solopreneurs',
  } = options;

  const safeCount = Math.min(Math.max(1, count), MAX_IDEAS_PER_RUN);

  console.log(`[IDEA PIPELINE] Starting for category: ${category} | count: ${safeCount}`);

  // ── 1. Rate limit ─────────────────────────────────────────
  enforceRateLimit();

  // ── 2. Backlog cap — bail early if 50+ ideas pending ──────
  const { count: pendingCount, error: countErr } = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'idea');

  if (countErr) {
    console.warn('[IDEA PIPELINE] Could not check pending count:', countErr.message);
  } else if (pendingCount >= MAX_PENDING_IDEAS) {
    console.log(`[IDEA PIPELINE] Backlog cap reached (${pendingCount} pending ideas). Skipping generation.`);
    return {
      success:     true,
      category,
      generated:   0,
      inserted:    0,
      skipped:     0,
      failed:      0,
      skipped_reason: 'backlog_cap',
      executed_at: new Date().toISOString(),
    };
  }

  // ── 3. Fetch all existing tool names for dedup + similarity ──
  const { data: existingTools, error: fetchErr } = await supabase
    .from('tools')
    .select('name');

  if (fetchErr) {
    console.warn('[IDEA PIPELINE] Could not fetch existing tools:', fetchErr.message);
  }

  const existingNames = (existingTools || []).map(t => t.name);

  // ── 4. Generate from AI ────────────────────────────────────
  let aiIdeas = [];
  try {
    aiIdeas = await generateIdeas(category, safeCount, target_audience);
  } catch (err) {
    console.error(`[IDEA PIPELINE] AI generation failed: ${err.message}`);
    return {
      success:     false,
      category,
      generated:   0,
      inserted:    0,
      skipped:     0,
      failed:      0,
      error:       err.message,
      executed_at: new Date().toISOString(),
    };
  }

  if (!Array.isArray(aiIdeas)) {
    const err = new Error('generateIdeas must return an array');
    err.code = 'PARSE_ERROR';
    throw err;
  }

  console.log(`[IDEA PIPELINE] Generated ${aiIdeas.length} ideas from AI`);

  // ── 5. Process each idea ───────────────────────────────────
  let inserted = 0;
  let skipped  = 0;
  let failed   = 0;

  for (const idea of aiIdeas) {
    // Quality filter
    if ((idea.viability_score || 0) < MIN_VIABILITY_SCORE) {
      console.log(`[IDEA PIPELINE] Low score skip: ${idea.name} (score: ${idea.viability_score})`);
      skipped++;
      continue;
    }

    // Exact duplicate check (case-insensitive)
    const isDuplicate = existingNames.some(
      n => n.toLowerCase() === idea.name.toLowerCase()
    );
    if (isDuplicate) {
      console.log(`[IDEA PIPELINE] Skipped duplicate: ${idea.name}`);
      skipped++;
      continue;
    }

    // Similarity check
    if (isSimilarToExisting(idea.name, existingNames)) {
      console.log(`[IDEA PIPELINE] Skipped similar: ${idea.name}`);
      skipped++;
      continue;
    }

    // Insert
    try {
      const { error: insertErr } = await supabase
        .from('tools')
        .insert({
          name:          idea.name,
          description:   idea.description,
          status:        'idea',
          source:        'ai',
          idea_score:    idea.viability_score,
          approved:      false,
          idea_metadata: {
            problem_solved:  idea.problem_solved,
            monetization:    idea.monetization,
            target_audience: idea.target_audience,
            complexity:      idea.complexity,
            generated_at:    new Date().toISOString(),
          },
        });

      if (insertErr) {
        console.error(`[IDEA PIPELINE] Insert error for "${idea.name}": ${insertErr.message}`);
        failed++;
      } else {
        console.log(`[IDEA PIPELINE] Inserted: ${idea.name} (score: ${idea.viability_score})`);
        inserted++;
        existingNames.push(idea.name); // prevent within-batch duplicates
      }
    } catch (err) {
      console.error(`[IDEA PIPELINE] Unexpected error for "${idea.name}": ${err.message}`);
      failed++;
    }
  }

  const summary = {
    success:     true,
    category,
    generated:   aiIdeas.length,
    inserted,
    skipped,
    failed,
    executed_at: new Date().toISOString(),
  };

  console.log(
    `[IDEA PIPELINE] Summary: generated=${summary.generated} inserted=${inserted} skipped=${skipped} failed=${failed}`
  );

  return summary;
}

/**
 * Approve a pending AI idea and optionally trigger a build plan.
 *
 * NOTE: generateBuildPlan validates status='idea', so we generate the plan
 * FIRST (while status is still 'idea'), then update status to 'building'.
 * This matches the builder-agent's state machine requirements.
 *
 * @param {string}  tool_id
 * @param {{ auto_generate_plan?: boolean }} opts
 */
async function approveAndPlanIdea(tool_id, { auto_generate_plan = true } = {}) {
  // ── 1. Validate ───────────────────────────────────────────
  const { data: tool, error: fetchErr } = await supabase
    .from('tools')
    .select('id, name, status, approved')
    .eq('id', tool_id)
    .maybeSingle();

  if (fetchErr) {
    const err = new Error('Database error fetching tool');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }
  if (!tool) {
    const err = new Error(`Tool not found: ${tool_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }
  if (tool.status !== 'idea') {
    const err = new Error(`Tool "${tool.name}" has status="${tool.status}". Only 'idea' tools can be approved here.`);
    err.code = 'INVALID_STATUS'; err.status = 422; throw err;
  }
  if (tool.approved === true) {
    const err = new Error(`Tool "${tool.name}" is already approved.`);
    err.code = 'ALREADY_APPROVED'; err.status = 422; throw err;
  }

  // ── 2. Mark approved (status stays 'idea' so builder-agent passes) ──
  const { error: approveErr } = await supabase
    .from('tools')
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq('id', tool_id);

  if (approveErr) {
    const err = new Error('Failed to approve tool');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  // ── 3. Generate build plan (optional, default true) ───────
  let plan_generated = false;
  let plan_id        = null;

  if (auto_generate_plan) {
    try {
      const planResult = await generateBuildPlan(tool_id);
      plan_generated   = true;
      plan_id          = planResult.plan_id || null;
      console.log(`[IDEA PIPELINE] Build plan created: ${plan_id} for tool: ${tool.name}`);
    } catch (planErr) {
      // Plan failure must NOT block approval — log and continue
      console.warn(`[IDEA PIPELINE] Plan generation failed for "${tool.name}": ${planErr.message}`);
    }
  }

  // ── 4. Move tool to 'building' ────────────────────────────
  const { error: statusErr } = await supabase
    .from('tools')
    .update({ status: 'building' })
    .eq('id', tool_id);

  if (statusErr) {
    console.error(`[IDEA PIPELINE] Failed to set status=building for ${tool_id}: ${statusErr.message}`);
  }

  console.log(`[IDEA PIPELINE] Approved: ${tool.name} → building | plan_generated=${plan_generated}`);

  return {
    success:        true,
    tool_id,
    tool_name:      tool.name,
    approved:       true,
    status:         'building',
    plan_generated,
    plan_id,
  };
}

/**
 * Mark an AI idea as ignored (status → 'killed').
 * @param {string} tool_id
 */
async function ignoreIdea(tool_id) {
  const { data: tool, error: fetchErr } = await supabase
    .from('tools')
    .select('id, name, status')
    .eq('id', tool_id)
    .maybeSingle();

  if (fetchErr) {
    const err = new Error('Database error fetching tool');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }
  if (!tool) {
    const err = new Error(`Tool not found: ${tool_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }
  if (tool.status !== 'idea') {
    const err = new Error(`Tool "${tool.name}" has status="${tool.status}". Only 'idea' tools can be ignored.`);
    err.code = 'INVALID_STATUS'; err.status = 422; throw err;
  }

  const { error: updateErr } = await supabase
    .from('tools')
    .update({ status: 'killed' })
    .eq('id', tool_id);

  if (updateErr) {
    const err = new Error('Failed to ignore tool');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  console.log(`[IDEA PIPELINE] Idea ignored: ${tool.name}`);

  return { success: true, tool_id, tool_name: tool.name, status: 'killed' };
}

module.exports = { generateAndStoreIdeas, approveAndPlanIdea, ignoreIdea };
