const express     = require('express')
const OpenAI      = require('openai')
const fs          = require('fs')
const path        = require('path')
const vm          = require('vm')
const requireAuth = require('../middleware/auth')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Admin guard ───────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// ── AI JSON parser (same pattern as admin-blog.js) ────────────────────────────

function parseAIJson(raw) {
  const cleaned = (raw || '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const block = cleaned.match(/```(?:json)?\n?([\s\S]+?)\n?```/)
  if (block) { try { return JSON.parse(block[1].trim()) } catch {} }
  const start = cleaned.search(/[\[{]/)
  const end   = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
  throw new Error('Cannot parse AI response as JSON')
}

// ── ES module data file loader (both data files have zero imports) ────────────

function evalDataFile(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8')
    const cjs = src.replace(/export\s+const\s+/g, 'var ')
    const ctx = Object.create(null)
    vm.runInNewContext(cjs, ctx, { timeout: 5000 })
    return ctx
  } catch (e) {
    console.error('[admin-seo/evalDataFile]', path.basename(filePath), e.message)
    return {}
  }
}

// ── GET /api/admin/seo/dashboard-data ────────────────────────────────────────

router.get('/dashboard-data', requireAuth, requireAdmin, (req, res) => {
  try {
    const blogCtx = evalDataFile(path.resolve(__dirname, '../../client/src/data/blogPosts.js'))
    const toolCtx = evalDataFile(path.resolve(__dirname, '../../client/src/data/toolRegistry.js'))

    const posts       = Array.isArray(blogCtx.BLOG_POSTS)    ? blogCtx.BLOG_POSTS    : []
    const tools       = Array.isArray(toolCtx.TOOL_REGISTRY) ? toolCtx.TOOL_REGISTRY : []
    const activeTools = tools.filter(t => !t.comingSoon)

    const now       = new Date()
    const thisMonth = now.toISOString().slice(0, 7) // 'YYYY-MM'

    const articlesThisMonth = posts.filter(p => (p.date || '').startsWith(thisMonth)).length
    const blogCategories    = [...new Set(posts.map(p => p.category).filter(Boolean))]
    const toolCategories    = [...new Set(activeTools.map(t => t.category).filter(Boolean))]

    // Per-category article counts
    const categoryCounts = {}
    blogCategories.forEach(cat => {
      categoryCounts[cat] = posts.filter(p => p.category === cat).length
    })

    // Publishing streak: count consecutive recent posts within 3-day gaps
    const sortedDates = posts.map(p => p.date).filter(Boolean).sort().reverse()
    let streak    = 0
    let checkDate = new Date()
    for (const dateStr of sortedDates) {
      const diffDays = Math.round((checkDate - new Date(dateStr)) / 86400000)
      if (diffDays <= 3) { streak++; checkDate = new Date(dateStr) } else break
    }

    const lastPublished = sortedDates[0] || null

    const recentArticles = posts.slice(0, 5).map((p, i) => ({
      id:        p.id || i + 1,
      slug:      p.slug     || '',
      title:     p.title    || '',
      date:      p.date     || '',
      category:  p.category || '',
      wordCount: p.readTime
        ? parseInt((p.readTime || '5').replace(/[^0-9]/g, ''), 10) * 200
        : 1000,
    }))

    const topTools = activeTools.slice(0, 10).map(t => ({
      slug:       t.slug,
      name:       t.name,
      category:   t.category,
      hasContent: posts.some(p =>
        Array.isArray(p.relatedTools) && p.relatedTools.some(rt => rt.slug === t.slug)
      ),
    }))

    // Content gaps: tool categories with no blog coverage
    const blogCatSet  = new Set(blogCategories.map(c => c.toLowerCase()))
    const contentGaps = toolCategories
      .filter(cat => !blogCatSet.has(cat.toLowerCase()))
      .map(cat => `No blog articles covering "${cat}" tools`)

    // Current month calendar grid
    const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthlyCalendar = Array.from({ length: daysInMonth }, (_, i) => {
      const day     = String(i + 1).padStart(2, '0')
      const dateStr = `${thisMonth}-${day}`
      const article = posts.find(p => p.date === dateStr)
      return { date: dateStr, hasArticle: !!article, title: article?.title }
    })

    res.json({
      success: true,
      stats: {
        totalArticles:     posts.length,
        totalTools:        activeTools.length,
        articlesThisMonth,
        publishingStreak:  streak,
        categoriesCovered: blogCategories,
        categoryCounts,
        lastPublished,
      },
      recentArticles,
      topTools,
      contentGaps,
      monthlyCalendar,
    })
  } catch (err) {
    console.error('[admin-seo/dashboard-data]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/seo/daily-briefing ───────────────────────────────────────

router.post('/daily-briefing', requireAuth, requireAdmin, async (req, res) => {
  const {
    totalArticles    = 0,
    daysSinceLastPost = 0,
    unusedKeywords   = 0,
    lowScoreArticles = 0,
    currentMonth,
    currentDay,
  } = req.body

  const now   = new Date()
  const month = currentMonth || now.toLocaleString('default', { month: 'long' })
  const day   = currentDay   || now.toLocaleString('default', { weekday: 'long' })
  const dateFormatted = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const prompt = `Current AWE-OS stats:
- Total articles published: ${totalArticles}
- Days since last post: ${daysSinceLastPost}
- Unused keywords in research list: ${unusedKeywords}
- Articles needing optimisation: ${lowScoreArticles}
- Today: ${day}, ${month} ${now.getDate()}, ${now.getFullYear()}

Return this exact JSON — no extra text:
{
  "greeting": "Personal greeting mentioning ${day}",
  "date": "${dateFormatted}",
  "priorities": [
    {
      "rank": 1,
      "action": "Specific actionable SEO task for AWE-OS",
      "reason": "Why this matters today (mention Indian context)",
      "estimatedImpact": "High",
      "timeRequired": "20 minutes",
      "actionType": "write"
    },
    {
      "rank": 2,
      "action": "Second priority task",
      "reason": "Why this is important",
      "estimatedImpact": "Medium",
      "timeRequired": "30 minutes",
      "actionType": "optimize"
    },
    {
      "rank": 3,
      "action": "Third priority task",
      "reason": "Why this helps",
      "estimatedImpact": "Low",
      "timeRequired": "15 minutes",
      "actionType": "promote"
    }
  ],
  "trendingTopic": {
    "topic": "A trending finance or tech topic relevant to Indian users right now",
    "reason": "Why Indians are searching this now",
    "articleIdea": "Specific article title for AWE-OS blog",
    "keyword": "primary keyword phrase",
    "urgency": "Today"
  },
  "weeklyGoal": {
    "target": "Publish 3 articles this week",
    "progress": ${Math.min(totalArticles % 3, 3)},
    "remaining": "Specific description of what remains"
  },
  "motivationalNote": "Inspiring note specific to AWE-OS: free tools site with 40+ tools, 16 articles, growing Indian audience",
  "quickWin": "The single fastest 5-minute action to improve SEO right now"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI SEO advisor for AWE-OS.com — a free tools website for Indian users with 40+ tools and a growing blog. Generate a practical daily SEO briefing. Return ONLY valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })
    const raw     = completion.choices[0]?.message?.content || ''
    const briefing = parseAIJson(raw)
    res.json({ success: true, briefing })
  } catch (err) {
    console.error('[admin-seo/daily-briefing]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/seo/generate-programmatic ─────────────────────────────────

router.post('/generate-programmatic', requireAuth, requireAdmin, async (req, res) => {
  const {
    pageType,
    tool1Slug, tool2Slug,
    tool1Name, tool2Name,
    cityName,
    categoryName,
  } = req.body

  if (!pageType) return res.status(400).json({ success: false, error: 'pageType is required' })

  let userPrompt = ''
  let slug       = ''

  if (pageType === 'comparison') {
    if (!tool1Slug || !tool2Slug) {
      return res.status(400).json({ success: false, error: 'tool1Slug and tool2Slug required' })
    }
    slug = `${tool1Slug}-vs-${tool2Slug}`
    userPrompt = `Generate an 800+ word comparison page for AWE-OS.com.

Tool 1: ${tool1Name || tool1Slug} — https://awe-os.com/tools/${tool1Slug}
Tool 2: ${tool2Name || tool2Slug} — https://awe-os.com/tools/${tool2Slug}
Target URL: /compare/${slug}
Audience: Indian users. Use ₹ amounts, Indian business examples, local context.
Minimum: 800 words + comparison table + 4 FAQs

Return ONLY valid JSON:
{
  "slug": "${slug}",
  "title": "Compelling H1 comparing both tools",
  "metaTitle": "SEO title max 60 chars with both tool names",
  "metaDescription": "Max 155 chars — include tool names and CTA",
  "content": [
    { "type": "h1", "text": "Title" },
    { "type": "p", "text": "Opening paragraph 100+ words, Indian context" },
    { "type": "h2", "text": "What is ${tool1Name || tool1Slug}?" },
    { "type": "p", "text": "Description 80+ words" },
    { "type": "h2", "text": "What is ${tool2Name || tool2Slug}?" },
    { "type": "p", "text": "Description 80+ words" },
    { "type": "h2", "text": "Feature Comparison" },
    { "type": "table", "headers": ["Feature", "${tool1Name || tool1Slug}", "${tool2Name || tool2Slug}"], "rows": [["Speed", "val", "val"], ["Use Case", "val", "val"], ["Output", "val", "val"]] },
    { "type": "h2", "text": "Which Should You Use?" },
    { "type": "p", "text": "Decision guide 100+ words with Indian examples" },
    { "type": "h2", "text": "Frequently Asked Questions" }
  ],
  "faqs": [
    { "q": "Question 1?", "a": "Answer 80+ words" },
    { "q": "Question 2?", "a": "Answer" },
    { "q": "Question 3?", "a": "Answer" },
    { "q": "Question 4?", "a": "Answer" }
  ],
  "wordCount": 850
}`

  } else if (pageType === 'city') {
    if (!tool1Slug || !cityName) {
      return res.status(400).json({ success: false, error: 'tool1Slug and cityName required' })
    }
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-')
    slug = `${tool1Slug}-${citySlug}`
    userPrompt = `Generate a 600+ word city-specific tool page for AWE-OS.com.

Tool: ${tool1Name || tool1Slug} — https://awe-os.com/tools/${tool1Slug}
City: ${cityName}, India
Target URL: /tools/${tool1Slug}/${citySlug}
Audience: ${cityName} businesses and individuals. Use ₹, ${cityName} examples, local tax/business context.
Minimum: 600 words + local examples + 4 FAQs

Return ONLY valid JSON with the same structure as a comparison page. slug: "${slug}". Focus entirely on how this tool helps ${cityName} users specifically.`

  } else if (pageType === 'faq-category') {
    if (!categoryName) {
      return res.status(400).json({ success: false, error: 'categoryName required' })
    }
    slug = `${categoryName.toLowerCase().replace(/\s+/g, '-')}-faq`
    userPrompt = `Generate a 1000+ word FAQ page for AWE-OS ${categoryName} tools.

Target URL: /faq/${slug}
Audience: Indian users
Minimum: 1000 words + 10 detailed FAQs (100+ words each answer)

Return ONLY valid JSON with the same structure as a comparison page. slug: "${slug}". Include 10 comprehensive FAQs covering everything Indian users ask about ${categoryName} tools.`
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a senior SEO content writer for AWE-OS.com. Generate HIGH-QUALITY programmatic SEO content. Minimum 600 words. Indian context throughout. Return ONLY valid JSON matching the requested page type.',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    })
    const raw  = completion.choices[0]?.message?.content || ''
    const page = parseAIJson(raw)
    res.json({ success: true, page })
  } catch (err) {
    console.error('[admin-seo/generate-programmatic]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
