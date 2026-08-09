const express  = require('express');
const OpenAI   = require('openai');
const supabase = require('../db/supabase');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { getPublicTools, getPublicTool } = require('../controllers/tools.controller');
const { generatePresignedUrl } = require('../services/s3.service');

const Anthropic = require('@anthropic-ai/sdk');

const router   = express.Router();
const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Explicit per-call ceiling instead of the SDK's ~10min default.
const AI_CALL_TIMEOUT_MS = 60_000

// ── helpers ──────────────────────────────────────────────────────────────────

function toRow(body) {
  const row = {};
  if (body.name        !== undefined) row.name         = body.name;
  if (body.slug        !== undefined) row.slug         = body.slug;
  if (body.description !== undefined) row.description  = body.description;
  if (body.category    !== undefined) row.category     = body.category;
  if (body.price       !== undefined) row.price        = Number(body.price) || 0;
  if (body.is_free     !== undefined) row.is_free      = Boolean(body.is_free);
  if (body.isFree      !== undefined) row.is_free      = Boolean(body.isFree);
  if (body.approved !== undefined) row.approved = Boolean(body.approved);
  const publishedVal = body.isPublished ?? body.is_published;
  if (publishedVal !== undefined) row.approved = Boolean(publishedVal);
  if (body.input_fields !== undefined) row.input_fields = body.input_fields;
  if (body.inputFields  !== undefined) row.input_fields = body.inputFields;
  if (body.ai_prompt    !== undefined) row.ai_prompt    = body.ai_prompt;
  if (body.aiPrompt     !== undefined) row.ai_prompt    = body.aiPrompt;
  return row;
}

// ── GET /api/tools — published list (public) ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, name, slug, description, input_fields, price, is_free, category, approved, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, tools: tools ?? [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/tools/resume/ai-summary — backward-compat for resume module ──
router.post('/resume/ai-summary', requireAuth, async (req, res) => {
  const { job_title, skills = [], experience_years = 0 } = req.body;
  if (!job_title?.trim()) {
    return res.status(400).json({ error: 'job_title is required' });
  }

  const skillsText = (Array.isArray(skills) ? skills : []).slice(0, 6).join(', ');
  const expText    = experience_years > 0
    ? `${experience_years}+ year${experience_years > 1 ? 's' : ''} of experience`
    : 'a strong foundation';

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'user', content: `Write a professional resume summary for a ${job_title.trim()}.${skillsText ? ` Key skills: ${skillsText}.` : ''} They have ${expText}.\n\nRequirements:\n- 2-3 sentences, max 260 characters total\n- Professional, confident tone (no first-person)\n- Highlight impact and measurable value\n- ATS-friendly\n- Return ONLY the summary text, nothing else` }],
      max_tokens:  120,
      temperature: 0.72,
    }, { timeout: AI_CALL_TIMEOUT_MS });
    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) throw new Error('Empty response');
    return res.json({ success: true, summary });
  } catch {
    const top4        = (Array.isArray(skills) ? skills : []).slice(0, 4).join(', ');
    const skillClause = top4 ? `Core expertise includes ${top4}.` : 'Skilled across the full development lifecycle.';
    const variants = [
      `Results-driven ${job_title.trim()} with ${expText} delivering high-impact solutions. ${skillClause} Proven track record of cross-functional collaboration and on-time delivery.`,
      `Dynamic ${job_title.trim()} bringing ${expText} building scalable, user-centric solutions. ${skillClause} Detail-oriented approach to quality with a passion for continuous learning.`,
    ];
    return res.json({ success: true, summary: variants[Math.floor(Math.random() * variants.length)] });
  }
});

// ── POST /api/tools — create (admin) ─────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = toRow(req.body);
    if (!row.name || !row.slug || !row.ai_prompt) {
      return res.status(400).json({ success: false, error: 'name, slug and ai_prompt are required' });
    }

    const { data: tool, error } = await supabase
      .from('tools')
      .insert(row)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Slug already exists' });
      }
      throw error;
    }
    res.status(201).json({ success: true, tool });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── GET /api/tools/public — public list (paginated, filtered, searchable) ──
// MUST be before /:slugOrId wildcard
router.get('/public',      getPublicTools);
router.get('/public/:slug', getPublicTool);

