'use strict';

/**
 * AWE-OS — CollaborativeOrchestrator                           Phase 5C
 *
 * Orchestrates multi-agent collaborative execution sessions.
 * A session has a goal, multiple participating agents, and aggregated results.
 *
 * Architecture:
 *   1. startSession(goal, context, options) → creates session, selects agents
 *   2. executeCollaborative(sessionId, tasks) → distributes tasks to agents
 *   3. Each agent contributes results back via AgentCommunicationBus
 *   4. Results are merged and shared to IntelligencePool
 *   5. Session status tracked in DB (collaboration_sessions)
 *
 * Example flow:
 *   BuilderAgent → asks SEOAgent for SEO strategy
 *               → asks RevenueAgent for monetization advice
 *               → asks OptimizationAgent for performance review
 *   All results merged → shared to IntelligencePool
 *
 * Safety:
 *   - All sessions have a 5-minute timeout
 *   - Failed tasks don't fail the session (partial success supported)
 *   - No live code execution — orchestrates at the intelligence/messaging layer
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../../monitoring/logger');

const log = createLogger('collab-orchestrator');

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes max per session
const SESSION_CACHE_MAX  = 50;

class CollaborativeOrchestrator {
  constructor() {
    this._sessions  = new Map();   // sessionId → session
    this._agentRegistry  = null;
    this._commBus = null;
    this._intelligencePool = null;
    this._agentConsensus  = null;
    this._bus = null;
    this._sessionCount = 0;
    this._initialized  = false;
  }

  /**
   * Wire dependencies. Called once at startup.
   */
  init(agentRegistry, commBus, intelligencePool, agentConsensus, bus) {
    if (this._initialized) return;
    this._initialized = true;
    this._agentRegistry  = agentRegistry;
    this._commBus = commBus;
    this._intelligencePool = intelligencePool;
    this._agentConsensus  = agentConsensus;
    this._bus = bus;
    log.info('CollaborativeOrchestrator initialized');
  }

  /**
   * Start a multi-agent collaboration session.
   *
   * @param {string}   goal     — what the session is trying to accomplish
   * @param {object}   context  — task context/payload
   * @param {object}   [options]
   * @param {string}   [options.coordinatorAgent]       — agent that coordinates (default: decision-agent)
   * @param {string[]} [options.requestedCapabilities]  — capabilities to involve
   * @param {number}   [options.maxAgents]              — max agents to recruit (default: 5)
   * @returns {Promise<CollaborationSession>}
   */
  async startSession(goal, context = {}, options = {}) {
    const sessionId = `session_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const coordinatorAgent = options.coordinatorAgent ?? 'decision-agent';
    const maxAgents = options.maxAgents ?? 5;
    const requestedCapabilities = options.requestedCapabilities ?? [];

    // Select participating agents
    const participants = [];
    for (const capability of requestedCapabilities) {
      if (participants.length >= maxAgents) break;
      const agent = this._agentRegistry?.getBestAgent(capability);
      if (agent && !participants.find(p => p.agentId === agent.agentId)) {
        participants.push({
          agentId:   agent.agentId,
          role:      agent.role,
          capability,
          status:    'assigned',
          result:    null,
          startedAt: null,
          completedAt: null,
        });
      }
    }

    const session = {
      sessionId,
      goal,
      context,
      coordinatorAgent,
      participants,
      status:    'active',
      taskCount: 0,
      completedTasks: 0,
      failedTasks:    0,
      results:  {},
      intelligenceContributions: 0,
      consensusReached: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      timeoutHandle: null,
    };

    // Set session timeout
    session.timeoutHandle = setTimeout(() => {
      this._expireSession(sessionId);
    }, SESSION_TIMEOUT_MS);

    this._sessions.set(sessionId, session);
    this._sessionCount++;

    // Persist session record
    setImmediate(() => this._persistSession(session).catch(() => {}));

    // Emit session start event
    this._bus?.emit('collab.session.started', {
      sessionId,
      goal,
      participantCount: participants.length,
      participants: participants.map(p => p.agentId),
    }, { source: 'collab-orchestrator', persist: false });

    log.info('Collaboration session started', {
      sessionId,
      goal: goal.slice(0, 80),
      participants: participants.length,
    });

    return { sessionId, participants, coordinatorAgent, goal, status: 'active' };
  }

  /**
   * Execute a set of collaborative tasks within a session.
   * Tasks are distributed to the best-matched participants.
   * Returns merged results after all tasks complete (or timeout).
   *
   * @param {string}   sessionId
   * @param {object[]} tasks      — [{ capability, payload, label }]
   * @param {object}   [options]  — { timeoutMs, collectConsensus }
   */
  async executeCollaborative(sessionId, tasks = [], options = {}) {
    const session = this._sessions.get(sessionId);
    if (!session) throw Object.assign(new Error(`Session not found: ${sessionId}`), { code: 'SESSION_NOT_FOUND' });
    if (session.status !== 'active') throw Object.assign(new Error(`Session ${sessionId} is ${session.status}`), { code: 'SESSION_INACTIVE' });

    session.taskCount = tasks.length;

    // Execute all tasks in parallel (each agent works independently)
    const taskResults = await Promise.allSettled(
      tasks.map(task => this._executeTask(session, task, options.timeoutMs))
    );

    // Collect results
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const result = taskResults[i];
      const label = task.label ?? task.capability;

      if (result.status === 'fulfilled') {
        session.results[label] = result.value;
        session.completedTasks++;
      } else {
        session.results[label] = { error: result.reason?.message ?? 'Task failed', failed: true };
        session.failedTasks++;
      }
    }

    // Optional: run consensus vote on results
    if (options.collectConsensus && Object.keys(session.results).length > 1) {
      const candidates = Object.keys(session.results).filter(k => !session.results[k].failed);
      if (candidates.length >= 2) {
        const agentIds = session.participants.map(p => p.agentId);
        const consensus = await this._agentConsensus?.vote(
          `Which result is most valuable for: "${session.goal}"?`,
          candidates,
          agentIds,
          session.context
        ).catch(() => null);

        if (consensus) session.consensusReached = consensus.outcome;
      }
    }

    // Share aggregated intelligence to pool
    if (Object.keys(session.results).length > 0) {
      await this._intelligencePool?.contribute(
        session.coordinatorAgent,
        `collab:${session.goal.slice(0, 50)}`,
        session.results,
        ['collaboration', ...session.participants.map(p => p.agentId)],
        { confidence: 0.75 }
      ).catch(() => {});
      session.intelligenceContributions++;
    }

    // Complete session
    clearTimeout(session.timeoutHandle);
    session.status = 'completed';
    session.completedAt = new Date().toISOString();

    // Emit completion
    this._bus?.emit('collab.session.completed', {
      sessionId,
      goal: session.goal,
      completedTasks: session.completedTasks,
      failedTasks: session.failedTasks,
    }, { source: 'collab-orchestrator', persist: false });

    // Update DB record
    setImmediate(() => this._updateSession(session).catch(() => {}));

    log.info('Collaboration session completed', {
      sessionId,
      completed: session.completedTasks,
      failed: session.failedTasks,
    });

    return {
      sessionId,
      goal:      session.goal,
      results:   session.results,
      completedTasks: session.completedTasks,
      failedTasks:    session.failedTasks,
      consensusReached: session.consensusReached,
      status: 'completed',
    };
  }

  /**
   * Request intelligence from a specific agent type via the communication bus.
   * Used for single-agent "ask" patterns (BuilderAgent → SEOAgent).
   *
   * @param {string} fromAgentId    — requesting agent
   * @param {string} targetCapability — what capability we need
   * @param {object} requestPayload — what we're asking
   * @param {number} [timeoutMs]
   */
  async requestAgentIntelligence(fromAgentId, targetCapability, requestPayload, timeoutMs = 8_000) {
    const targetAgent = this._agentRegistry?.getBestAgent(targetCapability);
    if (!targetAgent) {
      log.warn('No agent for capability', { capability: targetCapability });
      return null;
    }

    try {
      // Check IntelligencePool first (avoid redundant messaging)
      const poolResult = await this._intelligencePool?.query(
        [targetCapability, fromAgentId],
        { limit: 1, minConfidence: 0.6 }
      );

      if (poolResult?.length > 0) {
        log.debug('Intelligence served from pool', { capability: targetCapability });
        return poolResult[0].intelligence;
      }

      // Fall back to direct messaging
      const reply = await this._commBus?.request(
        fromAgentId,
        targetAgent.agentId,
        { capability: targetCapability, ...requestPayload },
        timeoutMs
      ).catch(err => {
        log.warn('Agent intelligence request failed', { error: err.message });
        return null;
      });

      return reply;
    } catch (err) {
      log.warn('requestAgentIntelligence failed', { error: err.message });
      return null;
    }
  }

  getSession(sessionId)   { return this._sessions.get(sessionId) ?? null; }
  getActiveSessions()     { return [...this._sessions.values()].filter(s => s.status === 'active'); }
  getCompletedSessions(n) { return [...this._sessions.values()].filter(s => s.status !== 'active').slice(-n); }

  getStats() {
    const sessions = [...this._sessions.values()];
    const completed = sessions.filter(s => s.status === 'completed');
    const failed    = sessions.filter(s => s.status === 'failed');

    return {
      totalSessions:     this._sessionCount,
      activeSessions:    this.getActiveSessions().length,
      completedSessions: completed.length,
      failedSessions:    failed.length,
      successRate: completed.length + failed.length > 0
        ? Math.round((completed.length / (completed.length + failed.length)) * 100)
        : null,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  async _executeTask(session, task, timeoutMs = 30_000) {
    const { capability, payload, label } = task;
    const participant = session.participants.find(p => p.capability === capability);
    const agentId = participant?.agentId ?? this._agentRegistry?.getBestAgent(capability)?.agentId;

    if (!agentId) throw new Error(`No agent for capability: ${capability}`);

    participant && (participant.status = 'working', participant.startedAt = new Date().toISOString());

    // Emit task start
    this._bus?.emit('collaboration.task.started', { agentId, taskType: capability, sessionId: session.sessionId }, { persist: false });

    try {
      // First: check IntelligencePool for existing intelligence
      const poolHit = await this._intelligencePool?.query([capability], { limit: 1, minConfidence: 0.6 });
      let result;

      if (poolHit?.length > 0) {
        result = { source: 'intelligence_pool', data: poolHit[0].intelligence, fromPool: true };
      } else {
        // Generate intelligence via the agent's "profile-based analysis"
        result = await this._generateAgentResponse(agentId, capability, payload, session.context);
      }

      if (participant) { participant.status = 'completed'; participant.completedAt = new Date().toISOString(); participant.result = result; }

      this._bus?.emit('collaboration.task.completed', { agentId, capability, sessionId: session.sessionId }, { persist: false });

      return result;
    } catch (err) {
      if (participant) participant.status = 'failed';
      this._bus?.emit('collaboration.task.failed', { agentId, capability, error: err.message, sessionId: session.sessionId }, { persist: false });
      throw err;
    }
  }

  /**
   * Generate an agent's contribution based on its profile and context.
   * This derives intelligence from the agent's specialization + IntelligencePool,
   * without calling external AI APIs (keeps it fast and non-blocking).
   */
  async _generateAgentResponse(agentId, capability, payload, context) {
    const profile = this._agentRegistry?.getProfile(agentId);
    if (!profile) return { agentId, capability, analysis: 'Agent profile not found', confidence: 0 };

    // Pull relevant memories for this agent's specialization
    const memories = await this._intelligencePool?.query(
      [capability, profile.specialization],
      { limit: 3, minConfidence: 0.4 }
    ) ?? [];

    return {
      agentId,
      capability,
      agentRole:      profile.role,
      specialization: profile.specialization,
      confidence:     profile.confidenceScore,
      analysis:       `${profile.role} analysis for capability "${capability}"`,
      context_used:   Object.keys(context ?? {}).length,
      memory_hits:    memories.length,
      recommendations: memories.map(m => ({
        subject: m.subject,
        confidence: m.confidence,
        insight: m.intelligence?.suggestion ?? m.intelligence?.content ?? 'See intelligence payload',
      })),
      payload_received: payload ?? null,
    };
  }

  _expireSession(sessionId) {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'active') return;
    session.status = 'failed';
    session.completedAt = new Date().toISOString();
    log.warn('Session expired', { sessionId, goal: session.goal?.slice(0, 60) });
    this._bus?.emit('collab.session.failed', { sessionId, reason: 'timeout' }, { persist: false });
    setImmediate(() => this._updateSession(session).catch(() => {}));
  }

  async _persistSession(session) {
    try {
      const supabase = require('../../db/supabase');
      await supabase.from('collaboration_sessions').insert({
        session_id:             session.sessionId,
        goal:                   session.goal,
        coordinator_agent:      session.coordinatorAgent,
        status:                 session.status,
        requested_capabilities: session.participants.map(p => p.capability),
        participant_count:      session.participants.length,
        context:                session.context ?? {},
        started_at:             session.startedAt,
      });

      // Insert participants
      for (const p of session.participants) {
        await supabase.from('collaboration_participants').insert({
          session_id:          session.sessionId,
          agent_id:            p.agentId,
          assigned_capability: p.capability,
          status:              p.status ?? 'assigned',
        });
      }
    } catch (_) {}
  }

  async _updateSession(session) {
    try {
      const supabase = require('../../db/supabase');
      const startTs  = session.startedAt  ? new Date(session.startedAt).getTime()  : null;
      const endTs    = session.completedAt ? new Date(session.completedAt).getTime() : null;

      await supabase.from('collaboration_sessions').update({
        status:            session.status,
        task_count:        session.taskCount,
        completed_tasks:   session.completedTasks,
        failed_tasks:      session.failedTasks,
        results:           session.results ?? {},
        intelligence_shared: session.intelligenceContributions,
        consensus_reached: session.consensusReached !== null ? !!session.consensusReached : null,
        duration_ms:       startTs && endTs ? endTs - startTs : null,
        completed_at:      session.completedAt,
        updated_at:        new Date().toISOString(),
      }).eq('session_id', session.sessionId);
    } catch (_) {}
  }
}

const collaborativeOrchestrator = new CollaborativeOrchestrator();

module.exports = { CollaborativeOrchestrator, collaborativeOrchestrator };
