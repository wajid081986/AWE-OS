const express          = require('express')
const OpenAI           = require('openai')
const fs               = require('fs')
const path             = require('path')
const { execSync }     = require('child_process')
const requireAuth      = require('../middleware/auth')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const BLOG_POSTS_PATH = path.resolve(__dirname, '../../client/src/data/blogPosts.js')
const REPO_ROOT       = path.resolve(__dirname, '../..')
const DATA_DIR        = path.resolve(__dirname, '../data')
const CALENDAR_PATH   = path.join(DATA_DIR, 'blog-calendar.json')

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
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
  throw new Error('Cannot parse AI response as JSON')
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert SEO content writer for AWE-OS (awe-os.com) — a free browser-based tools website for Indian users.
AWE-OS has 48+ free tools: PDF tools, financial calculators (SIP, FD, PPF, Tax, BMI, GST, EMI), AI tools, converters.
No signup required — everything is 100% free.

WRITING STYLE:
- Tone: Helpful friend explaining to a first-timer
- Language: Clear, simple English (Indian audience)
- Indian context: Use ₹ symbol, Indian examples, Indian regulations
- Never start sentences with 'I'
- No AI robotic phrases: 'It is worth noting', 'In conclusion', 'It is important to', 'Delve into'
- Short paragraphs (max 3 lines)
- Bold key numbers and conclusions using **text** (double asterisks)
- Indian number format: ₹12,75,000 (not ₹1,275,000)

OUTPUT FORMAT — Return ONLY valid JSON, no extra text:
{
  "slug": "url-friendly-slug",
  "title": "Full Article Title",
  "date": "YYYY-MM-DD",
  "category": "Finance",
  "author": "AWE-OS Team",
  "excerpt": "2-3 sentence summary for blog listing page",
  "readTime": "7 min read",
  "metaTitle": "SEO title under 60 chars",
  "metaDescription": "SEO description under 155 chars",
  "content": [
    { "type": "p", "text": "Opening hook paragraph — compelling, relatable" },
    { "type": "h2", "text": "Section Heading" },
    { "type": "p", "text": "Section content paragraph" },
    { "type": "table", "headers": ["Col1","Col2","Col3"], "rows": [["val","val","val"],["val","val","val"]] },
    { "type": "ul", "items": ["Point 1", "Point 2", "Point 3"] },
    { "type": "callout", "title": "Try it free", "text": "Use the free [Tool Name] at AWE-OS — no signup needed.", "links": [{"href": "/tools/tool-slug", "label": "Open Free Tool"}] }
  ],
  "faqs": [
    { "q": "Question 1?", "a": "Detailed answer minimum 100 chars." },
    { "q": "Question 2?", "a": "Detailed answer." },
    { "q": "Question 3?", "a": "Detailed answer." },
    { "q": "Question 4?", "a": "Detailed answer." },
    { "q": "Question 5?", "a": "Detailed answer." }
  ],
  "relatedTools": [
    { "label": "Tool Name", "slug": "tool-slug", "icon": "🔢" }
  ]
}

REQUIRED STRUCTURE:
1. Opening hook (1 relatable paragraph, no heading)
2. H2: Quick overview / What is [topic]
3. H2: Main comparison or explanation — include at least 1 data table with real Indian numbers
4. H2: Real examples with ₹ calculations
5. H2: Who should [do X] — specific scenarios
6. H2: How to [action] — include a callout block linking to AWE-OS tool
7. Five FAQs in the faqs array

Include at least 2 tables and 1 callout block.`

// ── POST /generate ────────────────────────────────────────────────────────────

router.post('/generate', requireAuth, requireAdmin, async (req, res) => {
  const { topic, keyword, toolSlug, toolName, wordCount = 1200, tone = 'beginner', category = 'Finance', indianContext = true } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })

  const toneGuides = {
    beginner:       'Write for someone completely new. Simple language, explain every term.',
    expert:         'Write for financially literate readers who want deep analysis, not basics.',
    conversational: 'Write like a friendly chat with a colleague — warm, direct, real examples.',
    quickguide:     'Be concise and practical. Bullet points over paragraphs where possible.',
  }

  const userPrompt = `Write a ${wordCount}-word SEO blog post for AWE-OS.

Topic: ${topic}
Target keyword (use naturally 3-5 times): ${keyword || topic}
${toolSlug ? `Primary AWE-OS tool to promote: ${toolName || toolSlug} (link href: /tools/${toolSlug})` : ''}
Category: ${category}
Tone style: ${toneGuides[tone] || toneGuides.beginner}
${indianContext ? 'Include Indian examples, ₹ amounts, Indian financial regulations and SEBI/RBI context where relevant.' : ''}

