const express          = require('express')
const fs               = require('fs')
const path             = require('path')
const vm               = require('vm')
const requireAuth      = require('../middleware/auth')
const { getOpenAI }    = require('../core/ai-engine')
const parseAIJson      = require('../services/parseAIJson')

const router = express.Router()

// ── Admin guard ───────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// ── Word count from content array ─────────────────────────────────────────────

function calcWordCount(content, faqs) {
  const blockText = (content || []).map(block => {
    if (block.type === 'p' || block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      return block.text || ''
    }
    if (block.type === 'ul') return (block.items || []).join(' ')
    if (block.type === 'table') {
      return [(block.headers || []).join(' '), ...(block.rows || []).map(r => r.join(' '))].join(' ')
    }
    return ''
  }).join(' ')

  const faqText = (faqs || []).map(f => `${f.q || ''} ${f.a || ''}`).join(' ')

  return [blockText, faqText]
    .join(' ')
    .split(/\s+/)
    .filter(w => w.length > 0).length
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
    const completion = await getOpenAI().chat.completions.create({
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
    const toolName = tool1Name || tool1Slug
    const citySlug = cityName.toLowerCase().replace(/\s+/g, '-')
    slug = `${tool1Slug}/${citySlug}`
    userPrompt = `Write a 1500+ word city-specific page for:
Tool: ${toolName}
City: ${cityName}, India
Tool URL: https://www.awe-os.com/tools/${tool1Slug}

Generate MINIMUM 1500 words of actual readable text in the content blocks.
Count only text values, NOT JSON keys or brackets.
Include at least 12-15 content blocks total.
Every section must be detailed and expanded — no summarizing.

REQUIRED SECTIONS (each section minimum 150 words):
1. Introduction (200 words): Why ${cityName} businesses/people need ${toolName}. Include city-specific context (main industries, economic activity, local challenges facing businesses).

2. H2: '${toolName} for ${cityName} — Key Features' (150 words): What makes this tool useful specifically for ${cityName} users, with detailed explanation. Include a data table with 5 rows.

3. H2: 'How to Use ${toolName} in ${cityName}' (200 words): Detailed step-by-step guide with ${cityName}-specific examples and ₹ amounts. Include at least 5 steps.

4. H2: '${cityName} Examples with Real Numbers' (250 words): 3 detailed real-world examples with ₹ amounts. Use ${cityName}'s actual industries (Mumbai=finance/textiles, Delhi=government/trade, Bengaluru=IT/startups, Hyderabad=pharma/IT, Chennai=manufacturing/auto, Pune=IT/auto, Ahmedabad=textiles/pharma, Kolkata=jute/trade, Surat=diamonds/textiles, Jaipur=tourism/gems). Each example must be at least 80 words.

5. H2: 'Who Needs ${toolName} in ${cityName}' (200 words): 5 specific user types relevant to ${cityName}'s economy. Each user type gets its own paragraph of 40+ words with a detailed explanation.

6. H2: 'Why AWE-OS ${toolName} is Perfect for ${cityName} Users' (150 words): Detailed benefits specific to ${cityName} with a bullet list of 5 items, each with a full sentence explanation.

7. Conclusion (150 words): Strong conclusion with specific reference to ${cityName} users. Clear CTA — free, no signup, works in browser, available 24/7.

GENERATE 5 FAQs — each answer minimum 120 words, specific to ${cityName} context.

TOTAL MUST BE 1500+ WORDS. Count carefully.

Return ONLY valid JSON:
{
  "slug": "${slug}",
  "title": "${toolName} for ${cityName} — Free Online Tool for ${cityName} Businesses",
  "metaTitle": "Free ${toolName} ${cityName} 2026 | AWE-OS",
  "metaDescription": "Use ${toolName} in ${cityName} — instant results, free, no signup required. Built for ${cityName} businesses.",
  "content": [
    { "type": "h1", "text": "WRITE COMPELLING H1 WITH ${cityName} AND ${toolName}" },
    { "type": "p", "text": "WRITE 150-WORD INTRO — WHY ${cityName} NEEDS ${toolName}, LOCAL INDUSTRIES, ECONOMIC CONTEXT" },
    { "type": "h2", "text": "${toolName} for ${cityName} — Key Features" },
    { "type": "p", "text": "WRITE 120+ WORDS ABOUT KEY FEATURES FOR ${cityName} USERS WITH LOCAL CONTEXT" },
    { "type": "table", "headers": ["Feature", "Benefit for ${cityName} Users", "Example"], "rows": [["100% Free", "No cost for ${cityName} SMEs", "${cityName} example"], ["Instant Results", "Real-time calculations", "${cityName} example"], ["No Signup", "Use immediately", "${cityName} example"], ["Indian Tax Compliant", "CGST/SGST breakdown", "${cityName} example"], ["Browser-Based", "Works on any device", "${cityName} example"]] },
    { "type": "h2", "text": "How to Use ${toolName} in ${cityName}" },
    { "type": "p", "text": "WRITE 150+ WORD STEP-BY-STEP GUIDE WITH ${cityName}-SPECIFIC ₹ AMOUNTS AND EXAMPLES" },
    { "type": "h2", "text": "${cityName} Examples with Real Numbers" },
    { "type": "p", "text": "WRITE 200+ WORDS WITH 3 REAL ${cityName} BUSINESS EXAMPLES. INCLUDE SPECIFIC LOCALITIES, INDUSTRIES, AND ₹ AMOUNTS" },
    { "type": "h2", "text": "Who Needs ${toolName} in ${cityName}" },
    { "type": "p", "text": "WRITE 150+ WORDS DESCRIBING 5 SPECIFIC USER TYPES IN ${cityName}'S ECONOMY WITH 30+ WORDS EACH" },
    { "type": "h2", "text": "Why AWE-OS ${toolName} is Perfect for ${cityName} Users" },
    { "type": "ul", "items": ["BENEFIT 1 SPECIFIC TO ${cityName}", "BENEFIT 2 WITH LOCAL CONTEXT", "BENEFIT 3", "BENEFIT 4", "BENEFIT 5 — MENTION FREE AND NO SIGNUP"] },
    { "type": "h2", "text": "Conclusion" },
    { "type": "p", "text": "WRITE 100+ WORD CONCLUSION WITH STRONG CTA — MENTION FREE, NO SIGNUP, WORKS IN BROWSER, LINK TO TOOL" }
  ],
  "faqs": [
    { "q": "WRITE FAQ Q1 SPECIFIC TO ${cityName}?", "a": "WRITE 100+ WORD ANSWER SPECIFIC TO ${cityName} USERS" },
    { "q": "WRITE FAQ Q2 SPECIFIC TO ${cityName}?", "a": "WRITE 100+ WORD ANSWER WITH ${cityName} BUSINESS CONTEXT" },
    { "q": "WRITE FAQ Q3 SPECIFIC TO ${cityName}?", "a": "WRITE 100+ WORD ANSWER" },
    { "q": "WRITE FAQ Q4 SPECIFIC TO ${cityName}?", "a": "WRITE 100+ WORD ANSWER" },
    { "q": "WRITE FAQ Q5 SPECIFIC TO ${cityName}?", "a": "WRITE 100+ WORD ANSWER" }
  ],
  "wordCount": 1500
}`

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

  // Per-type system prompt and token budget
  const systemPrompt = pageType === 'city'
    ? `You are a senior SEO content writer for AWE-OS.com. Write a COMPREHENSIVE city-specific tool page for Indian users. MANDATORY: Minimum 1500 words of actual readable text. Count only text content, NOT JSON structure. Use Indian context: ₹ amounts, local business examples, city-specific industries, local regulations. Every paragraph must be fully developed — no one-liners, no summaries. Return ONLY valid JSON — no markdown, no commentary, just the JSON object.`
    : 'You are a senior SEO content writer for AWE-OS.com. Generate HIGH-QUALITY programmatic SEO content. Indian context throughout. Return ONLY valid JSON matching the requested page type.'
  const maxTokens = pageType === 'city' ? 4000 : 3000

  try {
    const callAI = async (prompt) => {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      })
      const raw = completion.choices[0]?.message?.content || ''
      console.log('[admin-seo/generate-programmatic] raw length:', raw.length, 'preview:', raw.slice(0, 200))
      const p = parseAIJson(raw)
      p.wordCount = calcWordCount(p.content, p.faqs)
      console.log('[admin-seo/generate-programmatic] pageType:', pageType, 'wordCount:', p.wordCount, 'contentBlocks:', p.content?.length)
      return p
    }

    let page = await callAI(userPrompt)

    // City pages: auto-retry once if below 1200 words
    if (pageType === 'city' && page.wordCount < 1200) {
      const retryPrompt = userPrompt +
        `\n\nCRITICAL: Previous attempt only generated ${page.wordCount} words. This time write MORE. ` +
        `Add extra paragraphs to every section. Every paragraph must be at least 80 words. ` +
        `Do not summarize — expand each point fully with specific ${cityName} examples and ₹ amounts.`
      console.log('[admin-seo/generate-programmatic] Retry attempt 2 — wordCount was:', page.wordCount)
      const page2 = await callAI(retryPrompt)
      console.log('[admin-seo/generate-programmatic] After retry wordCount:', page2.wordCount)
      if (page2.wordCount > page.wordCount) page = page2
    }

    // Stamp tool/city metadata so CITY_PAGES entries are self-describing
    if (pageType === 'city') {
      page.toolSlug = tool1Slug
      page.toolName = tool1Name || tool1Slug
      page.cityName = cityName
    }

    res.json({ success: true, page })
  } catch (err) {
    console.error('[admin-seo/generate-programmatic]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── Publish city page to GitHub ───────────────────────────────────────────────
async function publishCityPageToGitHub(newPage, slug) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set — add it in Render dashboard')
  const REPO      = 'wajid081986/AWE-OS'
  const FILE_PATH = 'client/src/data/cityPages.js'
  const BRANCH    = 'main'
  const API_BASE  = 'https://api.github.com'
  const HEADERS   = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept':        'application/vnd.github.v3+json',
    'User-Agent':    'AWE-OS-SEO-Assistant',
  }

  const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, { headers: HEADERS })
  let currentContent, fileSha
  if (getRes.ok) {
    const fileData   = await getRes.json()
    currentContent   = Buffer.from(fileData.content, 'base64').toString('utf8')
    fileSha          = fileData.sha
  } else if (getRes.status === 404) {
    currentContent   = 'export const CITY_PAGES = [\n]\n'
    fileSha          = null
  } else {
    throw new Error(`GitHub GET failed: ${getRes.status}`)
  }

  // Parse existing pages using vm (same pattern as evalDataFile)
  let existingPages = []
  try {
    const cjs = currentContent.replace(/export\s+const\s+/g, 'var ')
    const ctx = Object.create(null)
    vm.runInNewContext(cjs, ctx, { timeout: 5000 })
    existingPages = Array.isArray(ctx.CITY_PAGES) ? ctx.CITY_PAGES : []
  } catch (e) {
    console.warn('[publish-programmatic] Could not parse existing CITY_PAGES:', e.message)
  }

  // Set metadata on incoming page
  newPage.publishedAt = new Date().toISOString().split('T')[0]
  newPage.slug        = slug

  // Dedup: update in-place if slug exists, otherwise prepend
  const existingIndex = existingPages.findIndex(p => p.slug === slug)
  let isUpdate = false
  if (existingIndex !== -1) {
    newPage.id                   = existingPages[existingIndex].id  // preserve original ID
    existingPages[existingIndex] = newPage
    isUpdate = true
  } else {
    const maxId = existingPages.reduce((max, p) => Math.max(max, p.id || 0), 0)
    newPage.id  = maxId + 1
    existingPages.unshift(newPage)
  }

  // Serialize the full array back to a clean JS module
  const serialize = obj => JSON.stringify(obj, null, 2)
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:')
    .replace(/"((?:[^"\\]|\\.)*)"/g, (_, s) => s.includes("'") ? `"${s}"` : `'${s}'`)

  const pagesJs    = existingPages
    .map(p => '  ' + serialize(p).replace(/\n/g, '\n  '))
    .join(',\n')
  const newContent = `export const CITY_PAGES = [\n${pagesJs ? pagesJs + ',\n' : ''}]\n`

  const pushBody = {
    message: isUpdate
      ? `seo: update city page "${newPage.title || slug}"`
      : `seo: add city page "${newPage.title || slug}"`,
    content: Buffer.from(newContent, 'utf8').toString('base64'),
    branch:  BRANCH,
  }
  if (fileSha) pushBody.sha = fileSha

  const pushRes  = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    method:  'PUT',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body:    JSON.stringify(pushBody),
  })
  const pushData = await pushRes.json()
  if (!pushRes.ok) throw new Error(pushData.message || 'GitHub push failed')
  return {
    success:   true,
    slug,
    id:        newPage.id,
    updated:   isUpdate,
    liveUrl:   `https://www.awe-os.com/${slug}`,
    commitUrl: pushData.commit?.html_url,
  }
}

router.post('/publish-programmatic', requireAuth, requireAdmin, async (req, res) => {
  const { page, slug, force } = req.body
  if (!page || !slug) return res.status(400).json({ success: false, error: 'page and slug are required' })
  if (!page.content?.length) return res.status(400).json({ success: false, error: 'page has no content blocks' })
  if (!force && (page.wordCount || 0) < 1200) {
    return res.status(422).json({
      success: false,
      error:   `Below 1200 words (got ${page.wordCount || 0}) — pass force: true to publish anyway`,
    })
  }
  try {
    const result = await publishCityPageToGitHub(page, slug)
    res.json(result)
  } catch (err) {
    console.error('[admin-seo/publish-programmatic]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
