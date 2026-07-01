const express  = require('express');
const OpenAI   = require('openai');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/admin.middleware');
const { trackToolUsage } = require('../services/analytics.service');
const { logToAgentLogs } = require('../db/agent-logger');

const { runAutonomousLoop }    = require('../agents/autonomous-agent');
const { executeDailyRevenue }  = require('../jobs/revenue.cron');
const { executeWeeklyContent } = require('../jobs/marketing.cron');
const { executeSLAMonitor }    = require('../jobs/support.cron');
const { executeIdeaRun }       = require('../jobs/idea.cron');
const { executeDecisionRun }   = require('../jobs/decision.cron');
const { analyzeAllLiveTools }  = require('../agents/optimization-agent');
const { getAllPlans, generateCode } = require('../agents/builder-agent');
const { checkSystemHealth }    = require('../agents/deployment-agent');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Agent trigger handlers ───────────────────────────────────────
// Each handler runs the closest equivalent to that agent's cron job
// so a manual "Trigger" does the same work the scheduler would do.
const AGENT_HANDLERS = {
  autonomous:   () => runAutonomousLoop({ limit: 10, triggered_by: 'manual' }),
  revenue:      () => executeDailyRevenue(),
  marketing:    () => executeWeeklyContent(),
  support:      () => executeSLAMonitor(),
  idea:         () => executeIdeaRun(),
  decision:     () => executeDecisionRun(),
  optimization: () => analyzeAllLiveTools(),
  deployment:   () => checkSystemHealth(),
  // Builder has no parameterless cron job — it runs code generation
  // for the oldest build plan that's already been approved.
  builder: async () => {
    const plans = await getAllPlans('approved');
    if (!plans.length) return { message: 'No approved build plans pending' };
    return generateCode(plans[0].id);
  },
};

const AGENT_NAMES = Object.keys(AGENT_HANDLERS);

// Some AGENT_HANDLERS keys don't match the agent_name the dashboard expects
// in agent_logs (the dashboard's status/logs queries use the frontend's card
// id). Translate before writing so triggered runs are actually visible.
const AGENT_LOG_NAMES = { idea: 'idea-pipeline' };
function logAgentName(agentName) {
  return AGENT_LOG_NAMES[agentName] || agentName;
}

// ── Status helper ─────────────────────────────────────────────────
async function getAgentStatus(agentName) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const logName  = logAgentName(agentName);

  const [lastRunRes, runs24hRes, totalRes, infoRes] = await Promise.all([
    supabase.from('agent_logs').select('created_at').eq('agent_name', logName)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('agent_logs').select('id', { count: 'exact', head: true })
      .eq('agent_name', logName).gte('created_at', since24h),
    supabase.from('agent_logs').select('id', { count: 'exact', head: true })
      .eq('agent_name', logName),
    supabase.from('agent_logs').select('id', { count: 'exact', head: true })
      .eq('agent_name', logName).eq('level', 'info'),
  ]);

  const totalCount = totalRes.count || 0;
  const infoCount  = infoRes.count  || 0;

  return {
    agent:       agentName,
    lastRun:     lastRunRes.data?.created_at || null,
    runs24h:     runs24hRes.count || 0,
    successRate: totalCount > 0 ? Math.round((infoCount / totalCount) * 100) : null,
  };
}

// POST /api/agents/run
router.post('/run', requireAuth, async (req, res) => {
  const { toolSlug, inputs } = req.body;

  if (!toolSlug || !inputs || typeof inputs !== 'object') {
    return res.status(400).json({ success: false, error: 'toolSlug and inputs are required' });
  }

  try {
    // Fetch tool from tools
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('slug', toolSlug)
      .eq('approved', true)
      .maybeSingle();

    if (toolErr) throw toolErr;
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });

    // Fetch user permissions and subscription
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('role, permissions, subscription_status')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (userErr) throw userErr;

    const hasAccess =
      tool.is_free ||
      user?.role === 'admin' ||
      (Array.isArray(user?.permissions) && user.permissions.includes(`tool:${tool.slug}`)) ||
      user?.subscription_status === 'active';

    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied', code: 'NO_ACCESS' });
    }

    // Replace {{variable}} placeholders
    let prompt = tool.ai_prompt;
    for (const [key, value] of Object.entries(inputs)) {
      prompt = prompt.replaceAll(`{{${key}}}`, String(value ?? ''));
    }

    const startTime  = Date.now();
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  2000,
      temperature: 0.7,
    });
    const responseTime = Date.now() - startTime;

    const result = completion.choices[0]?.message?.content?.trim() ?? '';

    trackToolUsage(
      req.user.userId,
      toolSlug,
      Object.keys(inputs).length,
      result.length,
      responseTime,
    ).catch(console.error);

    return res.json({ success: true, result });
  } catch (err) {
    console.error('[agents/run]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agents/:agentName/trigger
router.post('/:agentName/trigger', requireAuth, (req, res) => {
  const { agentName } = req.params;
  const handler = AGENT_HANDLERS[agentName];

  if (!handler) {
    return res.status(404).json({ success: false, error: `Unknown agent: ${agentName}` });
  }

  res.json({
    success:      true,
    message:      `${agentName} agent triggered`,
    agent:        agentName,
    triggered_at: new Date().toISOString(),
  });

  const triggeredBy = req.user?.userId || 'unknown';
  const logName = logAgentName(agentName);
  logToAgentLogs(logName, 'info', `Manual trigger started by ${triggeredBy}`).catch(() => {});

  handler()
    .then((result) => {
      logToAgentLogs(logName, 'info', 'Manual trigger completed', { result }).catch(() => {});
    })
    .catch((err) => {
      console.error(`[agents/trigger] ${agentName} failed:`, err.message);
      logToAgentLogs(logName, 'error', `Manual trigger failed: ${err.message}`).catch(() => {});
    });
});

// GET /api/agents/status
router.get('/status', requireAuth, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  try {
    const results = await Promise.all(AGENT_NAMES.map(getAgentStatus));
    const agents = {};
    for (const r of results) agents[r.agent] = r;
    return res.json({ success: true, agents });
  } catch (err) {
    console.error('[agents/status]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agents/:agentName/status
router.get('/:agentName/status', requireAuth, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  const { agentName } = req.params;
  if (!AGENT_HANDLERS[agentName]) {
    return res.status(404).json({ success: false, error: `Unknown agent: ${agentName}` });
  }

  try {
    const status = await getAgentStatus(agentName);
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('[agents/:agentName/status]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/agents/:agentName/logs?limit=20
router.get('/:agentName/logs', requireAuth, async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  const { agentName } = req.params;
  if (!AGENT_HANDLERS[agentName]) {
    return res.status(404).json({ success: false, error: `Unknown agent: ${agentName}` });
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  try {
    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_name', logAgentName(agentName))
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return res.json({ success: true, agent: agentName, logs: data || [] });
  } catch (err) {
    console.error('[agents/:agentName/logs]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
