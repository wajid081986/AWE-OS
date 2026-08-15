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
1. "about" — 3 short paragraphs (max 4 sentences each) introducing this specific tool: what
   it does, who it's for, and why someone would use AWE-OS's version over doing it manually.
   Be specific to this tool, not generic filler ("is one of the most popular tools" is
   exactly what NOT to write).
2. "faq" — exactly 5 question/answer pairs specific to this tool (not generic site-wide
   questions like "is it free"). Each answer 40-60 words.

Avoid corporate/AI phrasing: no "In conclusion", "It is worth noting", "leverage",
"seamless", "in today's fast-paced world". Write like a knowledgeable person explaining it
to a friend, not a marketing brochure.

Return ONLY valid JSON, no markdown fences:
{
  "about": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "faq": [
    {"q": "Question specific to this tool?", "a": "40-60 word answer."}
  ]
}`
}

// ── GET /tools — backlog list (tools with no about_content yet) ─────────────

router.get('/tools', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, slug, category, approved, status, about_content, content_generated_at, created_at')
      // approved alone isn't enough — idea-pipeline.js sets approved=true while
      // status is still 'idea'/'building', so status='live' excludes tools that
      // haven't actually shipped yet.
      .eq('approved', true)
      .eq('status', 'live')
      // Excludes hand-built tools synced by sync-tool-registry.js that render
      // via their own TOOL_COMPONENTS entry — they never hit the generic
      // fallback template this backlog exists to fix.
      .eq('has_dedicated_component', false)
      .is('about_content', null)
      .order('created_at', { ascending: false })
    if (error) throw error

    // De-dupe by name: the idea pipeline's duplicate detector only checks
    // status='idea' rows within a 30-day window, so the same tool name can
    // land here multiple times under different slugs. Keep the newest
    // occurrence (rows are already ordered created_at desc).
    const seen  = new Set()
    const tools = (data || []).filter(t => {
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
      max_tokens: 1200,
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
