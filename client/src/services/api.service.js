import axios from 'axios';

const BASE_URL  = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';
const TOKEN_KEY = 'awe_token';

// ── Axios instance (new domain APIs) ─────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Domain API groups ─────────────────────────────────────────

export const toolsAPI = {
  getAll:         ()           => api.get('/api/tools'),
  getBySlug:      (slug)       => api.get(`/api/tools/${slug}`),
  create:         (data)       => api.post('/api/tools', data),
  update:         (id, data)   => api.put(`/api/tools/${id}`, data),
  delete:         (id)         => api.delete(`/api/tools/${id}`),
};

export const productsAPI = {
  getAll:    ()   => api.get('/api/products'),
  purchase:  (id) => api.post('/api/products/purchase', { productId: id }),
  download:  (id) => api.get(`/api/products/${id}/download`),
};

export const calculatorsAPI = {
  getAll:    ()     => api.get('/api/calculators'),
  getBySlug: (slug) => api.get(`/api/calculators/${slug}`),
};

export const agentsAPI = {
  run: (toolSlug, inputs) => api.post('/api/agents/run', { toolSlug, inputs }),
};

export const adminAPI = {
  getUsers:               ()                          => api.get('/api/admin/users'),
  updateUserPermissions:  (userId, permissions)       => api.put(`/api/admin/users/${userId}/permissions`, { permissions }),
};

// ── Legacy fetch-based layer (backward-compatible) ────────────
// Used by AdminDashboard panels — do not remove.

function getToken() { return localStorage.getItem(TOKEN_KEY); }

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
      const err = new Error('Request timed out after 60s'); err.code = 'TIMEOUT'; throw err;
    }
    throw fetchErr;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    const err = new Error('Session expired — please sign in again'); err.code = 'UNAUTHORIZED'; throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const err = new Error('Server error — unexpected response format'); err.code = 'INVALID_RESPONSE'; throw err;
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.code = data.code || 'API_ERROR'; err.status = res.status; throw err;
  }

  return data;
}

// Tools
export const getTools         = ()                    => apiFetch('/api/tools');
export const updateToolStatus = (tool_id, status)     => apiFetch(`/api/tools/${tool_id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Decision Engine
export const getDecision      = (tool_id, dry_run = false) => apiFetch(`/api/decision/${tool_id}${dry_run ? '?dry_run=true' : ''}`);
export const getAllDecisions   = ({ dry_run = false, limit = 50 } = {}) => apiFetch(`/api/decision?dry_run=${dry_run}&limit=${limit}`);
export const approveDecision  = (tool_id) => apiFetch('/api/decision/approve', { method: 'POST', body: JSON.stringify({ tool_id }) });
export const rejectDecision   = (tool_id) => apiFetch('/api/decision/reject',  { method: 'POST', body: JSON.stringify({ tool_id }) });

// Analytics
export const getEventSummary  = (tool_id) => apiFetch(`/api/events/summary/${tool_id}`);

// Builder Agent
export const generatePlan      = (tool_id)         => apiFetch('/api/builder/generate', { method: 'POST', body: JSON.stringify({ tool_id }) });
export const getBuilderPlan    = (plan_id)         => apiFetch(`/api/builder/plan/${plan_id}`);
export const getAllBuilderPlans = (status = null)   => apiFetch(`/api/builder/plans${status ? `?status=${status}` : ''}`);
export const updatePlanStatus  = (plan_id, status, reviewer_notes = null) =>
  apiFetch(`/api/builder/plan/${plan_id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reviewer_notes }) });

// Ideas
export const generateIdeas  = ({ category = 'micro_saas', count = 5, target_audience = 'solopreneurs' } = {}) =>
  apiFetch('/api/ideas/generate', { method: 'POST', body: JSON.stringify({ category, count, target_audience }) });
export const getPendingIdeas = () => apiFetch('/api/ideas/pending');
export const approveIdea     = (tool_id) => apiFetch('/api/ideas/approve', { method: 'POST', body: JSON.stringify({ tool_id }) });
export const ignoreIdea      = (tool_id) => apiFetch('/api/ideas/ignore',  { method: 'POST', body: JSON.stringify({ tool_id }) });

