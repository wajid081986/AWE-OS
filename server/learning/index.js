'use strict';

/**
 * AWE-OS — Learning Engine Bootstrap                          Phase 5B
 *
 * Single entry point for the Autonomous Learning Engine.
 * Call initializeLearning(bus) once at server startup (after runtime init).
 */

const { learningEventCapture }  = require('./LearningEventCapture');
const { promptEvolutionEngine } = require('./PromptEvolutionEngine');
const { optimizationAdvisor }   = require('./OptimizationAdvisor');
const { learningPipelines }     = require('./LearningPipelines');
const { recordRepair }          = require('./FailureLearner');

// Re-export individual modules for direct import by routes/agents
// (but agents should use this index, not reach into subdirectories)

async function initializeLearning(bus) {
  // 1. Wire EventBus capture
  learningEventCapture.init(bus);

  // 2. Start autonomous learning pipelines
  learningPipelines.start();

  console.info('[Learning] Autonomous learning engine initialized');
}

function shutdownLearning() {
  learningPipelines.stop();
}

module.exports = {
  // Bootstrap
  initializeLearning,
  shutdownLearning,

  // Singletons
  learningEventCapture,
  promptEvolutionEngine,
  optimizationAdvisor,
  learningPipelines,

  // FailureLearner exposes recordRepair for repair agents to call directly
  recordRepair,
};
