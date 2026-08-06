const express        = require('express')
const requireAuth     = require('../middleware/auth')
const supabase         = require('../db/supabase')
const { getOpenAI }    = require('../core/ai-engine')
const parseAIJson      = require('../services/parseAIJson')

const router = express.Router()

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// Day → platform mapping fixed per the Growth OS spec (7-day cadence).
const CALENDAR_PLATFORMS = [
  { day: 1, platform: 'Blog' },
  { day: 2, platform: 'Quora' },
  { day: 3, platform: 'Reddit' },
  { day: 4, platform: 'LinkedIn' },
  { day: 5, platform: 'Blog' },
  { day: 6, platform: 'Pinterest' },
  { day: 7, platform: 'Email Newsletter' },
]

// ── POST /api/admin/growth-os/strategy ────────────────────────────────────────
// Three independent AI calls (keyword research, competitor gap analysis,
// 7-day content calendar) fired in parallel, each capped at a 30s timeout so
// one slow call can't stall the other two. A single failed section degrades
// to an empty array rather than failing the whole request.

const STRATEGY_TIMEOUT_MS = 30_000

async function callStrategySection(systemPrompt, userPrompt, maxTokens) {
  const completion = await getOpenAI().chat.completions.create(
    {
      model:      'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    },
    { timeout: STRATEGY_TIMEOUT_MS }
  )
  return parseAIJson(completion.choices[0]?.message?.content || '')
}

router.post('/strategy', requireAuth, requireAdmin, async (req, res) => {
  const { toolSlug, toolName, toolCategory, audience, goal } = req.body
  if (!toolSlug || !toolName) {
    return res.status(400).json({ success: false, error: 'toolSlug and toolName are required' })
  }

  const context = `Tool: ${toolName} (${toolSlug})
Category: ${toolCategory || 'General'}
Target audience: ${audience || 'General India'}
This week's content goal: ${goal || 'Drive traffic'}`

  const [keywordsResult, competitorsResult, calendarResult] = await Promise.allSettled([
    callStrategySection(
      `You are an SEO researcher for AWE-OS (awe-os.com), a free browser-based tools platform for Indian users. Given one tool, its audience, and a weekly goal, research 10 keywords.
Return ONLY valid JSON, no markdown: { "keywords": [ { "keyword": "string", "volume": "High|Medium|Low", "competition": "High|Medium|Low", "relatedQuestions": ["string", "string"] } ] }
Exactly 10 keywords, ordered by relevance.`,
      context, 1200
    ),
    callStrategySection(
      `You are a competitive analyst for AWE-OS (awe-os.com). Given one tool, its audience, and a weekly goal, identify 3 competitors and the content gaps AWE-OS could cover.
Return ONLY valid JSON, no markdown: { "competitors": [ { "url": "string (realistic competitor domain, no protocol)", "ranksFor": ["string"], "gaps": ["string — specific content the competitor is missing"] } ] }
Exactly 3 competitors, real plausible tool/finance/utility sites for the Indian market (not awe-os.com).`,
      context, 1000
    ),
    callStrategySection(
      `You are a content planner for AWE-OS (awe-os.com). Given one tool, its audience, and a weekly goal, produce a 7-day content calendar.
Return ONLY valid JSON, no markdown: { "calendar": [ { "day": 1, "platform": "Blog", "title": "string", "estimatedImpact": "High|Medium|Low" } ] }
Exactly 7 entries, one per day, using this fixed day→platform order: 1=Blog, 2=Quora, 3=Reddit, 4=LinkedIn, 5=Blog, 6=Pinterest, 7=Email Newsletter. Each title must be specific to that day's platform and angle, not a repeat of another day.`,
      context, 1200
    ),
  ])

  const warnings = []
  const pick = (result, label, key) => {
    if (result.status === 'fulfilled') return result.value[key] || []
    console.error(`[admin-growth-os/strategy] ${label} failed:`, result.reason?.message)
    warnings.push(`${label} failed: ${result.reason?.message || 'unknown error'}`)
    return []
  }

  const keywords    = pick(keywordsResult,    'Keyword research',      'keywords')
  const competitors  = pick(competitorsResult, 'Competitor analysis',   'competitors')
  const rawCalendar = pick(calendarResult,    'Content calendar',      'calendar')

  const calendar = rawCalendar.map((entry, i) => ({
    day:             CALENDAR_PLATFORMS[i]?.day || entry.day || i + 1,
    platform:        CALENDAR_PLATFORMS[i]?.platform || entry.platform,
    title:           entry.title || '',
    estimatedImpact: entry.estimatedImpact || 'Medium',
  }))

  if (warnings.length === 3) {
    return res.status(502).json({ success: false, error: 'All strategy sections failed: ' + warnings.join('; ') })
  }

  res.json({ success: true, keywords, competitors, calendar, warnings })
})

// ── GET /api/admin/growth-os/recommendations ──────────────────────────────────
// Heuristic recommendations from real signals we actually have: which tools
// have no recent blog coverage, and the category mix of published posts.
// Not a live search/traffic API integration — labelled as AI suggestions,
// not measured analytics.

router.get('/recommendations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: recentPosts, error } = await supabase
      .from('blog_posts')
      .select('title, category, related_tools, ai_score, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error

    const coveredSlugs = new Set(
      (recentPosts || []).flatMap(p => (p.related_tools || []).map(t => t.slug).filter(Boolean))
    )
    const categoryCounts = (recentPosts || []).reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1
      return acc
    }, {})
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 900,
      messages: [{
        role: 'system',
        content: `You are a growth advisor for AWE-OS. Given which content categories have been published recently and which have not, produce short, specific, actionable recommendations.
Return ONLY valid JSON:
{ "recommendations": [ { "type": "content-gap|platform|category", "message": "string, one specific actionable sentence", "priority": "High|Medium|Low" } ] }
Produce 4-6 recommendations. Be concrete — reference actual category names given, not generic advice.`,
      }, {
        role: 'user',
        content: `Recently published post categories (most recent 30): ${JSON.stringify(categoryCounts)}
Most-published category: ${topCategory || 'none yet'}
Number of distinct AWE-OS tools with a linked blog post in the last 30 posts: ${coveredSlugs.size}`,
      }],
    })

    const raw    = completion.choices[0]?.message?.content || ''
    const parsed = parseAIJson(raw)

    res.json({ success: true, recommendations: parsed.recommendations || [] })
  } catch (err) {
    console.error('[admin-growth-os/recommendations]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/growth-os/image-prompts ───────────────────────────────────
// Text-only prompt generation for a blog topic — does not call an image API.

router.post('/image-prompts', requireAuth, requireAdmin, async (req, res) => {
  const { topic, style } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })

  try {
    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 700,
      messages: [{
        role: 'system',
        content: `You write AI image-generation prompts for a blog's featured/social images. Style requested: ${style || 'Blog header'}.
Return ONLY valid JSON: { "prompts": ["string", "string", "string", "string", "string"] }
Exactly 5 prompts, each a single detailed sentence describing composition, subject, and mood — suitable to paste into an AI image generator.`,
      }, {
        role: 'user',
        content: `Blog topic: ${topic}`,
      }],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const parsed = parseAIJson(raw)
    res.json({ success: true, prompts: parsed.prompts || [] })
  } catch (err) {
    console.error('[admin-growth-os/image-prompts]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

module.exports = router
