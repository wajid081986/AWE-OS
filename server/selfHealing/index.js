'use strict';

/**
 * AWE-OS — Self-Healing Infrastructure                           Phase 6E
 *
 * Single entry point for all self-healing operations.
 */

const SelfHealingEngine      = require('./SelfHealingEngine');
const RuntimeRecoveryEngine  = require('./RuntimeRecoveryEngine');
const AutoRepairEngine        = require('./AutoRepairEngine');
const FaultIsolationEngine    = require('./FaultIsolationEngine');
const PredictiveFailureEngine = require('./PredictiveFailureEngine');
const SystemResilienceEngine  = require('./SystemResilienceEngine');
const EmergencyRoutingEngine  = require('./EmergencyRoutingEngine');

module.exports = {
  // Master engine
  SelfHealingEngine,

  // Sub-engines
  RuntimeRecoveryEngine,
  AutoRepairEngine,
  FaultIsolationEngine,
  PredictiveFailureEngine,
  SystemResilienceEngine,
  EmergencyRoutingEngine,

  // Convenience re-exports
  start:          () => SelfHealingEngine.start(),
  stop:           () => SelfHealingEngine.stop(),
  forceHeal:      () => SelfHealingEngine.forceHeal(),
  getOverview:    (refresh) => SelfHealingEngine.getOverview(refresh),
  recordFailure:  (m, o) => SelfHealingEngine.recordFailure(m, o),
  recordSuccess:  (m) => SelfHealingEngine.recordSuccess(m),
  canExecute:     (m) => SelfHealingEngine.canExecute(m),
  feedMetric:     (k, v) => SelfHealingEngine.feedMetric(k, v),
};
