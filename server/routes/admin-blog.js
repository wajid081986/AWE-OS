const express          = require('express')
const OpenAI           = require('openai')
const fs               = require('fs')
const path             = require('path')
const requireAuth      = require('../middleware/auth')

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DATA_DIR      = path.resolve(__dirname, '../data')
const CALENDAR_PATH = path.join(DATA_DIR, 'blog-calendar.json')

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

// ── POST /generate — word-count-targeted three-call approach ─────────────────

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

  // ── Word count config — adjust tokens and section targets per length ────────
  let call2MaxTokens, call3MaxTokens, call2Target, call3Target, call2SectionGuide, call3SectionGuide

  if (wordCount <= 800) {
    call2MaxTokens = 1500; call3MaxTokens = 1500
    call2Target = 400;     call3Target = 400
    call2SectionGuide = `Write sections 1-4 only. EXACT TARGET: ${call2Target} words total.
- Opening paragraph: exactly 80 words
- H2: What is [topic]? — exactly 100 words, 1 paragraph
- H2: How it works — exactly 120 words, include 1 small table
- H2: Who should use this — exactly 100 words, 3 bullet points
DO NOT write more than ${call2Target} words. Stop exactly at target.`
    call3SectionGuide = `Write sections 5-7 only. EXACT TARGET: ${call3Target} words total.
- H2: Step by step guide — exactly 120 words, 4 numbered steps
- H2: Common mistakes — exactly 80 words, 3 bullet points
- H2: FAQ — exactly 200 words total across 3 FAQs (65 words each answer)
- Conclusion: exactly 80 words
DO NOT write more than ${call3Target} words. Stop exactly at target.`
  } else if (wordCount <= 1200) {
    call2MaxTokens = 2000; call3MaxTokens = 2000
    call2Target = 600;     call3Target = 600
    call2SectionGuide = `Write sections 1-5 only. EXACT TARGET: ${call2Target} words total.
- Opening paragraph: exactly 100 words
- H2: What is [topic]? — exactly 150 words, 2 paragraphs
- H2: Main explanation with data table — exactly 150 words + table
- H2: Real examples with ₹ calculations — exactly 150 words, 2 examples
- H2: Who should use this — exactly 100 words, 4 bullet points
STOP at ${call2Target} words. Do not write beyond this.`
    call3SectionGuide = `Write sections 6-9 only. EXACT TARGET: ${call3Target} words total.
- H2: Step by step guide — exactly 150 words, 5 numbered steps
- H2: Common mistakes — exactly 100 words, 3 bullet points
- H2: FAQ — exactly 250 words total across 4 FAQs (60 words each answer)
- Conclusion with CTA: exactly 100 words
STOP at ${call3Target} words. Do not write beyond this.`
  } else {
    call2MaxTokens = 2500; call3MaxTokens = 2500
    call2Target = 750;     call3Target = 750
    call2SectionGuide = `Write sections 1-5 only. EXACT TARGET: ${call2Target} words total.
- Opening paragraph: exactly 120 words
- H2: What is [topic]? — exactly 180 words, 2-3 full paragraphs
- H2: Main explanation with data table — exactly 180 words + complete table
- H2: Real examples with ₹ calculations — exactly 200 words, 3 detailed examples
- H2: Who should use this — exactly 150 words, 5 detailed bullet points
STOP at exactly ${call2Target} words. Count carefully.`
    call3SectionGuide = `Write sections 6-9 only. EXACT TARGET: ${call3Target} words total.
- H2: Step by step guide — exactly 180 words, 5-6 steps
- H2: Common mistakes — exactly 120 words, 4 bullet points
- H2: FAQ — exactly 350 words total across 5 FAQs (70 words each answer)
- Conclusion with CTA: exactly 100 words
STOP at exactly ${call3Target} words. Count carefully.`
  }

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

    // ── Call 2: First half content (gpt-4o, dynamic tokens) ──────────────────
    const half1System = `You are a professional SEO content writer.
Write the first half of a long-form blog post about "${topic}".
Return ONLY a valid JSON array of content blocks. No extra text.

STRICT RULES:
- TOTAL TARGET: ${call2Target} words across all blocks
- Each paragraph block: minimum 60 words
- Tables: include complete rows with real Indian ₹ figures
- Bullet items: full sentences, 20+ words each
- CRITICAL: Count your words as you write. Target is exactly ${call2Target} words.
  Write to hit the target — not more, not less.
  If you reach the target mid-sentence, finish that sentence and stop.

Content block types:
{"type":"p","text":"paragraph text here"}
{"type":"h2","text":"Section Heading"}
{"type":"h3","text":"Sub heading"}
{"type":"ul","items":["item 1 full sentence","item 2 full sentence"]}
{"type":"table","headers":["Col1","Col2","Col3"],"rows":[["v1","v2","v3"]]}

DO NOT stop early. Write ALL sections completely.
DO NOT return anything except the JSON array.`

    const half1Prompt = `${call2SectionGuide}

Topic: "${topic}" | Keyword: "${kw}" | Tool: ${toolRef} (${toolUrl})
Indian Context: ${indianCtx} | Tone: ${toneGuide}

Rules: bold key numbers (**₹5,000**), short paragraphs (max 3 lines), Indian number format.
Return as a raw JSON array of content blocks (no wrapping object).`

    const call2 = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: half1System }, { role: 'user', content: half1Prompt }],
      max_tokens: call2MaxTokens, temperature: 0.7,
    })
    const raw2        = call2.choices[0]?.message?.content || ''
    const firstHalf   = parseAIJson(raw2)
    const firstBlocks = Array.isArray(firstHalf) ? firstHalf : (firstHalf.content || [])

    // ── Call 3: Second half content + FAQs (gpt-4o, dynamic tokens) ──────────
    const calloutHref  = toolSlug ? `/tools/${toolSlug}` : '/'
    const half2System = `You are a professional SEO content writer.
Write the second half of a long-form blog post about "${topic}".
Return ONLY a valid JSON object with two keys: blocks and faqs.
No extra text outside the JSON.

STRICT RULES:
- TOTAL TARGET: ${call3Target} words in blocks + 100+ words per FAQ answer
- Each step in step-by-step: full sentence with detail, 20+ words
- Each mistake bullet: 25+ words explaining what and why
- Conclusion: 2 full paragraphs, 60+ words each
- EACH FAQ ANSWER: minimum 100 words, explain thoroughly
- CRITICAL: Count your words as you write. Target is exactly ${call3Target} words for blocks.

Return format:
{
  "blocks": [
    {"type":"h2","text":"Step by Step..."},
    {"type":"p","text":"..."},
    {"type":"ul","items":["Step 1: ...","Step 2: ..."]},
    {"type":"callout","text":"...","links":[{"href":"${calloutHref}","label":"${toolRef}"}]},
    {"type":"h2","text":"Common Mistakes..."},
    {"type":"ul","items":["Mistake 1: explanation..."]},
    {"type":"h2","text":"Frequently Asked Questions"},
    {"type":"p","text":"Conclusion paragraph..."},
    {"type":"p","text":"Second conclusion paragraph with CTA..."}
  ],
  "faqs": [
    {"q":"Question 1?","a":"Full answer minimum 100 words..."},
    {"q":"Question 2?","a":"Full answer minimum 100 words..."},
    {"q":"Question 3?","a":"Full answer minimum 100 words..."},
    {"q":"Question 4?","a":"Full answer minimum 100 words..."},
    {"q":"Question 5?","a":"Full answer minimum 100 words..."}
  ]
}`

    const half2Prompt = `${call3SectionGuide}

Topic: "${topic}" | Keyword: "${kw}" | Tool: ${toolRef} (${toolUrl})
Indian Context: ${indianCtx} | Tone: ${toneGuide}

Return the JSON object with "blocks" and "faqs" keys as specified in the system prompt.`

    const call3 = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: half2System }, { role: 'user', content: half2Prompt }],
      max_tokens: call3MaxTokens, temperature: 0.7,
    })
    const raw3         = call3.choices[0]?.message?.content || ''
    const secondData   = parseAIJson(raw3)
    const secondBlocks = Array.isArray(secondData) ? secondData : (secondData.blocks || secondData.content || [])
    const faqs         = secondData.faqs || []

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
    const countWords = (str) => (str || '').split(/\s+/).filter(Boolean).length

    const call2Words        = firstBlocks.map(b => countWords(b.text || (b.items || []).join(' ') || (b.headers ? [...(b.headers || []), ...(b.rows || []).flat()].join(' ') : ''))).reduce((a, b) => a + b, 0)
    const call3ContentWords = secondBlocks.map(b => countWords(b.text || (b.items || []).join(' ') || (b.headers ? [...(b.headers || []), ...(b.rows || []).flat()].join(' ') : ''))).reduce((a, b) => a + b, 0)
    const faqWords          = faqs.map(f => countWords(f.q + ' ' + f.a)).reduce((a, b) => a + b, 0)
    const totalWords        = call2Words + call3ContentWords + faqWords

    console.log('[blog/generate] Call 2 words:', call2Words)
    console.log('[blog/generate] Call 3 content words:', call3ContentWords)
    console.log('[blog/generate] FAQ words:', faqWords)
    console.log('[blog/generate] Total words:', totalWords)

    if (totalWords < wordCount * 0.7) {
      return res.json({
        success:        false,
        error:          `Generated content too short (${totalWords} words). Please try again.`,
        actualWords:    totalWords,
        requestedWords: wordCount,
      })
    }

    res.json({ success: true, post, actualWords: totalWords })
  } catch (err) {
    console.error('[admin-blog/generate]', err.message)
    res.status(500).json({ success: false, error: err.message || 'Generation failed' })
  }
})

