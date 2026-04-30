const supabase    = require('../db/supabase');
const requireAuth = require('./auth');

async function requireAdmin(req, res, next) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    req.user.role = 'admin';
    next();
  } catch {
    return res.status(500).json({ success: false, error: 'Authorization check failed' });
  }
}

module.exports = { requireAuth, requireAdmin };
