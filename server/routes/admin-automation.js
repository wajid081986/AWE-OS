'use strict';
const express           = require('express');
const router            = express.Router();
const requireAuth       = require('../middleware/auth');
const { automationHub } = require('../core/automation-hub');

// ── Admin guard ───────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

// ── GSC INDEXING ──────────────────────────────────────────────────────────────

// POST /api/admin/automation/index-url
router.post('/index-url', requireAuth, requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'url required' });
  try {
    const result = await automationHub.indexUrl(url);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[automation/index-url]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/automation/index-batch
router.post('/index-batch', requireAuth, requireAdmin, async (req, res) => {
  const { urls } = req.body;
  if (!urls?.length) return res.status(400).json({ success: false, error: 'urls array required' });
  try {
    const result = await automationHub.indexBatch(urls);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[automation/index-batch]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/automation/index-history
router.get('/index-history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const history = await automationHub.getIndexHistory(50);
    const quota   = await automationHub.getQuotaUsed();
    res.json({ success: true, history, quotaUsed: quota });
  } catch (err) {
    console.error('[automation/index-history]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/automation/check-url-status
router.post('/check-url-status', requireAuth, requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'url required' });
  try {
    const status = await automationHub.getUrlStatus(url);
    res.json({ success: true, status });
  } catch (err) {
    console.error('[automation/check-url-status]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SITEMAP ───────────────────────────────────────────────────────────────────

// GET /api/admin/automation/sitemap-stats
router.get('/sitemap-stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await automationHub.getSitemapStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('[automation/sitemap-stats]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/automation/sitemap-preview
router.get('/sitemap-preview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const urls = await automationHub.getAllUrls();
    res.json({ success: true, urls, count: urls.length });
  } catch (err) {
    console.error('[automation/sitemap-preview]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SOCIAL SCHEDULER ─────────────────────────────────────────────────────────

// POST /api/admin/automation/generate-posts
router.post('/generate-posts', requireAuth, requireAdmin, async (req, res) => {
  const { platform, toolSlug, toolName, blogPost, count, subreddits } = req.body;
  try {
    const posts = await automationHub.generatePosts({
      platform, toolSlug, toolName, blogPost, count, subreddits
    });
    res.json({ success: true, posts });
  } catch (err) {
    console.error('[automation/generate-posts]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/automation/schedule-posts
router.post('/schedule-posts', requireAuth, requireAdmin, async (req, res) => {
  const { posts, scheduledFor } = req.body;
  if (!posts?.length) return res.status(400).json({ success: false, error: 'posts array required' });
  try {
    const results = await automationHub.schedulePosts(posts, scheduledFor);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[automation/schedule-posts]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/automation/schedule
router.get('/schedule', requireAuth, requireAdmin, async (req, res) => {
  const { platform, status } = req.query;
  try {
    const posts = await automationHub.getSchedule({ platform, status, limit: 50 });
    res.json({ success: true, posts });
  } catch (err) {
    console.error('[automation/schedule]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/automation/post-status/:id
router.patch('/post-status/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  try {
    const post = await automationHub.updatePost(id, status);
    res.json({ success: true, post });
  } catch (err) {
    console.error('[automation/post-status]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUBLISH QUEUE ─────────────────────────────────────────────────────────────

// GET /api/admin/automation/queue
router.get('/queue', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const [items, stats] = await Promise.all([
      automationHub.getQueue(status),
      automationHub.getQueueStats()
    ]);
    res.json({ success: true, items, stats });
  } catch (err) {
    console.error('[automation/queue]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/automation/queue/add
router.post('/queue/add', requireAuth, requireAdmin, async (req, res) => {
  const { type, title, slug, pageData, priority } = req.body;
  if (!type || !title) return res.status(400).json({ success: false, error: 'type and title required' });
  try {
    const item = await automationHub.addToQueue({ type, title, slug, pageData, priority });
    res.json({ success: true, item });
  } catch (err) {
    console.error('[automation/queue/add]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/automation/queue/clear
router.delete('/queue/clear', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const result = await automationHub.clearQueue(status || 'published');
    res.json({ success: true, result });
  } catch (err) {
    console.error('[automation/queue/clear]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
