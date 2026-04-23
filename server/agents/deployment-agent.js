'use strict';

const supabase = require('../db/supabase');

const BACKEND_URL  = 'https://awe-os.onrender.com';
const FRONTEND_URL = 'https://awe-os.vercel.app';
const FETCH_TIMEOUT_MS = 10_000;

const REQUIRED_TABLES = [
  'tools', 'tool_events', 'revenue_logs', 'builder_plans',
  'autonomous_logs', 'generated_code', 'optimization_suggestions',
  'monetization_strategies', 'deployment_logs', 'health_snapshots',
  'deployment_checklist',
];

const REQUIRED_ENV = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET', 'OPENAI_API_KEY',
  'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET',
];

// ── Utility ───────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const start = Date.now();
    const res = await fetch(url, { ...options, signal: controller.signal });
    const latency = Date.now() - start;
    return { ok: res.ok, status: res.status, latency };
  } catch (err) {
    return { ok: false, status: 0, latency: FETCH_TIMEOUT_MS, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// ── checkSystemHealth ─────────────────────────────────────────

async function checkSystemHealth() {
  console.log('[DEPLOY AGENT] Starting health check...');
  const issues = [];

  // STEP 1 — Backend
  let backendStatus = 'down';
  let backendLatency = null;
  try {
    const result = await fetchWithTimeout(`${BACKEND_URL}/api/health`);
    backendLatency = result.latency;
    if (result.ok) {
      backendStatus = result.latency > 3000 ? 'degraded' : 'healthy';
    }
    console.log(`[DEPLOY AGENT] Backend: ${backendStatus} (${backendLatency}ms)`);
    if (backendStatus !== 'healthy') {
      issues.push({
        severity: backendStatus === 'down' ? 'critical' : 'warning',
        service: 'backend',
        message: `Backend is ${backendStatus}`,
        fix: 'Check Render deployment logs. Redeploy if crashed.',
      });
    }
  } catch (err) {
    backendStatus = 'down';
    console.error('[DEPLOY AGENT] Backend check failed:', err.message);
    issues.push({ severity: 'critical', service: 'backend', message: 'Backend unreachable', fix: 'Check Render service status.' });
  }

  // STEP 2 — Frontend
  let frontendStatus = 'down';
  let frontendLatency = null;
  try {
    const result = await fetchWithTimeout(FRONTEND_URL);
    frontendLatency = result.latency;
    if (result.ok) {
      frontendStatus = result.latency > 5000 ? 'degraded' : 'healthy';
    }
    console.log(`[DEPLOY AGENT] Frontend: ${frontendStatus} (${frontendLatency}ms)`);
    if (frontendStatus !== 'healthy') {
      issues.push({
        severity: frontendStatus === 'down' ? 'critical' : 'warning',
        service: 'frontend',
        message: `Frontend is ${frontendStatus}`,
        fix: 'Check Vercel deployment logs.',
      });
    }
  } catch (err) {
    frontendStatus = 'down';
    console.error('[DEPLOY AGENT] Frontend check failed:', err.message);
    issues.push({ severity: 'critical', service: 'frontend', message: 'Frontend unreachable', fix: 'Check Vercel status.' });
  }

  // STEP 3 — Database
  let databaseStatus = 'down';
  let databaseLatency = null;
  let tablesOk = false;
  const missingTables = [];
  try {
    const dbStart = Date.now();
    const { error: countErr } = await supabase.from('tools').select('count', { count: 'exact', head: true });
    databaseLatency = Date.now() - dbStart;

    if (countErr) throw new Error(countErr.message);
    databaseStatus = databaseLatency > 2000 ? 'degraded' : 'healthy';

    // Check required tables
    for (const table of REQUIRED_TABLES) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) missingTables.push(table);
    }
    tablesOk = missingTables.length === 0;

    console.log(`[DEPLOY AGENT] Database: ${databaseStatus} (${databaseLatency}ms) tables_ok=${tablesOk}`);
    if (missingTables.length > 0) {
      issues.push({
        severity: 'warning',
        service: 'database',
        message: `Missing tables: ${missingTables.join(', ')}`,
        fix: 'Run schema_deployment.sql in Supabase SQL Editor.',
      });
    }
  } catch (err) {
    databaseStatus = 'down';
    console.error('[DEPLOY AGENT] Database check failed:', err.message);
    issues.push({ severity: 'critical', service: 'database', message: `Database error: ${err.message}`, fix: 'Check Supabase project status.' });
  }

  // STEP 4 — Cron jobs (check last autonomous run)
  let cronStatus = 'unknown';
  let lastCronRun = null;
  try {
    const { data, error } = await supabase
      .from('autonomous_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      lastCronRun = data.created_at;
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      const ageH  = ageMs / (1000 * 60 * 60);
      cronStatus = ageH <= 12 ? 'healthy' : 'stale';
      if (ageH > 12) {
        issues.push({
          severity: 'warning',
          service: 'cron',
          message: `Autonomous cron last ran ${Math.round(ageH)}h ago (expected ≤12h)`,
          fix: 'Manually trigger /api/autonomous/run or check Render server logs.',
        });
      }
    } else {
      cronStatus = 'no_data';
    }
  } catch (err) {
    cronStatus = 'error';
  }

  // STEP 5 — Save snapshot
  const overall = issues.some(i => i.severity === 'critical') ? 'down'
    : issues.length > 0 ? 'degraded'
    : 'healthy';

  try {
    await supabase.from('health_snapshots').insert({
      backend_status:   backendStatus,
      frontend_status:  frontendStatus,
      database_status:  databaseStatus,
      backend_latency:  backendLatency,
      frontend_latency: frontendLatency,
      database_latency: databaseLatency,
      checks: { backend: backendStatus, frontend: frontendStatus, database: databaseStatus, crons: cronStatus },
      issues_count: issues.length,
      issues,
    });
  } catch (err) {
    console.error('[DEPLOY AGENT] Failed to save health snapshot:', err.message);
  }

  const result = {
    overall,
    backend:  { status: backendStatus,  latency_ms: backendLatency },
    frontend: { status: frontendStatus, latency_ms: frontendLatency },
    database: { status: databaseStatus, tables_ok: tablesOk, missing_tables: missingTables },
    crons:    { last_run: lastCronRun, status: cronStatus },
    issues,
    checked_at: new Date().toISOString(),
  };

  console.log(`[DEPLOY AGENT] Health check complete: overall=${overall} issues=${issues.length}`);
  return result;
}

