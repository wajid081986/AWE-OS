const express  = require('express');
const OpenAI   = require('openai');
const supabase = require('../db/supabase');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { getPublicTools, getPublicTool } = require('../controllers/tools.controller');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  if (body.is_published !== undefined) row.is_published = Boolean(body.is_published);
  if (body.isPublished  !== undefined) row.is_published = Boolean(body.isPublished);
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
      .from('saas_tools')
      .select('id, name, slug, description, input_fields, price, is_free, category, is_published, created_at')
      .eq('is_published', true)
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
    });
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
      .from('saas_tools')
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

// ── GET /api/tools/:slugOrId — single tool ────────────────────────────────
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const { data: tool, error } = await supabase
      .from('saas_tools')
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
    row.updated_at = new Date().toISOString();

    const { data: tool, error } = await supabase
      .from('saas_tools')
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
      .from('saas_tools')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Tool deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
