const express      = require('express');
const rateLimit    = require('express-rate-limit');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { generateToolIdeas, runFactory } = require('../services/ai-factory.service');
const intelligence = require('../intelligence');
const supabase     = require('../db/supabase');
const router       = express.Router();

const factoryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { error: 'Too many factory runs. Max 10 per hour.' },
});

// POST /api/factory/generate
router.post('/generate', requireAuth, requireAdmin, factoryLimiter, async (req, res) => {
  const { category, idea, product_type } = req.body;
  const userId     = req.user.userId;
  const productType = product_type || 'prompt-tool';

  if (!category) return res.status(400).json({ error: 'Category required' });

  try {
    const { data: job, error } = await supabase
      .from('factory_jobs')
      .insert({
        status:       'running',
        category,
        input_prompt: idea || category,
        created_by:   userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const result = await runFactory(job.id, category, idea, userId, productType);

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Tool generation failed' });
    }

    res.json({ jobId: job.id, status: 'completed', tool: result.tool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/factory/jobs — list all
// Intentionally simple SELECT * — avoids FK join errors if tools relation isn't configured in Supabase
router.get('/jobs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('factory_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return res.json({ jobs: [] });
    return res.json({ jobs: data || [] });
  } catch (e) {
    return res.json({ jobs: [] });
  }
});

// GET /api/factory/jobs/:jobId — poll single job
router.get('/jobs/:jobId', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('factory_jobs')
    .select(`
      *,
      tools (id, name, slug, category, is_free, price, approved)
    `)
    .eq('id', req.params.jobId)
    .single();

  if (error) return res.status(404).json({ error: 'Job not found' });
  res.json(data);
});

// POST /api/factory/ideas — generate ideas only
router.post('/ideas', requireAuth, requireAdmin, async (req, res) => {
  const { category, count = 5 } = req.body;
  if (!category) return res.status(400).json({ error: 'Category required' });

  try {
    const ideas = await generateToolIdeas(category, Math.min(count, 10));

    const { data } = await supabase
      .from('tool_ideas')
      .insert(ideas.map(idea => ({ ...idea, category, source: 'ai' })))
      .select();

    res.json({ ideas: data || ideas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/factory/ideas — list all ideas
router.get('/ideas', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('tool_ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/factory/ideas/:id/build — build tool from idea
router.post('/ideas/:id/build', requireAuth, requireAdmin, factoryLimiter, async (req, res) => {
  const { data: idea } = await supabase
    .from('tool_ideas')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (!idea) return res.status(404).json({ error: 'Idea not found' });

  const { data: job } = await supabase
    .from('factory_jobs')
    .insert({
      status:       'pending',
      category:     idea.category,
      input_prompt: `${idea.name}: ${idea.description}`,
      created_by:   req.user.userId,
    })
    .select()
    .single();

  runFactory(job.id, idea.category, `${idea.name}: ${idea.description}`, req.user.userId);

  await supabase
    .from('tool_ideas')
    .update({ is_approved: true, factory_job_id: job.id })
    .eq('id', idea.id);

  res.json({ jobId: job.id, status: 'building' });
});

// ════════════════════════════════════════════════════════════════
// PHASE 6A — Intelligence Endpoints
// ════════════════════════════════════════════════════════════════

// POST /api/factory/intelligence/analyze
// Run the fast intelligence pipeline (~2-4s).
// Returns: analysis, monetization, seo, score, duplicateCheck, historical
router.post('/intelligence/analyze', requireAuth, requireAdmin, async (req, res) => {
  const { prompt, category } = req.body;
  if (!category) return res.status(400).json({ success: false, error: 'category is required' });

  try {
    const result = await intelligence.runIntelligencePipeline(
      prompt   || '',
      category,
      req.user.userId,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[factory/intelligence/analyze]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/factory/intelligence/blueprint
// Generate a full implementation blueprint (heavier Claude Sonnet call, ~5-10s).
router.post('/intelligence/blueprint', requireAuth, requireAdmin, async (req, res) => {
  const { prompt, category, analysis, ideaId } = req.body;
  if (!category) return res.status(400).json({ success: false, error: 'category is required' });

  try {
    const blueprint = await intelligence.generateBlueprint(
      prompt   || '',
      category,
      analysis || null,
      ideaId   || null,
    );
    res.json({ success: true, blueprint });
  } catch (err) {
    console.error('[factory/intelligence/blueprint]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/factory/intelligence/history
// List generated idea history (newest first, last 50).
router.get('/intelligence/history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('generated_tool_ideas')
      .select('id, title, category, seo_score, monetization_score, complexity_score, overall_score, launch_recommendation, approved, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/factory/intelligence/categories
// Historical category performance stats.
router.get('/intelligence/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const patterns = await intelligence.getHistoricalPatterns('all');
    res.json({ success: true, data: patterns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/factory/intelligence/feedback/:ideaId
// Record admin feedback on a generated idea.
router.post('/intelligence/feedback/:ideaId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await intelligence.recordFeedback(req.params.ideaId, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