// ── runPreDeployChecks ────────────────────────────────────────

async function runPreDeployChecks(deploy_type) {
  console.log(`[DEPLOY AGENT] Running pre-deploy checks for: ${deploy_type}`);
  const checks  = [];
  const blockers = [];
  const warnings = [];

  const addCheck = (name, status, message, fix_suggestion = '') => {
    checks.push({ name, status, message, fix_suggestion });
    if (status === 'fail')    blockers.push({ name, message, fix_suggestion });
    if (status === 'warning') warnings.push({ name, message, fix_suggestion });
  };

  // CHECK 1 — Environment Variables
  const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missingEnv.length === 0) {
    addCheck('Environment Variables', 'pass', `All ${REQUIRED_ENV.length} required env vars present`);
  } else {
    addCheck('Environment Variables', 'fail',
      `Missing: ${missingEnv.join(', ')}`,
      'Add missing variables to Render environment settings.');
  }

  // CHECK 2 — Database Health
  try {
    const { error } = await supabase.from('tools').select('count', { count: 'exact', head: true });
    if (error) throw new Error(error.message);

    const missingTables = [];
    for (const table of REQUIRED_TABLES) {
      const { error: tErr } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (tErr) missingTables.push(table);
    }

    if (missingTables.length === 0) {
      addCheck('Database Health', 'pass', `All ${REQUIRED_TABLES.length} required tables exist`);
    } else {
      addCheck('Database Health', 'fail',
        `Missing tables: ${missingTables.join(', ')}`,
        'Run schema_deployment.sql in Supabase SQL Editor.');
    }
  } catch (err) {
    addCheck('Database Health', 'fail', `Database error: ${err.message}`, 'Check Supabase project status.');
  }

  // CHECK 3 — Active Deployments (prevent concurrent)
  try {
    const { data, error } = await supabase
      .from('deployment_logs')
      .select('id, deploy_type, status, started_at')
      .in('status', ['deploying', 'validating']);

    if (error) throw new Error(error.message);
    if (data && data.length > 0) {
      addCheck('Active Deployments', 'fail',
        `${data.length} deployment(s) already in progress (${data.map(d => d.deploy_type).join(', ')})`,
        'Wait for active deployment to complete or mark it as failed.');
    } else {
      addCheck('Active Deployments', 'pass', 'No concurrent deployments running');
    }
  } catch (err) {
    addCheck('Active Deployments', 'warning', `Could not check active deploys: ${err.message}`);
  }

  // CHECK 4 — Recent Failures
  try {
    const { data, error } = await supabase
      .from('deployment_logs')
      .select('id, deploy_type, created_at')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) throw new Error(error.message);
    if (data && data.length >= 2) {
      addCheck('Recent Failures', 'warning',
        `${data.length} failed deployment(s) in the last hour`,
        'Review failure logs before deploying again.');
    } else {
      addCheck('Recent Failures', 'pass',
        data && data.length === 1 ? '1 failure in last hour (within tolerance)' : 'No recent failures');
    }
  } catch (err) {
    addCheck('Recent Failures', 'warning', `Could not check failure history: ${err.message}`);
  }

  // CHECK 5 — Backend API Responsive
  try {
    const result = await fetchWithTimeout(`${BACKEND_URL}/api/health`);
    if (result.ok) {
      addCheck('Backend API', 'pass', `Backend responding (${result.latency}ms)`);
    } else {
      addCheck('Backend API', 'fail',
        `Backend returned HTTP ${result.status}`,
        'Check Render service logs. Backend may be crashed or spinning up.');
    }
  } catch (err) {
    addCheck('Backend API', 'fail', `Backend unreachable: ${err.message}`, 'Check Render service status.');
  }

  const can_deploy = blockers.length === 0;
  console.log(`[DEPLOY AGENT] Pre-deploy checks: can_deploy=${can_deploy} blockers=${blockers.length} warnings=${warnings.length}`);

  return { can_deploy, checks, blockers, warnings };
}

