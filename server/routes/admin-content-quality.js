const express       = require('express')
const supabase       = require('../db/supabase')
const requireAuth    = require('../middleware/auth')
const { getOpenAI }  = require('../core/ai-engine')
const parseAIJson    = require('../services/parseAIJson')

const router = express.Router()

// Explicit per-call ceiling instead of the SDK's ~10min default.
const AI_CALL_TIMEOUT_MS = 90_000

// ── Admin guard ───────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// ── Tool content generation prompt ──────────────────────────────────────────
// Mirrors the voice rules from admin-blog.js's generatePostContent() (default
// beginner-friendly tone, ₹/Indian context, no corporate-AI phrasing) so tool
// pages and blog posts read as one site's writing — adapted for shape, since
// About/FAQ is a short section, not a full article.

function buildContentPrompt({ name, description, category }) {
  return `You are a professional content writer for AWE-OS (awe-os.com) — a free browser-based
tools website for Indian users. Write for someone completely new to this tool: simple
language, explain any term that isn't obvious. Use ₹ and Indian number format
(₹12,75,000) where money or numbers come up naturally — don't force it if the tool has
nothing to do with numbers.

Tool name: ${name}
Category: ${category || 'General'}
Short description: ${description || 'Not provided'}

Write:
1. "about" — 6 paragraphs (3-5 sentences each), 700-800 words total. Be specific to this
   tool throughout — generic filler ("is one of the most popular tools") is exactly what
   NOT to write. Each paragraph has a distinct job, so the length comes from real substance,
   not padding:
   1. What the tool does and who it's for.
   2. How AWE-OS's version specifically works (browser-based, no signup, no upload — files
      never leave the device) and why that beats the manual/alternative way of doing this.
   3. A concrete, tool-specific use-case scenario.
   4. A second, different concrete use-case scenario.
   5. Practical tips for getting the best result from this specific tool.
   6. Indian-context relevance where it naturally applies (₹, common Indian forms/documents/
      scenarios) — don't force it if the tool has nothing to do with that.
2. "faq" — exactly 6 question/answer pairs specific to this tool (not generic site-wide
   questions like "is it free"). Each answer 60-90 words.

Avoid corporate/AI phrasing: no "In conclusion", "It is worth noting", "leverage",
"seamless", "in today's fast-paced world". Write like a knowledgeable person explaining it
to a friend, not a marketing brochure. Do not pad sentences just to hit a word count —
add genuine substance (use cases, tips, specifics) instead.

Return ONLY valid JSON, no markdown fences:
{
  "about": ["paragraph 1", "paragraph 2", "paragraph 3", "paragraph 4", "paragraph 5", "paragraph 6"],
  "faq": [
    {"q": "Question specific to this tool?", "a": "60-90 word answer."}
  ]
}`
}

// ── GET /tools — backlog list (tools with no content, or content that's ────
// ── still too thin — below MIN_ABOUT_WORDS from a pre-batch-85 generation) ──

// Below the new 700-800 word target with margin for natural variance, but
// comfortably above the legacy ~138-162 word content this needs to catch —
// see docs/batches/batch-85-plan.md for the reasoning.
const MIN_ABOUT_WORDS = 400

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length
}

router.get('/tools', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, slug, category, approved, status, about_content, content_generated_at, created_at')
      // approved=true is the only reliable "actually public" signal — matches
      // tools.controller.js's getPublicTools/getPublicTool exactly. status is
      // NOT a valid gate here: the old idea-pipeline sets it ('idea' ->
      // 'building' -> ...), but the AI Factory pipeline (ai-factory.service.js
      // runFactory(), all product types) never touches tools.status at all, so
      // an AI-Factory-published, approved=true tool can sit at status='idea'
      // forever. A status filter here silently excludes real published tools.
      .eq('approved', true)
      // Excludes hand-built tools synced by sync-tool-registry.js that render
      // via their own TOOL_COMPONENTS entry — they never hit the generic
      // fallback template this backlog exists to fix.
      .eq('has_dedicated_component', false)
      .order('created_at', { ascending: false })
    if (error) throw error

    // Surface never-generated AND thin-existing content — PostgREST can't
    // express "word count below N" as a DB filter, so this check happens
    // here. Also de-dupe by name: the idea pipeline's duplicate detector
    // only checks status='idea' rows within a 30-day window, so the same
    // tool name can land here multiple times under different slugs. Keep
    // the newest occurrence (rows are already ordered created_at desc).
    const seen  = new Set()
    const tools = (data || []).filter(t => {
      if (t.about_content !== null && wordCount(t.about_content) >= MIN_ABOUT_WORDS) return false
      const key = t.name.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    res.json({ success: true, tools })
  } catch (err) {
    console.error('[admin-content-quality/tools]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /blog-summary — counts only, dashboard links out to /admin/blog ─────

router.get('/blog-summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, ai_score')
      .eq('status', 'published')
    if (error) throw error
    const posts     = data || []
    const unscored   = posts.filter(p => p.ai_score === null || p.ai_score === undefined).length
    res.json({ success: true, published: posts.length, unscored })
  } catch (err) {
    console.error('[admin-content-quality/blog-summary]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /tools/:id/generate — preview only, does NOT persist ───────────────

router.post('/tools/:id/generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: tool, error } = await supabase
      .from('tools')
      .select('id, name, slug, description, category')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' })

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      // 700-800 words (about) + 6x60-90 words (faq) is ~1400-1800 tokens of
      // content before JSON structure/escaping overhead — 1200 was sized for
      // the old ~150-word target and would truncate mid-response now.
      max_tokens: 3000,
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: buildContentPrompt(tool) },
      ],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    const about  = Array.isArray(result?.about) ? result.about.filter(p => typeof p === 'string' && p.trim()) : []
    const faq    = Array.isArray(result?.faq)
      ? result.faq.filter(f => f?.q && f?.a).map(f => ({ q: String(f.q), a: String(f.a) }))
      : []

    if (about.length === 0 || faq.length === 0) {
      return res.json({ success: false, error: 'AI response missing about or faq content' })
    }

    res.json({ success: true, result: { toolId: tool.id, about, faq } })
  } catch (err) {
    console.error('[admin-content-quality/tools/:id/generate]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /tools/:id/save — persists a previously returned generate result ───

router.post('/tools/:id/save', requireAuth, requireAdmin, async (req, res) => {
  const { about, faq } = req.body
  if (!Array.isArray(about) || about.length === 0) {
    return res.status(400).json({ success: false, error: 'about (non-empty array) is required' })
  }
  try {
    const { error } = await supabase
      .from('tools')
      .update({
        about_content:        about.join('\n\n'),
        faq:                  Array.isArray(faq) ? faq : [],
        content_generated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('[admin-content-quality/tools/:id/save]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
