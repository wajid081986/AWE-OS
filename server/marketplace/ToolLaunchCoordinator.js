'use strict';

/**
 * AWE-OS — ToolLaunchCoordinator                               Phase 6B
 *
 * Manages the full lifecycle of a marketplace tool launch:
 *   opportunity → approved → queued → building → published
 *
 * Safety mechanisms:
 *   - Max 3 concurrent builds across all categories
 *   - Max 3 launches per category per 30-day rolling window
 *   - Quality gate: overall_score >= 55 required to queue
 *   - Rollback protection: failed builds are logged and retried with backoff
 *   - Duplicate guard: checks for matching title in pending/in-progress
 *
 * Integration:
 *   - Writes to marketplace_opportunities table
 *   - Writes to marketplace_expansion_history table
 *   - Calls factory service (runFactory) for actual code generation
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('launch-coordinator');

// Safety limits
const MAX_CONCURRENT_BUILDS    = 3;
const MAX_LAUNCHES_PER_CAT_30D = 3;
const MIN_QUALITY_SCORE        = 55;
const MAX_RETRY_ATTEMPTS       = 2;
const RETRY_BACKOFF_MS         = 5_000;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

/**
 * Queue an opportunity for launch.
 *
 * @param {object} opportunity - Ranked opportunity object
 * @param {string} [actorId]   - Admin user ID or 'system'
 * @returns {Promise<{success, opportunityId, message}>}
 */
