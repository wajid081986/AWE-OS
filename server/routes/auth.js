'use strict';

const express     = require('express');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { z }       = require('zod');
const rateLimit   = require('express-rate-limit');
const supabase    = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Tighter limit for password-reset endpoints — prevents token-generation abuse
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many password reset attempts, try again in 1 hour.' },
});

const RegisterSchema = z.object({
  email:    z.string().email('Invalid email').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email:    z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

function signToken(userId, email, role, permissions) {
  return jwt.sign(
    { userId, email, role, permissions, jti: uuidv4() },
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

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash })
      .select('id, email, is_premium, role, permissions')
      .single();

    if (error) throw error;

    const token = signToken(user.id, user.email, user.role ?? 'user', user.permissions ?? []);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id:          user.id,
        email:       user.email,
        role:        user.role        ?? 'user',
        permissions: user.permissions ?? [],
        isPremium:   user.is_premium  ?? false,
      },
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
      .select('id, email, password_hash, is_premium, role, permissions, subscription_status')
      .eq('email', email)
      .maybeSingle();

    const passwordMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = signToken(user.id, user.email, user.role ?? 'user', user.permissions ?? []);

    return res.json({
      success: true,
      token,
      user: {
        id:                 user.id,
        email:              user.email,
        role:               user.role               ?? 'user',
        permissions:        user.permissions         ?? [],
        isPremium:          user.is_premium          ?? false,
        subscriptionStatus: user.subscription_status ?? 'free',
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ── POST /api/auth/forgot-password ─────────────────────────
router.post('/forgot-password', resetLimiter, async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();

  // Always respond the same way — never reveal whether the email exists
  const safeResponse = () =>
    res.json({ success: true, message: 'Reset link sent if email exists' });

  if (!email) return safeResponse();

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (!user) return safeResponse();

    const resetToken   = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabase
      .from('users')
      .update({ password_reset_token: resetToken, password_reset_expires: resetExpires })
      .eq('id', user.id);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink   = `${frontendUrl}/reset-password?token=${resetToken}`;

    // ── Email delivery ──────────────────────────────────────────
    // Configure RESEND_API_KEY (or SENDGRID_API_KEY / SMTP_*) in .env
    // and replace this block with your chosen provider's send call.
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:    process.env.EMAIL_FROM || 'noreply@awe-os.com',
          to:      user.email,
          subject: 'Reset your AWE-OS password',
          html:    `<p>Click the link below to reset your password (valid 1 hour):</p>
                    <p><a href="${resetLink}">${resetLink}</a></p>
                    <p>If you did not request this, ignore this email.</p>`,
        });
      } catch (mailErr) {
        console.error('[AUTH] Email send failed:', mailErr.message);
        // token is already stored — user can retry; don't block the safe response
      }
    } else {
      // Surface the missing integration in logs so it is never silently swallowed
      console.error(
        '[AUTH] Password reset: RESEND_API_KEY not configured — token generated but email NOT sent.',
        { userId: user.id, expiresAt: resetExpires }
      );
      // In development, print the reset link so developers can test the flow
      if (process.env.NODE_ENV !== 'production') {
        console.info('[AUTH][DEV] Reset link:', resetLink);
      }
    }

    return safeResponse();
  } catch (err) {
    console.error('Forgot password error:', err.message);
    return safeResponse();
  }
});

// ── POST /api/auth/reset-password ──────────────────────────
router.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || typeof token !== 'string' || token.length !== 64) {
    return res.status(400).json({ success: false, error: 'Invalid or missing reset token' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }

  try {
    const now = new Date().toISOString();

    const { data: user } = await supabase
      .from('users')
      .select('id, password_reset_token, password_reset_expires')
      .eq('password_reset_token', token)
      .maybeSingle();

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    if (!user.password_reset_expires || user.password_reset_expires < now) {
      return res.status(400).json({ success: false, error: 'Reset token has expired' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { error } = await supabase
      .from('users')
      .update({
        password_hash:          passwordHash,
        password_reset_token:   null,
        password_reset_expires: null,
      })
      .eq('id', user.id);

    if (error) throw error;

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_premium, role, permissions, subscription_status')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({
      success: true,
      user: {
        id:                 user.id,
        email:              user.email,
        role:               user.role               ?? 'user',
        permissions:        user.permissions         ?? [],
        isPremium:          user.is_premium          ?? false,
        subscriptionStatus: user.subscription_status ?? 'free',
      },
    });
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
