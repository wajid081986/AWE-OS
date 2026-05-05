'use strict';

/**
 * @fileoverview Testing Agent Core
 * @module testing-agent-core
 * @description Validates tool quality, persists test results, and triggers
 *              learning-engine feedback. Designed for high-throughput batch
 *              runs with full observability and graceful fault isolation.
 */

const { randomUUID }            = require('crypto');
const supabase                  = require('../db/supabase');
const { getLearningDecision,
        recordLearningOutcome } = require('./learning-engine');

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT = 'testing-agent';

/** Minimum score thresholds (inclusive) */
const SCORE_THRESHOLD = Object.freeze({ PASS: 80, PARTIAL: 50 });

/** Score contribution per dimension */
const SCORE_WEIGHT = Object.freeze({ API: 50, UI: 50 });

/** Maps test outcome → tools.status column value */
const TEST_TO_TOOL_STATUS = Object.freeze({
  pass:    'live',
  partial: 'needs_fix',
  fail:    'failed',
});

/** Allowed values for tool_tests.status */
const VALID_TEST_STATUSES = new Set(['pass', 'partial', 'fail']);

/** Columns fetched from the tools table for a test run */
const TOOL_SELECT_COLUMNS = [
  'id', 'name', 'slug', 'ai_prompt', 'input_fields',
  'category', 'success_count', 'failure_count',
  'avg_score', 'best_strategy', 'last_used_at', 'updated_at',
].join(', ');

/** Statuses that indicate a tool is awaiting validation */
const TESTABLE_STATUSES = Object.freeze(['testing', 'building']);

// ─── Logging ─────────────────────────────────────────────────────────────────

/**
 * Structured JSON logger.
 *
 * @param {'info'|'warn'|'error'} level
 * @param {Object} payload
 * @param {string}  payload.operation   - Calling function identifier
 * @param {string} [payload.tool_id]    - UUID of the tool being processed
 * @param {string}  payload.message     - Human-readable description
 * @param {string} [payload.error]      - Error message, if applicable
 * @param {Object} [payload.meta]       - Arbitrary extra context
 */
