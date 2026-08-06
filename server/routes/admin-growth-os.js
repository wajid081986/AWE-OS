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
// One composed AI call: keyword research + competitor gap analysis + 7-day
// content calendar, scoped to a single AWE-OS tool + audience + weekly goal.

router.post('/strategy', requireAuth, requireAdmin, async (req, res) => {
  const { toolSlug, toolName, toolCategory, audience, goal } = req.body
  if (!toolSlug || !toolName) {
    return res.status(400).json({ success: false, error: 'toolSlug and toolName are required' })
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 3000,
      messages: [{
        role: 'system',
        content: `You are a growth marketing strategist for AWE-OS (awe-os.com), a free browser-based tools platform for Indian users. Given one tool, its target audience, and a weekly content goal, produce a complete growth strategy.
Return ONLY valid JSON, no markdown, no explanation:
{
  "keywords": [
    { "keyword": "string", "volume": "High|Medium|Low", "competition": "High|Medium|Low", "relatedQuestions": ["string", "string"] }
  ],
  "competitors": [
    { "url": "string (realistic competitor domain, no protocol)", "ranksFor": ["string"], "gaps": ["string — specific content the competitor is missing that AWE-OS could cover"] }
  ],
  "calendar": [
    { "day": 1, "platform": "Blog", "title": "string", "estimatedImpact": "High|Medium|Low" }
  ]
}
Rules:
- Exactly 10 keywords, ordered by relevance.
- Exactly 3 competitors, real plausible tool/finance/utility sites for the Indian market (not awe-os.com).
- Exactly 7 calendar entries, one per day, using this fixed day→platform order: 1=Blog, 2=Quora, 3=Reddit, 4=LinkedIn, 5=Blog, 6=Pinterest, 7=Email Newsletter. Each title must be specific to that day's platform and angle, not a repeat of another day.`,
      }, {
        role: 'user',
        content: `Tool: ${toolName} (${toolSlug})
Category: ${toolCategory || 'General'}
Target audience: ${audience || 'General India'}
This week's content goal: ${goal || 'Drive traffic'}

Generate the full strategy.`,
      }],
    })

    const raw    = completion.choices[0]?.message?.content || ''
    const parsed = parseAIJson(raw)

    const calendar = (parsed.calendar || []).map((entry, i) => ({
      day:             CALENDAR_PLATFORMS[i]?.day || entry.day || i + 1,
      platform:        CALENDAR_PLATFORMS[i]?.platform || entry.platform,
      title:           entry.title || '',
      estimatedImpact: entry.estimatedImpact || 'Medium',
    }))

    res.json({
      success:     true,
      keywords:    parsed.keywords    || [],
      competitors: parsed.competitors || [],
      calendar,
    })
  } catch (err) {
    console.error('[admin-growth-os/strategy]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
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

module.exports = router
