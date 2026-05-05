'use strict';

/**
 * AWE-OS — Health Monitor Cron (Enterprise-Grade)
 *
 * Schedule  : Every 30 minutes
 * Checks    : System health (backend, frontend, database) · per-service latency thresholds
 *             · cron job staleness via checkCronHealth() · auto-recovery recommendations
 * Safety    : Structured JSON logging (no emoji) · recordCronRun() telemetry
 *             · never crashes the process · auto-starts on require
 */

const cron = require('node-cron');
const { checkSystemHealth } = require('../agents/deployment-agent');
const { recordCronRun, checkCronHealth } = require('../services/cron-health');

// ── Constants ──────────────────────────────────────────────────────────────────
const CRON_EXPRESSION  = '*/30 * * * *';
const AGENT            = 'health-cron';
const LATENCY_WARN_MS  = 500;
const LATENCY_ERROR_MS = 2_000;

const CRON_INTERVALS = {
  'analytics-cron':           24 * 60,
  'autonomous-cron':          6  * 60,
  'idea-cron':                12 * 60,
  'marketing-weekly-content': 7  * 24 * 60,
  'marketing-weekly-report':  7  * 24 * 60,
  'testing-cron':             24 * 60,
  'decision-cron':            24 * 60,
  'health-cron':              30,
  'revenue-cron':             24 * 60,
  'support-sla-monitor':      30,
  'support-auto-close':       24 * 60,
  'support-weekly-kb':        7  * 24 * 60,
};

// Recovery advice per service — logged at error level when a service is down
const RECOVERY_HINTS = {
  backend:  'Check server logs and process manager (PM2/systemd). Verify PORT and ENV vars.',
  frontend: 'Verify Vercel deployment status and check build logs for recent failures.',
  database: 'Check Supabase dashboard for outages. Verify SUPABASE_URL and SERVICE_ROLE_KEY.',
  default:  'Check service logs and cloud provider status page.',
};

// ── Logger ─────────────────────────────────────────────────────────────────────
function log(level, message, data = {}) {
  try {
    const line = JSON.stringify({ agent: AGENT, level, message, ...data, ts: new Date().toISOString() });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } catch (_) {
    console.log(`[${AGENT}] ${level.toUpperCase()} — ${message}`);
  }
}

// ── Service latency assessment ─────────────────────────────────────────────────
function assessService(name, serviceData) {
  if (!serviceData) return;
  const status    = serviceData.status     ?? 'unknown';
  const latencyMs = serviceData.latency_ms ?? null;

  if (status === 'down' || status === 'error') {
    log('error', 'Service DOWN', {
      service:       name,
      status,
      latency_ms:    latencyMs,
      recovery_hint: RECOVERY_HINTS[name] || RECOVERY_HINTS.default,
    });
    return;
  }

  if (latencyMs !== null && latencyMs > LATENCY_ERROR_MS) {
    log('error', 'Service latency critical', {
      service:       name,
      latency_ms:    latencyMs,
      threshold_ms:  LATENCY_ERROR_MS,
      recovery_hint: `${name} is responding but very slowly. Check load and connection pool.`,
    });
  } else if (latencyMs !== null && latencyMs > LATENCY_WARN_MS) {
    log('warn', 'Service latency elevated', {
      service:      name,
      latency_ms:   latencyMs,
      threshold_ms: LATENCY_WARN_MS,
    });
  } else {
    log('info', 'Service healthy', { service: name, status, latency_ms: latencyMs });
  }
}

// ── Core execution ─────────────────────────────────────────────────────────────
async function executeHealthCheck() {
  const startedAt = Date.now();
  log('info', 'Health check starting');

  try {
    const health    = await checkSystemHealth();
    const overall   = health?.overall ?? 'unknown';
    const issues    = Array.isArray(health?.issues) ? health.issues : [];
    const duration_ms = Date.now() - startedAt;

    // Per-service assessment with latency thresholds
    assessService('backend',  health?.backend);
    assessService('frontend', health?.frontend);
    assessService('database', health?.database);

    // Overall status summary
    if (overall === 'down') {
      log('error', 'SYSTEM DOWN — immediate action required', {
        overall,
        issues_count: issues.length,
        duration_ms,
      });
      for (const issue of issues) {
        log('error', 'Critical system issue', {
          service:  issue.service  || 'unknown',
          severity: issue.severity || 'unknown',
          message:  issue.message  || null,
          fix:      issue.fix      || (RECOVERY_HINTS[issue.service] ?? RECOVERY_HINTS.default),
        });
      }
    } else if (issues.length > 0) {
      log('warn', 'System degraded', { overall, issues_count: issues.length, duration_ms });
      for (const issue of issues) {
        log('warn', 'Degraded service', {
          service:  issue.service  || 'unknown',
          severity: issue.severity || 'info',
          message:  issue.message  || null,
          fix:      issue.fix      || null,
        });
      }
    } else {
      log('info', 'All services healthy', { overall, duration_ms });
    }

    // Cron staleness check — detect any cron that hasn't run within 2× its interval
    await checkCronHealth(CRON_INTERVALS);

    await recordCronRun(AGENT, 'success', null, { overall, issues_count: issues.length });
  } catch (err) {
    log('error', 'Health check threw an unexpected error', {
      error:       err?.message || String(err),
      duration_ms: Date.now() - startedAt,
    });
    await recordCronRun(AGENT, 'error', err?.message || String(err));
  }
}

// ── Scheduler — auto-starts on require ────────────────────────────────────────
function startHealthCron() {
  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[${AGENT}] Invalid cron expression: "${CRON_EXPRESSION}"`);
  }
  const task = cron.schedule(CRON_EXPRESSION, executeHealthCheck, { scheduled: true, timezone: 'UTC' });
  log('info', 'Registered — runs every 30 minutes', {
    expression:        CRON_EXPRESSION,
    latency_warn_ms:   LATENCY_WARN_MS,
    latency_error_ms:  LATENCY_ERROR_MS,
    monitored_crons:   Object.keys(CRON_INTERVALS).length,
  });
  return task;
}

const scheduledJob = startHealthCron();

module.exports = { scheduledJob, startHealthCron, executeHealthCheck };
