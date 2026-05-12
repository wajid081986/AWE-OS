/**
 * AWE-OS — Multi-Agent Intelligence Service                   Phase 5C
 * Client-side API service for /api/multi-agent/* endpoints.
 */

import api from './api.service';

const BASE = '/api/multi-agent';

// ── Status ────────────────────────────────────────────────────────────────────
export const getMultiAgentStatus = () => api.get(`${BASE}/status`).then(r => r.data);

// ── Agents ────────────────────────────────────────────────────────────────────
export const getAllAgents      = () => api.get(`${BASE}/agents`).then(r => r.data);
export const getAgentProfile   = (agentId) => api.get(`${BASE}/agents/${agentId}`).then(r => r.data);
export const getAgentsByCapability = (capability) => api.get(`${BASE}/capabilities/${capability}`).then(r => r.data);

// ── Collaboration ─────────────────────────────────────────────────────────────
export const startCollaboration = ({ goal, context, requestedCapabilities, coordinatorAgent, maxAgents }) =>
  api.post(`${BASE}/collaborate`, { goal, context, requestedCapabilities, coordinatorAgent, maxAgents }).then(r => r.data);

export const executeCollaboration = (sessionId, { tasks, collectConsensus = true }) =>
  api.post(`${BASE}/collaborate/${sessionId}/execute`, { tasks, collectConsensus }).then(r => r.data);

export const getSessions = ({ status, limit } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit)  params.set('limit', limit);
  return api.get(`${BASE}/sessions?${params.toString()}`).then(r => r.data);
};

export const getSession = (sessionId) => api.get(`${BASE}/sessions/${sessionId}`).then(r => r.data);

// ── Intelligence Pool ─────────────────────────────────────────────────────────
export const contributeIntelligence = ({ agentId, subject, intelligence, tags, confidence }) =>
  api.post(`${BASE}/intelligence/contribute`, { agentId, subject, intelligence, tags, confidence }).then(r => r.data);

export const queryIntelligence = ({ tags = [], limit, minConfidence } = {}) => {
  const params = new URLSearchParams();
  if (tags.length) params.set('tags', tags.join(','));
  if (limit)       params.set('limit', limit);
  if (minConfidence !== undefined) params.set('minConfidence', minConfidence);
  return api.get(`${BASE}/intelligence/query?${params.toString()}`).then(r => r.data);
};

// ── Consensus ─────────────────────────────────────────────────────────────────
export const runConsensusVote = ({ question, candidates, votingAgents, context, threshold }) =>
  api.post(`${BASE}/consensus`, { question, candidates, votingAgents, context, threshold }).then(r => r.data);

export const getConsensusHistory = (limit = 20) =>
  api.get(`${BASE}/consensus/history?limit=${limit}`).then(r => r.data);

// ── Task Delegation ───────────────────────────────────────────────────────────
export const delegateTask = ({ fromAgentId, taskType, payload, priority, context }) =>
  api.post(`${BASE}/delegate`, { fromAgentId, taskType, payload, priority, context }).then(r => r.data);

export const getDelegationHistory = (limit = 20) =>
  api.get(`${BASE}/delegate/history?limit=${limit}`).then(r => r.data);

// ── Dead-Letter Queue ─────────────────────────────────────────────────────────
export const getDLQ   = () => api.get(`${BASE}/messages/dlq`).then(r => r.data);
export const clearDLQ = () => api.delete(`${BASE}/messages/dlq`).then(r => r.data);