// ── POST /publish — GitHub API (works on Render.com ephemeral FS) ─────────────

async function publishToGitHub(newPost) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN env variable not set — add it in Render dashboard')

  const REPO      = 'wajid081986/AWE-OS'
  const FILE_PATH = 'client/src/data/blogPosts.js'
  const BRANCH    = 'main'
  const API_BASE  = 'https://api.github.com'
  const HEADERS   = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept':        'application/vnd.github.v3+json',
    'User-Agent':    'AWE-OS-Blog-Assistant',
  }

  // Step 1: Get current file + SHA from GitHub
  const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, { headers: HEADERS })
  if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status} ${getRes.statusText}`)
  const fileData       = await getRes.json()
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8')
  const fileSha        = fileData.sha

  // Step 2: Assign next id
  const idMatches = [...currentContent.matchAll(/\bid:\s*(\d+)/g)]
  const maxId     = idMatches.length ? Math.max(...idMatches.map(m => parseInt(m[1]))) : 0
  newPost.id      = maxId + 1

  // Step 3: Insert new post at top of BLOG_POSTS array
  const MARKER      = 'export const BLOG_POSTS = ['
  const insertPoint = currentContent.indexOf(MARKER) + MARKER.length
  if (insertPoint === MARKER.length - 1) throw new Error('BLOG_POSTS array marker not found in blogPosts.js')

  const divider     = '─'.repeat(77)
  const commentLine = `\n  // ${divider}\n  // ${newPost.id}. ${newPost.title}\n  // ${divider}\n`
  const newContent  =
    currentContent.slice(0, insertPoint) +
    commentLine +
    '  ' + JSON.stringify(newPost, null, 2).replace(/\n/g, '\n  ') +
    ',' +
    currentContent.slice(insertPoint)

  // Step 4: Push to GitHub via Contents API
  const pushRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `blog: add "${newPost.title}"`,
      content: Buffer.from(newContent, 'utf8').toString('base64'),
      sha:     fileSha,
      branch:  BRANCH,
    })
  })
  const pushData = await pushRes.json()
  if (!pushRes.ok) throw new Error(pushData.message || 'GitHub push failed')

  return {
    success:   true,
    slug:      newPost.slug,
    id:        newPost.id,
    liveUrl:   `https://www.awe-os.com/blog/${newPost.slug}`,
    commitUrl: pushData.commit?.html_url,
  }
}

router.post('/publish', requireAuth, requireAdmin, async (req, res) => {
  const { post } = req.body
  if (!post?.slug || !post?.title) {
    return res.status(400).json({ success: false, error: 'post with slug and title is required' })
  }

  try {
    const cleanPost = {
      slug:            post.slug,
      title:           post.title,
      date:            new Date().toISOString().split('T')[0],
      category:        post.category        || 'General',
      author:          'AWE-OS Team',
      readTime:        post.readTime        || '5 min read',
      excerpt:         post.excerpt         || '',
      metaTitle:       post.metaTitle       || post.title,
      metaDescription: post.metaDescription || post.excerpt || '',
      relatedTools:    post.relatedTools    || [],
      content:         post.content         || [],
      ...(Array.isArray(post.faqs) && post.faqs.length ? { faqs: post.faqs } : {}),
    }

    const result = await publishToGitHub(cleanPost)
    res.json(result)
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
