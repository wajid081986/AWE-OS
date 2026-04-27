// Centralised API layer.
// Uses the same fetch-based pattern as the existing apiFetch in App.jsx
// so there is zero new runtime dependency (no Axios needed).

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

function getToken() {
  return localStorage.getItem('awe_token');
}

/**
 * Core fetch wrapper — injects JWT, handles 401, validates JSON.
 * Throws a typed error so callers can branch on err.code.
 */
async function apiFetch(path, options = {}) {
  const token = getToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
      },
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      const err = new Error('Request timed out after 60s');
      err.code = 'TIMEOUT';
      throw err;
    }
    throw fetchErr;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    localStorage.removeItem('awe_token');
    const err = new Error('Session expired — please sign in again');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const err = new Error('Server error — unexpected response format');
    err.code = 'INVALID_RESPONSE';
    throw err;
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.code  = data.code  || 'API_ERROR';
    err.status = res.status;
    throw err;
  }

  return data;
}

// ── Tools ─────────────────────────────────────────────────────

/** Fetch all tools with metrics */
export const getTools = () => apiFetch('/api/tools');

// ── Decision Engine ───────────────────────────────────────────

/** Evaluate a single tool */
export const getDecision = (tool_id, dry_run = false) =>
  apiFetch(`/api/decision/${tool_id}${dry_run ? '?dry_run=true' : ''}`);

/** Evaluate all live/scaling tools */
export const getAllDecisions = ({ dry_run = false, limit = 50 } = {}) =>
  apiFetch(`/api/decision?dry_run=${dry_run}&limit=${limit}`);

/** Manually approve a tool decision (sets status = live) */
export const approveDecision = (tool_id) =>
  apiFetch('/api/decision/approve', {
    method: 'POST',
    body: JSON.stringify({ tool_id }),
  });

/** Manually reject a tool (sets status = killed, manual_override = true) */
export const rejectDecision = (tool_id) =>
  apiFetch('/api/decision/reject', {
    method: 'POST',
    body: JSON.stringify({ tool_id }),
  });

// ── Analytics ─────────────────────────────────────────────────

/** Event summary for a single tool */
export const getEventSummary = (tool_id) =>
  apiFetch(`/api/events/summary/${tool_id}`);

// ── Builder Agent ─────────────────────────────────────────────

/** Generate a build plan for a tool in 'idea' status */
export const generatePlan = (tool_id) =>
  apiFetch('/api/builder/generate', { method: 'POST', body: JSON.stringify({ tool_id }) });

/** Fetch a single plan by plan_id */
export const getBuilderPlan = (plan_id) =>
  apiFetch(`/api/builder/plan/${plan_id}`);

/** Fetch all plans, optionally filtered by status */
export const getAllBuilderPlans = (status = null) =>
  apiFetch(`/api/builder/plans${status ? `?status=${status}` : ''}`);

/** Update a plan's status */
export const updatePlanStatus = (plan_id, status, reviewer_notes = null) =>
  apiFetch(`/api/builder/plan/${plan_id}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, reviewer_notes }),
  });

// ── Tools ─────────────────────────────────────────────────────

/** Update a tool's status manually */
export const updateToolStatus = (tool_id, status) =>
  apiFetch(`/api/tools/${tool_id}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status }),
  });

// ── Ideas ─────────────────────────────────────────────────────

/** Trigger a manual AI idea generation run */
export const generateIdeas = ({ category = 'micro_saas', count = 5, target_audience = 'solopreneurs' } = {}) =>
  apiFetch('/api/ideas/generate', {
    method: 'POST',
    body:   JSON.stringify({ category, count, target_audience }),
  });

/** Fetch AI-generated ideas awaiting human review */
export const getPendingIdeas = () =>
  apiFetch('/api/ideas/pending');

/** Approve a pending AI idea — triggers build plan generation */
export const approveIdea = (tool_id) =>
  apiFetch('/api/ideas/approve', {
    method: 'POST',
    body:   JSON.stringify({ tool_id }),
  });

/** Ignore a pending AI idea — sets status to 'killed' */
export const ignoreIdea = (tool_id) =>
  apiFetch('/api/ideas/ignore', {
    method: 'POST',
    body:   JSON.stringify({ tool_id }),
  });

// ── Autonomous Agent ──────────────────────────────────────────

/** Manually trigger an autonomous agent run */
export const triggerAutonomousRun = (options = {}) =>
  apiFetch('/api/autonomous/run', {
    method: 'POST',
    body:   JSON.stringify(options),
  });

/** Fetch autonomous agent run logs, optionally filtered by tool and limited */
export const getAutonomousLogs = (limit = 20, tool_id = null) => {
  const params = new URLSearchParams({ limit });
  if (tool_id) params.set('tool_id', tool_id);
  return apiFetch(`/api/autonomous/logs?${params.toString()}`);
};

/** Fetch the most recent autonomous run summary */
export const getLastAutonomousRun = () =>
  apiFetch('/api/autonomous/last-run');

// ── Optimization ──────────────────────────────────────────────

/** Run AI optimization analysis for a single tool */
export const analyzeTool = (tool_id) =>
  apiFetch(`/api/optimize/analyze/${tool_id}`, { method: 'POST' });

/** Fetch optimization suggestions for a tool */
export const getOptimizationSuggestions = (tool_id, status = null) =>
  apiFetch(`/api/optimize/suggestions/${tool_id}${status ? `?status=${status}` : ''}`);

/** Mark an optimization suggestion as applied */
export const applySuggestion = (suggestion_id, notes = null) =>
  apiFetch(`/api/optimize/suggestion/${suggestion_id}/apply`, {
    method: 'PATCH',
    body:   JSON.stringify({ notes }),
  });

