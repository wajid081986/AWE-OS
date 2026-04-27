const express     = require('express');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');
const router      = express.Router();

router.use(requireAuth);

// POST / — process payment for an invoice
router.post('/', async (req, res) => {
  const { invoice_id, payment_method } = req.body;
  const userId = req.user?.userId;

  if (!invoice_id || !payment_method) {
    return res.status(400).json({ success: false, message: 'invoice_id and payment_method are required' });
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ invoice_id, payment_method, user_id: userId }])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, message: 'Invoice not found' });
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    return res.status(201).json({ success: true, data, message: 'Payment processed successfully' });
  } catch (err) {
    console.error('[Invoice Generator Pro]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
