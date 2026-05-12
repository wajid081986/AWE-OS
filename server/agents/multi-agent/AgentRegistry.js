'use strict';

/**
 * AWE-OS — AgentRegistry                                       Phase 5C
 *
 * Central registry for all agent specialization profiles and runtime metrics.
 * Provides capability-based routing (findByCapability, getBestAgent).
 *
 * Design:
 *   - Static profiles define roles, capabilities, and base confidence
 *   - Runtime metrics tracked in-memory, updated via EventBus subscriptions
 *   - Confidence score = blend of base confidence + observed success rate
 *   - Load-aware routing: penalizes agents with high active-task counts
 *   - Non-blocking: all DB operations are fire-and-forget
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-registry');

const STATIC_PROFILES = Object.freeze({
  'builder-agent': {
    role: 'Tool Builder',
    capabilities: ['tool_creation', 'code_generation', 'config_building', 'api_design', 'saas_construction'],
    strengths: ['creative_generation', 'code_quality', 'api_integration'],
    specialization: 'saas_tool_construction',
    baseConfidence: 0.80,
    description: 'Constructs SaaS tool configurations and code from ideas and specifications',
  },
  'deployment-agent': {
    role: 'Deployment Specialist',
    capabilities: ['deployment', 'publishing', 'version_control', 'rollback', 'release_management'],
    strengths: ['reliability', 'consistency', 'version_tracking'],
    specialization: 'production_deployment',
    baseConfidence: 0.85,
    description: 'Deploys tools to production with reliability guarantees and rollback support',
  },
  'optimization-agent': {
    role: 'Performance Optimizer',
    capabilities: ['performance_analysis', 'bottleneck_detection', 'tuning', 'profiling', 'latency_analysis'],
    strengths: ['data_analysis', 'pattern_recognition', 'runtime_tuning'],
    specialization: 'performance_optimization',
    baseConfidence: 0.75,
    description: 'Analyzes and optimizes tool and runtime performance',
  },
  'revenue-agent': {
    role: 'Revenue Analyst',
    capabilities: ['revenue_analysis', 'forecasting', 'pricing_strategy', 'monetization', 'conversion_analysis'],
    strengths: ['financial_modeling', 'trend_analysis', 'pricing_optimization'],
    specialization: 'revenue_optimization',
    baseConfidence: 0.70,
    description: 'Analyzes revenue patterns and identifies monetization opportunities',
  },
  'seo-agent': {
    role: 'SEO Specialist',
    capabilities: ['seo_analysis', 'keyword_strategy', 'content_optimization', 'ranking', 'metadata_optimization'],
    strengths: ['content_strategy', 'keyword_research', 'search_visibility'],
    specialization: 'search_optimization',
    baseConfidence: 0.75,
    description: 'Optimizes tool visibility and search engine ranking',
  },
  'repair-agent': {
    role: 'Auto-Repair Specialist',
    capabilities: ['debugging', 'error_analysis', 'code_repair', 'recovery', 'stability_testing'],
    strengths: ['error_pattern_recognition', 'fix_generation', 'recovery_planning'],
    specialization: 'failure_recovery',
    baseConfidence: 0.80,
    description: 'Diagnoses and repairs tool failures and runtime errors',
  },
  'analytics-agent': {
    role: 'Analytics Analyst',
    capabilities: ['data_analysis', 'metrics_tracking', 'reporting', 'trend_detection', 'anomaly_detection'],
    strengths: ['statistical_analysis', 'pattern_detection', 'insight_generation'],
    specialization: 'data_intelligence',
    baseConfidence: 0.80,
    description: 'Tracks and analyzes tool usage, performance and user behavior',
  },
  'decision-agent': {
    role: 'Decision Coordinator',
    capabilities: ['decision_making', 'rule_evaluation', 'consensus_building', 'prioritization', 'risk_assessment'],
    strengths: ['multi_criteria_evaluation', 'risk_scoring', 'priority_ranking'],
    specialization: 'autonomous_decisions',
    baseConfidence: 0.75,
    description: 'Coordinates complex decisions with rule evaluation and consensus',
  },
  'memory-agent': {
    role: 'Memory Curator',
    capabilities: ['memory_management', 'knowledge_retrieval', 'pattern_indexing', 'context_sharing', 'intelligence_curation'],
    strengths: ['semantic_retrieval', 'knowledge_curation', 'context_preservation'],
    specialization: 'intelligence_persistence',
    baseConfidence: 0.85,
    description: 'Manages the AI memory layer and retrieves contextual intelligence',
  },
  'learning-agent': {
    role: 'Learning Engine',
    capabilities: ['pattern_learning', 'strategy_evolution', 'prompt_optimization', 'feedback_processing', 'continuous_improvement'],
    strengths: ['pattern_generalization', 'adaptive_strategies', 'prompt_evolution'],
    specialization: 'autonomous_learning',
    baseConfidence: 0.80,
    description: 'Continuously learns from outcomes to improve system performance',
  },
});

const MIN_SAMPLES_FOR_CONFIDENCE = 5;

class AgentRegistry {
  constructor() {
    this._profiles  = new Map();  // agentId → profile
    this._metrics   = new Map();  // agentId → RuntimeMetrics
    this._initialized = false;
  }

  /**
   * Initialize with static profiles and wire EventBus listeners.
   * Must be called once at startup.
   */
  init(bus) {
    if (this._initialized) return;
    this._initialized = true;

    for (const [agentId, profile] of Object.entries(STATIC_PROFILES)) {
      this._profiles.set(agentId, {
        ...profile,
        agentId,
        registeredAt: new Date().toISOString(),
      });
      this._metrics.set(agentId, this._emptyMetrics());
    }

    bus.subscribe('agent.started',   p => this._onStarted(p));
    bus.subscribe('agent.completed', p => this._onCompleted(p));
    bus.subscribe('agent.error',     p => this._onError(p));
    bus.subscribe('agent.timeout',   p => this._onError(p));

    // Collaboration task events
    bus.subscribe('collaboration.task.started',   p => this._onStarted(p));
    bus.subscribe('collaboration.task.completed', p => this._onCompleted(p));
    bus.subscribe('collaboration.task.failed',    p => this._onError(p));

    log.info('AgentRegistry initialized', { agentCount: this._profiles.size });
  }

  /**
   * Register or update an agent profile at runtime.
   */
  register(agentId, profile) {
    const existing = this._profiles.get(agentId) ?? {};
    this._profiles.set(agentId, {
      ...existing,
      ...profile,
      agentId,
      registeredAt: existing.registeredAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!this._metrics.has(agentId)) {
      this._metrics.set(agentId, this._emptyMetrics());
    }
    log.debug('Agent registered', { agentId });
  }

  /**
   * Get full profile + runtime metrics for an agent.
   */
  getProfile(agentId) {
    const profile = this._profiles.get(agentId);
    if (!profile) return null;
    const metrics = this._metrics.get(agentId) ?? this._emptyMetrics();
    return {
      ...profile,
      metrics,
      confidenceScore: this._calculateConfidence(agentId),
      successRate: this._successRate(agentId),
    };
  }

  /**
   * Find all agents with a given capability, ranked by confidence.
   */
  findByCapability(capability) {
    const results = [];
    for (const [agentId, profile] of this._profiles) {
      if (profile.capabilities?.includes(capability)) {
        results.push(this.getProfile(agentId));
      }
    }
    return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Find the single best agent for a task, considering workload.
   * Score = confidenceScore / (1 + activeTasks)
   */
  getBestAgent(capability) {
    const candidates = this.findByCapability(capability);
    if (!candidates.length) return null;

    return candidates
      .map(a => ({ ...a, _routeScore: a.confidenceScore / (1 + (a.metrics?.activeTasks ?? 0)) }))
      .sort((a, b) => b._routeScore - a._routeScore)[0];
  }

  /**
   * Get all registered agents.
   */
  getAll() {
    return [...this._profiles.keys()].map(id => this.getProfile(id)).filter(Boolean);
  }

  /**
   * Manually record a task outcome (called by collaborators).
   */
  updateMetrics(agentId, { success, durationMs = 0 } = {}) {
    const m = this._metrics.get(agentId);
    if (!m) return;
    m.totalTasks++;
    m.activeTasks = Math.max(0, m.activeTasks - 1);
    m.totalLatencyMs += durationMs;
    if (success) m.successCount++; else m.failureCount++;
    m.lastActiveAt = new Date().toISOString();
    this._syncToDB(agentId).catch(() => {});
  }

  getStats() {
    return {
      totalAgents: this._profiles.size,
      agents: this.getAll().map(a => ({
        agentId:        a.agentId,
        role:           a.role,
        specialization: a.specialization,
        confidenceScore: a.confidenceScore,
        activeTasks:    a.metrics?.activeTasks ?? 0,
        totalTasks:     a.metrics?.totalTasks  ?? 0,
        successRate:    a.successRate,
      })),
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  _onStarted(payload) {
    const agentId = payload?.agentName ?? payload?.agentId;
    if (!agentId) return;
    const m = this._metrics.get(agentId);
    if (!m) return;
    m.activeTasks++;
    m.lastActiveAt = new Date().toISOString();
  }

  _onCompleted(payload) {
    const agentId = payload?.agentName ?? payload?.agentId;
    if (!agentId) return;
    this.updateMetrics(agentId, { success: true, durationMs: payload?.durationMs ?? 0 });
  }

  _onError(payload) {
    const agentId = payload?.agentName ?? payload?.agentId;
    if (!agentId) return;
    this.updateMetrics(agentId, { success: false });
  }

  _successRate(agentId) {
    const m = this._metrics.get(agentId);
    if (!m || m.totalTasks === 0) return null;
    return Math.round((m.successCount / m.totalTasks) * 100);
  }

  _calculateConfidence(agentId) {
    const profile = this._profiles.get(agentId);
    const m = this._metrics.get(agentId);
    if (!profile) return 0;

    const base = profile.baseConfidence ?? 0.5;
    if (!m || m.totalTasks < MIN_SAMPLES_FOR_CONFIDENCE) return base;

    const observed = m.successCount / m.totalTasks;
    // 60% base weight, 40% observed — blends stability with empirical data
    return Math.round(((base * 0.6) + (observed * 0.4)) * 1000) / 1000;
  }

  _emptyMetrics() {
    return {
      activeTasks: 0,
      totalTasks: 0,
      successCount: 0,
      failureCount: 0,
      totalLatencyMs: 0,
      lastActiveAt: null,
    };
  }

  async _syncToDB(agentId) {
    try {
      const profile = this._profiles.get(agentId);
      const m = this._metrics.get(agentId);
      if (!profile || !m) return;

      const supabase = require('../../db/supabase');
      await supabase.from('agent_profiles').upsert({
        agent_id:        agentId,
        role:            profile.role,
        specialization:  profile.specialization,
        description:     profile.description ?? null,
        base_confidence: profile.baseConfidence,
        confidence_score: this._calculateConfidence(agentId),
        workload_score:  Math.min(1, (m.activeTasks ?? 0) / 10),
        total_tasks:     m.totalTasks,
        success_count:   m.successCount,
        failure_count:   m.failureCount,
        avg_latency_ms:  m.totalTasks > 0 ? Math.round(m.totalLatencyMs / m.totalTasks) : null,
        last_active_at:  m.lastActiveAt,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'agent_id' });
    } catch (_) {
      // Best-effort sync — never block execution
    }
  }
}

const agentRegistry = new AgentRegistry();

module.exports = { AgentRegistry, agentRegistry, STATIC_PROFILES };
