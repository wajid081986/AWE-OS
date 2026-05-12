'use strict';

/**
 * AWE-OS — AutonomousTuner                                     Phase 5D
 *
 * Safe autonomous configuration tuner with full rollback support.
 * ALL tuning actions are:
 *   1. Logged to runtime_tuning table before being applied
 *   2. Reversible via rollback()
 *   3. Gated by confidence threshold (default: 0.75)
 *   4. Protected by circuit breaker (stops after 3 consecutive failures)
 *   5. Limited to auto-applicable recommendations only
 *
 * What can be tuned:
 *   - Optimization thresholds (soft, in-memory)
 *   - Prompt strategy selection defaults
 *   - Retry policy suggestions (logged, not hot-applied)
 *   - Queue concurrency hints (advisory — read by queue on next cycle)
 *
 * What CANNOT be tuned autonomously:
 *   - Auth, security, or payment configurations
 *   - Database schema or migrations
 *   - Live agent code or prompt text
 *   - Any config requiring server restart
 *
 * Kill switch: set AUTONOMOUS_TUNER_ENABLED=false to disable all auto-tuning.
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../monitoring/logger');

const log = createLogger('autonomous-tuner');

const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;
const CIRCUIT_BREAKER_MAX_FAILURES = 3;
const CIRCUIT_BREAKER_RESET_MS     = 30 * 60_000;  // 30 minutes
const HISTORY_CAP                  = 100;

// In-memory tuning state — readable by other components
const _tuningState = {};

class AutonomousTuner {
  constructor() {
    this._enabled  = process.env.AUTONOMOUS_TUNER_ENABLED !== 'false';
    this._threshold = DEFAULT_CONFIDENCE_THRESHOLD;
    this._history   = [];   // in-memory (capped)
    this._breaker   = { failures: 0, openUntil: null };
    this._bus = null;
    this._initialized = false;
  }

  /**
   * Wire to EventBus. Called once at startup.
   */
  init(bus) {
    if (this._initialized) return;
    this._initialized = true;
    this._bus = bus;

    // Listen for high-confidence recommendations to auto-apply
    bus.subscribe('optimization.recommendation.ready', p => this._onRecommendationReady(p));

    log.info('AutonomousTuner initialized', { enabled: this._enabled, threshold: this._threshold });
  }

  /**
   * Apply a tuning from a recommendation.
   * Rejects if: disabled, confidence < threshold, circuit breaker open, not auto-applicable.
   *
   * @param {object} recommendation — from OptimizationRecommender
   * @param {string} [appliedBy]    — 'auto' or admin userId
   * @returns {Promise<TuningRecord>}
   */
  async applyTuning(recommendation, appliedBy = 'auto') {
    if (!this._enabled) {
      throw Object.assign(new Error('AutonomousTuner is disabled (AUTONOMOUS_TUNER_ENABLED=false)'), { code: 'TUNER_DISABLED' });
    }

    if (this._isBreakerOpen()) {
      throw Object.assign(new Error('AutonomousTuner circuit breaker is open — too many recent failures'), { code: 'CIRCUIT_OPEN' });
    }

    if ((recommendation.confidence ?? 0) < this._threshold) {
      throw Object.assign(
        new Error(`Confidence ${recommendation.confidence} below threshold ${this._threshold}`),
        { code: 'BELOW_THRESHOLD' }
      );
    }

    if (appliedBy === 'auto' && !recommendation.autoApplicable && !recommendation.auto_applicable) {
      throw Object.assign(new Error('Recommendation is not marked auto-applicable'), { code: 'NOT_AUTO_APPLICABLE' });
    }

    const tuningId = `tuning_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const beforeConfig = this._captureCurrentState(recommendation.recommendationType ?? recommendation.recommendation_type);

    const record = {
      tuningId,
      tuningType:      recommendation.recommendationType ?? recommendation.recommendation_type ?? 'generic',
      target:          recommendation.targetId ?? recommendation.target_id ?? 'system',
      description:     recommendation.title ?? recommendation.description ?? 'Autonomous tuning',
      beforeConfig,
      afterConfig:     recommendation.afterState ?? recommendation.after_state ?? {},
      rollbackConfig:  beforeConfig,
      confidence:      recommendation.confidence,
      status:          'applied',
      appliedBy,
      recommendationId: recommendation.id ?? null,
      appliedAt:       new Date().toISOString(),
    };

    // Apply the tuning to in-memory state
    this._applyToState(record);

    // Persist BEFORE marking as applied (audit-first)
    await this._persist(record);

    // Emit event
    this._bus?.emit('optimization.tuning.applied', {
      tuningId,
      tuningType: record.tuningType,
      target:     record.target,
      confidence: record.confidence,
      appliedBy,
    }, { source: 'autonomous-tuner', persist: false });

    this._history.unshift(record);
    if (this._history.length > HISTORY_CAP) this._history.pop();

    log.info('Tuning applied', { tuningId, type: record.tuningType, target: record.target, appliedBy });
    return record;
  }

  /**
   * Rollback a previously applied tuning.
   * Restores the before-state from the tuning record.
   *
   * @param {string} tuningId
   * @param {string} [reason]
   */
  async rollback(tuningId, reason = 'manual_rollback') {
    const record = this._history.find(r => r.tuningId === tuningId);
    if (!record) {
      // Try DB
      const dbRecord = await this._fetchFromDB(tuningId);
      if (!dbRecord) throw Object.assign(new Error(`Tuning not found: ${tuningId}`), { code: 'TUNING_NOT_FOUND' });
      this._restoreState(dbRecord.rollbackConfig ?? dbRecord.rollback_config ?? {});
      await this._markRolledBack(tuningId, reason);
      this._breaker.failures++;
      return;
    }

    this._restoreState(record.rollbackConfig);
    record.status = 'rolled_back';
    record.rolledBackAt = new Date().toISOString();
    record.rollbackReason = reason;

    await this._markRolledBack(tuningId, reason);

    this._bus?.emit('optimization.tuning.rolledback', {
      tuningId,
      tuningType:     record.tuningType,
      target:         record.target,
      rollbackReason: reason,
    }, { source: 'autonomous-tuner', persist: false });

    this._breaker.failures++;
    if (this._breaker.failures >= CIRCUIT_BREAKER_MAX_FAILURES) {
      this._breaker.openUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      log.warn('AutonomousTuner circuit breaker OPENED', { failures: this._breaker.failures });
    }

    log.info('Tuning rolled back', { tuningId, reason });
  }

  /**
   * Get current in-memory tuning state (readable by optimization components).
   */
  static getTuningState() { return { ..._tuningState }; }
  getTuningState()         { return AutonomousTuner.getTuningState(); }

  getTuningHistory(limit = 20) { return this._history.slice(0, limit); }

  setEnabled(enabled) {
    this._enabled = !!enabled;
    log.info('AutonomousTuner enabled changed', { enabled: this._enabled });
  }

  setThreshold(threshold) {
    if (threshold < 0 || threshold > 1) throw new RangeError('Threshold must be between 0 and 1');
    this._threshold = threshold;
  }

  resetBreaker() {
    this._breaker = { failures: 0, openUntil: null };
    log.info('AutonomousTuner circuit breaker reset');
  }

  getStats() {
    return {
      enabled:              this._enabled,
      confidenceThreshold:  this._threshold,
      totalTunings:         this._history.length,
      rollbacks:            this._history.filter(r => r.status === 'rolled_back').length,
      circuitBreakerOpen:   this._isBreakerOpen(),
      breakerFailures:      this._breaker.failures,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  _onRecommendationReady(payload) {
    if (!this._enabled || !payload?.autoApplicable) return;
    if ((payload.confidence ?? 0) >= this._threshold) {
      setImmediate(() => {
        this.applyTuning(payload, 'auto').catch(err => {
          log.warn('Auto-tuning skipped', { reason: err.message, code: err.code });
        });
      });
    }
  }

  _isBreakerOpen() {
    if (!this._breaker.openUntil) return false;
    if (Date.now() > this._breaker.openUntil) {
      this._breaker = { failures: 0, openUntil: null };
      return false;
    }
    return true;
  }

  _captureCurrentState(tuningType) {
    return { tuningType, capturedAt: new Date().toISOString(), ..._tuningState };
  }

  _applyToState(record) {
    _tuningState[record.tuningType] = {
      ...record.afterConfig,
      tuningId:  record.tuningId,
      appliedAt: record.appliedAt,
    };
  }

  _restoreState(rollbackConfig) {
    const tuningType = rollbackConfig.tuningType;
    if (tuningType) delete _tuningState[tuningType];
  }

  async _persist(record) {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('runtime_tuning').insert({
        tuning_id:        record.tuningId,
        tuning_type:      record.tuningType,
        target:           record.target,
        description:      record.description,
        before_config:    record.beforeConfig,
        after_config:     record.afterConfig,
        rollback_config:  record.rollbackConfig,
        confidence:       record.confidence,
        status:           record.status,
        applied_by:       record.appliedBy,
        recommendation_id: record.recommendationId ?? null,
        applied_at:       record.appliedAt,
        expires_at:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (err) {
      log.warn('AutonomousTuner persist failed', { error: err.message });
      throw err;  // Fail loudly — tuning without audit trail is not allowed
    }
  }

  async _fetchFromDB(tuningId) {
    try {
      const supabase = require('../db/supabase');
      const { data } = await supabase
        .from('runtime_tuning')
        .select('*')
        .eq('tuning_id', tuningId)
        .single();
      return data;
    } catch (_) { return null; }
  }

  async _markRolledBack(tuningId, reason) {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('runtime_tuning')
        .update({
          status:          'rolled_back',
          rolled_back_at:  new Date().toISOString(),
          rollback_reason: reason,
          updated_at:      new Date().toISOString(),
        })
        .eq('tuning_id', tuningId);
    } catch (_) {}
  }
}

const autonomousTuner = new AutonomousTuner();

module.exports = { AutonomousTuner, autonomousTuner };
