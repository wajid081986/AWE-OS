'use strict';

/**
 * AWE-OS — Self-Optimization Engine Bootstrap                  Phase 5D
 *
 * Single entry point for all autonomous optimization systems.
 * Call initializeSelfOptimization(bus) once at server startup.
 *
 * Initialization order:
 *   1. RuntimeOptimizer     — subscribe to EventBus, begin monitoring
 *   2. PipelineOptimizer    — initialize (stateless, query-on-demand)
 *   3. OptimizationRecommender — wire all analyzers
 *   4. AutonomousTuner      — wire to EventBus (safe tuning only)
 *   5. DecisionCoordinator  — wire consensus + intelligence
 */

const { runtimeOptimizer }          = require('./RuntimeOptimizer');
const { pipelineOptimizer }         = require('./PipelineOptimizer');
const { optimizationRecommender }   = require('./OptimizationRecommender');
const { autonomousTuner }           = require('./AutonomousTuner');
const { decisionCoordinator }       = require('./DecisionCoordinator');
const { createLogger }              = require('../monitoring/logger');

const log = createLogger('self-optimization');

async function initializeSelfOptimization(bus) {
  try {
    // 1. Runtime Optimizer — live monitoring via EventBus
    runtimeOptimizer.init(bus);

    // 2. Pipeline Optimizer — stateless, no init needed beyond flag
    pipelineOptimizer.init();

    // 3. Optimization Recommender — wire all sources
    const { optimizationAdvisor } = require('../learning/OptimizationAdvisor');
    optimizationRecommender.init(runtimeOptimizer, pipelineOptimizer, optimizationAdvisor, bus);

    // 4. Autonomous Tuner — safe auto-tuning with kill switch
    autonomousTuner.init(bus);

    // 5. Decision Coordinator — wire consensus + intelligence from multi-agent layer
    const { agentConsensus, intelligencePool, agentRegistry } = require('../agents/multi-agent');
    decisionCoordinator.init(agentConsensus, intelligencePool, agentRegistry);

    log.info('Self-Optimization Engine initialized', {
      tunerEnabled:   process.env.AUTONOMOUS_TUNER_ENABLED !== 'false',
      threshold:      0.75,
    });
  } catch (err) {
    log.error('initializeSelfOptimization error', { error: err?.message });
    console.error('[SelfOptimization] init error:', err?.message);
  }
}

function shutdownSelfOptimization() {
  runtimeOptimizer.shutdown();
  log.info('Self-Optimization Engine shutdown');
}

module.exports = {
  // Bootstrap
  initializeSelfOptimization,
  shutdownSelfOptimization,

  // Singletons
  runtimeOptimizer,
  pipelineOptimizer,
  optimizationRecommender,
  autonomousTuner,
  decisionCoordinator,
};
