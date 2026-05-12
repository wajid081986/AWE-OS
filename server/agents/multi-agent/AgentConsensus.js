'use strict';

/**
 * AWE-OS — AgentConsensus                                      Phase 5C
 *
 * Weighted consensus / voting system for multi-agent decisions.
 * Each agent casts a vote weighted by its current confidence score.
 * Consensus is reached when weighted votes for a single option exceed threshold.
 *
 * Design:
 *   - Agents vote based on their specialization affinity for the question
 *   - Vote weight = agent.confidenceScore (0-1)
 *   - Consensus threshold = 0.6 by default (configurable)
 *   - Conflict resolution: highest weighted option wins; tie → no consensus
 *   - All votes persisted to consensus_votes table for audit
 *   - Never blocks: no network calls in the hot path
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-consensus');

const DEFAULT_THRESHOLD = 0.60;  // 60% weighted confidence for consensus
const CONSENSUS_TIMEOUT_MS = 5_000;

class AgentConsensus {
  constructor() {
    this._agentRegistry  = null;
    this._bus = null;
    this._voteHistory = [];  // recent votes in-memory (capped)
    this._initialized = false;
  }

  /**
   * Wire dependencies. Called once at startup.
   */
  init(agentRegistry, bus) {
    if (this._initialized) return;
    this._initialized = true;
    this._agentRegistry = agentRegistry;
    this._bus = bus;
    log.info('AgentConsensus initialized');
  }

  /**
   * Run a weighted consensus vote across specified agents.
   *
   * @param {string}   question       — the decision question
   * @param {string[]} candidates     — options/candidates to vote on
   * @param {string[]} votingAgentIds — which agents participate
   * @param {object}   context        — task context for vote reasoning
   * @param {object}   [options]      — { threshold, timeoutMs, minVoters }
   * @returns {Promise<ConsensusResult>}
   */
  async vote(question, candidates, votingAgentIds, context = {}, options = {}) {
    const voteId    = uuidv4();
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const minVoters = options.minVoters ?? 1;

    if (!candidates.length) throw new Error('AgentConsensus.vote: candidates array is empty');
    if (!votingAgentIds.length) throw new Error('AgentConsensus.vote: no voting agents specified');

    // Collect weighted votes from each agent
    const votes = [];
    for (const agentId of votingAgentIds) {
      const profile = this._agentRegistry?.getProfile(agentId);
      if (!profile) continue;

      const vote = this._deriveVote(agentId, profile, candidates, context);
      votes.push({
        agentId,
        vote:       vote.choice,
        weight:     profile.confidenceScore ?? 0.5,
        reasoning:  vote.reasoning,
        confidence: profile.confidenceScore ?? 0.5,
      });
    }

    if (votes.length < minVoters) {
      log.warn('AgentConsensus: insufficient voters', { voteId, needed: minVoters, got: votes.length });
    }

    const result = this._calculateConsensus(votes, candidates, threshold);

    const consensusResult = {
      voteId,
      question,
      candidates,
      votes,
      outcome:          result.winner,
      confidence:       result.winnerConfidence,
      highConfidence:   result.winnerConfidence >= threshold,
      allScores:        result.scores,
      voterCount:       votes.length,
      consensusReached: result.consensusReached,
      timestamp:        new Date().toISOString(),
    };

    // Record in vote history (capped at 100)
    this._voteHistory.unshift(consensusResult);
    if (this._voteHistory.length > 100) this._voteHistory.pop();

    // Emit event
    this._bus?.emit('agent.consensus.reached', {
      voteId,
      question,
      outcome: result.winner,
      confidence: result.winnerConfidence,
      consensusReached: result.consensusReached,
    }, { source: 'agent-consensus', persist: false });

    // Persist asynchronously
    setImmediate(() => this._persist(consensusResult).catch(() => {}));

    log.info('Consensus vote completed', {
      voteId,
      question: question.slice(0, 60),
      outcome:  result.winner,
      confidence: result.winnerConfidence,
      reached: result.consensusReached,
    });

    return consensusResult;
  }

  /**
   * Get recent vote history.
   */
  getHistory(limit = 20) {
    return this._voteHistory.slice(0, limit);
  }

  async getStats() {
    const total = this._voteHistory.length;
    const reached = this._voteHistory.filter(v => v.consensusReached).length;
    return {
      totalVotes:      total,
      consensusRate:   total > 0 ? Math.round((reached / total) * 100) : null,
      avgConfidence:   total > 0
        ? Math.round(this._voteHistory.reduce((s, v) => s + v.confidence, 0) / total * 100) / 100
        : null,
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  /**
   * Derive an agent's vote based on its specialization affinity for the context.
   * This is the "intelligence" behind voting — agents vote for options that align
   * with their specialization when the context contains capability-matching signals.
   */
  _deriveVote(agentId, profile, candidates, context) {
    const specialization = profile.specialization ?? '';
    const capabilities   = profile.capabilities   ?? [];

    // Look for context signals that match specialization
    const contextStr = JSON.stringify(context).toLowerCase();
    let bestCandidateScore = -1;
    let bestCandidate = candidates[0];

    for (const candidate of candidates) {
      const candidateStr = candidate.toLowerCase();
      let score = 0;

      // Affinity: does this candidate align with agent's capabilities?
      for (const cap of capabilities) {
        if (candidateStr.includes(cap) || contextStr.includes(cap)) score += 0.1;
      }

      // Specialization match
      if (candidateStr.includes(specialization.split('_')[0])) score += 0.2;

      // Positive language signals
      if (candidateStr.includes('optimize') || candidateStr.includes('improve')) score += 0.05;

      if (score > bestCandidateScore) {
        bestCandidateScore = score;
        bestCandidate = candidate;
      }
    }

    // If no strong affinity, pick the first candidate (default)
    return {
      choice:    bestCandidate,
      reasoning: bestCandidateScore > 0
        ? `Chose "${bestCandidate}" based on ${specialization} specialization affinity`
        : `No strong affinity — defaulting to "${bestCandidate}"`,
    };
  }

  /**
   * Aggregate weighted votes into a consensus result.
   */
  _calculateConsensus(votes, candidates, threshold) {
    const scores = {};
    const totalWeight = votes.reduce((s, v) => s + v.weight, 0);

    for (const candidate of candidates) scores[candidate] = 0;
    for (const vote of votes) {
      if (scores[vote.vote] !== undefined) {
        scores[vote.vote] += vote.weight;
      }
    }

    let winner = null;
    let winnerScore = -1;
    for (const [candidate, score] of Object.entries(scores)) {
      if (score > winnerScore) { winner = candidate; winnerScore = score; }
    }

    const winnerConfidence = totalWeight > 0 ? winnerScore / totalWeight : 0;
    const consensusReached = winnerConfidence >= threshold;

    return {
      winner,
      winnerConfidence: Math.round(winnerConfidence * 1000) / 1000,
      scores,
      consensusReached,
    };
  }

  async _persist(result) {
    try {
      const supabase = require('../../db/supabase');
      for (const v of result.votes) {
        await supabase.from('consensus_votes').insert({
          vote_id:    result.voteId,
          agent_id:   v.agentId,
          question:   result.question,
          vote_value: v.vote,
          weight:     v.weight,
          reasoning:  v.reasoning ?? null,
          confidence: v.confidence,
          context:    {},
          voted_at:   result.timestamp,
        });
      }
    } catch (_) {}
  }
}

const agentConsensus = new AgentConsensus();

module.exports = { AgentConsensus, agentConsensus };
