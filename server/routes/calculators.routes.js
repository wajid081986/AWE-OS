const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const supabase = require('../db/supabase');
const router = express.Router();

// GET /api/calculators/admin/all — all calculators (admin, unpublished included)
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('calculators')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/calculators — all published (PUBLIC)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('calculators')
    .select('id, name, slug, description, category, meta_title, meta_description')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/calculators/:slug — single published (PUBLIC)
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('calculators')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('is_published', true)
    .single();
  if (error) return res.status(404).json({ error: 'Calculator not found' });
  res.json(data);
});

// POST /api/calculators — admin create
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('calculators')
    .insert(req.body)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/calculators/:id — admin update
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('calculators')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/calculators/:id — admin delete
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('calculators')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

module.exports = router;
