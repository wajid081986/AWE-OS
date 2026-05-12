'use strict';

/**
 * AWE-OS — TaskDelegator                                       Phase 5C
 *
 * Autonomous task delegation engine. Routes tasks to the best-suited agents
 * based on: capability matching, workload, and confidence scores.
 *
 * Design:
 *   - findDelegates(taskType): returns ranked list of capable agents
 *   - delegate(fromAgent, taskType, payload): delegates + persists delegation record
 *   - Delegation goes through AgentCommunicationBus (delegate message type)
 *   - All delegations logged for audit and learning
 *   - Escalation support: if no agent available, escalate to decision-agent
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../../monitoring/logger');

const log = createLogger('task-delegator');

// Capability taxonomy — maps task types to required capabilities
const TASK_CAPABILITY_MAP = Object.freeze({
  build_tool:          'tool_creation',
  generate_code:       'code_generation',
  deploy:              'deployment',
  optimize_performance: 'performance_analysis',
  analyze_revenue:     'revenue_analysis',
  seo_optimize:        'seo_analysis',
  repair:              'debugging',
  analyze_data:        'data_analysis',
  make_decision:       'decision_making',
  retrieve_memory:     'knowledge_retrieval',
  learn_pattern:       'pattern_learning',
  monetize:            'monetization',
  market:              'content_optimization',
  support:             'reporting',
  detect_bottleneck:   'bottleneck_detection',
});

class TaskDelegator {
  constructor() {
    this._agentRegistry = null;
    this._commBus = null;
    this._history = [];   // in-memory delegation log (capped at 200)
    this._initialized = false;
  }

  /**
   * Wire dependencies. Called once at startup.
   */
  init(agentRegistry, commBus) {
    if (this._initialized) return;
    this._initialized = true;
    this._agentRegistry = agentRegistry;
    this._commBus = commBus;
    log.info('TaskDelegator initialized');
  }

  /**
   * Find the best N agents for a task type.
   * Returns agents ranked by (confidence × load-factor).
   *
   * @param {string} taskType  — see TASK_CAPABILITY_MAP
   * @param {number} [count]   — how many delegates to return
   */
  findDelegates(taskType, count = 1) {
    const capability = TASK_CAPABILITY_MAP[taskType] ?? taskType;
    const candidates = this._agentRegistry?.findByCapability(capability) ?? [];

    if (!candidates.length) {
      log.warn('TaskDelegator: no capable agents found', { taskType, capability });
      return [];
    }

    return candidates.slice(0, count);
  }

  /**
   * Delegate a task to the best available agent.
   * Sends a delegate message via AgentCommunicationBus.
   *
   * @param {string} fromAgentId — the delegating agent
   * @param {string} taskType    — task type key
   * @param {object} payload     — task payload
   * @param {object} [options]   — { priority, context, escalateOnFailure }
   * @returns {Promise<DelegationRecord>}
   */
  async delegate(fromAgentId, taskType, payload, options = {}) {
    const delegationId = uuidv4();
    const delegates = this.findDelegates(taskType, 1);

    if (!delegates.length) {
      // Escalate: no capable agent — route to decision-agent
      if (options.escalateOnFailure !== false) {
        return this._escalate(fromAgentId, taskType, payload, delegationId, 'no_capable_agent');
      }
      const err = new Error(`No agent capable of "${taskType}"`);
      err.code = 'NO_CAPABLE_AGENT';
      throw err;
    }

    const target = delegates[0];
    const record = {
      delegationId,
      fromAgent:    fromAgentId,
      toAgent:      target.agentId,
      taskType,
      capability:   TASK_CAPABILITY_MAP[taskType] ?? taskType,
      payload,
      priority:     options.priority ?? 'normal',
      status:       'delegated',
      delegatedAt:  new Date().toISOString(),
      confidence:   target.confidenceScore,
    };

    // Send delegation message
    await this._commBus?.send(fromAgentId, target.agentId, 'delegate', {
      delegationId,
      taskType,
      payload,
      priority: options.priority ?? 'normal',
      context:  options.context ?? {},
    }, { metadata: { delegationId } });

    // Update delegation history
    this._history.unshift(record);
    if (this._history.length > 200) this._history.pop();

    log.info('Task delegated', {
      delegationId,
      from: fromAgentId,
      to:   target.agentId,
      task: taskType,
    });

    return record;
  }

  /**
   * Get delegation history.
   */
  getDelegationHistory(limit = 50) {
    return this._history.slice(0, limit);
  }

  getStats() {
    const total = this._history.length;
    const escalations = this._history.filter(r => r.status === 'escalated').length;
    return {
      totalDelegations: total,
      escalations,
      successRate: total > 0
        ? Math.round(((total - escalations) / total) * 100)
        : null,
      supportedTaskTypes: Object.keys(TASK_CAPABILITY_MAP),
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async _escalate(fromAgentId, taskType, payload, delegationId, reason) {
    const record = {
      delegationId,
      fromAgent:  fromAgentId,
      toAgent:    'decision-agent',
      taskType,
      capability: 'decision_making',
      payload,
      status:     'escalated',
      escalationReason: reason,
      delegatedAt: new Date().toISOString(),
      confidence: 0.5,
    };

    await this._commBus?.send(fromAgentId, 'decision-agent', 'escalate', {
      delegationId,
      originalTaskType: taskType,
      escalationReason: reason,
      payload,
    });

    this._history.unshift(record);
    log.warn('Task escalated', { delegationId, from: fromAgentId, task: taskType, reason });
    return record;
  }
}

const taskDelegator = new TaskDelegator();

module.exports = { TaskDelegator, taskDelegator, TASK_CAPABILITY_MAP };
