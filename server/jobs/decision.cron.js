'use strict';

/**
 * AWE-OS — Decision Engine Cron (Enterprise-Grade)
 *
 * Schedule  : Daily at 02:00 UTC (runs after autonomous-cron finishes at 00:00)
 * Agent     : decision-engine.evaluateAllSaasTools()
 * Safety    : Overlap guard · same-day dedup guard · decision caching
 *             · confidence scoring · reasoning chain logging
 *             · recordCronRun() telemetry · never crashes the process
 *             · auto-starts on require (registered via bare require() in index.js)
 */

const cron = require('node-cron');
const { evaluateAllSaasTools } = require('../agents/decision-engine');
const { recordCronRun }        = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION       = '0 2 * * *';
const AGENT                 = 'decision-cron';
const REASONING_SAMPLE_SIZE = 5;    // log top N individual decisions for observability

// ── State ──────────────────────────────────────────────────────────────────────
let isRunning   = false;
let lastRunDate = null;   // 'YYYY-MM-DD' — prevents duplicate same-day evaluations

// Decision cache: maps tool_id → { decision, score, ts } for last run
const decisionCache = new Map();

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

// ── Decision analytics ─────────────────────────────────────────────────────────
function computeConfidencePct(result) {
  if (!result?.total_evaluated || result.total_evaluated === 0) return 0;
  const s = result.summary || {};
  const decisioned = (s.scale || 0) + (s.kill || 0) + (s.improve || 0) + (s.observe || 0);
  return Number(((decisioned / result.total_evaluated) * 100).toFixed(1));
}

function buildReasoningChain(result) {
  if (!Array.isArray(result?.decisions)) return [];
  return result.decisions.slice(0, REASONING_SAMPLE_SIZE).map(d => ({
    tool_id:  d.tool_id  || null,
    decision: d.decision || null,
    score:    d.score    ?? null,
    reason:   d.reason   || null,
  }));
}

function updateDecisionCache(result) {
  if (!Array.isArray(result?.decisions)) return;
  const now = Date.now();
  for (const d of result.decisions) {
    if (d.tool_id) {
      decisionCache.set(d.tool_id, { decision: d.decision, score: d.score, ts: now });
    }
  }
}

function detectCacheChanges(result) {
  if (!Array.isArray(result?.decisions)) return 0;
  let changed = 0;
  for (const d of result.decisions) {
    const prev = decisionCache.get(d.tool_id);
    if (prev && prev.decision !== d.decision) changed++;
  }
  return changed;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeDecisionRun() {
  if (isRunning) {
    log('warn', 'Skipping — previous run still in progress');
    return;
  }

  const today = todayIso();
  if (lastRunDate === today) {
    log('info', 'Skipping — decision run already completed today', { last_run_date: lastRunDate });
    return;
  }

  isRunning = true;
  const startedAt = Date.now();
  log('info', 'Batch evaluation starting', { cache_size: decisionCache.size });

  try {
    const result     = await evaluateAllSaasTools({ dry_run: false });
    const duration_ms = Date.now() - startedAt;

    const confidence = computeConfidencePct(result);
    const changed    = detectCacheChanges(result);
    const summary    = result?.summary || {};

    log('info', 'Batch evaluation complete', {
      total_evaluated: result?.total_evaluated ?? 0,
      scale:           summary.scale           ?? 0,
      kill:            summary.kill            ?? 0,
      improve:         summary.improve         ?? 0,
      observe:         summary.observe         ?? 0,
      auto_hidden:     result?.auto_hidden     ?? 0,
      errors:          result?.errors?.length  ?? 0,
      confidence_pct:  confidence,
      decisions_changed_vs_cache: changed,
      duration_ms,
    });

    if ((result?.auto_hidden ?? 0) > 0) {
      log('warn', 'Tools auto-hidden this run — critically low usage after observation window', {
        auto_hidden: result.auto_hidden,
        tool_ids: (result.results || []).filter(r => r.action_taken === 'auto_hidden').map(r => r.tool_id),
      });
    }

    const reasoning = buildReasoningChain(result);
    if (reasoning.length > 0) {
      log('info', 'Reasoning chain sample', { sample_size: reasoning.length, decisions: reasoning });
    }

    if (Array.isArray(result?.errors) && result.errors.length > 0) {
      for (const err of result.errors.slice(0, 10)) {
        log('warn', 'Decision error', { tool_id: err?.tool_id || null, error: err?.message || String(err) });
      }
    }

    updateDecisionCache(result);
    lastRunDate = today;

    await recordCronRun(AGENT, 'success', null, {
      records_processed: result?.total_evaluated ?? 0,
      confidence_pct:    confidence,
    });
  } catch (err) {
    log('error', 'Run threw an unexpected error', {
      error:       err?.message || String(err),
      code:        err?.code    || null,
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  } finally {
    isRunning = false;
  }
}

// ── Scheduler — auto-starts on require ────────────────────────────────────────
function startDecisionCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  const task = cron.schedule(CRON_EXPRESSION, executeDecisionRun, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs daily at 02:00 UTC', { expression: CRON_EXPRESSION });
  return task;
}

module.exports = { startDecisionCron, executeDecisionRun };
