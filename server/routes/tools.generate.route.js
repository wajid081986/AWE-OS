const express    = require('express')
const OpenAI     = require('openai')
const requireAuth = require('../middleware/auth')
const supabase   = require('../db/supabase')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LENGTH_TOKENS = { short: 300, medium: 700, long: 1400 }

const PRO_PLANS   = ['pro_monthly', 'pro_yearly']
const TOOL_PLANS  = { 'resume-builder': 'resume_builder', 'content-writer': 'content_writer' }

// ── Auth + subscription gate ─────────────────────────────────
async function requirePayment(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Login required' })

  const { tool } = req.body
  const userId   = req.user.userId

  try {
    const { data: user } = await supabase
      .from('users')
      .select('subscription_plan, subscription_expires_at')
      .eq('id', userId)
      .maybeSingle()

    const plan      = user?.subscription_plan ?? 'free'
    const expiresAt = user?.subscription_expires_at

    // Pro plan access — check not expired
    if (PRO_PLANS.includes(plan)) {
      if (!expiresAt || new Date(expiresAt) > new Date()) return next()
      // Expired — downgrade silently and fall through to credit check
      await supabase.from('users').update({ subscription_plan: 'free', is_premium: false }).eq('id', userId)
    }

    // Pay-per-use credit — check payment_history for last 24h
    const toolSlug = tool === 'resume-builder' ? 'resume-builder' : 'ai-content-writer'
    const since    = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: credit } = await supabase
      .from('payment_history')
      .select('id')
      .eq('user_id', userId)
      .eq('tool_slug', toolSlug)
      .eq('status', 'paid')
      .gte('created_at', since)
      .limit(1)
      .maybeSingle()

    if (credit) {
      // Mark credit as used so it can't be reused
      await supabase.from('payment_history').update({ status: 'used' }).eq('id', credit.id)
      return next()
    }

    return res.status(403).json({
      success: false,
      error:   'This is a paid feature. Upgrade to Pro or pay per use.',
      code:    'SUBSCRIPTION_REQUIRED',
    })
  } catch (err) {
    console.error('[tools.generate] auth check error:', err.message)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
}

function buildResumePrompt(data) {
  const exp = (data.experience || []).map(e =>
    `- ${e.role} at ${e.company} (${e.period}): ${e.description}`
  ).join('\n')
  const edu = (data.education || []).map(e =>
    `- ${e.degree} from ${e.institution} (${e.year})`
  ).join('\n')

  return `Create a professional resume for the following person. Format it with clear sections using markdown-style headers.

Name: ${data.fullName}
Email: ${data.email}
Phone: ${data.phone}
Location: ${data.location}
LinkedIn: ${data.linkedin}

Summary: ${data.summary}

Experience:
${exp}

Education:
${edu}

Skills: ${data.skills}

Write a polished, ATS-friendly resume. Use clear section headers (PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION, SKILLS). Keep descriptions concise and action-oriented. Do not add any commentary — output only the resume.`
}

function buildContentPrompt(data) {
  const wordTarget = data.length === 'short' ? '150 words' : data.length === 'medium' ? '400 words' : '800 words'
  return `Write a ${data.type} about "${data.topic}".

Tone: ${data.tone}
Target audience: ${data.audience || 'general readers'}
Target length: approximately ${wordTarget}
Keywords to include: ${data.keywords || 'none specified'}

Write professional, engaging content. Output only the content itself — no meta-commentary or explanations.`
}

// POST /api/tools/generate
router.post('/', requireAuth, requirePayment, async (req, res) => {
  const { tool, data } = req.body
  if (!tool || !data) return res.status(400).json({ success: false, error: 'tool and data are required' })

  let prompt
  let maxTokens = 1200

  if (tool === 'resume-builder') {
    if (!data.fullName) return res.status(400).json({ success: false, error: 'fullName is required' })
    prompt = buildResumePrompt(data)
    maxTokens = 1500
  } else if (tool === 'content-writer') {
    if (!data.topic) return res.status(400).json({ success: false, error: 'topic is required' })
    prompt = buildContentPrompt(data)
    maxTokens = LENGTH_TOKENS[data.length] || 700
  } else {
    return res.status(400).json({ success: false, error: `Unknown tool: ${tool}` })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || ''
    res.json({ success: true, content })
  } catch (err) {
    console.error('[tools.generate] OpenAI error:', err.message)
    res.status(500).json({ success: false, error: 'AI generation failed. Please try again.' })
  }
})

module.exports = router
