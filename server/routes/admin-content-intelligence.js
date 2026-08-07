const express    = require('express')
const requireAuth = require('../middleware/auth')
const Anthropic  = require('@anthropic-ai/sdk')

const router = express.Router()

// Explicit per-call ceiling instead of the SDK's ~10min default.
const AI_CALL_TIMEOUT_MS = 90_000

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
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const objMatch = stripped.match(/\{[\s\S]*\}/)
  const arrMatch = stripped.match(/\[[\s\S]*\]/)
  return JSON.parse(objMatch ? objMatch[0] : arrMatch ? arrMatch[0] : stripped)
}

// POST /api/admin/content-patterns-claude
router.post('/content-patterns-claude', requireAuth, requireAdmin, async (req, res) => {
  const { entries = [] } = req.body

  if (!entries.length) {
    return res.status(400).json({ success: false, error: 'No content entries provided' })
  }

  try {
    const client = getAnthropic()

    const summary = entries.map(e =>
      `- "${e.title}" | Type: ${e.type} | Date: ${e.date} | Views: ${e.views} | Engagement: ${e.engagement} | Rating: ${e.rating}/5`
    ).join('\n')

    const topPerformers = entries.filter(e => e.rating >= 4).map(e => e.title)
    const lowPerformers = entries.filter(e => e.rating <= 2).map(e => e.title)

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a content strategy analyst for AWE-OS — a free tools website targeting Indian users (PDF tools, calculators, AI writing tools, converters). Analyze this content performance data and identify patterns.

Content Performance Data (${entries.length} pieces):
${summary}

Top performers (rated 4-5): ${topPerformers.length ? topPerformers.join(', ') : 'none yet'}
Low performers (rated 1-2): ${lowPerformers.length ? lowPerformers.join(', ') : 'none yet'}

Identify what makes the successful content work and what's holding back the rest. Return ONLY valid JSON — no markdown, no extra text:
{
  "bestContentType": "which platform/type performs best and why in one phrase",
  "bestTopics": ["topic category 1", "topic category 2", "topic category 3"],
  "bestWordCount": "e.g. 800-1200 words for blog posts",
  "bestPostingTime": "e.g. Tuesday-Thursday mornings",
  "audienceInsights": "2 sentences about what the audience responds to",
  "titlePatterns": "2 sentences describing title structures that get engagement",
  "improvementAreas": ["area to improve 1", "area to improve 2", "area to improve 3"],
  "winningFormula": "1-2 sentence recipe for content success on AWE-OS"
}`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const raw = msg.content?.[0]?.text
    if (!raw) throw new Error('Empty response from Claude')

    const patterns = extractJson(raw)
    res.json({ success: true, data: patterns })
  } catch (err) {
    console.error('[content-patterns] error:', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/content-suggestions-claude
router.post('/content-suggestions-claude', requireAuth, requireAdmin, async (req, res) => {
  const { patterns, entries = [] } = req.body

  try {
    const client = getAnthropic()

    const patternContext = patterns
      ? `Content DNA insights:
- Best type: ${patterns.bestContentType}
- Best topics: ${(patterns.bestTopics || []).join(', ')}
- Winning formula: ${patterns.winningFormula}
- Audience: ${patterns.audienceInsights}`
      : 'No pattern analysis available — generate general ideas for AWE-OS (PDF tools, calculators, AI writing, Indian users).'

    const recentTitles = entries.slice(0, 10).map(e => e.title).join(', ')

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `You are a content strategist for AWE-OS — a free tools website for Indian users. Suggest 5 high-potential content pieces based on what's working.

${patternContext}
Recent content already created: ${recentTitles || 'none yet'}

Generate 5 fresh content ideas that are NOT similar to recent content. Focus on Indian audience needs, seasonal trends, and underserved queries. Return ONLY valid JSON — no markdown, no extra text:
{
  "suggestions": [
    {
      "title": "exact article/post title to use",
      "keyword": "primary target keyword",
      "whyItWillWork": "1 sentence specific reason based on patterns",
      "estimatedDifficulty": "Easy",
      "suggestedLength": "e.g. 1200 words"
    }
  ]
}
estimatedDifficulty must be exactly one of: Easy, Medium, Hard`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const raw = msg.content?.[0]?.text
    if (!raw) throw new Error('Empty response from Claude')

    const parsed = extractJson(raw)
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || [])
    res.json({ success: true, data: suggestions })
  } catch (err) {
    console.error('[content-suggestions] error:', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

module.exports = router
