const express    = require('express')
const requireAuth = require('../middleware/auth')
const OpenAI     = require('openai')

const router = express.Router()

// Explicit per-call ceiling instead of the SDK's ~10min default.
const AI_CALL_TIMEOUT_MS = 90_000

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY not set')
    err.status = 503
    throw err
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
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

// POST /api/admin/recovery-plan-claude
router.post('/recovery-plan-claude', requireAuth, requireAdmin, async (req, res) => {
  const { triggeredAlerts = [], trafficHistory = [], trafficChange } = req.body

  if (!triggeredAlerts.length) {
    return res.status(400).json({ success: false, error: 'No triggered alerts provided' })
  }

  try {
    const client = getOpenAI()

    const alertSummary = triggeredAlerts
      .map(a => `- ${a.name}: ${a.detail}`)
      .join('\n')

    const trafficContext = trafficHistory.length >= 2
      ? `Traffic trend: ${trafficHistory.map(t => `${t.date}: ${t.visitors} visitors`).join(', ')}`
      : 'Traffic data: insufficient history'

    const changeText = trafficChange !== null
      ? `Latest week change: ${trafficChange > 0 ? '+' : ''}${trafficChange?.toFixed(1)}%`
      : ''

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `You are a growth recovery strategist for AWE-OS — a free tools website for Indian users (PDF tools, calculators, AI writing, converters). Multiple marketing health alerts have been triggered.

Triggered alerts:
${alertSummary}

Context:
${trafficContext}
${changeText}

Create a specific, actionable recovery plan. Return ONLY valid JSON — no markdown, no extra text:
{
  "alertType": "combined short name for what went wrong (e.g. 'Traffic Drop + Content Gap')",
  "urgency": "Critical",
  "immediateActions": [
    {"action": "specific action to take right now", "timeRequired": "e.g. 30 mins", "expectedImpact": "what this will fix"},
    {"action": "second immediate action", "timeRequired": "1 hour", "expectedImpact": "expected improvement"},
    {"action": "third action", "timeRequired": "2 hours", "expectedImpact": "outcome"}
  ],
  "weekPlan": [
    "Day 1: specific task to do",
    "Day 2-3: specific tasks",
    "Day 4-5: specific tasks",
    "Day 6-7: review and adjust"
  ],
  "rootCauseAnalysis": "2 sentences explaining why traffic/engagement likely dropped and what the core issue is"
}
urgency must be exactly one of: Critical, High, Medium`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const raw = completion.choices?.[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const plan = extractJson(raw)
    res.json({ success: true, data: plan })
  } catch (err) {
    console.error('[recovery-plan] error:', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/goal-analysis-claude
router.post('/goal-analysis-claude', requireAuth, requireAdmin, async (req, res) => {
  const { goals = {}, actuals = {}, achieved = [] } = req.body

  try {
    const client = getOpenAI()

    const achievedList = achieved.join(', ') || 'various goals'

    const summary = Object.entries(actuals)
      .map(([k, v]) => `${k}: ${v} / ${goals[k] || '?'} target`)
      .join(', ')

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are an enthusiastic growth coach for AWE-OS, a free tools website targeting Indian users. The admin has just achieved their monthly goal(s): ${achievedList}.

Progress: ${summary}

Write a short (2-3 sentences), energetic, and specific motivational message celebrating this achievement and encouraging them to push further. Reference AWE-OS specifically. Be upbeat but not over-the-top. Return ONLY valid JSON:
{"message": "your motivational message here"}`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const raw = completion.choices?.[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const result = extractJson(raw)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[goal-analysis] error:', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

module.exports = router
