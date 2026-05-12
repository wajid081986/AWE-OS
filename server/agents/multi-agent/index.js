'use strict';

/**
 * AWE-OS — Multi-Agent Intelligence Engine Bootstrap           Phase 5C
 *
 * Single entry point for the multi-agent collaboration layer.
 * Call initializeMultiAgent(bus) once at server startup (after runtime + memory init).
 *
 * Initialization order:
 *   1. AgentRegistry   — load profiles + wire EventBus metrics
 *   2. AgentCommunicationBus — wire to EventBus
 *   3. IntelligencePool — wire to MemoryManager
 *   4. AgentConsensus  — wire to registry + bus
 *   5. TaskDelegator   — wire to registry + commBus
 *   6. CollaborativeOrchestrator — wire all components
 */

const { agentRegistry }             = require('./AgentRegistry');
const { agentCommBus, AGENT_EVENTS, MESSAGE_TYPES } = require('./AgentCommunicationBus');
const { intelligencePool }          = require('./IntelligencePool');
const { agentConsensus }            = require('./AgentConsensus');
const { taskDelegator }             = require('./TaskDelegator');
const { collaborativeOrchestrator } = require('./CollaborativeOrchestrator');
const { createLogger }              = require('../../monitoring/logger');

const log = createLogger('multi-agent');

async function initializeMultiAgent(bus) {
  try {
    // 1. Agent Registry (must be first — others depend on it)
    agentRegistry.init(bus);

    // 2. Communication Bus
    agentCommBus.init(bus);

    // 3. Intelligence Pool (wires to MemoryManager)
    const { memoryManager } = require('../../memory/MemoryManager');
    intelligencePool.init(memoryManager);

    // 4. Consensus System
    agentConsensus.init(agentRegistry, bus);

    // 5. Task Delegator
    taskDelegator.init(agentRegistry, agentCommBus);

    // 6. Collaborative Orchestrator (wire all)
    collaborativeOrchestrator.init(
      agentRegistry,
      agentCommBus,
      intelligencePool,
      agentConsensus,
      bus
    );

    log.info('Multi-Agent Intelligence Engine initialized', {
      agents:       agentRegistry.getAll().length,
      busReady:     true,
      poolReady:    true,
      consensusReady: true,
    });

  } catch (err) {
    log.error('initializeMultiAgent error', { error: err?.message });
    console.error('[MultiAgent] initializeMultiAgent error:', err?.message);
  }
}

function shutdownMultiAgent() {
  // No persistent resources to clean up — in-memory state is process-scoped
  log.info('Multi-Agent Intelligence Engine shutdown');
}

module.exports = {
  // Bootstrap
  initializeMultiAgent,
  shutdownMultiAgent,

  // Singletons
  agentRegistry,
  agentCommBus,
  intelligencePool,
  agentConsensus,
  taskDelegator,
  collaborativeOrchestrator,

  // Event taxonomy
  AGENT_EVENTS,
  MESSAGE_TYPES,
};
