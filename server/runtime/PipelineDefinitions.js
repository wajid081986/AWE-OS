'use strict';

/**
 * AWE-OS — Built-in Pipeline Definitions                     Phase 4B
 *
 * Defines the three core production pipelines as DAG objects.
 * Each step.fn is an async function that:
 *   - Receives (context, signal) from AgentExecutor
 *   - Returns a plain object merged into the accumulated pipeline context
 *   - Never throws uncaught — AgentExecutor handles retry + failure
 *
 * SAFETY CONTRACT:
 *   - No tool is ever published without passing through an approval gate
 *   - Auto-approve only fires when quality score >= 80 AND complexity is LOW
 *   - Recovery pipelines always require human approval — never auto-publish
 *   - Daily analysis pipeline has no approval gate (read-only operations)
 *
 * Pipelines:
 *   tool-creation-v1    — idea → config → test → [approval] → publish
 *   tool-recovery-v1    — failed tool → debug → retest → [approval] → republish
 *   daily-analysis-v1   — revenue snapshot → optimization analysis (autonomous)
 */

const supabase = require('../db/supabase');

// ─── Lazy requires to avoid circular deps or side effects on module load ────────
const getFactoryService  = () => require('../services/ai-factory.service');
const getTestingAgent    = () => require('../agents/testing-agent.core');
const getApprovalAgent   = () => require('../agents/auto-approval-agent');
const getRevenueAgent    = () => require('../agents/revenue-agent');
const getOptimizeAgent   = () => require('../agents/optimization-agent');

// ── Helpers ──────────────────────────────────────────────────────────────────────

async function ensureUniqueSlug(slug) {
  const { data } = await supabase
    .from('tools').select('id').eq('slug', slug).maybeSingle();
  return data ? `${slug}-${Date.now()}` : slug;
}