// ── runPostDeployChecks ───────────────────────────────────────

async function runPostDeployChecks(deploy_id, deploy_type) {
  console.log(`[DEPLOY AGENT] Running post-deploy checks for deploy_id=${deploy_id}`);
  const checks = [];

  const addCheck = (name, pass, message, fix_suggestion = '') => {
    checks.push({ name, status: pass ? 'pass' : 'fail', message, fix_suggestion });
  };

  // CHECK 1 — Backend Health
  let backendOk = false;
  try {
    const result = await fetchWithTimeout(`${BACKEND_URL}/api/health`);
    backendOk = result.ok;
    addCheck('Backend Health', result.ok,
      result.ok ? `Healthy (${result.latency}ms)` : `HTTP ${result.status}`,
      result.ok ? '' : 'Deployment may have failed. Check Render logs.');
  } catch (err) {
    addCheck('Backend Health', false, `Unreachable: ${err.message}`, 'Check Render service.');
  }

  // CHECK 2 — Critical APIs (with JWT if available)
  const token = process.env.DEPLOY_TEST_TOKEN || '';
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const criticalApis = [
    { path: '/api/tools',           name: 'Tools API' },
    { path: '/api/autonomous/logs', name: 'Autonomous Logs API' },
  ];

  for (const api of criticalApis) {
    try {
      const result = await fetchWithTimeout(`${BACKEND_URL}${api.path}`, { headers: authHeaders });
      const pass = result.status === 200 || result.status === 401; // 401 = API alive, just no token
      addCheck(api.name, pass,
        pass ? `Responding (HTTP ${result.status})` : `HTTP ${result.status}`,
        pass ? '' : `${api.path} returned unexpected status. Check route registration.`);
    } catch (err) {
      addCheck(api.name, false, `Request failed: ${err.message}`, `Check ${api.path} route.`);
    }
  }

  // CHECK 3 — Frontend Loading
  let frontendOk = false;
  try {
    const result = await fetchWithTimeout(FRONTEND_URL);
    frontendOk = result.ok;
    addCheck('Frontend Loading', result.ok,
      result.ok ? `Vercel OK (${result.latency}ms)` : `HTTP ${result.status}`,
      result.ok ? '' : 'Check Vercel deployment logs.');
  } catch (err) {
    addCheck('Frontend Loading', false, `Unreachable: ${err.message}`, 'Check Vercel status.');
  }

  // CHECK 4 — Database Tables
  let dbOk = true;
  try {
    const missingTables = [];
    for (const table of REQUIRED_TABLES) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) missingTables.push(table);
    }
    dbOk = missingTables.length === 0;
    addCheck('Database Tables', dbOk,
      dbOk ? `All ${REQUIRED_TABLES.length} tables intact` : `Missing: ${missingTables.join(', ')}`,
      dbOk ? '' : 'Run schema_deployment.sql to restore missing tables.');
  } catch (err) {
    dbOk = false;
    addCheck('Database Tables', false, `Check failed: ${err.message}`, 'Check Supabase connection.');
  }

  // CHECK 5 — Resume Builder (MANDATORY — main product)
  let resumeBuilderOk = false;
  try {
    const result = await fetchWithTimeout(FRONTEND_URL);
    resumeBuilderOk = result.ok;
    addCheck('Resume Builder (CRITICAL)', result.ok,
      result.ok ? 'Frontend loads — Resume Builder accessible' : `Frontend returned HTTP ${result.status}`,
      result.ok ? '' : 'CRITICAL: Resume Builder is down. Rollback immediately.');
  } catch (err) {
    addCheck('Resume Builder (CRITICAL)', false,
      `Cannot reach frontend: ${err.message}`,
      'CRITICAL: Check Vercel. Rollback if needed.');
  }

  // Determine overall result
  const allCritical = checks.filter(c =>
    ['Backend Health', 'Resume Builder (CRITICAL)', 'Frontend Loading'].includes(c.name)
  );
  const criticalFailed = allCritical.filter(c => c.status === 'fail').length;
  const anyFailed = checks.some(c => c.status === 'fail');

  const overall = criticalFailed > 0 ? 'failed' : anyFailed ? 'failed' : 'success';
  const recommendation = overall === 'success' ? 'stable'
    : criticalFailed > 0 ? 'rollback'
    : 'monitor';

  // Update deployment log
  try {
    await supabase
      .from('deployment_logs')
      .update({
        status:       overall,
        completed_at: new Date().toISOString(),
        post_checks:  { checks, overall, resume_builder_ok: resumeBuilderOk },
      })
      .eq('id', deploy_id);
  } catch (err) {
    console.error('[DEPLOY AGENT] Failed to update deployment log:', err.message);
  }

  console.log(`[DEPLOY AGENT] Post-deploy checks: overall=${overall} recommendation=${recommendation}`);
  return { deploy_id, overall, checks, resume_builder_ok: resumeBuilderOk, recommendation };
}

