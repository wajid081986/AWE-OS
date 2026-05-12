'use strict';

/**
 * AWE-OS — Multi-Agent Intelligence Routes                     Phase 5C
 *
 * Admin-only endpoints for the Multi-Agent Intelligence Engine.
 *
 *  GET  /api/multi-agent/status            — agent registry + bus stats
 *  GET  /api/multi-agent/agents            — all agent profiles + metrics
 *  GET  /api/multi-agent/agents/:id        — single agent profile
 *  GET  /api/multi-agent/capabilities/:cap — find agents by capability
 *  POST /api/multi-agent/collaborate       — start a collaboration session
 *  POST /api/multi-agent/collaborate/:id/execute — execute tasks in a session
 *  GET  /api/multi-agent/sessions          — active/recent sessions
 *  GET  /api/multi-agent/sessions/:id      — session detail
 *  POST /api/multi-agent/intelligence/contribute — contribute to intelligence pool
 *  GET  /api/multi-agent/intelligence/query      — query intelligence pool
 *  POST /api/multi-agent/consensus         — run a consensus vote
 *  GET  /api/multi-agent/consensus/history — consensus vote history
 *  POST /api/multi-agent/delegate          — delegate a task
 *  GET  /api/multi-agent/delegate/history  — delegation history
 *  GET  /api/multi-agent/messages/dlq      — dead-letter queue
 *  DELETE /api/multi-agent/messages/dlq    — clear dead-letter queue
 */

const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const {
  agentRegistry,
  agentCommBus,
  intelligencePool,
  agentConsensus,
  taskDelegator,
  collaborativeOrchestrator,
} = require('../agents/multi-agent');

const router = express.Router();

// All multi-agent routes require admin
router.use(requireAuth, requireAdmin);

