const express   = require('express')
const requireAuth = require('../middleware/auth')
const Anthropic = require('@anthropic-ai/sdk')

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
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  return JSON.parse(match ? match[0] : stripped)
}

// POST /api/admin/weekly-report-claude
router.post('/weekly-report-claude', requireAuth, requireAdmin, async (req, res) => {
  const {
    campaignsCount       = 0,
    contentCount         = 0,
    directoriesCount     = 0,
    scheduledPostsData,
    previousRecommendations,
    weekStartDate,
  } = req.body

  try {
    const client = getAnthropic()

    const scheduled = scheduledPostsData
      ? `${scheduledPostsData.completed ?? 0} completed, ${scheduledPostsData.pending ?? 0} pending`
      : 'data unavailable'

    const prevRecs = Array.isArray(previousRecommendations) && previousRecommendations.length
      ? previousRecommendations.map(r => `${r.action} (${r.priority})`).join('; ')
      : 'none — first report'

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a digital growth analyst for AWE-OS — a free tools website targeting Indian users (PDF tools, calculators, AI writing, converters, generators). Analyze weekly marketing performance and generate actionable insights.

Week of: ${weekStartDate || 'current week'}
Activity metrics:
- Traffic campaigns run: ${campaignsCount}
- Content pieces generated: ${contentCount} (blog posts + social media + Reddit + Quora + Pinterest drafts)
- Directory submissions made: ${directoriesCount}
- Scheduled posts: ${scheduled}
- Previous week recommendations: ${prevRecs}

Based on this data, generate a strategic weekly report. Return ONLY valid JSON — no markdown, no extra text:
{
  "weekSummary": "2-3 sentence overview of this week's activity level and momentum",
  "topPerformingChannels": [
    {"channel": "channel name", "reason": "specific reason this channel showed promise"}
  ],
  "whatWorked": ["specific tactic or behavior that worked well this week", "another positive"],
  "whatDidntWork": ["specific gap or missed opportunity", "another area for improvement"],
  "nextWeekRecommendations": [
    {"action": "concrete, specific action step", "priority": "High", "expectedImpact": "measurable expected outcome"},
    {"action": "second important action", "priority": "Med", "expectedImpact": "expected benefit"},
    {"action": "maintenance or growth task", "priority": "Low", "expectedImpact": "minor sustained improvement"}
  ],
  "focusToolForNextWeek": "single tool or channel to prioritize for maximum impact",
  "estimatedTrafficImpact": "e.g. +15-20% organic reach if all recommendations are implemented"
}`,
      }],
    })

    const raw = msg.content?.[0]?.text
    if (!raw) throw new Error('Empty response from Claude')

    const analysis = extractJson(raw)
    res.json({ success: true, data: analysis })
  } catch (err) {
    console.error('[weekly-report] error:', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

module.exports = router
