const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.use(requireAuth);

// GET / — list all invoices for the authenticated user
router.get('/', async (req, res) => {
  const userId = req.user?.userId;
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, client_name, total_amount, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: 'Server error' });
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[Invoice Generator Pro]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / — create invoice
router.post('/', async (req, res) => {
  const userId = req.user?.userId;
  const { items, client_name, total_amount } = req.body;

  if (!client_name || !Array.isArray(items) || typeof total_amount !== 'number') {
    return res.status(400).json({ success: false, message: 'Validation failed: client_name, items[], and total_amount are required' });
  }

  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert([{ user_id: userId, items, client_name, total_amount }])
      .select('id, client_name, total_amount, status, created_at')
      .single();

    if (error) return res.status(500).json({ success: false, message: 'Server error' });
    return res.status(201).json({ success: true, data, message: 'Invoice created successfully' });
  } catch (err) {
    console.error('[Invoice Generator Pro]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id — get single invoice
router.get('/:id', async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, message: 'Invoice not found' });
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    return res.json({ success: true, data: invoice });
  } catch (err) {
    console.error('[Invoice Generator Pro]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /:id — delete invoice
router.delete('/:id', async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, message: 'Invoice not found' });
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    return res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('[Invoice Generator Pro]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