async function queueForLaunch(opportunity, actorId = 'system') {
  const { title, category, description, opportunityScore } = opportunity;

  // ── Safety checks ─────────────────────────────────────────────────────────
  if ((opportunityScore || 0) < MIN_QUALITY_SCORE) {
    return { success: false, message: `Score ${opportunityScore} below minimum ${MIN_QUALITY_SCORE}` };
  }

  // Check 30-day category launch rate
  const rateOk = await _checkCategoryRate(category);
  if (!rateOk) {
    return { success: false, message: `Category "${category}" has reached the 30-day launch limit (${MAX_LAUNCHES_PER_CAT_30D})` };
  }

  // Check concurrent build ceiling
  const concurrencyOk = await _checkConcurrency();
  if (!concurrencyOk) {
    return { success: false, message: `Max concurrent builds (${MAX_CONCURRENT_BUILDS}) reached — try again later` };
  }

  // Check for duplicate pending/in-progress launches
  const dupCheck = await _checkDuplicate(title, category);
  if (dupCheck) {
    return { success: false, message: `Similar launch already in queue: "${dupCheck}"` };
  }

  try {
    // Persist opportunity record
    const { data: opp, error } = await db()
      .from('marketplace_opportunities')
      .insert({
        title:              String(title).slice(0, 200),
        category:           String(category).slice(0, 50),
        description:        String(description || '').slice(0, 500),
        opportunity_score:  opportunity.opportunityScore  || 0,
        seo_score:          opportunity.seoScore          || 0,
        monetization_score: opportunity.monetizationScore || 0,
        saturation_risk:    opportunity.saturationRisk    || 0,
        implementation_score: opportunity.implementationScore || 0,
        roi_score:          opportunity.roiScore          || 0,
        launch_priority:    opportunity.launchPriority    || 50,
        trend_signal:       opportunity.trendSignal       || 'stable',
        generated_by:       actorId,
        status:             'pending',
        metadata:           { complexity: opportunity.complexity, timing: opportunity.timing },
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Log the event
    await _logEvent('launch_queued', {
      opportunityId: opp.id,
      category,
      actor:         actorId,
      outcome:       'pending',
      metadata:      { title, score: opportunityScore },
    });

    log.info('Launch queued', { opportunityId: opp.id, title, category });
    return { success: true, opportunityId: opp.id, message: 'Queued for launch' };

  } catch (err) {
    log.error('queueForLaunch failed', { error: err.message, title, category });
    return { success: false, message: err.message };
  }
}

/**
 * Approve a pending opportunity and start the build pipeline.
 *
 * @param {string} opportunityId
 * @param {string} [actorId]
 * @returns {Promise<{success, jobId, message}>}
 */
async function approveLaunch(opportunityId, actorId = 'system') {
  try {
    const { data: opp } = await db()
      .from('marketplace_opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (!opp) return { success: false, message: 'Opportunity not found' };
    if (opp.status !== 'pending') return { success: false, message: `Cannot approve: status is "${opp.status}"` };

    // Mark as in_progress
    await db()
      .from('marketplace_opportunities')
      .update({ status: 'in_progress' })
      .eq('id', opportunityId);

    await _logEvent('opportunity_approved', {
      opportunityId,
      category: opp.category,
      actor:    actorId,
      outcome:  'started',
      metadata: { title: opp.title },
    });

    // Kick off the factory run (non-blocking)
    _runBuildPipeline(opp, actorId).catch(err =>
      log.error('Build pipeline error', { opportunityId, error: err.message })
    );

    log.info('Launch approved', { opportunityId, title: opp.title });
    return { success: true, opportunityId, message: 'Build pipeline started' };

  } catch (err) {
    log.error('approveLaunch failed', { error: err.message, opportunityId });
    return { success: false, message: err.message };
  }
}

/**
 * Reject a pending opportunity.
 *
 * @param {string} opportunityId
 * @param {string} [reason]
 * @param {string} [actorId]
 */
async function rejectLaunch(opportunityId, reason = '', actorId = 'system') {
  try {
    await db()
      .from('marketplace_opportunities')
      .update({ status: 'rejected' })
      .eq('id', opportunityId);

    await _logEvent('opportunity_rejected', {
      opportunityId,
      actor:   actorId,
      outcome: 'rejected',
      metadata: { reason },
    });

    log.info('Launch rejected', { opportunityId, reason });
    return { success: true };
  } catch (err) {
    log.error('rejectLaunch failed', { error: err.message, opportunityId });
    return { success: false, message: err.message };
  }
}

/**
 * Get the current launch queue (pending + in_progress).
 *
 * @returns {Promise<object[]>}
 */
async function getLaunchQueue() {
  try {
    const { data } = await db()
      .from('marketplace_opportunities')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('launch_priority', { ascending: false })
      .limit(50);

    return data || [];
  } catch (err) {
    log.warn('getLaunchQueue failed', { error: err.message });
    return [];
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _checkCategoryRate(category) {
  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { count } = await db()
      .from('marketplace_expansion_history')
      .select('id', { count: 'exact', head: true })
      .eq('category', category)
      .eq('event_type', 'launch_completed')
      .gte('created_at', since);

    return (count || 0) < MAX_LAUNCHES_PER_CAT_30D;
  } catch (_) { return true; } // fail open — don't block launches if DB unavailable
}

async function _checkConcurrency() {
  try {
    const { count } = await db()
      .from('marketplace_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    return (count || 0) < MAX_CONCURRENT_BUILDS;
  } catch (_) { return true; }
}

async function _checkDuplicate(title, category) {
  try {
    const { data } = await db()
      .from('marketplace_opportunities')
      .select('title')
      .eq('category', category)
      .in('status', ['pending', 'in_progress'])
      .ilike('title', `%${title.split(' ').slice(0, 3).join(' ')}%`)
      .limit(1);

    return data?.[0]?.title || null;
  } catch (_) { return null; }
}

async function _runBuildPipeline(opp, actorId) {
  let attempts = 0;
  while (attempts <= MAX_RETRY_ATTEMPTS) {
    try {
      const { runFactory } = require('../services/ai-factory.service');
      const supabase       = db();

      // Create a factory job
      const { data: job } = await supabase
        .from('factory_jobs')
        .insert({
          status:       'running',
          category:     opp.category,
          input_prompt: `${opp.title}: ${opp.description}`,
          created_by:   actorId === 'system' ? null : actorId,
        })
        .select('id')
        .single();

      if (!job?.id) throw new Error('Failed to create factory job');

      // Update opportunity with job reference
      await supabase
        .from('marketplace_opportunities')
        .update({ factory_job_id: job.id })
        .eq('id', opp.id);

      await _logEvent('launch_started', {
        opportunityId: opp.id,
        category:      opp.category,
        actor:         actorId,
        outcome:       'running',
        metadata:      { jobId: job.id, title: opp.title, attempt: attempts + 1 },
      });

      const result = await runFactory(job.id, opp.category, `${opp.title}: ${opp.description}`, actorId);

      if (result.success) {
        await supabase
          .from('marketplace_opportunities')
          .update({ status: 'launched', metadata: { ...opp.metadata, toolId: result.tool?.id } })
          .eq('id', opp.id);

        await _logEvent('launch_completed', {
          opportunityId: opp.id,
          category:      opp.category,
          actor:         actorId,
          outcome:       'success',
          metadata:      { toolId: result.tool?.id, jobId: job.id },
        });

        log.info('Launch completed', { opportunityId: opp.id, toolId: result.tool?.id });
        return;
      } else {
        throw new Error(result.error || 'Factory run failed');
      }

    } catch (err) {
      attempts++;
      log.warn('Build attempt failed', { opportunityId: opp.id, attempt: attempts, error: err.message });

      if (attempts > MAX_RETRY_ATTEMPTS) {
        await db()
          .from('marketplace_opportunities')
          .update({ status: 'pending', metadata: { ...opp.metadata, lastError: err.message } })
          .eq('id', opp.id);

        await _logEvent('launch_failed', {
          opportunityId: opp.id,
          category:      opp.category,
          actor:         actorId,
          outcome:       'failed',
          metadata:      { error: err.message, attempts },
        });
        return;
      }

      await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS * attempts));
    }
  }
}

async function _logEvent(eventType, { opportunityId, category, actor, outcome, metadata } = {}) {
  try {
    await db().from('marketplace_expansion_history').insert({
      event_type:     eventType,
      category:       category || null,
      opportunity_id: opportunityId || null,
      actor:          actor || 'system',
      outcome:        outcome || 'pending',
      metadata:       metadata || {},
    });
  } catch (_) { /* non-fatal */ }
}

module.exports = { queueForLaunch, approveLaunch, rejectLaunch, getLaunchQueue };
