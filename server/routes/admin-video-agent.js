const express     = require('express');
const requireAuth = require('../middleware/auth');
const { generateVideo, saveGeneration, getHistory, deleteGeneration } = require('../core/video-agent');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

// ── POST /generate ────────────────────────────────────────────────────────────
router.post('/generate', requireAuth, requireAdmin, async (req, res) => {
  const { prompt, negativePrompt, style, duration, mode, imageUrl } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({ success: false, error: 'prompt is required (min 3 characters)' });
  }
  try {
    const result = await generateVideo({ prompt: prompt.trim(), negativePrompt, style, duration, mode, imageUrl });
    await saveGeneration(result).catch(err => {
      console.warn('[admin-video-agent/generate] history save failed:', err.message);
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[admin-video-agent/generate]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /history ───────────────────────────────────────────────────────────────
router.get('/history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const history = await getHistory(20);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('[admin-video-agent/history]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /history/:id ──────────────────────────────────────────────────────
router.delete('/history/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteGeneration(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[admin-video-agent/history/delete]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
