const express    = require('express')
const OpenAI     = require('openai')
const requireAuth = require('../middleware/auth')
const supabase   = require('../db/supabase')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Explicit per-call ceiling instead of the SDK's ~10min default.
const AI_CALL_TIMEOUT_MS = 90_000

const LENGTH_TOKENS = { short: 300, medium: 700, long: 1400 }

const PRO_PLANS   = ['pro_monthly', 'pro_yearly']
const TOOL_PLANS  = { 'resume-builder': 'resume_builder', 'content-writer': 'content_writer' }

// ── Auth + subscription gate ─────────────────────────────────
const ADMIN_ONLY_TOOLS = ['marketing-assistant']

async function requirePayment(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Login required' })

  const { tool } = req.body
  if (ADMIN_ONLY_TOOLS.includes(tool)) return next()

  const userId = req.user.userId

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

function buildMarketingPrompt(data) {
  const isToolMode = data.mode === 'tool'
  const charLimit  = data.platform === 'Twitter/X' ? '280 characters maximum per post' : '100–300 words per post'
  const langNote   = data.language === 'Hinglish' ? ' (casual mix of Hindi and English — use Hinglish naturally, not literal translation)' : ''

  const subject = isToolMode
    ? `the free online tool "${data.toolName}" — ${data.toolDesc}. Tool URL: ${data.toolUrl}`
    : `a blog post titled "${data.blogTitle}". URL: ${data.blogUrl}${data.keyInsight ? `. Key insight to highlight: ${data.keyInsight}` : ''}`

  return `You are the social media manager for AWE-OS (awe-os.com), a free online tools website for Indian users.

Generate exactly 3 unique ${data.platform} posts promoting ${subject}

Requirements:
- Platform: ${data.platform}
- Tone: ${data.tone}
- Language: ${data.language}${langNote}
- Post type: ${data.postType}
- Length: ${charLimit}
- Each post must use a completely different hook or angle
- Include 2–4 relevant emojis per post
- Include 3–5 relevant hashtags per post
- Always include awe-os.com or the direct URL naturally in the post
- Sound authentic, not like an advertisement

Post type guide:
- problem-solution: Start with a relatable problem, end with AWE-OS as the solution
- tool-highlight: Showcase one specific feature of the tool with clear CTA
- before-after: Compare life/work before vs after using AWE-OS tool
- quick-tip: Give a useful tip, naturally mention the tool as the way to do it
- comparison: Compare AWE-OS (free, no signup) vs alternatives (paid, complex)
- cta-post: Direct promotional post with strong action-driving language

Tone guide:
- funny: Use humor, relatable situations, light memes format
- viral: Start with a hook/pattern interrupt, use numbers, create curiosity
- informative: Teach something valuable, establish AWE-OS as expert resource
- emotional: Connect with feelings (stress, pride, achievement, relief)
- fomo: Create urgency, highlight what they're missing by not using AWE-OS
- inspirational: Motivate action, connect tool to bigger life/career goals

Respond ONLY with a valid JSON array of exactly 3 strings. No markdown, no code blocks, no explanation.
Format: ["post 1 text", "post 2 text", "post 3 text"]`
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
  } else if (tool === 'marketing-assistant') {
    if (!data.mode) return res.status(400).json({ success: false, error: 'mode is required' })
    if (data.mode === 'tool' && !data.toolName) return res.status(400).json({ success: false, error: 'toolName is required' })
    if (data.mode === 'blog' && !data.blogTitle) return res.status(400).json({ success: false, error: 'blogTitle is required' })
    prompt    = buildMarketingPrompt(data)
    maxTokens = 900
  } else {
    return res.status(400).json({ success: false, error: `Unknown tool: ${tool}` })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const rawContent = completion.choices[0]?.message?.content || ''

    if (tool === 'marketing-assistant') {
      try {
        const posts = JSON.parse(rawContent)
        if (Array.isArray(posts)) return res.json({ success: true, posts })
      } catch {}
      return res.json({ success: true, posts: [rawContent] })
    }

    const content = rawContent
    res.json({ success: true, content })
  } catch (err) {
    console.error('[tools.generate] OpenAI error:', err.message)
    res.status(500).json({ success: false, error: 'AI generation failed. Please try again.' })
  }
})

module.exports = router
