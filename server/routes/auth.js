// ===== NEW CODE START =====
const express     = require('express');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z }       = require('zod');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const RegisterSchema = z.object({
  email:    z.string().email('Invalid email').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email:    z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

function signToken(userId, email) {
  return jwt.sign(
    { userId, email, jti: uuidv4() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ─────────────────────────────────
router.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { email, password } = parsed.data;

  try {
    // Check for existing account
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash })
      .select('id, email, is_premium')
      .single();

    if (error) throw error;

    const token = signToken(user.id, user.email);

    return res.status(201).json({
      success: true,
      token,
      user: { email: user.email, isPremium: user.is_premium },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    // Generic message to avoid revealing which field failed
    return res.status(400).json({ success: false, error: 'Invalid credentials' });
  }

  const { email, password } = parsed.data;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash, is_premium')
      .eq('email', email)
      .maybeSingle();

    const passwordMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = signToken(user.id, user.email);

    return res.json({
      success: true,
      token,
      user: { email: user.email, isPremium: user.is_premium },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

console.log("✅ AUTH ROUTES LOADED");
// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('email, is_premium')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({ success: true, user: { email: user.email, isPremium: user.is_premium } });
  } catch (err) {
    console.error('Me error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// ── POST /api/auth/logout ───────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.user.jti && req.user.tokenExp) {
      const expiresAt = new Date(req.user.tokenExp * 1000).toISOString();
      await supabase
        .from('token_blacklist')
        .insert({ jti: req.user.jti, expires_at: expiresAt });
    }
    await supabase
      .from('users')
      .update({ last_logout_at: new Date().toISOString() })
      .eq('id', req.user.userId);
  } catch (_) {
    // Non-fatal — client will clear token regardless
  }
  return res.json({ success: true });
});

module.exports = router;
// ===== NEW CODE END =====
