const express    = require('express')
const OpenAI     = require('openai')
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAIJson(raw) {
  const cleaned = (raw || '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const block = cleaned.match(/```(?:json)?\n?([\s\S]+?)\n?```/)
  if (block) { try { return JSON.parse(block[1].trim()) } catch {} }
  const start = cleaned.search(/[\[{]/)
  const end   = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  return null
}

// ── POST /api/admin/traffic/reddit-subreddits ─────────────────────────────────

router.post('/reddit-subreddits', requireAuth, requireAdmin, async (req, res) => {
  const { topic, toolName, toolSlug, targetAudience } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a Reddit growth expert for Indian audiences.
Find the most relevant subreddits for promoting AWE-OS tools.
AWE-OS is a free tools website for Indian users — PDF tools, calculators (GST, SIP, FD, Tax, BMI), AI tools.
Focus on subreddits where Indian users are active.
Return ONLY valid JSON:
{
  "subreddits": [
    {
      "name": string,
      "members": string,
      "relevanceScore": number,
      "postingRules": ["string"],
      "bestPostType": string,
      "indianUsers": boolean,
      "avgUpvotes": string,
      "whyRelevant": string
    }
  ]
}
Return 6-8 subreddits sorted by relevance.`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}\nTool: ${toolName || topic}\nTarget Audience: ${targetAudience || 'Indian users'}\n\nFind the best subreddits.`,
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, subreddits: result?.subreddits || [] })
  } catch (err) {
    console.error('[admin-traffic/reddit-subreddits]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/reddit-posts ──────────────────────────────────────

router.post('/reddit-posts', requireAuth, requireAdmin, async (req, res) => {
  const { topic, toolName, toolSlug, toolUrl, subreddit, postType, targetAudience } = req.body
  if (!topic || !subreddit) {
    return res.status(400).json({ success: false, error: 'topic and subreddit are required' })
  }
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a Reddit growth expert. Create GENUINE value-first posts for ${subreddit}.
Rules:
1. NEVER start with promotion — lead with value/question/insight
2. Mention AWE-OS link NATURALLY in context, not as main point
3. Follow each subreddit's rules strictly
4. Posts must feel like a real Indian user wrote them
5. Use natural Hinglish tone where appropriate
6. Title must NOT sound like an ad
7. Body must give real value before mentioning the tool
Return ONLY valid JSON:
{
  "posts": [
    {
      "variation": number,
      "subreddit": string,
      "postType": string,
      "title": string,
      "body": string,
      "linkPlacement": string,
      "linkText": string,
      "redditRules": ["string"],
      "bestTime": string,
      "expectedUpvotes": string
    }
  ],
  "commentTemplates": ["string"]
}`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}
Tool: ${toolName || topic}
Tool URL: ${toolUrl || `https://awe-os.com/tools/${toolSlug || 'sip-calculator'}`}
Subreddit: ${subreddit}
Post Type: ${postType || 'Discussion'}
Target Audience: ${targetAudience || 'Indian users'}

Generate 3 post variations (V1=Value-First, V2=Question Hook, V3=Story Format) and 3 comment reply templates.`,
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, posts: result?.posts || [], commentTemplates: result?.commentTemplates || [] })
  } catch (err) {
    console.error('[admin-traffic/reddit-posts]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/quora-questions ───────────────────────────────────

router.post('/quora-questions', requireAuth, requireAdmin, async (req, res) => {
  const { topic, toolName, niche } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a Quora growth expert for Indian audiences.
Find real-style Quora questions where answering would drive traffic to AWE-OS tools.
Focus on high-view, answerable questions with Indian context.
Return ONLY valid JSON:
{
  "questions": [
    {
      "question": string,
      "estimatedViews": string,
      "opportunity": "High"|"Medium"|"Low",
      "reason": string,
      "topicUrl": string
    }
  ]
}
Return 5 questions sorted by opportunity.`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}\nTool: ${toolName || topic}\nNiche: ${niche || 'Finance'}\n\nFind 5 high-opportunity Quora questions.`,
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, questions: result?.questions || [] })
  } catch (err) {
    console.error('[admin-traffic/quora-questions]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/quora-answer ──────────────────────────────────────

router.post('/quora-answer', requireAuth, requireAdmin, async (req, res) => {
  const { question, toolName, toolSlug, toolUrl, niche } = req.body
  if (!question) return res.status(400).json({ success: false, error: 'question is required' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are an expert Indian finance/tools professional answering on Quora. Write authoritative, helpful answers that:
1. Start with a compelling hook (not a question)
2. Provide genuine expert insight (3-4 detailed points)
3. Use Indian context: ₹ amounts, Indian regulations, examples
4. Mention AWE-OS tool naturally as 'I use this free tool...'
5. End with a clear takeaway
6. Sound like a real Indian professional, not marketing copy
Return ONLY valid JSON:
{
  "answer": {
    "content": string,
    "aweosMention": string,
    "credentials": string,
    "callToAction": string,
    "wordCount": number,
    "estimatedViews": string
  }
}`,
        },
        {
          role: 'user',
          content: `Question: ${question}
Tool: ${toolName || 'AWE-OS Calculator'}
Tool URL: ${toolUrl || `https://awe-os.com/tools/${toolSlug || 'sip-calculator'}`}
Niche: ${niche || 'Finance'}

Write an expert 500-800 word Quora answer.`,
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, answer: result?.answer || null })
  } catch (err) {
    console.error('[admin-traffic/quora-answer]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/pinterest-strategy ────────────────────────────────

router.post('/pinterest-strategy', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolSlug, niche, targetAudience } = req.body
  if (!toolName) return res.status(400).json({ success: false, error: 'toolName is required' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a Pinterest growth expert for Indian digital tools.
Create a Pinterest board strategy for AWE-OS.com tools.
Return ONLY valid JSON:
{
  "boards": [
    {
      "boardName": string,
      "description": string,
      "keywords": ["string"],
      "targetAudience": string
    }
  ],
  "pinningSchedule": string
}
Return 3-4 boards with a recommended pinning schedule.`,
        },
        {
          role: 'user',
          content: `Tool: ${toolName}\nNiche: ${niche || 'Finance'}\nTarget: ${targetAudience || 'Indian Professionals'}\n\nCreate Pinterest board strategy.`,
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, boards: result?.boards || [], pinningSchedule: result?.pinningSchedule || '' })
  } catch (err) {
    console.error('[admin-traffic/pinterest-strategy]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/pinterest-pins ────────────────────────────────────

router.post('/pinterest-pins', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolSlug, toolUrl, niche, board } = req.body
  if (!toolName) return res.status(400).json({ success: false, error: 'toolName is required' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: `You are a Pinterest SEO expert for Indian audiences.
Create Pinterest pin content that drives traffic to AWE-OS.com tools.
Return ONLY valid JSON:
{
  "pins": [
    {
      "title": string,
      "description": string,
      "hashtags": ["string"],
      "destinationUrl": string,
      "bestPostingTime": string,
      "searchKeywords": ["string"],
      "pinType": "Idea"|"Product"|"How-To"|"Infographic"
    }
  ]
}
Return 3 pins. Title max 100 chars. Description max 500 chars. 8-12 hashtags each.`,
        },
        {
          role: 'user',
          content: `Tool: ${toolName}
Tool URL: ${toolUrl || `https://awe-os.com/tools/${toolSlug || 'sip-calculator'}`}
Niche: ${niche || 'Finance'}
Board: ${board || 'Finance Tools India'}

Create 3 Pinterest pins to drive Indian traffic.`,
        },
      ],
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, pins: result?.pins || [] })
  } catch (err) {
    console.error('[admin-traffic/pinterest-pins]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
