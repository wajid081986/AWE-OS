const jwt      = require('jsonwebtoken');
const supabase = require('../db/supabase');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });

    if (!payload.userId && !payload.id) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (payload.jti) {
      const { data: blocked } = await supabase
        .from('token_blacklist')
        .select('jti')
        .eq('jti', payload.jti)
        .maybeSingle();
      if (blocked) return res.status(401).json({ success: false, error: 'Token revoked' });
    }

    req.user = {
      userId:   payload.userId || payload.id,
      email:    payload.email,
      jti:      payload.jti,
      tokenExp: payload.exp,
    };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: msg });
  }
}

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