// Autonomous Agent
export const triggerAutonomousRun = (options = {}) => apiFetch('/api/autonomous/run', { method: 'POST', body: JSON.stringify(options) });
export const getAutonomousLogs    = (limit = 20, tool_id = null) => {
  const params = new URLSearchParams({ limit });
  if (tool_id) params.set('tool_id', tool_id);
  return apiFetch(`/api/autonomous/logs?${params.toString()}`);
};
export const getLastAutonomousRun = () => apiFetch('/api/autonomous/last-run');

// Optimization
export const analyzeTool                = (tool_id)                    => apiFetch(`/api/optimize/analyze/${tool_id}`, { method: 'POST' });
export const getOptimizationSuggestions = (tool_id, status = null)     => apiFetch(`/api/optimize/suggestions/${tool_id}${status ? `?status=${status}` : ''}`);
export const applySuggestion            = (suggestion_id, notes = null) => apiFetch(`/api/optimize/suggestion/${suggestion_id}/apply`,   { method: 'PATCH', body: JSON.stringify({ notes }) });
export const dismissSuggestion          = (suggestion_id, notes = null) => apiFetch(`/api/optimize/suggestion/${suggestion_id}/dismiss`, { method: 'PATCH', body: JSON.stringify({ notes }) });
export const runOptimizationAll         = ()                            => apiFetch('/api/optimize/run-all', { method: 'POST' });

// Monetization
export const analyzeMonetization   = (tool_id) => apiFetch(`/api/monetize/analyze/${tool_id}`, { method: 'POST' });
export const getMonetizationStrategies = (tool_id, { status, type } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type)   params.set('type', type);
  return apiFetch(`/api/monetize/strategies/${tool_id}${params.toString() ? `?${params.toString()}` : ''}`);
};
export const updateStrategyStatus   = (strategy_id, status, notes = null) => apiFetch(`/api/monetize/strategy/${strategy_id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) });
export const createPricingExperiment = (data)          => apiFetch('/api/monetize/experiment', { method: 'POST', body: JSON.stringify(data) });
export const concludeExperiment      = (experiment_id) => apiFetch(`/api/monetize/experiment/${experiment_id}/conclude`, { method: 'POST' });
export const getExperiments          = (tool_id)       => apiFetch(`/api/monetize/experiments/${tool_id}`);

// Code Generator
export const generateCode   = (tool_id)                    => apiFetch(`/api/codegen/generate/${tool_id}`, { method: 'POST' });
export const getGeneratedCode = (tool_id)                   => apiFetch(`/api/codegen/${tool_id}`);
export const approveCode    = (code_id, reviewer_notes = null) => apiFetch(`/api/codegen/${code_id}/approve`, { method: 'POST', body: JSON.stringify({ reviewer_notes }) });
export const rejectCode     = (code_id, reviewer_notes = null) => apiFetch(`/api/codegen/${code_id}/reject`,  { method: 'POST', body: JSON.stringify({ reviewer_notes }) });

// Revenue Agent
export const getRevenueDashboard    = ()           => apiFetch('/api/revenue-agent/dashboard');
export const runRevenueSnapshot     = ()           => apiFetch('/api/revenue-agent/snapshot', { method: 'POST' });
export const getRevenueHistory      = (days = 30)  => apiFetch(`/api/revenue-agent/history?days=${days}`);
export const getUpsellOpportunities = ({ status = 'identified', limit = 20 } = {}) => apiFetch(`/api/revenue-agent/upsells?status=${status}&limit=${limit}`);
export const findUpsellOpportunities = ()          => apiFetch('/api/revenue-agent/upsells/find', { method: 'POST' });
export const updateUpsellStatus     = (id, status) => apiFetch(`/api/revenue-agent/upsells/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getFailedPayments      = (resolved = false) => apiFetch(`/api/revenue-agent/failed-payments?resolved=${resolved}`);
export const resolveFailedPayment   = (id)         => apiFetch(`/api/revenue-agent/failed-payments/${id}/resolve`, { method: 'PATCH' });
export const getRevenueAlerts       = (acknowledged = false) => apiFetch(`/api/revenue-agent/alerts?acknowledged=${acknowledged}`);
export const acknowledgeRevenueAlert = (id)        => apiFetch(`/api/revenue-agent/alerts/${id}/acknowledge`, { method: 'PATCH' });

// Support Agent
export const getSupportDashboard = () => apiFetch('/api/support/dashboard');
export const getSupportTickets   = (params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/api/support/tickets${qs}`);
};
export const submitSupportTicket = (body) => apiFetch('/api/support/ticket', { method: 'POST', body: JSON.stringify(body) });
