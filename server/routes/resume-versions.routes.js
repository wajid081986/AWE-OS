const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/resume-versions
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resume_versions')
      .select('id, name, created_at, updated_at')
      .eq('user_id', req.user.userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, versions: data || [] });
  } catch (err) {
    console.error('Get resume versions error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch versions' });
  }
});

// POST /api/resume-versions
router.post('/', requireAuth, async (req, res) => {
  const { name = 'Untitled', data } = req.body;
  if (!data) return res.status(400).json({ success: false, error: 'data is required' });
  try {
    const { data: created, error } = await supabase
      .from('resume_versions')
      .insert({ user_id: req.user.userId, name: (name || 'Untitled').trim(), data })
      .select('id, name, created_at, updated_at')
      .single();
    if (error) throw error;
    res.json({ success: true, version: created });
  } catch (err) {
    console.error('Save resume version error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save version' });
  }
});

// GET /api/resume-versions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resume_versions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .single();
    if (error || !data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, version: data });
  } catch (err) {
    console.error('Get resume version error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch version' });
  }
});

// PUT /api/resume-versions/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { name, data } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = (name || 'Untitled').trim();
  if (data !== undefined) updates.data = data;
  try {
    const { data: updated, error } = await supabase
      .from('resume_versions')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select('id, name, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, version: updated });
  } catch (err) {
    console.error('Update resume version error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update version' });
  }
});

// DELETE /api/resume-versions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('resume_versions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Delete resume version error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete version' });
  }
});

module.exports = router;