Return ONLY the JSON object. No other text.`

  try {
    const completion = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      max_tokens:  3000,
      temperature: 0.7,
    })

    const raw  = completion.choices[0]?.message?.content || ''
    const post = parseAIJson(raw)

    post.author   = 'AWE-OS Team'
    post.date     = new Date().toISOString().split('T')[0]
    post.category = post.category || category
    if (!post.faqs)         post.faqs         = []
    if (!post.relatedTools) post.relatedTools = []

    res.json({ success: true, post })
  } catch (err) {
    console.error('[admin-blog/generate]', err.message)
    res.status(500).json({ success: false, error: err.message || 'Generation failed' })
  }
})

// ── POST /publish ─────────────────────────────────────────────────────────────

router.post('/publish', requireAuth, requireAdmin, async (req, res) => {
  const { post } = req.body
  if (!post?.slug || !post?.title) {
    return res.status(400).json({ success: false, error: 'post with slug and title is required' })
  }

  try {
    const source = fs.readFileSync(BLOG_POSTS_PATH, 'utf8')

    // Derive next id from existing ids in file
    const idMatches = source.match(/\bid:\s*(\d+)/g) || []
    const maxId = idMatches.reduce((max, m) => {
      const n = parseInt(m.replace(/[^\d]/g, ''))
      return n > max ? n : max
    }, 0)

    // Build clean post (only schema fields — strip tags/toolLinks/unknowns)
    const cleanPost = {
      id:              maxId + 1,
      slug:            post.slug,
      title:           post.title,
      date:            new Date().toISOString().split('T')[0],
      category:        post.category     || 'General',
      author:          'AWE-OS Team',
      readTime:        post.readTime     || '5 min read',
      excerpt:         post.excerpt      || '',
      metaTitle:       post.metaTitle    || post.title,
      metaDescription: post.metaDescription || post.excerpt || '',
      relatedTools:    post.relatedTools || [],
      content:         post.content      || [],
      ...(Array.isArray(post.faqs) && post.faqs.length ? { faqs: post.faqs } : {}),
    }

    // Insert at the start of BLOG_POSTS array
    const MARKER  = 'export const BLOG_POSTS = ['
    const mIdx    = source.indexOf(MARKER)
    if (mIdx === -1) throw new Error('BLOG_POSTS array marker not found in blogPosts.js')

    const insertAt  = mIdx + MARKER.length
    const divider   = '─'.repeat(66)
    const header    = `\n  // ${divider}\n  // ${cleanPost.id}. ${cleanPost.title}\n  // ${divider}\n`
    const postJs    = JSON.stringify(cleanPost, null, 2).split('\n').join('\n  ')
    const newSource = source.slice(0, insertAt) + header + '  ' + postJs + ',\n' + source.slice(insertAt)

    fs.writeFileSync(BLOG_POSTS_PATH, newSource, 'utf8')

    // Git operations
    const git = (cmd) => execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe', timeout: 30_000 }).toString().trim()
    try {
      git('git add client/src/data/blogPosts.js')
      git(`git commit -m "blog: add ${cleanPost.title}"`)
      git('git push origin main')
    } catch (gitErr) {
      return res.json({
        success:  true,
        partial:  true,
        slug:     cleanPost.slug,
        id:       cleanPost.id,
        liveUrl:  `https://awe-os.com/blog/${cleanPost.slug}`,
        warning:  'File saved but git push failed — push manually to deploy.',
        gitError: gitErr.message?.split('\n')[0],
      })
    }

    res.json({ success: true, slug: cleanPost.slug, id: cleanPost.id, liveUrl: `https://awe-os.com/blog/${cleanPost.slug}` })
  } catch (err) {
    console.error('[admin-blog/publish]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /ideas ───────────────────────────────────────────────────────────────

router.post('/ideas', requireAuth, requireAdmin, async (req, res) => {
  const { category = 'All', count = 30 } = req.body

  const scope = category === 'All'
    ? 'Mix across: Finance, PDF Tools, Calculators, AI Tools, Health, General'
    : `Focus on: ${category}`

  const prompt = `Generate ${count} SEO blog post ideas for AWE-OS (awe-os.com), a free online tools site for Indian users.

${scope}

For each idea return exactly:
{
  "title": "Compelling SEO-optimised article title",
  "keyword": "primary target keyword phrase",
  "difficulty": "Easy" | "Medium" | "Hard",
  "estimatedSearches": "8,000/month",
  "angle": "One sentence: the unique angle that makes this article stand out",
  "toolSlug": "awe-os-tool-slug to promote (e.g. sip-calculator)",
  "category": "Finance" | "PDF Tools" | "Calculators" | "AI Tools" | "Health" | "General"
}

Return ONLY a valid JSON array of ${count} objects. No other text.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 3000, temperature: 0.8,
    })
    const raw   = completion.choices[0]?.message?.content || ''
    const ideas = parseAIJson(raw)
    res.json({ success: true, ideas: Array.isArray(ideas) ? ideas : [] })
  } catch (err) {
    console.error('[admin-blog/ideas]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /calendar — generate 30-day plan ─────────────────────────────────────

router.post('/calendar', requireAuth, requireAdmin, async (req, res) => {
  const now   = new Date()
  const month = req.body.month || now.toLocaleString('default', { month: 'long' })
  const year  = req.body.year  || now.getFullYear()

  const prompt = `Create a 30-day content calendar for the AWE-OS blog for ${month} ${year}.
AWE-OS is a free tools website for Indian users (PDF tools, financial calculators, AI tools).

For each of the 30 days return:
{ "day": 1, "date": "YYYY-MM-DD", "title": "Article title", "keyword": "target keyword", "category": "Finance", "toolSlug": "sip-calculator", "status": "planned" }

Rules:
- No more than 3 consecutive days in the same category
- Finance 40%, PDF Tools 25%, Calculators 20%, AI/Health/General 15%
- Vary keyword difficulty (mix Easy/Medium/Hard)

Return ONLY a valid JSON array of 30 objects. No other text.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 3000, temperature: 0.7,
    })
    const raw      = completion.choices[0]?.message?.content || ''
    const calendar = parseAIJson(raw)
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(Array.isArray(calendar) ? calendar : [], null, 2), 'utf8')
    res.json({ success: true, calendar: Array.isArray(calendar) ? calendar : [] })
  } catch (err) {
    console.error('[admin-blog/calendar POST]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /calendar — load saved plan ──────────────────────────────────────────

router.get('/calendar', requireAuth, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(CALENDAR_PATH)) return res.json({ success: true, calendar: [] })
    const cal = JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'))
    res.json({ success: true, calendar: Array.isArray(cal) ? cal : [] })
  } catch {
    res.json({ success: true, calendar: [] })
  }
})

