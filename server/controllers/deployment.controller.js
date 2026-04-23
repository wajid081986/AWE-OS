'use strict';

const {
  checkSystemHealth,
  runPreDeployChecks,
  startDeployment,
  completeDeployment,
  getDeploymentHistory,
  getHealthHistory,
} = require('../agents/deployment-agent');

// GET /api/deploy/health
async function getHealth(req, res) {
  try {
    const health = await checkSystemHealth();
    return res.status(200).json({ success: true, data: health });
  } catch (err) {
    console.error('[DEPLOY CTRL] getHealth error:', err.message);
    return res.status(500).json({ success: false, error: 'Health check failed', detail: err.message });
  }
}

// POST /api/deploy/pre-check
async function preDeployCheck(req, res) {
  const { deploy_type } = req.body;

  const valid = ['backend', 'frontend', 'database', 'hotfix', 'rollback'];
  if (!deploy_type || !valid.includes(deploy_type)) {
    return res.status(400).json({
      success: false,
      error: `deploy_type is required. Must be one of: ${valid.join(', ')}`,
    });
  }

  try {
    const result = await runPreDeployChecks(deploy_type);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[DEPLOY CTRL] preDeployCheck error:', err.message);
    return res.status(500).json({ success: false, error: 'Pre-deploy check failed', detail: err.message });
  }
}

// POST /api/deploy/start
async function startDeploy(req, res) {
  const { deploy_type, git_commit = '', notes = '' } = req.body;

  const valid = ['backend', 'frontend', 'database', 'hotfix', 'rollback'];
  if (!deploy_type || !valid.includes(deploy_type)) {
    return res.status(400).json({
      success: false,
      error: `deploy_type is required. Must be one of: ${valid.join(', ')}`,
    });
  }

  try {
    const result = await startDeployment(deploy_type, git_commit, notes);
    const statusCode = result.blocked ? 200 : 201;
    return res.status(statusCode).json({ success: true, data: result });
  } catch (err) {
    console.error('[DEPLOY CTRL] startDeploy error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to start deployment', detail: err.message });
  }
}

// POST /api/deploy/complete
async function completeDeploy(req, res) {
  const { deploy_id, success = true, error_msg = '' } = req.body;

  if (!deploy_id) {
    return res.status(400).json({ success: false, error: 'deploy_id is required' });
  }

  try {
    const result = await completeDeployment(deploy_id, success, error_msg);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[DEPLOY CTRL] completeDeploy error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to complete deployment', detail: err.message });
  }
}

// GET /api/deploy/history
async function getHistory(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  try {
    const data = await getDeploymentHistory(limit);
    return res.status(200).json({ success: true, data, count: data.length });
  } catch (err) {
    console.error('[DEPLOY CTRL] getHistory error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch history', detail: err.message });
  }
}

// GET /api/deploy/health-history
async function getHealthHistory(req, res) {
  const hours = Math.min(parseInt(req.query.hours, 10) || 24, 168);
  try {
    const data = await getHealthHistory(hours);
    return res.status(200).json({ success: true, data, count: data.length });
  } catch (err) {
    console.error('[DEPLOY CTRL] getHealthHistory error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch health history', detail: err.message });
  }
}

module.exports = { getHealth, preDeployCheck, startDeploy, completeDeploy, getHistory, getHealthHistory };
