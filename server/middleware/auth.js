const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const token = authHeader.slice(7);

    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if ((!payload.userId && !payload.id) || typeof payload.email !== 'string') {
      throw new Error('Invalid token payload');
    }

    req.user = {
      userId: payload.userId || payload.id,
      email: payload.email,
    };

    next();
  } catch (err) {
    console.error('Auth error');

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};