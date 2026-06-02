const express   = require('express')
const requireAuth = require('../middleware/auth')
const Anthropic  = require('@anthropic-ai/sdk')

const router = express.Router()

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY not set')
    err.status = 503
    throw err
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

function extractJson(raw) {
  // Strip markdown code fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  return JSON.parse(match ? match[0] : stripped)
}

// ── POST /api/admin/seo-keywords-claude ───────────────────────────────────────
router.post('/seo-keywords-claude', requireAuth, requireAdmin, async (req, res) => {
  const { competitorUrl, toolName } = req.body
  if (!competitorUrl || !toolName) {
    return res.status(400).json({ success: false, error: 'competitorUrl and toolName are required' })
  }
  try {
    const client = getAnthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1400,
      system: `You are an SEO keyword gap analyst specialising in Indian search traffic. Find keyword opportunities where a competitor likely ranks but AWE-OS does not yet have content.
AWE-OS is a free tools website for Indian users — PDF tools, GST/SIP/FD/Tax/BMI calculators, AI writing tools, converters, and generators.
Return ONLY valid JSON — no markdown fences, no extra text:
{
  "keywords": [
    {
      "keyword": string,
      "searchIntent": "informational" | "transactional" | "navigational" | "commercial",
      "difficulty": "Low" | "Medium" | "High",
      "estimatedMonthlySearches": string,
      "whyItWorks": string
    }
  ]
}
Return exactly 5 keywords. Focus on long-tail Indian search intent with realistic monthly search estimates.`,
      messages: [{ role: 'user', content: `Competitor URL: ${competitorUrl}\nAWE-OS Tool to promote: ${toolName}\n\nFind 5 keyword gaps where this competitor ranks but AWE-OS can outrank with better content targeting Indian users.` }]
    })
    const raw = msg.content[0]?.text || ''
    let result
    try { result = extractJson(raw) } catch { result = { keywords: [] } }
    res.json({ success: true, keywords: result.keywords || [] })
  } catch (err) {
    console.error('[admin-content/seo-keywords-claude]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/blog-writer-claude ────────────────────────────────────────
router.post('/blog-writer-claude', requireAuth, requireAdmin, async (req, res) => {
  const { keyword, toolName, toolSlug } = req.body
  if (!keyword || !toolName) {
    return res.status(400).json({ success: false, error: 'keyword and toolName are required' })
  }
  const toolUrl = `https://www.awe-os.com/tools/${toolSlug || ''}`
  try {
    const client = getAnthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2800,
      system: `You are an expert SEO content writer for Indian audiences. Write clear, helpful, conversational 700-800 word blog articles.
AWE-OS is a free tools website — PDF tools, calculators, AI tools for Indian users.
Embed the AWE-OS tool link as a markdown hyperlink [${toolName}](${toolUrl}) at least twice naturally in the sections content.
Return ONLY valid JSON — no markdown fences, no extra text:
{
  "title": string,
  "metaDescription": string,
  "slug": string,
  "wordCount": number,
  "sections": [
    { "h2": string, "content": string }
  ],
  "faqSection": [
    { "q": string, "a": string }
  ]
}
Rules:
- title: compelling H1 that includes the keyword
- metaDescription: 150-160 characters
- slug: URL-friendly kebab-case from the title
- sections: 3-4 sections, each content field is 2-3 paragraphs of plain text with the tool linked naturally
- faqSection: exactly 3 FAQs targeting real user questions
- Total article should be 700-800 words across all sections`,
      messages: [{ role: 'user', content: `Target keyword: "${keyword}"\nAWE-OS Tool: ${toolName}\nTool URL: ${toolUrl}\n\nWrite a complete SEO blog article targeting Indian users searching for "${keyword}".` }]
    })
    const raw = msg.content[0]?.text || ''
    let result
    try {
      result = extractJson(raw)
    } catch {
      result = {
        title: keyword,
        metaDescription: '',
        slug: keyword.toLowerCase().replace(/\s+/g, '-'),
        wordCount: 0,
        sections: [{ h2: 'Overview', content: raw }],
        faqSection: []
      }
    }
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[admin-content/blog-writer-claude]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/landing-page-claude ───────────────────────────────────────
router.post('/landing-page-claude', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolSlug, location } = req.body
  if (!toolName) {
    return res.status(400).json({ success: false, error: 'toolName is required' })
  }
  const toolUrl = `https://www.awe-os.com/tools/${toolSlug || ''}`
  const locationCtx = location ? ` for users in ${location}` : ' for Indian users'
  try {
    const client = getAnthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3500,
      system: `You are an expert programmatic SEO landing page copywriter. Write conversion-focused content for free tool landing pages${locationCtx}.
AWE-OS is a free tools website with PDF tools, GST/SIP/FD calculators, AI writers, converters, and generators.
Return ONLY valid JSON — no markdown fences, no trailing text:
{
  "pageTitle": string,
  "metaDescription": string,
  "h1": string,
  "heroSubtext": string,
  "howItWorks": [
    { "step": number, "title": string, "description": string }
  ],
  "keyFeatures": [
    { "icon": string, "title": string, "description": string }
  ],
  "useCases": [
    { "title": string, "description": string }
  ],
  "faqSection": [
    { "question": string, "answer": string }
  ],
  "relatedTools": [],
  "seoKeywords": []
}
Rules (strictly followed):
- pageTitle: max 60 chars, includes tool name and location if provided
- metaDescription: max 155 chars, includes primary keyword
- h1: different from pageTitle, compelling and keyword-rich
- heroSubtext: exactly 2-3 sentences, benefit-focused
- howItWorks: exactly 3 steps, practical and numbered
- keyFeatures: exactly 4 features, each with a relevant emoji icon
- useCases: exactly 3 use cases${location ? ` with context specific to ${location}` : ' with Indian context'}
- faqSection: exactly 5 FAQs with detailed answers (2-3 sentences each)
- relatedTools: array of exactly 3 strings — real AWE-OS tool names (e.g. "GST Calculator", "Merge PDF", "SIP Calculator")
- seoKeywords: array of exactly 8 relevant long-tail keywords targeting Indian searches`,
      messages: [{ role: 'user', content: `Tool: ${toolName}\nTool URL: ${toolUrl}\nTarget location: ${location || 'India'}\n\nGenerate complete programmatic SEO landing page content.` }]
    })
    const raw = msg.content[0]?.text || ''
    let result
    try { result = extractJson(raw) } catch { result = {} }
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[admin-content/landing-page-claude]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/social-blast-claude ──────────────────────────────────────
router.post('/social-blast-claude', requireAuth, requireAdmin, async (req, res) => {
  const { articleTitle, articleUrl, toolName, toolSlug, audience } = req.body
  if (!articleTitle || !toolName) {
    return res.status(400).json({ success: false, error: 'articleTitle and toolName are required' })
  }
  const toolUrl = toolSlug
    ? `https://www.awe-os.com/tools/${toolSlug}`
    : 'https://www.awe-os.com/tools'
  const pageUrl = articleUrl || toolUrl
  try {
    const client = getAnthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `You are a social media expert who creates genuine, value-first content that serves real users.
CORE RULE: Every post must provide actual value. Tool mentions must feel natural — like a friend recommending something useful, never promotional spam.
Write for ${audience || 'General'} audiences in India. AWE-OS is a free Indian tools website.

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "redditPost": {
    "subreddit": string,
    "title": string,
    "body": string
  },
  "quoraAnswer": {
    "question": string,
    "answer": string
  },
  "pinterestPin": {
    "title": string,
    "description": string,
    "hashtags": []
  },
  "whatsappMessage": {
    "text": string
  },
  "linkedinPost": {
    "text": string
  },
  "twitterThread": [
    { "tweet": string, "charCount": number },
    { "tweet": string, "charCount": number },
    { "tweet": string, "charCount": number }
  ]
}

Rules for each platform:
- redditPost.subreddit: real subreddit name without r/ prefix, pick where this content genuinely belongs
- redditPost.title: authentic, community-appropriate headline (not clickbait)
- redditPost.body: 200-300 words of helpful content, tool URL mentioned once at end naturally
- quoraAnswer.question: real question someone would search on Quora
- quoraAnswer.answer: knowledgeable 150-200 word answer, tool mentioned once as a resource
- pinterestPin.title: max 100 chars, descriptive and keyword-rich
- pinterestPin.description: max 500 chars, helpful and keyword-rich
- pinterestPin.hashtags: array of 8-10 hashtag strings (include # prefix)
- whatsappMessage.text: max 100 words, conversational, 1-2 Hindi phrases natural (e.g. "bilkul free hai", "zaroor try karein"), end with tool link: ${pageUrl}
- linkedinPost.text: professional tone, 150-200 words, insight-led, subtle tool mention at end
- twitterThread: exactly 3 tweets. Tweet 1 = hook or surprising fact < 280 chars. Tweet 2 = key insight or tip < 280 chars. Tweet 3 = CTA + link < 280 chars. charCount must be accurate.`,
      messages: [{
        role: 'user',
        content: `Article title: "${articleTitle}"\nContent URL: ${pageUrl}\nAWE-OS Tool: ${toolName}\nTool URL: ${toolUrl}\nTarget audience: ${audience || 'General'}\n\nGenerate social media content for all 6 platforms.`
      }]
    })
    const raw = msg.content[0]?.text || ''
    let result
    try { result = extractJson(raw) } catch { result = {} }
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[admin-content/social-blast-claude]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/schedule-intelligence ─────────────────────────────────────
router.post('/schedule-intelligence', requireAuth, requireAdmin, async (req, res) => {
  const { toolCategory, audience, dayOfWeek } = req.body
  if (!toolCategory || !audience) {
    return res.status(400).json({ success: false, error: 'toolCategory and audience are required' })
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDay = dayNames[typeof dayOfWeek === 'number' ? dayOfWeek : new Date().getDay()]
  try {
    const client = getAnthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are a social media scheduling expert for Indian audiences.
Analyze the best posting times for AWE-OS content based on Indian user behavior in IST timezone.
Return ONLY valid JSON — no markdown, no extra text:
{
  "suggestions": [
    {
      "day": "string (Mon/Tue/Wed/Thu/Fri/Sat/Sun)",
      "time": "string — exactly one of: Morning 8-10 AM | Afternoon 12-2 PM | Evening 6-8 PM | Night 9-11 PM",
      "platform": "string — exactly one of: Reddit | Quora | Pinterest | Blog | LinkedIn | WhatsApp | Twitter",
      "reason": "string (1-2 sentences why this slot works for this audience in India)",
      "priority": 1
    }
  ]
}
Rules:
- Return EXACTLY 3 suggestions, priority values 1, 2, 3
- Match platform to audience: Finance/PDF → LinkedIn + Reddit; AI tools → Twitter; lifestyle → Pinterest
- Avoid times that have already passed today (current day: ${currentDay})
- Reference Indian work/study schedules (college hours 9-5, office 9-6, peak phone usage 6-10 PM)`,
      messages: [{
        role: 'user',
        content: `Tool category: ${toolCategory}\nTarget audience: ${audience}\nCurrent day: ${currentDay}\n\nSuggest the 3 best posting times this week for maximum reach.`
      }]
    })
    const raw = msg.content[0]?.text || ''
    let result
    try { result = extractJson(raw) } catch { result = { suggestions: [] } }
    res.json({ success: true, suggestions: result.suggestions || [] })
  } catch (err) {
    console.error('[admin-content/schedule-intelligence]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

module.exports = router