function log(level, payload) {
  const entry = {
    ts:        new Date().toISOString(),
    level,
    agent:     AGENT,
    operation: payload.operation,
    tool_id:   payload.tool_id  ?? null,
    message:   payload.message,
  };

  if (payload.error) entry.error = payload.error;
  if (payload.meta)  entry.meta  = payload.meta;

  const serialised = JSON.stringify(entry);
  (level === 'error' ? console.error : console.log)(serialised);
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Derives a test status from a numeric score.
 *
 * @param  {number} score  0–100
 * @returns {'pass'|'partial'|'fail'}
 */
function deriveTestStatus(score) {
  if (score >= SCORE_THRESHOLD.PASS)    return 'pass';
  if (score >= SCORE_THRESHOLD.PARTIAL) return 'partial';
  return 'fail';
}

/**
 * Maps a test status to the corresponding tool status.
 *
 * @param  {'pass'|'partial'|'fail'} testStatus
 * @returns {string}
 */
function deriveToolStatus(testStatus) {
  return TEST_TO_TOOL_STATUS[testStatus] ?? 'failed';
}

/**
 * Guarantees input_fields is always an array.
 *
 * @param  {*} raw
 * @returns {Array}
 */
function normaliseInputFields(raw) {
  return Array.isArray(raw) ? raw : [];
}

/**
 * Returns true when toolId is a non-empty, non-whitespace string.
 *
 * @param  {*} toolId
 * @returns {boolean}
 */
function isValidToolId(toolId) {
  return typeof toolId === 'string' && toolId.trim().length > 0;
}

/**
 * Returns true when score is a finite, non-NaN number.
 *
 * @param  {*} score
 * @returns {boolean}
 */
function isValidScore(score) {
  return typeof score === 'number' && Number.isFinite(score);
}

/**
 * Extracts the message string from any thrown value.
 *
 * @param  {unknown} err
 * @returns {string}
 */
function toErrorMessage(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Evaluates a tool row and returns granular scoring details.
 *
 * @typedef  {Object} ScoringResult
 * @property {boolean} api_ok        - All required fields are populated
 * @property {boolean} ui_ok         - Prompt quality is sufficient
 * @property {boolean} hasName
 * @property {boolean} hasSlug
 * @property {boolean} hasPrompt
 * @property {boolean} hasInputFields
 * @property {boolean} hasCategory
 * @property {boolean} promptLong
 * @property {boolean} hasVarPattern
 * @property {boolean} allFieldsInPrompt
 * @property {number}  score          - 0 | 50 | 100
 *
 * @param  {Object} tool - Row from the tools table
 * @returns {ScoringResult}
 */
function scoreTool(tool) {
  const inputFields = normaliseInputFields(tool.input_fields);

  const hasName        = typeof tool.name      === 'string' && tool.name.trim().length      > 0;
  const hasSlug        = typeof tool.slug      === 'string' && tool.slug.trim().length      > 0;
  const hasPrompt      = typeof tool.ai_prompt === 'string' && tool.ai_prompt.trim().length > 0;
  const hasInputFields = inputFields.length > 0;
  const hasCategory    = typeof tool.category  === 'string' && tool.category.trim().length  > 0;

  const api_ok = hasName && hasSlug && hasPrompt && hasInputFields && hasCategory;

  let promptLong       = false;
  let hasVarPattern    = false;
  let allFieldsInPrompt = false;

  if (hasPrompt && hasInputFields) {
    promptLong        = tool.ai_prompt.length > 50;
    hasVarPattern     = /\{\{[^}]+\}\}/.test(tool.ai_prompt);
    allFieldsInPrompt = inputFields.every(
      (f) => f?.name && tool.ai_prompt.includes(`{{${f.name}}}`),
    );
  }

  const ui_ok = promptLong && hasVarPattern && allFieldsInPrompt;

  const score = (api_ok ? SCORE_WEIGHT.API : 0) + (ui_ok ? SCORE_WEIGHT.UI : 0);

  return {
    api_ok, ui_ok,
    hasName, hasSlug, hasPrompt, hasInputFields, hasCategory,
    promptLong, hasVarPattern, allFieldsInPrompt,
    score,
  };
}

// ─── Database helpers ─────────────────────────────────────────────────────────

/**
 * Confirms the tool row exists in the database before any dependent insert.
 * Returns the tool id on success, null otherwise (after logging).
 *
 * @param  {string} toolId
 * @returns {Promise<string|null>}
 */
async function validateToolExists(toolId) {
  const { data: tool, error } = await supabase
    .from('tools')
    .select('id')
    .eq('id', toolId)
    .maybeSingle();

  if (error) {
    log('error', {
      operation: 'validate_tool_exists',
      tool_id:   toolId,
      message:   'Supabase error while validating tool existence',
      error:     error.message,
    });
    return null;
  }

  if (!tool) {
    log('error', {
      operation: 'validate_tool_exists',
      tool_id:   toolId,
      message:   'Tool not found – FK guard prevented insert',
    });
    return null;
  }

  return tool.id;
}

/**
 * Persists a single test result row.
 *
 * @param  {string} toolId
 * @param  {'pass'|'partial'|'fail'} testStatus
 * @param  {number} score
 * @returns {Promise<boolean>} true on successful insert
 */
async function insertToolTest(toolId, testStatus, score) {
  // Guard: tool_id
  if (!isValidToolId(toolId)) {
    log('error', {
      operation: 'insert_tool_test',
      tool_id:   toolId,
      message:   'Invalid tool_id – skipping test result insert',
    });
    return false;
  }

  // Guard: testStatus
  if (!VALID_TEST_STATUSES.has(testStatus)) {
    log('error', {
      operation: 'insert_tool_test',
      tool_id:   toolId,
      message:   `Invalid test status "${testStatus}" – skipping insert`,
    });
    return false;
  }

  // Guard: score
  if (!isValidScore(score)) {
    log('error', {
      operation: 'insert_tool_test',
      tool_id:   toolId,
      message:   'Non-finite score – skipping insert',
    });
    return false;
  }

  // FK pre-check
  const existingId = await validateToolExists(toolId);
  if (!existingId) return false;

  try {
    const { error } = await supabase
      .from('tool_tests')
      .insert({ tool_id: toolId, status: testStatus, score });

    if (error) {
      const isFk = error.code === '23503';
      log('error', {
        operation: 'insert_tool_test',
        tool_id:   toolId,
        message:   isFk ? 'FK violation prevented insert' : 'Failed to insert test result',
        error:     error.message,
      });
      return false;
    }
  } catch (err) {
    const isFk = err?.code === '23503';
    log('error', {
      operation: 'insert_tool_test',
      tool_id:   toolId,
      message:   isFk ? 'FK violation prevented insert' : 'Unexpected error inserting test result',
      error:     toErrorMessage(err),
    });
    return false;
  }

  log('info', {
    operation: 'insert_tool_test',
    tool_id:   toolId,
    message:   'Test result inserted',
    meta:      { testStatus, score },
  });

  return true;
}

/**
 * Updates the tool's `status` and `quality_score` columns.
 *
 * @param  {Object} params
 * @param  {string} params.toolId
 * @param  {string} params.toolStatus
 * @param  {number} params.score
 * @returns {Promise<boolean>}
 */
async function updateToolStatus({ toolId, toolStatus, score }) {
  const { error } = await supabase
    .from('tools')
    .update({ status: toolStatus, quality_score: score })
    .eq('id', toolId);

  if (error) {
    log('error', {
      operation: 'update_tool_status',
      tool_id:   toolId,
      message:   'Failed to update tool status',
      error:     error.message,
    });
    return false;
  }

  log('info', {
    operation: 'update_tool_status',
    tool_id:   toolId,
    message:   'Tool status updated',
    meta:      { toolStatus, score },
  });

  return true;
}

// ─── Learning integration ─────────────────────────────────────────────────────

/**
 * Fires a learning outcome record; never throws (errors are logged and swallowed).
 *
 * @param {Object} tool
 * @param {'pass'|'partial'|'fail'} testStatus
 * @param {number} score
 * @param {string} traceId
 * @param {string|null} runId
 */
async function recordTestLearning(tool, testStatus, score, traceId, runId) {
  try {
    await recordLearningOutcome({
      tool,
      toolId:    tool?.id ?? null,
      success:   testStatus === 'pass',
      score,
      errorType: testStatus === 'pass' ? null : 'VALIDATION_ERROR',
      strategy:  'test_validation',
      traceId,
      runId,
    });
  } catch (err) {
    log('error', {
      operation: 'record_test_learning',
      tool_id:   tool?.id ?? null,
      message:   'Learning outcome recording failed (non-fatal)',
      error:     toErrorMessage(err),
    });
  }
}

// ─── Failure result factory ───────────────────────────────────────────────────

/**
 * Produces a standardised failure result object.
 *
 * @param {string|null}  toolId
 * @param {string|null} [toolName]
 * @param {string|null} [errorMessage]
 * @param {string|null} [decisionReason]
 * @returns {Object}
 */
function makeFailResult(toolId, toolName = null, errorMessage = null, decisionReason = null) {
  const result = {
    tool_id:       toolId  ?? null,
    tool_name:     toolName ?? null,
    status:        'fail',
    testStatus:    'fail',
    toolStatus:    'failed',
    score:         0,
    test_score:    0,
    inserted:      false,
  };

  if (errorMessage)    result.error           = errorMessage;
  if (decisionReason)  result.decision_reason = decisionReason;

  return result;
}

// ─── Core: testTool ───────────────────────────────────────────────────────────

/**
 * Fetches a tool, validates its fields, persists the test result, and triggers
 * the learning engine.
 *
 * @param  {string}      toolId
 * @param  {string|null} [runId] - Batch run UUID supplied by the caller
 * @returns {Promise<Object>} Normalised test result
 */
async function testTool(toolId, runId = null) {
  const traceId = randomUUID();

  // ── Guard: toolId ──
  if (!isValidToolId(toolId)) {
    log('error', {
      operation: 'test_tool',
      tool_id:   toolId,
      message:   'Invalid tool_id – skipping test',
    });
    return makeFailResult(toolId ?? null);
  }

  try {
    // ── Fetch tool ──
    const { data: tool, error: fetchErr } = await supabase
      .from('tools')
      .select(TOOL_SELECT_COLUMNS)
      .eq('id', toolId)
      .maybeSingle();

    if (fetchErr || !tool) {
      log('error', {
        operation: 'fetch_tool',
        tool_id:   toolId,
        message:   fetchErr ? 'Supabase error fetching tool' : 'Tool not found',
        error:     fetchErr?.message ?? null,
      });
      return makeFailResult(toolId);
    }

    // ── Learning gate ──
    const learningDecision = await getLearningDecision(tool, {
      errorType: null,
      score:     tool.avg_score,
      traceId,
      runId,
    });

    if (learningDecision.should_skip) {
      log('info', {
        operation: 'test_tool',
        tool_id:   toolId,
        message:   'Learning engine skipped low-confidence execution',
        meta:      { reason: learningDecision.decision_reason },
      });
      return makeFailResult(toolId, tool.name, null, learningDecision.decision_reason);
    }

    // ── Score ──
    const scoring = scoreTool(tool);

    if (!isValidScore(scoring.score)) {
      log('error', {
        operation: 'score_validation',
        tool_id:   toolId,
        message:   'Computed score is non-finite – skipping insert',
      });
      return makeFailResult(toolId, tool.name);
    }

    const testStatus = deriveTestStatus(scoring.score);
    const toolStatus = deriveToolStatus(testStatus);

    log('info', {
      operation: 'test_tool',
      tool_id:   toolId,
      message:   `Scoring complete for "${tool.name ?? toolId}"`,
      meta:      { testStatus, toolStatus, score: scoring.score, api_ok: scoring.api_ok, ui_ok: scoring.ui_ok },
    });

    // ── Persist ──
    const inserted = await insertToolTest(toolId, testStatus, scoring.score);

    if (inserted) {
      await Promise.all([
        updateToolStatus({ toolId, toolStatus, score: scoring.score }),
        recordTestLearning(tool, testStatus, scoring.score, traceId, runId),
      ]);
    }

    return {
      tool_id:    toolId,
      tool_name:  tool.name,
      api_ok:     scoring.api_ok,
      ui_ok:      scoring.ui_ok,
      status:     testStatus,
      testStatus,
      toolStatus,
      score:      scoring.score,
      test_score: scoring.score,
      inserted,
    };

  } catch (err) {
    const message = toErrorMessage(err);
    log('error', {
      operation: 'test_tool',
      tool_id:   toolId,
      message:   'Unhandled error in testTool – returning safe failure',
      error:     message,
    });
    return makeFailResult(toolId, null, message);
  }
}

// ─── Core: runTestingAgent ────────────────────────────────────────────────────

/**
 * Fetches all tools in testable statuses and runs `testTool` against each.
 * Individual tool failures are isolated and never abort the batch.
 *
 * @returns {Promise<Object[]>} Array of per-tool test results
 */
async function runTestingAgent() {
  const runId = randomUUID();

  log('info', {
    operation: 'run_testing_agent',
    message:   'Batch testing started',
    meta:      { runId },
  });

  try {
    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, name, status')
      .in('status', TESTABLE_STATUSES);

    if (error) {
      log('error', {
        operation: 'fetch_tools',
        message:   'Failed to fetch tools for batch testing',
        error:     error.message,
      });
      return [];
    }

    if (!tools?.length) {
      log('info', {
        operation: 'fetch_tools',
        message:   'No tools in testable status – batch complete with no work',
      });
      return [];
    }

    log('info', {
      operation: 'fetch_tools',
      message:   `Fetched ${tools.length} tool(s) for testing`,
      meta:      { runId, count: tools.length },
    });

    const results = await Promise.allSettled(
      tools.map(async (tool) => {
        if (!tool || !isValidToolId(tool.id)) {
          log('error', {
            operation: 'run_testing_agent',
            tool_id:   tool?.id ?? null,
            message:   'Skipping tool with invalid id',
          });
          return makeFailResult(tool?.id ?? null, tool?.name ?? null);
        }

        try {
          return await testTool(tool.id, runId);
        } catch (err) {
          const message = toErrorMessage(err);
          log('error', {
            operation: 'run_testing_agent',
            tool_id:   tool.id,
            message:   'Tool test threw unexpectedly – continuing batch',
            error:     message,
          });
          return makeFailResult(tool.id, tool.name ?? null, message);
        }
      }),
    );

    // Unwrap allSettled – rejected promises should never occur given our
    // internal try/catch, but we handle them defensively.
    const normalisedResults = results.map((settled, i) => {
      if (settled.status === 'fulfilled') return settled.value;

      const tool = tools[i];
      log('error', {
        operation: 'run_testing_agent',
        tool_id:   tool?.id ?? null,
        message:   'Promise rejected unexpectedly in batch',
        error:     toErrorMessage(settled.reason),
      });
      return makeFailResult(tool?.id ?? null, tool?.name ?? null, toErrorMessage(settled.reason));
    });

    const summary = {
      total:   normalisedResults.length,
      passed:  normalisedResults.filter((r) => r.testStatus === 'pass').length,
      partial: normalisedResults.filter((r) => r.testStatus === 'partial').length,
      failed:  normalisedResults.filter((r) => r.testStatus === 'fail').length,
    };

    log('info', {
      operation: 'run_testing_agent',
      message:   'Batch testing complete',
      meta:      { runId, ...summary },
    });

    return normalisedResults;

  } catch (err) {
    log('error', {
      operation: 'run_testing_agent',
      message:   'Batch testing failed at top level – returning empty results',
      error:     toErrorMessage(err),
    });
    return [];
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { testTool, runTestingAgent };
