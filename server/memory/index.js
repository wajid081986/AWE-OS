'use strict';

/**
 * AWE-OS — Memory Layer Bootstrap                              Phase 5A
 *
 * Single entry point for the AI Memory Layer.
 * Import this module; call initializeMemory() once at server startup.
 */

const { shortTermMemory, MEMORY_TYPES: STM_TYPES } = require('./ShortTermMemory');
const { longTermMemory,  MEMORY_TYPES: LTM_TYPES, CONFIDENCE_DECAY, CONFIDENCE_BOOST, RETIREMENT_THRESHOLD } = require('./LongTermMemory');
const { semanticMemory }   = require('./SemanticMemory');
const { memoryManager, TYPES } = require('./MemoryManager');

async function initializeMemory() {
  await memoryManager.initialize();
}

function shutdownMemory() {
  memoryManager.destroy();
}

module.exports = {
  // Bootstrap
  initializeMemory,
  shutdownMemory,

  // Singletons
  memoryManager,
  shortTermMemory,
  longTermMemory,
  semanticMemory,

  // Type enums
  TYPES,
  STM_TYPES,
  LTM_TYPES,

  // Constants
  CONFIDENCE_DECAY,
  CONFIDENCE_BOOST,
  RETIREMENT_THRESHOLD,
};
