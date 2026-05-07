const express = require('express')
const OpenAI  = require('openai')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LENGTH_TOKENS = { short: 300, medium: 700, long: 1400 }

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
router.post('/', async (req, res) => {
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