// ── startDeployment ───────────────────────────────────────────

async function startDeployment(deploy_type, git_commit = '', notes = '') {
  console.log(`[DEPLOY AGENT] Starting deployment: type=${deploy_type} commit=${git_commit}`);

  // Create deployment record
  const { data: log, error: insertErr } = await supabase
    .from('deployment_logs')
    .insert({ deploy_type, git_commit, notes, status: 'pending' })
    .select()
    .single();

  if (insertErr) {
    console.error('[DEPLOY AGENT] Failed to create deployment log:', insertErr.message);
    throw new Error(`Failed to create deployment record: ${insertErr.message}`);
  }

  const deploy_id = log.id;

  // Run pre-deploy checks
  const preChecks = await runPreDeployChecks(deploy_type);

  if (!preChecks.can_deploy) {
    await supabase
      .from('deployment_logs')
      .update({
        status:      'failed',
        completed_at: new Date().toISOString(),
        pre_checks:   preChecks,
        issues:       preChecks.blockers.map(b => ({ severity: 'critical', message: b.message, fix_suggestion: b.fix_suggestion })),
      })
      .eq('id', deploy_id);

    console.log(`[DEPLOY AGENT] Deployment BLOCKED — ${preChecks.blockers.length} blocker(s)`);
    return { deploy_id, blocked: true, reason: 'Pre-deploy checks failed', blockers: preChecks.blockers };
  }

  // Update status to validating
  await supabase
    .from('deployment_logs')
    .update({ status: 'validating', pre_checks: preChecks })
    .eq('id', deploy_id);

  console.log(`[DEPLOY AGENT] Deployment ${deploy_id} ready. Awaiting human approval.`);
  return { deploy_id, blocked: false, pre_checks: preChecks };
}

