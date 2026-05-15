const express  = require('express');
const OpenAI   = require('openai');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/admin.middleware');
const { trackToolUsage } = require('../services/analytics.service');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/agents/run
router.post('/run', requireAuth, async (req, res) => {
  const { toolSlug, inputs } = req.body;

  if (!toolSlug || !inputs || typeof inputs !== 'object') {
    return res.status(400).json({ success: false, error: 'toolSlug and inputs are required' });
  }

  try {
    // Fetch tool from tools
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('*')
      .eq('slug', toolSlug)
      .eq('approved', true)
      .maybeSingle();

    if (toolErr) throw toolErr;
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });

    // Fetch user permissions and subscription
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('role, permissions, subscription_status')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (userErr) throw userErr;

    const hasAccess =
      tool.is_free ||
      user?.role === 'admin' ||
      (Array.isArray(user?.permissions) && user.permissions.includes(`tool:${tool.slug}`)) ||
      user?.subscription_status === 'active';

    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'Access denied', code: 'NO_ACCESS' });
    }

    // Replace {{variable}} placeholders
    let prompt = tool.ai_prompt;
    for (const [key, value] of Object.entries(inputs)) {
      prompt = prompt.replaceAll(`{{${key}}}`, String(value ?? ''));
    }

    const startTime  = Date.now();
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  2000,
      temperature: 0.7,
    });
    const responseTime = Date.now() - startTime;

    const result = completion.choices[0]?.message?.content?.trim() ?? '';

    trackToolUsage(
      req.user.userId,
      toolSlug,
      Object.keys(inputs).length,
      result.length,
      responseTime,
    ).catch(console.error);

    return res.json({ success: true, result });
  } catch (err) {
    console.error('[agents/run]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