// ── GET /api/multi-agent/status ──────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const [registryStats, busStats, poolStats, consensusStats, delegatorStats, orchStats] =
      await Promise.allSettled([
        Promise.resolve(agentRegistry.getStats()),
        Promise.resolve(agentCommBus.getStats()),
        intelligencePool.getStats(),
        agentConsensus.getStats(),
        Promise.resolve(taskDelegator.getStats()),
        Promise.resolve(collaborativeOrchestrator.getStats()),
      ]);

    res.json({
      success: true,
      data: {
        registry:      registryStats.status  === 'fulfilled' ? registryStats.value  : null,
        commBus:       busStats.status        === 'fulfilled' ? busStats.value        : null,
        intelligence:  poolStats.status       === 'fulfilled' ? poolStats.value       : null,
        consensus:     consensusStats.status  === 'fulfilled' ? consensusStats.value  : null,
        delegator:     delegatorStats.status  === 'fulfilled' ? delegatorStats.value  : null,
        orchestrator:  orchStats.status       === 'fulfilled' ? orchStats.value       : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/agents ──────────────────────────────────────────────
router.get('/agents', (req, res) => {
  try {
    const agents = agentRegistry.getAll();
    res.json({ success: true, data: agents, count: agents.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/agents/:id ─────────────────────────────────────────
router.get('/agents/:id', (req, res) => {
  try {
    const profile = agentRegistry.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/capabilities/:cap ───────────────────────────────────
router.get('/capabilities/:cap', (req, res) => {
  try {
    const agents = agentRegistry.findByCapability(req.params.cap);
    res.json({ success: true, data: agents, count: agents.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/multi-agent/collaborate ────────────────────────────────────────
router.post('/collaborate', async (req, res) => {
  const { goal, context, requestedCapabilities, coordinatorAgent, maxAgents } = req.body;
  if (!goal) return res.status(400).json({ success: false, error: 'goal is required' });

  try {
    const session = await collaborativeOrchestrator.startSession(
      goal,
      context ?? {},
      { requestedCapabilities: requestedCapabilities ?? [], coordinatorAgent, maxAgents }
    );
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/multi-agent/collaborate/:id/execute ─────────────────────────────
router.post('/collaborate/:id/execute', async (req, res) => {
  const { tasks, collectConsensus } = req.body;
  if (!Array.isArray(tasks)) return res.status(400).json({ success: false, error: 'tasks array required' });

  try {
    const result = await collaborativeOrchestrator.executeCollaborative(
      req.params.id,
      tasks,
      { collectConsensus: collectConsensus !== false }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.code === 'SESSION_NOT_FOUND' ? 404
      : err.code === 'SESSION_INACTIVE' ? 409 : 500;
    res.status(status).json({ success: false, error: err.message, code: err.code });
  }
});

// ── GET /api/multi-agent/sessions ─────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const status = req.query.status;

    let sessions;
    if (status === 'active') {
      sessions = collaborativeOrchestrator.getActiveSessions();
    } else {
      const supabase = require('../db/supabase');
      let q = supabase.from('collaboration_sessions').select('*').order('started_at', { ascending: false }).limit(limit);
      if (status) q = q.eq('status', status);
      const { data } = await q;
      sessions = data ?? [];
    }

    res.json({ success: true, data: sessions, count: sessions.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/sessions/:id ─────────────────────────────────────────
router.get('/sessions/:id', async (req, res) => {
  try {
    // Check in-memory first (active sessions)
    const inMemory = collaborativeOrchestrator.getSession(req.params.id);
    if (inMemory) return res.json({ success: true, data: inMemory });

    // Fall back to DB
    const supabase = require('../db/supabase');
    const { data: session } = await supabase.from('collaboration_sessions').select('*').eq('session_id', req.params.id).single();
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const { data: participants } = await supabase.from('collaboration_participants').select('*').eq('session_id', req.params.id);
    res.json({ success: true, data: { ...session, participants: participants ?? [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/multi-agent/intelligence/contribute ─────────────────────────────
router.post('/intelligence/contribute', async (req, res) => {
  const { agentId, subject, intelligence, tags, confidence, ttlMs } = req.body;
  if (!agentId || !subject || !intelligence) {
    return res.status(400).json({ success: false, error: 'agentId, subject, intelligence required' });
  }

  try {
    const entry = await intelligencePool.contribute(agentId, subject, intelligence, tags ?? [], { confidence, ttlMs });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/intelligence/query ───────────────────────────────────
router.get('/intelligence/query', async (req, res) => {
  const tags  = req.query.tags  ? req.query.tags.split(',').map(t => t.trim()) : [];
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const minConf = Number(req.query.minConfidence) || 0.3;

  try {
    const results = await intelligencePool.query(tags, { limit, minConfidence: minConf });
    res.json({ success: true, data: results, count: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/multi-agent/consensus ──────────────────────────────────────────
router.post('/consensus', async (req, res) => {
  const { question, candidates, votingAgents, context, threshold } = req.body;
  if (!question || !candidates?.length || !votingAgents?.length) {
    return res.status(400).json({ success: false, error: 'question, candidates, votingAgents required' });
  }

  try {
    const result = await agentConsensus.vote(question, candidates, votingAgents, context ?? {}, { threshold });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/consensus/history ────────────────────────────────────
router.get('/consensus/history', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const history = agentConsensus.getHistory(limit);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/multi-agent/delegate ────────────────────────────────────────────
router.post('/delegate', async (req, res) => {
  const { fromAgentId, taskType, payload, priority, context } = req.body;
  if (!fromAgentId || !taskType) {
    return res.status(400).json({ success: false, error: 'fromAgentId and taskType required' });
  }

  try {
    const record = await taskDelegator.delegate(fromAgentId, taskType, payload ?? {}, { priority, context });
    res.json({ success: true, data: record });
  } catch (err) {
    const status = err.code === 'NO_CAPABLE_AGENT' ? 422 : 500;
    res.status(status).json({ success: false, error: err.message, code: err.code });
  }
});

// ── GET /api/multi-agent/delegate/history ─────────────────────────────────────
router.get('/delegate/history', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const history = taskDelegator.getDelegationHistory(limit);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/multi-agent/messages/dlq ─────────────────────────────────────────
router.get('/messages/dlq', (req, res) => {
  try {
    const dlq = agentCommBus.getDLQ();
    res.json({ success: true, data: dlq, count: dlq.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/multi-agent/messages/dlq ─────────────────────────────────────
router.delete('/messages/dlq', (req, res) => {
  try {
    agentCommBus.clearDLQ();
    res.json({ success: true, message: 'DLQ cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
