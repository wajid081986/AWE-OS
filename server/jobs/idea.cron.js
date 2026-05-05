'use strict';

/**
 * AWE-OS — Idea Generation Cron (Enterprise-Grade)
 *
 * Schedule  : Every 12 hours (00:00 and 12:00 UTC)
 * Agent     : idea-pipeline.generateAndStoreIdeas()
 * Safety    : Overlap guard · category rotation · deduplication guard (7-day window)
 *             · quality scoring · backlog cap · recordCronRun() telemetry
 *             · never crashes the server process
 *
 * Registration (in index.js): call startIdeaCron() inside app.listen()
 */

const cron     = require('node-cron');
const supabase = require('../db/supabase');
const { generateAndStoreIdeas } = require('../agents/idea-pipeline');
const { recordCronRun }         = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION   = '0 */12 * * *';
const AGENT             = 'idea-cron';
const IDEA_COUNT        = 5;
const DEDUP_WINDOW_DAYS = 7;      // skip if fresh ideas for category already exist
const MIN_QUALITY_SCORE = 60;     // warn if avg quality below this

const CATEGORY_ROTATION = [
  'micro_saas',
  'b2b_tools',
  'developer_tools',
  'automation',
  'ai_powered',
  'productivity',
];

// ── State ──────────────────────────────────────────────────────────────────────
let isRunning     = false;
let categoryIndex = 0;   // incremented each run to rotate categories

// ── Logger ─────────────────────────────────────────────────────────────────────
function log(level, message, data = {}) {
  try {
    const line = JSON.stringify({ agent: AGENT, level, message, ...data, ts: new Date().toISOString() });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch (_) {
    console.log(`[${AGENT}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Deduplication ──────────────────────────────────────────────────────────────
async function hasRecentIdeasForCategory(category) {
  const since = new Date(Date.now() - DEDUP_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('saas_tools')
    .select('id')
    .eq('status', 'idea')
    .eq('category', category)
    .gte('created_at', since)
    .limit(1);

  if (error) {
    log('warn', 'Dedup check failed — proceeding with generation', { category, error: error.message });
    return false;   // fail-open: generate rather than skip on error
  }
  return Array.isArray(data) && data.length > 0;
}

// ── Quality assessment ─────────────────────────────────────────────────────────
function assessQuality(result, category) {
  const avg = result?.avg_quality_score ?? null;
  if (avg !== null && avg < MIN_QUALITY_SCORE) {
    log('warn', 'Low quality score for generated ideas', {
      category,
      avg_quality_score: avg,
      threshold:         MIN_QUALITY_SCORE,
      hint:              'Consider refining idea-pipeline prompts for this category.',
    });
  }
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeIdeaRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  const category  = CATEGORY_ROTATION[categoryIndex % CATEGORY_ROTATION.length];
  categoryIndex   = (categoryIndex + 1) % CATEGORY_ROTATION.length;

  log('info', 'Run starting', { category, idea_count: IDEA_COUNT, next_category: CATEGORY_ROTATION[categoryIndex] });

  try {
    const isDuplicate = await hasRecentIdeasForCategory(category);
    if (isDuplicate) {
      log('info', 'Dedup skip — fresh ideas already exist for category', {
        category,
        window_days: DEDUP_WINDOW_DAYS,
      });
      await recordCronRun(AGENT, 'skipped');
      return;
    }

    const result = await generateAndStoreIdeas({
      category,
      count:           IDEA_COUNT,
      target_audience: 'solopreneurs',
    });

    const duration_ms = Date.now() - startedAt;

    if (!result || !result.success) {
      log('error', 'Run returned failure', {
        category,
        error:      result?.error || 'unknown',
        duration_ms,
      });
      await recordCronRun(AGENT, 'error', result?.error || 'Run returned failure');
      return;
    }

    if (result.skipped_reason === 'backlog_cap') {
      log('info', 'Skipped — idea backlog cap reached', { category, duration_ms });
      await recordCronRun(AGENT, 'skipped');
      return;
    }

    assessQuality(result, category);

    log('info', 'Run complete', {
      category,
      generated:         result.generated         ?? 0,
      inserted:          result.inserted          ?? 0,
      skipped:           result.skipped           ?? 0,
      failed:            result.failed            ?? 0,
      avg_quality_score: result.avg_quality_score ?? null,
      duration_ms,
    });

    await recordCronRun(AGENT, 'success', null, {
      records_processed: result.inserted ?? 0,
      category,
    });
  } catch (err) {
    log('error', 'Run threw an unexpected error', {
      category,
      error:       err?.message || String(err),
      code:        err?.code    || null,
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────────────
function startIdeaCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  const task = cron.schedule(CRON_EXPRESSION, executeIdeaRun, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs every 12 hours (00:00, 12:00 UTC)', {
    expression:         CRON_EXPRESSION,
    category_rotation:  CATEGORY_ROTATION,
    dedup_window_days:  DEDUP_WINDOW_DAYS,
  });
  return task;
}

module.exports = { startIdeaCron, executeIdeaRun };