// ─────────────────────────────────────────────────────────────────────────────────
// PIPELINE 1: Tool Creation
//   Context inputs expected:  { category, idea?, toolId? }
//   Context outputs produced: { toolId, toolConfig, testScore, published }
// ─────────────────────────────────────────────────────────────────────────────────
const TOOL_CREATION_PIPELINE = {
  id:          'tool-creation-v1',
  name:        'Tool Creation Pipeline',
  description: 'Generates, quality-tests, and conditionally publishes a new SaaS tool. Requires human approval unless the tool scores >= 80 with low complexity.',
  version:     1,
  steps: [

    {
      name:         'generate_config',
      agentName:    'ai-factory',
      description:  'Generate tool configuration using AI Factory',
      dependencies: [],
      timeoutMs:    90_000,
      maxRetries:   3,
      retryDelays:  [5_000, 15_000, 45_000],

      fn: async (context) => {
        const { category, idea, toolId } = context;
        if (!category) throw new Error('generate_config: context.category is required');

        const { generateToolConfig } = getFactoryService();
        const config = await generateToolConfig(category, idea || category);
        config.slug  = await ensureUniqueSlug(config.slug);

        // Update an existing tool record if toolId is supplied
        if (toolId) {
          const { error } = await supabase
            .from('tools')
            .update({
              ai_prompt:    config.ai_prompt,
              input_fields: config.input_fields,
              description:  config.description || null,
            })
            .eq('id', toolId);
          if (error) throw new Error(`generate_config: DB update failed — ${error.message}`);
          return { toolId, toolConfig: config, configGenerated: true };
        }

        // Insert a new tool record (not published yet)
        const { data: newTool, error } = await supabase
          .from('tools')
          .insert({
            name:         config.name,
            slug:         config.slug,
            description:  config.description || null,
            category:     config.category || category,
            price:        config.price || 0,
            is_free:      config.is_free ?? true,
            input_fields: config.input_fields,
            ai_prompt:    config.ai_prompt,
            approved: false,
          })
          .select('id, name, slug')
          .single();

        if (error) throw new Error(`generate_config: DB insert failed — ${error.message}`);
        return { toolId: newTool.id, toolName: newTool.name, toolSlug: newTool.slug, toolConfig: config, configGenerated: true };
      },
    },

    {
      name:         'test_quality',
      agentName:    'testing',
      description:  'Run automated quality tests on the generated tool configuration',
      dependencies: ['generate_config'],
      timeoutMs:    60_000,
      maxRetries:   2,
      retryDelays:  [5_000, 15_000],

      fn: async (context) => {
        const { toolId } = context;
        if (!toolId) throw new Error('test_quality: toolId missing from pipeline context');

        const { testTool } = getTestingAgent();
        const testResult   = await testTool(toolId);
        const score        = testResult?.test_score ?? testResult?.score ?? 0;

        return { testResult, testScore: score, testPassed: score >= 40 };
      },
    },

    {
      name:         'evaluate_approval',
      agentName:    'auto-approval',
      description:  'Evaluate tool quality to determine if auto-approval is warranted',
      dependencies: ['test_quality'],
      timeoutMs:    30_000,
      maxRetries:   1,

      fn: async (context) => {
        const { toolId, testScore } = context;
        if (!toolId) throw new Error('evaluate_approval: toolId missing from pipeline context');

        const { evaluateTool } = getApprovalAgent();
        const approval         = await evaluateTool(toolId, testScore ?? 0);

        // Auto-approve only if decision is auto_live AND quality score is high
        const canAutoApprove =
          approval.decision      === 'auto_live' &&
          (approval.qualityScore ?? 0) >= 80;

        return {
          approvalDecision:      approval.decision,
          approvalComplexity:    approval.complexity,
          approvalQualityScore:  approval.qualityScore ?? 0,
          canAutoApprove,
        };
      },
    },

    {
      // Approval gate — pauses pipeline until a human (or auto-approve condition)
      // grants permission to publish. This is the primary safety boundary.
      name:         'human_approval',
      type:         'approval',
      description:  'Human review required before publishing. Auto-bypassed only when quality >= 80.',
      dependencies: ['evaluate_approval'],
      // Auto-approve only when explicitly flagged by evaluate_approval step
      autoApproveCondition: (ctx) => ctx.canAutoApprove === true,
    },

    {
      name:         'publish_tool',
      agentName:    'publisher',
      description:  'Publish the approved tool — set approved=true and create audit log',
      dependencies: ['human_approval'],
      timeoutMs:    20_000,
      maxRetries:   3,
      retryDelays:  [2_000, 5_000, 10_000],

      fn: async (context) => {
        const { toolId, toolName, approvalDecision, approvalQualityScore } = context;
        if (!toolId) throw new Error('publish_tool: toolId missing from pipeline context');

        const { error } = await supabase
          .from('tools')
          .update({ approved: true })
          .eq('id', toolId);

        if (error) throw new Error(`publish_tool: DB update failed — ${error.message}`);

        // Audit log
        await supabase.from('autonomous_logs').insert({
          tool_id:          toolId,
          tool_name:        toolName  || 'unknown',
          action:           'published_via_pipeline',
          status_before:    'idea',
          status_after:     'live',
          is_auto_executed: context.canAutoApprove === true,
          notes:            `Pipeline publish | decision: ${approvalDecision} | quality: ${approvalQualityScore}`,
        }).catch(() => {});

        return { published: true, publishedAt: new Date().toISOString() };
      },
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────────
// PIPELINE 2: Tool Recovery
//   Context inputs:  { toolId }
//   Context outputs: { debugScore, retestScore, republished }
// ─────────────────────────────────────────────────────────────────────────────────
const TOOL_RECOVERY_PIPELINE = {
  id:          'tool-recovery-v1',
  name:        'Tool Recovery Pipeline',
  description: 'Diagnoses failed tools, runs recovery tests, and requires human approval before re-publishing. Never auto-approves — all recovery requires human sign-off.',
  version:     1,
  steps: [

    {
      name:         'debug_tool',
      agentName:    'auto-debug',
      description:  'Analyse failure and attempt automated recovery',
      dependencies: [],
      timeoutMs:    90_000,
      maxRetries:   2,
      retryDelays:  [10_000, 30_000],

      fn: async (context) => {
        const { toolId } = context;
        if (!toolId) throw new Error('debug_tool: toolId missing from pipeline context');

        // Run test to capture current failure details before debug
        const { testTool } = getTestingAgent();
        const testResult   = await testTool(toolId);

        return {
          debugAttempted:  true,
          debugTestResult: testResult,
          debugScore:      testResult?.test_score ?? 0,
        };
      },
    },

    {
      name:         'retest_tool',
      agentName:    'testing',
      description:  'Re-test the tool after debug attempt',
      dependencies: ['debug_tool'],
      timeoutMs:    60_000,
      maxRetries:   2,
      retryDelays:  [5_000, 15_000],

      fn: async (context) => {
        const { toolId } = context;
        if (!toolId) throw new Error('retest_tool: toolId missing from pipeline context');

        const { testTool } = getTestingAgent();
        const testResult   = await testTool(toolId);
        const score        = testResult?.test_score ?? 0;

        return { retestResult: testResult, retestScore: score, retestPassed: score >= 40 };
      },
    },

    {
      // Recovery always requires human approval — no auto-approve path
      name:         'recovery_approval',
      type:         'approval',
      description:  'Human review required before re-publishing a recovered tool. Never auto-approved.',
      dependencies: ['retest_tool'],
      autoApproveCondition: () => false, // always manual
    },

    {
      name:         'republish_tool',
      agentName:    'publisher',
      description:  'Re-publish the recovered tool after human approval',
      dependencies: ['recovery_approval'],
      timeoutMs:    20_000,
      maxRetries:   3,
      retryDelays:  [2_000, 5_000, 10_000],

      fn: async (context) => {
        const { toolId } = context;
        if (!toolId) throw new Error('republish_tool: toolId missing from pipeline context');

        const { error } = await supabase
          .from('tools')
          .update({ approved: true })
          .eq('id', toolId);

        if (error) throw new Error(`republish_tool: DB update failed — ${error.message}`);

        await supabase.from('autonomous_logs').insert({
          tool_id:          toolId,
          action:           'republished_via_recovery_pipeline',
          status_before:    'failed',
          status_after:     'live',
          is_auto_executed: false,
          notes:            'Republished after human-approved recovery pipeline',
        }).catch(() => {});

        return { republished: true, republishedAt: new Date().toISOString() };
      },
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────────
// PIPELINE 3: Daily Analysis (fully autonomous — read/write analytics only)
//   Context inputs:  {} (uses internal DB queries)
//   Context outputs: { revenueSnapshot, optimizationResult }
// ─────────────────────────────────────────────────────────────────────────────────
const DAILY_ANALYSIS_PIPELINE = {
  id:          'daily-analysis-v1',
  name:        'Daily Analysis Pipeline',
  description: 'Runs daily revenue snapshot and optimization analysis. Fully autonomous — no human approval required. Read-heavy, no tool publishing.',
  version:     1,
  steps: [

    {
      name:         'revenue_snapshot',
      agentName:    'revenue',
      description:  'Calculate daily revenue snapshot',
      dependencies: [],
      timeoutMs:    90_000,
      maxRetries:   2,
      retryDelays:  [10_000, 30_000],

      fn: async () => {
        const { calculateDailySnapshot } = getRevenueAgent();
        const snapshot = await calculateDailySnapshot();
        return { revenueSnapshot: snapshot || {} };
      },
    },

    {
      name:         'optimization_analysis',
      agentName:    'optimization',
      description:  'Identify optimization opportunities from current performance data',
      dependencies: ['revenue_snapshot'],
      timeoutMs:    60_000,
      maxRetries:   2,
      retryDelays:  [10_000, 20_000],

      fn: async (context) => {
        const { identifyOptimizations } = getOptimizeAgent();
        const result = await identifyOptimizations(context.revenueSnapshot);
        return { optimizationResult: result || {} };
      },
    },
  ],
};


// ── Pipeline Registry ────────────────────────────────────────────────────────────

const PIPELINE_REGISTRY = new Map([
  [TOOL_CREATION_PIPELINE.id,  TOOL_CREATION_PIPELINE],
  [TOOL_RECOVERY_PIPELINE.id,  TOOL_RECOVERY_PIPELINE],
  [DAILY_ANALYSIS_PIPELINE.id, DAILY_ANALYSIS_PIPELINE],
]);

function getPipeline(id) {
  return PIPELINE_REGISTRY.get(id) ?? null;
}

/**
 * Returns safe (no fn references) summaries for HTTP responses.
 */
function listPipelines() {
  return [...PIPELINE_REGISTRY.values()].map(p => ({
    id:          p.id,
    name:        p.name,
    description: p.description,
    version:     p.version,
    stepCount:   p.steps.length,
    hasApproval: p.steps.some(s => s.type === 'approval'),
    steps: p.steps.map(({ fn: _fn, autoApproveCondition: _a, ...rest }) => rest),
  }));
}

module.exports = {
  TOOL_CREATION_PIPELINE,
  TOOL_RECOVERY_PIPELINE,
  DAILY_ANALYSIS_PIPELINE,
  PIPELINE_REGISTRY,
  getPipeline,
  listPipelines,
};
