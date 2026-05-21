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

// ── POST /generate — three-call approach for reliable 1500-word content ──────

router.post('/generate', requireAuth, requireAdmin, async (req, res) => {
  const { topic, keyword, toolSlug, toolName, wordCount = 1200, tone = 'beginner', category = 'Finance', indianContext = true } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })

  const toneGuide = {
    beginner:       'Write for someone completely new. Simple language, explain every term.',
    expert:         'Write for financially literate readers who want deep analysis, not basics.',
    conversational: 'Write like a friendly chat with a colleague — warm, direct, real examples.',
    quickguide:     'Be concise and practical. Bullet points over paragraphs where possible.',
  }[tone] || 'Write for someone completely new. Simple language, explain every term.'

  const toolUrl   = toolSlug ? `https://www.awe-os.com/tools/${toolSlug}` : 'https://www.awe-os.com'
  const toolRef   = toolName || toolSlug || 'AWE-OS'
  const kw        = keyword  || topic
  const indianCtx = indianContext
    ? 'Yes — use ₹ symbol, Indian number format (₹12,75,000), SEBI/RBI/ICMR context where relevant'
    : 'No'

  try {
    // ── Call 1: Metadata only (gpt-4o, 500 tokens) ───────────────────────────
    const metaPrompt = `Generate blog post metadata. Return ONLY valid JSON, no other text.

Topic: ${topic}
Target Keyword: "${kw}"
AWE-OS Tool: ${toolRef} at ${toolUrl}
Category: ${category}
Indian Context: ${indianCtx}

{
  "slug": "url-slug-from-topic",
  "title": "Compelling article title with target keyword",
  "metaTitle": "SEO title max 60 chars",
  "metaDescription": "SEO description max 155 chars, include keyword",
  "category": "${category}",
  "excerpt": "2-3 sentence blog listing summary",
  "readTime": "${Math.ceil(wordCount / 200)} min read",
  "relatedTools": [
    {"label": "Tool Name", "slug": "tool-slug", "icon": "emoji"},
    {"label": "Tool Name", "slug": "tool-slug", "icon": "emoji"}
  ]
}`

    const call1 = await openai.chat.completions.create({
      model: 'gpt-4o', messages: [{ role: 'user', content: metaPrompt }],
      max_tokens: 500, temperature: 0.7,
    })
    const metadata = parseAIJson(call1.choices[0]?.message?.content || '')

    // ── Call 2: First half — sections 1-5 (gpt-4o, 2500 tokens) ─────────────
    const half1System = `You are writing ONLY the first 5 sections of a blog post about "${topic}".
DO NOT write a conclusion. DO NOT write FAQs. STOP after section 5.
Each section MUST be 150-200 words minimum.
Total output must be 700-800 words of actual prose content.
Return ONLY a valid JSON array of content blocks. No wrapper object. No other text.
Example format: [{"type":"p","text":"..."},{"type":"h2","text":"..."},{"type":"table","headers":[...],"rows":[[...]]}]`

    const half1Prompt = `Write the FIRST HALF (sections 1-5) of a blog post.
Topic: "${topic}" | Keyword: "${kw}" | Tool: ${toolRef} (${toolUrl})
Indian Context: ${indianCtx} | Tone: ${toneGuide}

SECTION 1 — Opening paragraph (NO heading tag):
100+ words. Hook with a relatable problem or surprising fact about ${topic}.

SECTION 2 — H2: What is ${topic.split(' ').slice(0, 5).join(' ')}?
150+ words. Full explanation with Indian context. At least 2 paragraphs.

SECTION 3 — H2: [Data/Comparison section with a complete table]
200+ words. Include a complete data table with real Indian ₹ figures, percentages, or dates. 2-3 paragraphs plus the table.

SECTION 4 — H2: Real Examples with ₹ Calculations
200+ words. 3 detailed worked examples with actual arithmetic. Use ₹12,75,000 format.

SECTION 5 — H2: Who Should Know This?
150+ words. 5 specific reader scenarios or profiles who benefit most.

Rules: bold key numbers (**₹5,000**), short paragraphs (max 3 lines), Indian number format.
Return as a raw JSON array of content blocks (no wrapping object).`

    const call2 = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: half1System }, { role: 'user', content: half1Prompt }],
      max_tokens: 2500, temperature: 0.7,
    })
    const raw2       = call2.choices[0]?.message?.content || ''
    const firstHalf  = parseAIJson(raw2)
    const firstBlocks = Array.isArray(firstHalf) ? firstHalf : (firstHalf.content || [])

    // ── Call 3: Second half — sections 6-9 + FAQs (gpt-4o, 2500 tokens) ─────
    const half2System = `You are writing ONLY the last 4 sections of a blog post about "${topic}".
This is the SECOND HALF. Do NOT repeat sections 1-5. Start directly from section 6.
Each FAQ answer MUST be 100 words minimum. Write detailed, practical answers.
Total prose content must be 700-800 words.
Return ONLY a valid JSON object with exactly two keys: "content" and "faqs". No other text.`

    const calloutHref  = toolSlug ? `/tools/${toolSlug}` : '/'
    const half2Prompt = `Write the SECOND HALF (sections 6-9) of a blog post.
Topic: "${topic}" | Keyword: "${kw}" | Tool: ${toolRef} (${toolUrl})
Indian Context: ${indianCtx} | Tone: ${toneGuide}

SECTION 6 — H2: Step by Step — How to Use ${toolRef}
150+ words. Numbered steps (1-5) for using the AWE-OS tool. Follow with a callout block.

SECTION 7 — H2: Common Mistakes to Avoid
100+ words. 3-4 specific mistakes people make related to ${topic}. Use a bullet list.

SECTION 8 — H2: Frequently Asked Questions
Write 5 FAQs. Each answer MUST be 100 words minimum — detailed and practical.

SECTION 9 — Conclusion (NO heading tag)
100+ words. Summarise key takeaways and end with a strong CTA to use ${toolRef} at ${toolUrl}.

Return this exact JSON structure:
{
  "content": [
    {"type":"h2","text":"Step by Step — How to Use ${toolRef}"},
    {"type":"p","text":"intro paragraph..."},
    {"type":"ul","items":["Step 1: ...","Step 2: ...","Step 3: ...","Step 4: ...","Step 5: ..."]},
    {"type":"callout","title":"Try it Free","text":"Use the free ${toolRef} at AWE-OS — no signup needed.","links":[{"href":"${calloutHref}","label":"Open Free ${toolRef}"}]},
    {"type":"h2","text":"Common Mistakes to Avoid"},
    {"type":"ul","items":["Mistake 1: ...","Mistake 2: ...","Mistake 3: ..."]},
    {"type":"p","text":"conclusion paragraph 100+ words..."}
  ],
  "faqs": [
    {"q":"Question 1?","a":"100+ word detailed answer..."},
    {"q":"Question 2?","a":"100+ word detailed answer..."},
    {"q":"Question 3?","a":"100+ word detailed answer..."},
    {"q":"Question 4?","a":"100+ word detailed answer..."},
    {"q":"Question 5?","a":"100+ word detailed answer..."}
  ]
}`

    const call3 = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: half2System }, { role: 'user', content: half2Prompt }],
      max_tokens: 2500, temperature: 0.7,
    })
    const raw3        = call3.choices[0]?.message?.content || ''
    const secondData  = parseAIJson(raw3)
    const secondBlocks = Array.isArray(secondData) ? secondData : (secondData.content || [])
    const faqs        = secondData.faqs || []

    // ── Merge into final post ─────────────────────────────────────────────────
    const allContent = [...firstBlocks, ...secondBlocks]

    const post = {
      slug:            metadata.slug            || topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      title:           metadata.title           || topic,
      date:            new Date().toISOString().split('T')[0],
      category:        metadata.category        || category,
      author:          'AWE-OS Team',
      readTime:        metadata.readTime         || `${Math.ceil(wordCount / 200)} min read`,
      excerpt:         metadata.excerpt          || '',
      metaTitle:       metadata.metaTitle        || metadata.title || topic,
      metaDescription: metadata.metaDescription  || metadata.excerpt || '',
      relatedTools:    metadata.relatedTools     || [],
      content:         allContent,
      faqs,
    }

    // ── Word count validation ─────────────────────────────────────────────────
    const actualWc = allContent
      .map(b => b.text || (b.items || []).join(' ') || (b.headers ? [...(b.headers || []), ...(b.rows || []).flat()].join(' ') : ''))
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
      .length

    if (actualWc < wordCount * 0.8) {
      return res.json({
        success:        false,
        error:          `Generated content too short (${actualWc} words). Please try again.`,
        actualWords:    actualWc,
        requestedWords: wordCount,
      })
    }

    res.json({ success: true, post, actualWords: actualWc })
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
