const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { generateToolIdeas, runFactory } = require('../services/ai-factory.service');
const supabase   = require('../db/supabase');
const router     = express.Router();

const factoryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { error: 'Too many factory runs. Max 10 per hour.' },
});

// POST /api/factory/generate
router.post('/generate', requireAuth, requireAdmin, factoryLimiter, async (req, res) => {
  const { category, idea } = req.body;
  const userId = req.user.userId;

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

    const result = await runFactory(job.id, category, idea, userId);

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Tool generation failed' });
    }

    res.json({ jobId: job.id, status: 'completed', tool: result.tool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/factory/jobs — list all
router.get('/jobs', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('factory_jobs')
    .select(`
      id, status, category, input_prompt,
      created_at, completed_at,
      saas_tools (id, name, slug, is_published)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/factory/jobs/:jobId — poll single job
router.get('/jobs/:jobId', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('factory_jobs')
    .select(`
      *,
      saas_tools (id, name, slug, category, is_free, price, is_published)
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

module.exports = router;
