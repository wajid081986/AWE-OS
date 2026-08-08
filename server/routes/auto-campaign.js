const express      = require('express')
const requireAuth  = require('../middleware/auth')
const supabase     = require('../db/supabase')
const fetchFeaturedImage = require('../services/unsplashImage')
const { getOpenAI } = require('../core/ai-engine')
const { postTweet }  = require('../services/twitter.service')
const { createPin }  = require('../services/pinterest.service')
const { buildTrackedUrl } = require('../services/utm')

const router = express.Router()

// Explicit per-call ceiling instead of the SDK's ~10min default.
const AI_CALL_TIMEOUT_MS = 120_000

const SUBREDDIT_MAP = {
  'PDF Tools':    'india',
  'Calculators':  'personalfinanceindia',
  'Converters':   'productivity',
  'Productivity': 'freelance',
  'AI Tools':     'artificial',
}

const BOARD_MAP = {
  'PDF Tools':    'PDF Tips India',
  'Calculators':  'Financial Planning India',
  'Converters':   'Online Tools India',
  'Productivity': 'Work Productivity',
  'AI Tools':     'AI Tools Tips',
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// ── POST /api/auto-campaign/run ───────────────────────────────────────────────
// SSE streaming endpoint — sends progress events as each step completes.

router.post('/run', requireAuth, requireAdmin, async (req, res) => {
  const { toolSlug, toolName, toolCategory, audience } = req.body
  if (!toolSlug || !toolName) {
    return res.status(400).json({ success: false, error: 'toolSlug and toolName are required' })
  }

  // ── SSE setup ─────────────────────────────────────────────────
  res.setHeader('Content-Type',      'text/event-stream')
  res.setHeader('Cache-Control',     'no-cache, no-transform')
  res.setHeader('Connection',        'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let aborted = false
  req.on('close', () => { aborted = true })

  const send = (data) => {
    if (aborted) return
    try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch {}
  }

  const toolUrl   = `https://www.awe-os.com/tools/${toolSlug}`
  const subreddit = SUBREDDIT_MAP[toolCategory] || 'india'
  const board     = BOARD_MAP[toolCategory]     || 'Online Tools India'

  try {
    // ── Steps 1-3: Single Claude call generates all content ──────
    send({ step: 1, total: 6, status: 'running', label: 'Generating Reddit post...' })
    send({ step: 2, total: 6, status: 'running', label: 'Generating Quora answer...' })
    send({ step: 3, total: 6, status: 'running', label: 'Generating blog article...' })

    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 4000,
      messages: [{
        role: 'system',
        content: `You are a content creator for AWE-OS (https://www.awe-os.com), a free online tools platform for Indian users.
Generate complete marketing content for a given tool in a single structured response.
Return ONLY valid JSON, no markdown, no explanation:
{
  "twitterText": "string (max 240 chars, conversational, no hashtags, mention the tool briefly)",
  "pinterestTitle": "string (max 100 chars, SEO-friendly, include a benefit or action)",
  "pinterestDescription": "string (150-200 words, helpful, includes tool URL naturally, ends with soft CTA)",
  "blogTitle": "string (60-70 chars, SEO-optimized, includes primary keyword)",
  "blogSlug": "string (kebab-case, 4-6 words, no numbers or years)",
  "blogMetaDescription": "string (max 155 chars, includes target keyword and value prop)",
  "blogBlocks": [
    {"type": "h2", "text": "Section heading"},
    {"type": "p", "text": "Paragraph, 120-150 words"},
    {"type": "p", "text": "Paragraph, 120-150 words"},
    {"type": "ul", "items": ["Full sentence bullet point", "Another full sentence bullet point"]}
  ],
  "blogFaqs": [{"q": "string", "a": "string (80-120 words, thorough and specific)"}],
  "redditPost": {"subreddit": "string", "title": "string (compelling, not spammy)", "body": "string (200-250 words, value-first, tool mentioned once naturally)"},
  "quoraAnswer": {"question": "string (realistic question a user would ask)", "answer": "string (250-300 words, expert tone, Indian context, tool mentioned once)"}
}
Blog structure rules:
- blogBlocks must contain exactly 7 sections, each an {"type":"h2"} block followed by 2 {"type":"p"} paragraph blocks (~250-300 words per section, ~2000 words total across all sections). Add a {"type":"ul"} block to 2-3 sections where a bullet list fits naturally.
- Exactly 5 blogFaqs, each answer 80-120 words.
- Naturally weave exactly one inline internal link into one paragraph's text using this exact HTML format: <a href='/tools/${toolSlug}'>${toolName}</a>
- Write as a genuine Indian professional sharing useful info, not marketing copy.`,
      }, {
        role: 'user',
        content: `Tool: ${toolName}
Tool URL: ${toolUrl}
Category: ${toolCategory || 'General'}
Target Audience: ${audience || 'Indian Professionals'}
Subreddit: r/${subreddit}
Pinterest Board: ${board}

Generate all content for this tool. Keep it authentic and helpful.`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    if (aborted) return res.end()

    const raw   = completion.choices[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI returned unexpected format — no JSON found')
    const content = JSON.parse(match[0])

    send({ step: 1, total: 6, status: 'done',    label: 'Reddit post ready',    data: content.redditPost  })
    send({ step: 2, total: 6, status: 'done',    label: 'Quora answer ready',   data: content.quoraAnswer })
    send({ step: 3, total: 6, status: 'done',    label: 'Blog article ready'                              })

    // ── Step 4: Publish blog to Supabase ─────────────────────────
    if (aborted) return res.end()
    send({ step: 4, total: 6, status: 'running', label: 'Publishing blog to AWE-OS...' })

    let blogUrl = null
    let campaignSlug = null
    try {
      const rawSlug   = content.blogSlug || `${toolSlug}-guide`
      const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      campaignSlug = cleanSlug
      const blogBlocks = content.blogBlocks || []
      const blogWordCount = blogBlocks
        .map(b => b.text || (b.items || []).join(' '))
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length
      const featuredImage = await fetchFeaturedImage(toolName)
      const row = {
        slug:             cleanSlug,
        title:            content.blogTitle,
        date:             new Date().toISOString().split('T')[0],
        category:         toolCategory || 'General',
        author:           'AWE-OS Team',
        read_time:        `${Math.max(1, Math.ceil(blogWordCount / 200))} min read`,
        excerpt:          content.blogMetaDescription || '',
        meta_title:       content.blogTitle,
        meta_description: content.blogMetaDescription || '',
        content:          blogBlocks,
        faqs:             content.blogFaqs     || [],
        related_tools:    [{ slug: toolSlug, label: toolName, icon: '🔧' }],
        tags:             [toolName, toolCategory || 'tools', 'AWE-OS', 'free online'],
        image_url:        featuredImage?.url       || null,
        image_credit:     featuredImage?.credit    || null,
        image_credit_url: featuredImage?.creditUrl || null,
        status:           'published',
        updated_at:       new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .upsert([row], { onConflict: 'slug' })
        .select('slug')
      if (error) throw error
      blogUrl = `https://www.awe-os.com/blog/${data[0]?.slug || cleanSlug}`
      send({ step: 4, total: 6, status: 'done',   label: 'Blog published',      url: blogUrl })
    } catch (err) {
      console.error('[auto-campaign/blog]', err.message)
      send({ step: 4, total: 6, status: 'failed', label: 'Blog publish failed', error: err.message })
    }

    // ── Step 5: Post to Twitter ───────────────────────────────────
    if (aborted) return res.end()
    send({ step: 5, total: 6, status: 'running', label: 'Posting to Twitter/X...' })

    let tweetUrl = null
    try {
      const linkToUse = buildTrackedUrl(blogUrl || toolUrl, {
        source:   'twitter',
        medium:   'social',
        campaign: campaignSlug || toolSlug,
      })
      const tweetText = content.twitterText || `${toolName} — free on AWE-OS! No signup needed.`
      const posted    = await postTweet(tweetText, linkToUse)
      tweetUrl        = posted.tweetUrl
      send({ step: 5, total: 6, status: 'done',   label: 'Tweet posted',    url: tweetUrl })
    } catch (err) {
      console.error('[auto-campaign/twitter]', err.message)
      send({ step: 5, total: 6, status: 'failed', label: 'Twitter failed', error: err.message })
    }

    // ── Step 6: Create Pinterest pin ──────────────────────────────
    if (aborted) return res.end()
    send({ step: 6, total: 6, status: 'running', label: 'Creating Pinterest pin...' })

    let pinUrl = null
    try {
      const pin = await createPin({
        title:       content.pinterestTitle || `Free ${toolName} Online — AWE-OS`,
        description: content.pinterestDescription,
        link:        buildTrackedUrl(blogUrl || toolUrl, {
          source:   'pinterest',
          medium:   'social',
          campaign: campaignSlug || toolSlug,
        }),
      })
      pinUrl = pin.pinUrl
      send({ step: 6, total: 6, status: 'done',   label: 'Pinterest pin created', url: pinUrl })
    } catch (err) {
      console.error('[auto-campaign/pinterest]', err.message)
      send({ step: 6, total: 6, status: 'failed', label: 'Pinterest failed',      error: err.message })
    }

    // ── Final summary ─────────────────────────────────────────────
    send({
      step: 'complete',
      results: {
        blog:      blogUrl  ? { success: true, url: blogUrl }  : { success: false },
        twitter:   tweetUrl ? { success: true, url: tweetUrl } : { success: false },
        pinterest: pinUrl   ? { success: true, url: pinUrl }   : { success: false },
        reddit:    content.redditPost  || null,
        quora:     content.quoraAnswer || null,
      },
    })

  } catch (err) {
    console.error('[auto-campaign/run]', err.message)
    send({ step: 1, total: 6, status: 'failed', label: 'Content generation failed', error: err.message })
    send({ step: 2, total: 6, status: 'failed', label: 'Content generation failed', error: err.message })
    send({ step: 3, total: 6, status: 'failed', label: 'Content generation failed', error: err.message })
    send({ step: 'error', error: err.message })
  } finally {
    if (!aborted) res.end()
  }
})

module.exports = router