/** Dismiss an optimization suggestion */
export const dismissSuggestion = (suggestion_id, notes = null) =>
  apiFetch(`/api/optimize/suggestion/${suggestion_id}/dismiss`, {
    method: 'PATCH',
    body:   JSON.stringify({ notes }),
  });

/** Run optimization analysis across all live/scaling tools */
export const runOptimizationAll = () =>
  apiFetch('/api/optimize/run-all', { method: 'POST' });

// ── Monetization ──────────────────────────────────────────────

/** Run AI monetization analysis for a live/scaling tool */
export const analyzeMonetization = (tool_id) =>
  apiFetch(`/api/monetize/analyze/${tool_id}`, { method: 'POST' });

/** Fetch monetization strategies for a tool */
export const getMonetizationStrategies = (tool_id, { status, type } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type)   params.set('type', type);
  const qs = params.toString();
  return apiFetch(`/api/monetize/strategies/${tool_id}${qs ? `?${qs}` : ''}`);
};

/** Update a monetization strategy status (suggested→testing→implemented|rejected) */
export const updateStrategyStatus = (strategy_id, status, notes = null) =>
  apiFetch(`/api/monetize/strategy/${strategy_id}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, notes }),
  });

/** Create a new A/B pricing experiment */
export const createPricingExperiment = (data) =>
  apiFetch('/api/monetize/experiment', {
    method: 'POST',
    body:   JSON.stringify(data),
  });

/** Conclude an A/B experiment and compute the winner */
export const concludeExperiment = (experiment_id) =>
  apiFetch(`/api/monetize/experiment/${experiment_id}/conclude`, { method: 'POST' });

/** Fetch all pricing experiments for a tool */
export const getExperiments = (tool_id) =>
  apiFetch(`/api/monetize/experiments/${tool_id}`);

// ── Code Generator ────────────────────────────────────────────

/** Trigger AI code generation for a tool with an approved build plan */
export const generateCode = (tool_id) =>
  apiFetch(`/api/codegen/generate/${tool_id}`, { method: 'POST' });

/** Fetch generated code with all file contents for a tool */
export const getGeneratedCode = (tool_id) =>
  apiFetch(`/api/codegen/${tool_id}`);

/** Approve generated code — marks the tool as 'live' */
export const approveCode = (code_id, reviewer_notes = null) =>
  apiFetch(`/api/codegen/${code_id}/approve`, {
    method: 'POST',
    body:   JSON.stringify({ reviewer_notes }),
  });

/** Reject generated code — tool stays 'building', allows regeneration */
export const rejectCode = (code_id, reviewer_notes = null) =>
  apiFetch(`/api/codegen/${code_id}/reject`, {
    method: 'POST',
    body:   JSON.stringify({ reviewer_notes }),
  });

// ── Revenue Agent ─────────────────────────────────────────────

/** Full revenue dashboard (metrics, insights, alerts, top tools) */
export const getRevenueDashboard = () =>
  apiFetch('/api/revenue-agent/dashboard');

/** Trigger a fresh daily revenue snapshot + AI insights */
export const runRevenueSnapshot = () =>
  apiFetch('/api/revenue-agent/snapshot', { method: 'POST' });

/** Historical daily snapshots for chart (default 30 days) */
export const getRevenueHistory = (days = 30) =>
  apiFetch(`/api/revenue-agent/history?days=${days}`);

/** Fetch upsell opportunities */
export const getUpsellOpportunities = ({ status = 'identified', limit = 20 } = {}) =>
  apiFetch(`/api/revenue-agent/upsells?status=${status}&limit=${limit}`);

/** Scan for new upsell opportunities (AI) */
export const findUpsellOpportunities = () =>
  apiFetch('/api/revenue-agent/upsells/find', { method: 'POST' });

/** Update upsell opportunity status */
export const updateUpsellStatus = (id, status) =>
  apiFetch(`/api/revenue-agent/upsells/${id}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status }),
  });

/** Fetch unresolved failed payments */
export const getFailedPayments = (resolved = false) =>
  apiFetch(`/api/revenue-agent/failed-payments?resolved=${resolved}`);

/** Mark a failed payment as resolved */
export const resolveFailedPayment = (id) =>
  apiFetch(`/api/revenue-agent/failed-payments/${id}/resolve`, { method: 'PATCH' });

/** Fetch unacknowledged revenue alerts */
export const getRevenueAlerts = (acknowledged = false) =>
  apiFetch(`/api/revenue-agent/alerts?acknowledged=${acknowledged}`);

/** Acknowledge a revenue alert */
export const acknowledgeRevenueAlert = (id) =>
  apiFetch(`/api/revenue-agent/alerts/${id}/acknowledge`, { method: 'PATCH' });

// ── Support Agent ─────────────────────────────────────────────

export const getSupportDashboard = () =>
  apiFetch('/api/support/dashboard');

export const getSupportTickets = (params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/api/support/tickets${qs}`);
};

export const submitSupportTicket = (body) =>
  apiFetch('/api/support/ticket', {
    method: 'POST',
    body:   JSON.stringify(body),
  });

// General-purpose request helper used by SupportPanel (and future panels)
// that need ad-hoc GET / POST / PATCH without adding a named export per call.
const api = {
  get:   (path, opts = {})  => apiFetch(`/api${path}`, { method: 'GET',   ...opts }),
  post:  (path, body = {})  => apiFetch(`/api${path}`, { method: 'POST',  body: JSON.stringify(body) }),
  patch: (path, body = {})  => apiFetch(`/api${path}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export default api;