// ── completeDeployment ────────────────────────────────────────

async function completeDeployment(deploy_id, success = true, error_msg = '') {
  console.log(`[DEPLOY AGENT] Completing deployment: deploy_id=${deploy_id} success=${success}`);

  // Fetch original start time for duration calc
  const { data: log } = await supabase
    .from('deployment_logs')
    .select('started_at')
    .eq('id', deploy_id)
    .single();

  if (!success) {
    const duration_ms = log ? Date.now() - new Date(log.started_at).getTime() : null;
    await supabase
      .from('deployment_logs')
      .update({
        status:       'failed',
        completed_at: new Date().toISOString(),
        duration_ms,
        issues:       [{ severity: 'critical', message: error_msg || 'Deployment reported as failed', fix_suggestion: 'Review Render/Vercel logs.' }],
      })
      .eq('id', deploy_id);

    return { deploy_id, overall: 'failed', recommendation: 'rollback' };
  }

  // Mark as verifying
  await supabase.from('deployment_logs').update({ status: 'verifying' }).eq('id', deploy_id);

  // Run post-deploy checks
  const result = await runPostDeployChecks(deploy_id, null);

  // Update duration
  const duration_ms = log ? Date.now() - new Date(log.started_at).getTime() : null;
  await supabase
    .from('deployment_logs')
    .update({ duration_ms })
    .eq('id', deploy_id);

  // Return full record
  const { data: finalLog } = await supabase
    .from('deployment_logs')
    .select('*')
    .eq('id', deploy_id)
    .single();

  return { ...result, deployment_log: finalLog };
}

// ── getDeploymentHistory ──────────────────────────────────────

async function getDeploymentHistory(limit = 20) {
  const { data, error } = await supabase
    .from('deployment_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DEPLOY AGENT] Failed to fetch deployment history:', error.message);
    throw new Error(error.message);
  }
  return data || [];
}

// ── getHealthHistory ──────────────────────────────────────────

async function getHealthHistory(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('health_snapshots')
    .select('*')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false });

  if (error) {
    console.error('[DEPLOY AGENT] Failed to fetch health history:', error.message);
    throw new Error(error.message);
  }
  return data || [];
}

module.exports = {
  checkSystemHealth,
  runPreDeployChecks,
  runPostDeployChecks,
  startDeployment,
  completeDeployment,
  getDeploymentHistory,
  getHealthHistory,
};