// ── POST /api/tools/:slug/run — execute a tool (public + admin preview) ──
// MUST be before /:slugOrId wildcard
router.post('/:slug/run', async (req, res) => {
  try {
    const { slug } = req.params;

    // Check optional admin auth — admins can run unapproved tools for preview
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = require('jsonwebtoken').verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET
        );
        isAdmin = decoded.role === 'admin';
      } catch (_) {}
    }

    console.log('[/run]', slug, 'isAdmin:', isAdmin, 'body:', JSON.stringify(req.body));

    let toolQuery = supabase
      .from('tools')
      .select('id, name, slug, ai_prompt, input_fields, approved, usage_count')
      .eq('slug', slug);

    if (!isAdmin) {
      toolQuery = toolQuery.eq('approved', true);
    }
    const { data: tool, error: fetchError } = await toolQuery.maybeSingle();

    if (fetchError) throw fetchError;
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });

    const fields = Array.isArray(tool.input_fields) ? tool.input_fields : [];
    const missing = fields
      .filter(f => f.required && !req.body[f.name]?.toString().trim())
      .map(f => f.name);

    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }

    let prompt = tool.ai_prompt || '';
    for (const field of fields) {
      if (req.body[field.name] !== undefined) {
        prompt = prompt.replaceAll(`{{${field.name}}}`, req.body[field.name]);
      }
    }

    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    }, { timeout: AI_CALL_TIMEOUT_MS });
    const result = message.content[0]?.text || 'No response generated.';

    supabase
      .from('tools')
      .update({ usage_count: (tool.usage_count ?? 0) + 1, last_used_at: new Date().toISOString() })
      .eq('id', tool.id)
      .then(({ error }) => { if (error) console.error('usage update failed:', error.message); });

    res.json({ success: true, result, tool: { id: tool.id, name: tool.name, slug: tool.slug } });
  } catch (err) {
    console.error('[/run] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/tools/:slug/download — download non-prompt product assets ───
// MUST be before /:slugOrId wildcard
router.get('/:slug/download', async (req, res) => {
  try {
    const { slug } = req.params;

    // Same gate as /:slug/run — admins can preview unapproved products.
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    // TEMPORARY DEBUG — approved-gate investigation, remove after diagnosis
    console.log('[DEBUG download gate] authHeader:', authHeader || 'MISSING');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = require('jsonwebtoken').verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET
        );
        isAdmin = decoded.role === 'admin';
      } catch (_) {}
    }
    // TEMPORARY DEBUG — approved-gate investigation, remove after diagnosis
    console.log('[DEBUG download gate] admin branch taken:', isAdmin);

    let toolQuery = supabase
      .from('tools')
      .select('id, slug, product_type, asset_url, approved')
      .eq('slug', slug);

    if (!isAdmin) {
      toolQuery = toolQuery.eq('approved', true);
    }
    const { data: tool, error } = await toolQuery.maybeSingle();
    // TEMPORARY DEBUG — approved-gate investigation, remove after diagnosis
    console.log('[DEBUG download gate] query result:', { slug, found: !!tool, approved: tool?.approved, filterApplied: !isAdmin });

    if (error) throw error;
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });

    if (tool.product_type === 'prompt-tool') {
      return res.status(400).json({ success: false, error: 'This product is executed via /run, not downloaded' });
    }
    if (!tool.asset_url) {
      return res.status(404).json({ success: false, error: 'No downloadable asset for this product' });
    }

    const url = await generatePresignedUrl(tool.asset_url, 300);
    res.redirect(url);
  } catch (err) {
    console.error('[/download] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/tools/:slugOrId — single tool ────────────────────────────────
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const { data: tool, error } = await supabase
      .from('tools')
      .select('*')
      .eq(isUUID ? 'id' : 'slug', slugOrId)
      .maybeSingle();

    if (error) throw error;
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    res.json({ success: true, tool });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/tools/:id — update (admin) ──────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = toRow(req.body);
    console.log('[PUT /tools] row being saved:', JSON.stringify(row));
    row.updated_at = new Date().toISOString();

    const { data: tool, error } = await supabase
      .from('tools')
      .update(row)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    res.json({ success: true, tool });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/tools/:id — delete (admin) ───────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('tools')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Tool deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
