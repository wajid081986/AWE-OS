const supabase = require('../db/supabase');

async function requireSeller(req, res, next) {
  if (!req.user?.userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { data: seller } = await supabase
      .from('store_sellers')
      .select('*')
      .eq('user_id', req.user.userId)
      .maybeSingle();

    if (!seller) {
      return res.status(403).json({ success: false, error: 'Seller registration required' });
    }
    if (seller.status !== 'approved') {
      return res.status(403).json({ success: false, error: 'Seller account is suspended' });
    }

    req.seller = seller;
    next();
  } catch {
    return res.status(500).json({ success: false, error: 'Seller authorization check failed' });
  }
}

module.exports = { requireSeller };
