'use strict';

/**
 * AWE-OS — ChaosEngine                                         Phase 4F
 *
 * DEV-ONLY fault injection layer for testing runtime resilience.
 * ALL behavior is gated behind process.env.CHAOS_ENABLED === 'true'.
 *
 * Usage:
 *   const chaos = require('./ChaosEngine');
 *   await chaos.maybeInject('agent:openai', context);  // no-op in production
 *
 * Fault types:
 *   delay   — random sleep (ms)
 *   error   — throw a synthetic error
 *   timeout — throw a TIMEOUT error
 *   drop    — silently return null (simulates dropped result)
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('chaos-engine');

const ENABLED = process.env.CHAOS_ENABLED === 'true';

const FAULT_TYPES = Object.freeze({
  DELAY:   'delay',
  ERROR:   'error',
  TIMEOUT: 'timeout',
  DROP:    'drop',
});

// Default fault registry — keyed by target name
// Format: { probability: 0–1, type: FAULT_TYPES, delayMs?: number, message?: string }
const _faults = new Map();

// Stats
let _totalInjections = 0;
const _injectionCounts = {};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a fault for a named target.
 *
 * @param {string} target          - e.g. 'agent:openai', 'pipeline:email'
 * @param {object} config
 * @param {number} config.probability  - 0.0 to 1.0
 * @param {string} config.type         - FAULT_TYPES value
 * @param {number} [config.delayMs]    - for DELAY faults
 * @param {string} [config.message]    - for ERROR/TIMEOUT faults
 */
function register(target, config) {
  if (!ENABLED) return;
  _faults.set(target, { probability: 0.1, delayMs: 500, message: 'Chaos fault', ...config });
  log.warn('Chaos fault registered', { target, config });
}

/**
 * Clear a registered fault.
 */
function clear(target) {
  _faults.delete(target);
}

/**
 * Clear all faults.
 */
function clearAll() {
  _faults.clear();
}

/**
 * Inject a fault (if enabled and configured for this target).
 * Returns true if a fault was injected (only DELAY/DROP return; ERROR/TIMEOUT throw).
 *
 * @param {string} target
 * @param {object} [context]   - for logging
 * @returns {Promise<boolean>}
 */
async function maybeInject(target, context = {}) {
  if (!ENABLED) return false;

  const config = _faults.get(target) ?? _faults.get('*');
  if (!config) return false;

  if (Math.random() > config.probability) return false;

  _totalInjections++;
  _injectionCounts[target] = (_injectionCounts[target] ?? 0) + 1;

  log.warn('CHAOS: injecting fault', { target, type: config.type, ...context });

  switch (config.type) {
    case FAULT_TYPES.DELAY: {
      const ms = config.delayMs ?? 1_000;
      await new Promise(r => setTimeout(r, ms));
      return true;
    }

    case FAULT_TYPES.ERROR: {
      const err = new Error(config.message ?? `Chaos error: ${target}`);
      err.code = 'CHAOS_ERROR';
      throw err;
    }

    case FAULT_TYPES.TIMEOUT: {
      const err = new Error(config.message ?? `Chaos timeout: ${target}`);
      err.code = 'TIMEOUT';
      throw err;
    }

    case FAULT_TYPES.DROP:
      return true; // caller checks return value and treats true as "drop this result"

    default:
      return false;
  }
}

/**
 * Stats snapshot for diagnostics.
 */
function getStats() {
  return {
    enabled:         ENABLED,
    registeredFaults: _faults.size,
    totalInjections: _totalInjections,
    byTarget:        { ..._injectionCounts },
    faults: ENABLED
      ? Object.fromEntries([..._faults.entries()].map(([k, v]) => [k, { ...v }]))
      : {},
  };
}

module.exports = {
  ENABLED,
  FAULT_TYPES,
  register,
  clear,
  clearAll,
  maybeInject,
  getStats,
};
