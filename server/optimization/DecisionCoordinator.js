'use strict';

/**
 * AWE-OS — DecisionCoordinator                                 Phase 5D
 *
 * AI-powered decision intelligence engine. Coordinates complex decisions
 * by combining agent consensus, optimization intelligence, and memory recall.
 *
 * Use cases:
 *   - Should this tool be published or need repair?
 *   - Should we apply an optimization recommendation?
 *   - Which pipeline configuration is optimal?
 *   - Should an agent task be delegated or executed directly?
 *
 * Decision process:
 *   1. Retrieve relevant memories from IntelligencePool
 *   2. Get agent consensus vote on options
 *   3. Apply confidence weighting
 *   4. Generate structured recommendation with reasoning
 *   5. Persist to decision_history for audit
 *
 * All decisions are advisory — humans retain final authority.
 * No autonomous action is taken without explicit operator approval.
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../monitoring/logger');

const log = createLogger('decision-coordinator');

class DecisionCoordinator {
  constructor() {
    this._agentConsensus  = null;
    this._intelligencePool = null;
    this._agentRegistry   = null;
    this._history = [];
    this._initialized = false;
  }

  /**
   * Wire dependencies. Called once at startup.
   */
  init(agentConsensus, intelligencePool, agentRegistry) {
    if (this._initialized) return;
    this._initialized = true;
    this._agentConsensus   = agentConsensus;
    this._intelligencePool = intelligencePool;
    this._agentRegistry    = agentRegistry;
    log.info('DecisionCoordinator initialized');
  }

  /**
   * Coordinate a decision across the agent network.
   *
   * @param {object} params
   * @param {string}   params.decisionType  — lifecycle | optimization | delegation | configuration
   * @param {string}   params.question      — the decision question
   * @param {string[]} params.options       — possible choices
   * @param {object}   [params.context]     — relevant context
   * @param {string[]} [params.agentIds]    — which agents to consult (auto-selected if omitted)
   * @param {object}   [opts]               — { confidenceRequired, persist }
   */
  async coordinate(params, opts = {}) {
    const { decisionType, question, options, context = {} } = params;
    const decisionId = `dec_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    if (!options?.length) throw new Error('DecisionCoordinator.coordinate: options array is required');

    // 1. Select voting agents based on decision type
    const agentIds = params.agentIds ?? this._selectAgents(decisionType);

    // 2. Retrieve relevant intelligence
    const intelligenceTags = [decisionType, ...this._extractTags(context, question)];
    const relevantIntel = await this._intelligencePool
      ?.query(intelligenceTags, { limit: 5, minConfidence: 0.4 })
      .catch(() => []) ?? [];

    // 3. Run consensus vote
    let consensus = null;
    if (agentIds.length > 0 && this._agentConsensus) {
      consensus = await this._agentConsensus.vote(
        question,
        options,
        agentIds,
        { ...context, relevantIntel: relevantIntel.length },
        { threshold: opts.confidenceRequired ?? 0.55 }
      ).catch(err => {
        log.warn('Consensus vote failed in coordinator', { error: err.message });
        return null;
      });
    }

    // 4. Build decision result
    const outcome      = consensus?.outcome ?? options[0];
    const confidence   = consensus?.confidence ?? 0.5;
    const highConf     = confidence >= (opts.confidenceRequired ?? 0.55);

    const result = {
      decisionId,
      decisionType,
      question,
      options,
      outcome,
      confidence,
      highConfidence:   highConf,
      participatingAgents: agentIds,
      voteSummary:      consensus?.allScores ?? {},
      intelligenceUsed: relevantIntel.length,
      consensusReached: consensus?.consensusReached ?? false,
      context,
      reasoning:        this._buildReasoning(outcome, confidence, relevantIntel),
      timestamp:        new Date().toISOString(),
    };

    // 5. Store in history
    this._history.unshift(result);
    if (this._history.length > 200) this._history.pop();

    // 6. Persist asynchronously
    if (opts.persist !== false) {
      setImmediate(() => this._persist(result).catch(() => {}));
    }

    log.info('Decision coordinated', {
      decisionId,
      type:      decisionType,
      outcome,
      confidence,
      highConf,
    });

    return result;
  }

  /**
   * Convenience: decide tool lifecycle (publish vs repair vs kill vs monitor).
   */
  async decideToolLifecycle(toolId, toolStats, context = {}) {
    return this.coordinate({
      decisionType: 'lifecycle',
      question:     `What is the optimal action for tool "${toolId}"?`,
      options:      ['publish', 'repair', 'monitor', 'pause'],
      context:      { toolId, ...toolStats, ...context },
    });
  }

  /**
   * Convenience: decide whether to apply an optimization recommendation.
   */
  async decideOptimization(recommendation, context = {}) {
    return this.coordinate({
      decisionType: 'optimization',
      question:     `Should we apply: "${recommendation.title}"?`,
      options:      ['apply', 'defer', 'reject'],
      context:      { recommendation, ...context },
    });
  }

  getHistory(limit = 50) { return this._history.slice(0, limit); }

  async getStats() {
    const total   = this._history.length;
    const highConf = this._history.filter(d => d.highConfidence).length;
    return {
      totalDecisions:    total,
      highConfidenceRate: total > 0 ? Math.round((highConf / total) * 100) : null,
      avgConfidence:     total > 0
        ? Math.round(this._history.reduce((s, d) => s + d.confidence, 0) / total * 100) / 100
        : null,
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  _selectAgents(decisionType) {
    const typeAgentMap = {
      lifecycle:     ['decision-agent', 'analytics-agent', 'optimization-agent'],
      optimization:  ['optimization-agent', 'decision-agent', 'analytics-agent'],
      delegation:    ['decision-agent', 'memory-agent'],
      configuration: ['optimization-agent', 'decision-agent', 'learning-agent'],
    };
    return typeAgentMap[decisionType] ?? ['decision-agent'];
  }

  _extractTags(context, question) {
    const tags = [];
    const words = (question + ' ' + JSON.stringify(context)).toLowerCase().split(/\W+/);
    const keywords = ['tool', 'pipeline', 'optimization', 'repair', 'deploy', 'publish', 'revenue', 'seo'];
    for (const kw of keywords) {
      if (words.includes(kw)) tags.push(kw);
    }
    return tags.slice(0, 5);
  }

  _buildReasoning(outcome, confidence, relevantIntel) {
    const confLabel = confidence >= 0.80 ? 'high' : confidence >= 0.60 ? 'medium' : 'low';
    const intelNote = relevantIntel.length > 0
      ? ` ${relevantIntel.length} memory record(s) consulted.`
      : ' No prior intelligence available.';
    return `Decision: "${outcome}" with ${confLabel} confidence (${(confidence * 100).toFixed(0)}%).${intelNote}`;
  }

  async _persist(result) {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('decision_history').insert({
        decision_id:         result.decisionId,
        decision_type:       result.decisionType,
        question:            result.question,
        options:             result.options,
        outcome:             result.outcome,
        confidence:          result.confidence,
        participating_agents: result.participatingAgents,
        vote_summary:        result.voteSummary,
        context:             result.context ?? {},
        applied:             false,
        created_at:          result.timestamp,
      });
    } catch (_) {}
  }
}

const decisionCoordinator = new DecisionCoordinator();

module.exports = { DecisionCoordinator, decisionCoordinator };
