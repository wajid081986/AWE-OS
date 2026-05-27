'use strict';

/**
 * /api/landing-pages  — Landing Page Builder routes
 *
 * POST   /api/landing-pages/generate      — kick off 4-agent generation (async)
 * GET    /api/landing-pages               — list all pages (admin)
 * GET    /api/landing-pages/presets/list  — available style presets
 * GET    /api/landing-pages/:id/status    — poll generation status
 * GET    /api/landing-pages/:id           — get full page record
 * PUT    /api/landing-pages/:id           — save edited HTML / change status
 * DELETE /api/landing-pages/:id           — delete
 * GET    /api/landing-pages/public/:slug  — serve published HTML
 */

const express  = require('express');
const router   = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const supabase = require('../db/supabase');
const { generateLandingPage, STYLE_PRESETS } = require('../services/landing-page-generator.service');

// Allow large HTML payloads for PUT (save edited page)
router.use(express.json({ limit: '10mb' }));

// ── helpers ───────────────────────────────────────────────────────────────────

function generateSlug(productName) {
  return productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    + '-' + Date.now();
}

// ── GET /api/landing-pages/presets/list ──────────────────────────────────────
// Must be before /:id wildcard
router.get('/presets/list', (req, res) => {
  const presets = Object.entries(STYLE_PRESETS).map(([key, cfg]) => ({
    id:   key,
    name: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    ...cfg,
  }));
  res.json({ presets });
});

// ── GET /api/landing-pages/public/:slug ──────────────────────────────────────
// Public: serve published page HTML. Must be before /:id wildcard.
router.get('/public/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('html_content, title, views')
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return res.status(404).send('<h1 style="font-family:sans-serif;text-align:center;padding:4rem">Page not found</h1>');
    }

    // Fire-and-forget view increment
    supabase
      .from('landing_pages')
      .update({ views: (data.views || 0) + 1 })
      .eq('slug', req.params.slug)
      .then(() => {});

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data.html_content);
  } catch (err) {
    res.status(500).send('<h1>Server Error</h1>');
  }
});

// ── GET /api/landing-pages — list all (admin) ─────────────────────────────────
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('id, title, slug, status, style_preset, views, conversions, created_at, generation_score')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ pages: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/landing-pages/generate — kick off generation ────────────────────
router.post('/generate', requireAuth, requireAdmin, async (req, res) => {
  const { brief, stylePreset = 'modern-saas', title } = req.body;

  if (!brief || !brief.productName) {
    return res.status(400).json({ error: 'brief.productName is required' });
  }
  if (!STYLE_PRESETS[stylePreset]) {
    return res.status(400).json({ error: `Unknown stylePreset. Valid: ${Object.keys(STYLE_PRESETS).join(', ')}` });
  }

  // Insert record immediately so frontend can poll
  const slug = generateSlug(brief.productName);
  const { data: page, error: createError } = await supabase
    .from('landing_pages')
    .insert({
      title:       title || brief.productName,
      slug,
      brief,
      style_preset: stylePreset,
      status:      'generating',
      user_id:     req.user?.userId || null,
    })
    .select('id, slug')
    .single();

  if (createError) {
    return res.status(500).json({ error: createError.message });
  }

  // Respond immediately — generation continues in background
  res.json({
    success: true,
    pageId:  page.id,
    slug:    page.slug,
    message: 'Generation started. Poll /status for updates.',
  });

  // Fire-and-forget — all 4 agents run sequentially in background
  generateLandingPage(brief, stylePreset)
    .then(async ({ htmlContent, score }) => {
      await supabase
        .from('landing_pages')
        .update({
          html_content:     htmlContent,
          status:           'ready',
          generation_score: score,
          variants: [{
            id:           'original',
            name:         'Original',
            html_content: htmlContent,
            views:        0,
            conversions:  0,
          }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      console.log(`[LP] ✅ Generation complete: ${page.slug}`);
    })
    .catch(async (err) => {
      await supabase
        .from('landing_pages')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', page.id);
      console.error(`[LP] ❌ Generation failed: ${page.slug} —`, err.message);
    });
});

// ── GET /api/landing-pages/:id/status — poll generation ──────────────────────
// Must be before /:id to avoid route conflict when id contains /status
router.get('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('id, status, generation_score, slug, updated_at')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    // Only include html_content if ready (avoid huge payload on every poll)
    res.json({
      ...data,
      ready: data.status === 'ready',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/landing-pages/:id — full page record ────────────────────────────
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Page not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/landing-pages/:id — update ──────────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { html_content, status, title } = req.body;
    const updates = { updated_at: new Date().toISOString() };

    if (html_content !== undefined) updates.html_content = html_content;
    if (status       !== undefined) updates.status       = status;
    if (title        !== undefined) updates.title        = title;
    if (status === 'published')     updates.published_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('landing_pages')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/landing-pages/:id ────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
