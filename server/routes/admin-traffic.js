const express          = require('express')
const requireAuth      = require('../middleware/auth')
const { getOpenAI }    = require('../core/ai-engine')
const parseAIJson      = require('../services/parseAIJson')
const Anthropic        = require('@anthropic-ai/sdk')

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

// ── POST /api/admin/traffic/reddit-subreddits ─────────────────────────────────

router.post('/reddit-subreddits', requireAuth, requireAdmin, async (req, res) => {
  const { topic, toolName, toolSlug, targetAudience } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })
  try {
    const completion = await getOpenAI().chat.completions.create({
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
    }, { timeout: AI_CALL_TIMEOUT_MS })
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
    const completion = await getOpenAI().chat.completions.create({
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
    }, { timeout: AI_CALL_TIMEOUT_MS })
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
    const completion = await getOpenAI().chat.completions.create({
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
    }, { timeout: AI_CALL_TIMEOUT_MS })
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
    const completion = await getOpenAI().chat.completions.create({
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
    }, { timeout: AI_CALL_TIMEOUT_MS })
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
    const completion = await getOpenAI().chat.completions.create({
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
    }, { timeout: AI_CALL_TIMEOUT_MS })
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
    const completion = await getOpenAI().chat.completions.create({
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
    }, { timeout: AI_CALL_TIMEOUT_MS })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, pins: result?.pins || [] })
  } catch (err) {
    console.error('[admin-traffic/pinterest-pins]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/quora-questions-claude ───────────────────────────

router.post('/quora-questions-claude', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolSlug, niche } = req.body
  if (!toolName) return res.status(400).json({ success: false, error: 'toolName is required' })
  try {
    const msg = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You generate realistic Quora questions that real users actually search for.
Focus on the specific tool and its use cases. Questions should be concrete, not generic.
Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "question": "string",
      "estimatedViews": "string (e.g. 10K–50K views)",
      "opportunity": "High"|"Medium"|"Low",
      "reason": "string (why this is a good opportunity, 1 sentence)"
    }
  ]
}
Return exactly 5 questions sorted by opportunity.`,
      messages: [{
        role: 'user',
        content: `Tool: ${toolName}\nSlug: ${toolSlug}\nNiche: ${niche || 'general'}\n\nGenerate 5 high-opportunity Quora questions that real users ask about ${toolName} — focus on problems this tool solves for Indian users.`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })
    const raw    = msg.content[0]?.text || ''
    const match  = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Unexpected Claude response format')
    const data = JSON.parse(match[0])
    res.json({ success: true, questions: data.questions || [] })
  } catch (err) {
    console.error('[admin-traffic/quora-questions-claude]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/quora-answer-claude ───────────────────────────────

router.post('/quora-answer-claude', requireAuth, requireAdmin, async (req, res) => {
  const { question, toolName, toolSlug, toolUrl, niche } = req.body
  if (!question) return res.status(400).json({ success: false, error: 'question is required' })
  const url = toolUrl || `https://awe-os.com/tools/${toolSlug || ''}`
  try {
    const msg = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: `You write expert Quora answers that genuinely help the person asking.
Rules:
- 200–300 words total
- Start directly with the most useful insight (no "Great question!" filler)
- Provide 2–3 concrete, actionable points with Indian context where relevant
- Mention ${toolName} and ${url} naturally once, as a tool you personally find useful
- End with a single soft call-to-action sentence (not pushy)
- Sound like a knowledgeable Indian professional, not a marketer
Return ONLY valid JSON (no markdown):
{"answer": "string", "aweosMention": "string (the exact sentence mentioning the tool)", "callToAction": "string (the last CTA sentence)"}`,
      messages: [{
        role: 'user',
        content: `Write a Quora answer to: "${question}"\nTool to mention: ${toolName} (${url})\nNiche: ${niche || 'general'}`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })
    const raw   = msg.content[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Unexpected Claude response format')
    const data = JSON.parse(match[0])
    res.json({ success: true, answer: { content: data.answer || '', aweosMention: data.aweosMention || '', callToAction: data.callToAction || '' } })
  } catch (err) {
    console.error('[admin-traffic/quora-answer-claude]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/pinterest-pin-claude ─────────────────────────────

router.post('/pinterest-pin-claude', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolSlug, toolUrl, board, keywords } = req.body
  if (!toolName || !board) return res.status(400).json({ success: false, error: 'toolName and board are required' })
  const url = toolUrl || `https://www.awe-os.com/tools/${toolSlug || ''}`
  try {
    const msg = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You create Pinterest pin content for AWE-OS, a free online tools platform for Indian users.
Rules:
- Titles: exactly 3, each max 100 characters, SEO-optimised for Pinterest search, include a benefit or number
- Description: 150-200 words, flows naturally, includes the tool URL once (${url}), weaves in keywords naturally, ends with a soft CTA
- Hashtags: exactly 10, relevant to the tool and Indian audience, no spaces, no # prefix needed
Return ONLY valid JSON (no markdown):
{
  "titles": ["title1", "title2", "title3"],
  "description": "string",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"]
}`,
      messages: [{
        role: 'user',
        content: `Tool: ${toolName}\nURL: ${url}\nBoard: ${board}\nTarget keywords: ${keywords || toolName + ' India free online'}\n\nCreate Pinterest pin content.`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })
    const raw   = msg.content[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Unexpected Claude response format')
    const data = JSON.parse(match[0])
    res.json({
      success: true,
      titles:      Array.isArray(data.titles)   ? data.titles.slice(0, 3) : [],
      description: data.description || '',
      hashtags:    Array.isArray(data.hashtags)  ? data.hashtags.slice(0, 10) : [],
    })
  } catch (err) {
    console.error('[admin-traffic/pinterest-pin-claude]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/traffic/reddit-post-claude ───────────────────────────────
// Generates a single helpful, non-spammy Reddit post using Claude claude-sonnet-4-6.

let _anthropic = null
function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY environment variable is not set')
    err.code = 'AI_UNAVAILABLE'
    throw err
  }
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

router.post('/reddit-post-claude', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolSlug, toolUrl, subreddit, targetAudience } = req.body
  if (!toolName || !subreddit) {
    return res.status(400).json({ success: false, error: 'toolName and subreddit are required' })
  }
  const url = toolUrl || `https://awe-os.com/tools/${toolSlug || 'sip-calculator'}`
  try {
    const client = getAnthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You write genuine, helpful Reddit posts for ${subreddit}.
Community rules you must follow:
- 150–250 words total
- Lead with real value or a relatable problem — NEVER open with promotion
- Mention the AWE-OS tool and its URL exactly once, framed as something you personally found useful
- No hard selling, no "check out", no "amazing tool" hype language
- Sound like a real community member sharing a helpful tip
- Target audience: ${targetAudience || 'Indian users'}
Return ONLY valid JSON (no markdown, no explanation):
{"title": "...", "body": "..."}`,
      messages: [{
        role: 'user',
        content: `Write a Reddit post for ${subreddit} naturally mentioning ${toolName} (${url}). Focus on being genuinely helpful first.`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })
    const raw = msg.content[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Claude returned unexpected format')
    const data = JSON.parse(match[0])
    res.json({ success: true, post: { title: data.title || '', body: data.body || '' } })
  } catch (err) {
    console.error('[admin-traffic/reddit-post-claude]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