// ── PATCH /calendar/:day — update single entry status ────────────────────────

router.patch('/calendar/:day', requireAuth, requireAdmin, (req, res) => {
  const day    = parseInt(req.params.day)
  const status = req.body.status
  try {
    if (!fs.existsSync(CALENDAR_PATH)) return res.status(404).json({ success: false, error: 'No calendar saved' })
    const cal   = JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'))
    const entry = cal.find(e => e.day === day)
    if (entry) entry.status = status
    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(cal, null, 2), 'utf8')
    res.json({ success: true, calendar: cal })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /seo-analyze ─────────────────────────────────────────────────────────

router.post('/seo-analyze', requireAuth, requireAdmin, async (req, res) => {
  const { text, title, keyword } = req.body
  if (!text) return res.status(400).json({ success: false, error: 'text is required' })

  const prompt = `Analyze this blog article for SEO quality. Return ONLY valid JSON:
{
  "metaTitleSuggestion": "Improved meta title under 60 chars",
  "metaDescSuggestion": "Improved meta description under 155 chars",
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "faqSuggestions": [
    { "q": "FAQ question?", "a": "Answer min 80 chars." },
    { "q": "FAQ question?", "a": "Answer." },
    { "q": "FAQ question?", "a": "Answer." }
  ],
  "internalLinkSuggestions": [
    { "anchor": "text to link", "toolSlug": "tool-slug", "toolName": "Tool Name" }
  ],
  "readabilityScore": "Good",
  "readabilityNotes": "One sentence improvement tip."
}

Article title: ${title || 'N/A'}
Target keyword: ${keyword || 'N/A'}
Article (first 3000 chars):
${(text || '').slice(0, 3000)}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.4,
    })
    const raw    = completion.choices[0]?.message?.content || ''
    const result = parseAIJson(raw)
    res.json({ success: true, result })
  } catch (err) {
    console.error('[admin-blog/seo-analyze]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /keywords ────────────────────────────────────────────────────────────

router.post('/keywords', requireAuth, requireAdmin, async (req, res) => {
  const { topic } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })

  const prompt = `Generate 10 SEO keyword ideas for the topic "${topic}" targeting Indian users.

Return ONLY a valid JSON array of 10 objects:
[{ "keyword": "exact phrase", "intent": "Informational", "difficulty": "Easy", "estimatedSearches": "5,000/month", "angle": "One sentence article angle." }]

intent values: Informational | Commercial | Transactional
difficulty values: Easy | Medium | Hard`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.6,
    })
    const raw  = completion.choices[0]?.message?.content || ''
    const kws  = parseAIJson(raw)
    res.json({ success: true, keywords: Array.isArray(kws) ? kws : [] })
  } catch (err) {
    console.error('[admin-blog/keywords]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
