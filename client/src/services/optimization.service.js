/**
 * AWE-OS — Self-Optimization Service                          Phase 5D
 * Client-side API service for /api/self-optimize/* endpoints.
 */

import api from './api.service';

const BASE = '/api/self-optimize';

// ── Status ────────────────────────────────────────────────────────────────────
export const getOptimizationStatus = () => api.get(`${BASE}/status`).then(r => r.data);

// ── Bottlenecks ───────────────────────────────────────────────────────────────
export const getBottlenecks = () => api.get(`${BASE}/bottlenecks`).then(r => r.data);

export const getOptimizationEvents = ({ limit, unresolved, source } = {}) => {
  const params = new URLSearchParams();
  if (limit)      params.set('limit', limit);
  if (unresolved) params.set('unresolved', 'true');
  if (source)     params.set('source', source);
  return api.get(`${BASE}/events?${params.toString()}`).then(r => r.data);
};

// ── Recommendations ───────────────────────────────────────────────────────────
export const getRecommendations = ({ limit, minConfidence, priority, source } = {}) => {
  const params = new URLSearchParams();
  if (limit)         params.set('limit', limit);
  if (minConfidence) params.set('minConfidence', minConfidence);
  if (priority)      params.set('priority', priority);
  if (source)        params.set('source', source);
  return api.get(`${BASE}/recommendations?${params.toString()}`).then(r => r.data);
};

export const getAutoApplicableRecommendations = ({ limit, minConfidence } = {}) => {
  const params = new URLSearchParams();
  if (limit)         params.set('limit', limit);
  if (minConfidence) params.set('minConfidence', minConfidence);
  return api.get(`${BASE}/recommendations/auto?${params.toString()}`).then(r => r.data);
};

export const applyRecommendation   = (id) => api.post(`${BASE}/recommendations/${id}/apply`).then(r => r.data);
export const dismissRecommendation = (id, reason = '') =>
  api.post(`${BASE}/recommendations/${id}/dismiss`, { reason }).then(r => r.data);

// ── Analysis ──────────────────────────────────────────────────────────────────
export const runAnalysisCycle = () => api.post(`${BASE}/analyze`).then(r => r.data);

// ── Tuning ────────────────────────────────────────────────────────────────────
export const getTuningHistory = ({ limit, source } = {}) => {
  const params = new URLSearchParams();
  if (limit)  params.set('limit', limit);
  if (source) params.set('source', source);
  return api.get(`${BASE}/tuning/history?${params.toString()}`).then(r => r.data);
};

export const rollbackTuning    = (id, reason = '') =>
  api.post(`${BASE}/tuning/${id}/rollback`, { reason }).then(r => r.data);

export const toggleAutonomousTuner = (enabled) =>
  api.put(`${BASE}/tuning/toggle`, { enabled }).then(r => r.data);

export const resetCircuitBreaker = () =>
  api.post(`${BASE}/tuning/reset-breaker`).then(r => r.data);

// ── Decisions ─────────────────────────────────────────────────────────────────
export const getDecisionHistory = ({ limit, source } = {}) => {
  const params = new URLSearchParams();
  if (limit)  params.set('limit', limit);
  if (source) params.set('source', source);
  return api.get(`${BASE}/decisions?${params.toString()}`).then(r => r.data);
};

export const coordinateDecision = ({ decisionType, question, options, context, agentIds }) =>
  api.post(`${BASE}/decisions/coordinate`, { decisionType, question, options, context, agentIds }).then(r => r.data);
