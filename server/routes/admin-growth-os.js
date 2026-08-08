const express        = require('express')
const requireAuth     = require('../middleware/auth')
const supabase         = require('../db/supabase')
const { getOpenAI }    = require('../core/ai-engine')
const parseAIJson      = require('../services/parseAIJson')
const { getSearchAnalytics, isConfigured } = require('../services/search-console.service')

const router = express.Router()

// Explicit per-call ceiling instead of the SDK's ~10min default, for the
// single-call routes below that don't already have their own timeout
// (compare STRATEGY_TIMEOUT_MS used by /strategy further down).
const AI_CALL_TIMEOUT_MS = 90_000

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// Day → platform mapping fixed per the Growth OS spec (7-day cadence).
const CALENDAR_PLATFORMS = [
  { day: 1, platform: 'Blog' },
  { day: 2, platform: 'Quora' },
  { day: 3, platform: 'Reddit' },
  { day: 4, platform: 'LinkedIn' },
  { day: 5, platform: 'Blog' },
  { day: 6, platform: 'Pinterest' },
  { day: 7, platform: 'Email Newsletter' },
]

// ── POST /api/admin/growth-os/strategy ────────────────────────────────────────
// Three independent AI calls (keyword research, competitor gap analysis,
// 7-day content calendar) fired in parallel, each capped at a 30s timeout so
// one slow call can't stall the other two. A single failed section degrades
// to an empty array rather than failing the whole request.

const STRATEGY_TIMEOUT_MS = 30_000

async function callStrategySection(systemPrompt, userPrompt, maxTokens) {
  const completion = await getOpenAI().chat.completions.create(
    {
      model:      'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    },
    { timeout: STRATEGY_TIMEOUT_MS }
  )
  return parseAIJson(completion.choices[0]?.message?.content || '')
}

router.post('/strategy', requireAuth, requireAdmin, async (req, res) => {
  const { toolSlug, toolName, toolCategory, audience, goal } = req.body
  if (!toolSlug || !toolName) {
    return res.status(400).json({ success: false, error: 'toolSlug and toolName are required' })
  }

  try {
    const context = `Tool: ${toolName} (${toolSlug})
Category: ${toolCategory || 'General'}
Target audience: ${audience || 'General India'}
This week's content goal: ${goal || 'Drive traffic'}`

    const [keywordsResult, competitorsResult, calendarResult] = await Promise.allSettled([
      callStrategySection(
        `You are an SEO researcher for AWE-OS (awe-os.com), a free browser-based tools platform for Indian users. Given one tool, its audience, and a weekly goal, research 10 keywords.
Return ONLY valid JSON, no markdown: { "keywords": [ { "keyword": "string", "volume": "High|Medium|Low", "competition": "High|Medium|Low", "relatedQuestions": ["string", "string"] } ] }
Exactly 10 keywords, ordered by relevance.`,
        context, 1200
      ),
      callStrategySection(
        `You are a competitive analyst for AWE-OS (awe-os.com). Given one tool, its audience, and a weekly goal, identify 3 competitors and the content gaps AWE-OS could cover.
Return ONLY valid JSON, no markdown: { "competitors": [ { "url": "string (realistic competitor domain, no protocol)", "ranksFor": ["string"], "gaps": ["string — specific content the competitor is missing"] } ] }
Exactly 3 competitors, real plausible tool/finance/utility sites for the Indian market (not awe-os.com).`,
        context, 1000
      ),
      callStrategySection(
        `You are a content planner for AWE-OS (awe-os.com). Given one tool, its audience, and a weekly goal, produce a 7-day content calendar.
Return ONLY valid JSON, no markdown: { "calendar": [ { "day": 1, "platform": "Blog", "title": "string", "estimatedImpact": "High|Medium|Low" } ] }
Exactly 7 entries, one per day, using this fixed day→platform order: 1=Blog, 2=Quora, 3=Reddit, 4=LinkedIn, 5=Blog, 6=Pinterest, 7=Email Newsletter. Each title must be specific to that day's platform and angle, not a repeat of another day.`,
        context, 1200
      ),
    ])

    const warnings = []
    const pick = (result, label, key) => {
      if (result.status === 'fulfilled') return result.value?.[key] || []
      console.error(`[admin-growth-os/strategy] ${label} failed:`, result.reason?.message)
      warnings.push(`${label} failed: ${result.reason?.message || 'unknown error'}`)
      return []
    }

    const keywords    = pick(keywordsResult,    'Keyword research',      'keywords')
    const competitors  = pick(competitorsResult, 'Competitor analysis',   'competitors')
    const rawCalendar = pick(calendarResult,    'Content calendar',      'calendar')

    const calendar = rawCalendar.map((entry, i) => ({
      day:             CALENDAR_PLATFORMS[i]?.day || entry.day || i + 1,
      platform:        CALENDAR_PLATFORMS[i]?.platform || entry.platform,
      title:           entry.title || '',
      estimatedImpact: entry.estimatedImpact || 'Medium',
    }))

    if (warnings.length === 3) {
      return res.status(502).json({ success: false, error: 'All strategy sections failed: ' + warnings.join('; ') })
    }

    res.json({ success: true, keywords, competitors, calendar, warnings })
  } catch (err) {
    console.error('[admin-growth-os/strategy]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── Search Console aggregation helpers ──────────────────────────────────────────
// Shared by /search-performance and /recommendations so both read the same
// cached gsc_daily_stats rows instead of duplicating the fetch/aggregate logic.

function emptyWindow() {
  return { totalClicks: 0, totalImpressions: 0, avgCtr: 0, avgPosition: 0, topPages: [], allPages: [], topQueries: [] }
}

function aggregateWindow(rows) {
  let totalClicks = 0, totalImpressions = 0, positionWeighted = 0
  const pageMap     = new Map()
  const queryMap    = new Map()
  // Per-page query breakdown — additive alongside the site-wide queryMap
  // above, so CTR Optimizer (Batch 53) can show which real queries are
  // driving impressions on a specific low-CTR page.
  const pageQueryMap = new Map() // page_url -> Map(query -> { query, clicks, impressions })
  // Per-page position, tracked separately from pageMap (not merged onto its
  // objects) so topPages — which references those same objects — stays
  // byte-identical for its existing consumers. See Batch 59 plan.
  const pagePositionMap = new Map() // page_url -> { weighted, impressions }

  for (const r of rows) {
    totalClicks      += r.clicks
    totalImpressions += r.impressions
    positionWeighted += r.position * r.impressions

    const page = pageMap.get(r.page_url) || { page_url: r.page_url, clicks: 0, impressions: 0 }
    page.clicks      += r.clicks
    page.impressions += r.impressions
    pageMap.set(r.page_url, page)

    const pp = pagePositionMap.get(r.page_url) || { weighted: 0, impressions: 0 }
    pp.weighted    += r.position * r.impressions
    pp.impressions += r.impressions
    pagePositionMap.set(r.page_url, pp)

    const q = queryMap.get(r.query) || { query: r.query, clicks: 0, impressions: 0, positionWeighted: 0 }
    q.clicks           += r.clicks
    q.impressions       += r.impressions
    q.positionWeighted  += r.position * r.impressions
    queryMap.set(r.query, q)

    const pq      = pageQueryMap.get(r.page_url) || new Map()
    const pqEntry = pq.get(r.query) || { query: r.query, clicks: 0, impressions: 0 }
    pqEntry.clicks      += r.clicks
    pqEntry.impressions += r.impressions
    pq.set(r.query, pqEntry)
    pageQueryMap.set(r.page_url, pq)
  }

  const topPages = [...pageMap.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 10)

  // Unsliced, includes ctr + each page's top 3 queries by impressions —
  // topPages above stays exactly as-is (sliced top-10 by clicks) for its
  // existing consumers (/recommendations), since a zero-click page would
  // never surface there.
  const allPages = [...pageMap.values()]
    .map(p => {
      const pp = pagePositionMap.get(p.page_url)
      return {
        ...p,
        ctr:         p.impressions > 0 ? Number((p.clicks / p.impressions).toFixed(4)) : 0,
        avgPosition: pp && pp.impressions > 0 ? Number((pp.weighted / pp.impressions).toFixed(1)) : 0,
        topQueries:  [...(pageQueryMap.get(p.page_url)?.values() || [])]
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 3),
      }
    })
    .sort((a, b) => b.impressions - a.impressions)

  const topQueries = [...queryMap.values()]
    .map(q => ({
      query:       q.query,
      clicks:      q.clicks,
      impressions: q.impressions,
      position:    q.impressions > 0 ? Number((q.positionWeighted / q.impressions).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  return {
    totalClicks,
    totalImpressions,
    avgCtr:      totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0,
    avgPosition: totalImpressions > 0 ? Number((positionWeighted / totalImpressions).toFixed(1)) : 0,
    topPages,
    allPages,
    topQueries,
  }
}

// Reads the last 28 days of cached GSC rows once and returns both windows.
// Returns null if not configured, so callers can fall back cleanly.
async function fetchSearchPerformance() {
  if (!isConfigured()) return null

  const end       = new Date()
  const cutoff28  = new Date(end.getTime() - 28 * 24 * 60 * 60 * 1000)
  const cutoff7   = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fmt       = d => d.toISOString().slice(0, 10)
  const cutoff7Str = fmt(cutoff7)

  const { data: rows, error } = await supabase
    .from('gsc_daily_stats')
    .select('date, page_url, query, clicks, impressions, ctr, position, synced_at')
    .gte('date', fmt(cutoff28))
    .limit(10000)
  if (error) throw error

  if (!rows || rows.length === 0) {
    return { lastSyncedAt: null, last7: emptyWindow(), last28: emptyWindow() }
  }

  const rows7 = rows.filter(r => r.date >= cutoff7Str)
  const lastSyncedAt = rows.reduce((max, r) => (!max || r.synced_at > max) ? r.synced_at : max, null)

  return { lastSyncedAt, last7: aggregateWindow(rows7), last28: aggregateWindow(rows) }
}

// ── GET /api/admin/growth-os/search-performance ─────────────────────────────────
// Reads cached GSC data written by /gsc-sync — never calls the live API on a
// dashboard load. Returns both a 7-day and a 28-day aggregation window.

router.get('/search-performance', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.json({ success: true, configured: false })
    }

    const perf = await fetchSearchPerformance()
    res.json({ success: true, configured: true, ...perf })
  } catch (err) {
    console.error('[admin-growth-os/search-performance]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/growth-os/recommendations ──────────────────────────────────
// Heuristic recommendations from real signals: which tools have no recent
// blog coverage, the category mix of published posts, and — when synced —
// real Search Console performance (cached, via fetchSearchPerformance).
// Falls back to category-gap logic alone if no GSC data has been synced yet.

router.get('/recommendations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: recentPosts, error } = await supabase
      .from('blog_posts')
      .select('title, category, related_tools, ai_score, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error

    const coveredSlugs = new Set(
      (recentPosts || []).flatMap(p => (p.related_tools || []).map(t => t.slug).filter(Boolean))
    )
    const categoryCounts = (recentPosts || []).reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1
      return acc
    }, {})
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    let searchPerf = null
    try {
      searchPerf = await fetchSearchPerformance()
    } catch (perfErr) {
      console.error('[admin-growth-os/recommendations] search performance fetch failed:', perfErr.message)
    }
    const hasSearchData = !!(searchPerf && searchPerf.last28.totalImpressions > 0)

    const searchPerfBlock = hasSearchData
      ? `

Search Console data, last 28 days (use these real numbers — flag pages with high impressions but low CTR as title/meta problems, and high-position-but-low-click queries as content-relevance gaps):
Total clicks: ${searchPerf.last28.totalClicks}, total impressions: ${searchPerf.last28.totalImpressions}, avg CTR: ${(searchPerf.last28.avgCtr * 100).toFixed(1)}%, avg position: ${searchPerf.last28.avgPosition}
Top pages by clicks: ${JSON.stringify(searchPerf.last28.topPages.slice(0, 5))}
Top queries by clicks: ${JSON.stringify(searchPerf.last28.topQueries.slice(0, 5))}`
      : ''

    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 900,
      messages: [{
        role: 'system',
        content: `You are a growth advisor for AWE-OS. Given which content categories have been published recently, which have not, and (when available) real Search Console performance, produce short, specific, actionable recommendations.
Return ONLY valid JSON:
{ "recommendations": [ { "type": "content-gap|platform|category|seo-performance", "message": "string, one specific actionable sentence", "priority": "High|Medium|Low" } ] }
Produce 4-6 recommendations. Be concrete — reference actual category names, page URLs, or query strings given, not generic advice.${hasSearchData ? ' Prefer seo-performance recommendations grounded in the real Search Console numbers when they reveal a clear opportunity.' : ''}`,
      }, {
        role: 'user',
        content: `Recently published post categories (most recent 30): ${JSON.stringify(categoryCounts)}
Most-published category: ${topCategory || 'none yet'}
Number of distinct AWE-OS tools with a linked blog post in the last 30 posts: ${coveredSlugs.size}${searchPerfBlock}`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })

    const raw    = completion.choices[0]?.message?.content || ''
    const parsed = parseAIJson(raw)

    res.json({ success: true, recommendations: parsed.recommendations || [] })
  } catch (err) {
    console.error('[admin-growth-os/recommendations]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/growth-os/gsc-sync ─────────────────────────────────────────
// Pulls the last 7 days of Search Console data and upserts it into
// gsc_daily_stats (deduped on date+page_url+query). Manually triggered from
// the UI for now — no cron/scheduling wired up in this stage.

const GSC_SYNC_BATCH_SIZE = 500

router.post('/gsc-sync', requireAuth, requireAdmin, async (req, res) => {
  try {
    const end   = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fmt   = d => d.toISOString().slice(0, 10)

    const startDate = fmt(start)
    const endDate   = fmt(end)

    const { configured, rows } = await getSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['date', 'page', 'query'],
      rowLimit:   5000,
    })

    if (!configured) {
      return res.json({ success: true, configured: false, synced: 0 })
    }

    const syncedAt = new Date().toISOString()
    const payload = rows.map(row => ({
      date:        row.keys[0],
      page_url:    row.keys[1],
      query:       row.keys[2],
      clicks:      row.clicks,
      impressions: row.impressions,
      ctr:         row.ctr,
      position:    row.position,
      synced_at:   syncedAt,
    }))

    let synced = 0
    for (let i = 0; i < payload.length; i += GSC_SYNC_BATCH_SIZE) {
      const batch = payload.slice(i, i + GSC_SYNC_BATCH_SIZE)
      const { error } = await supabase
        .from('gsc_daily_stats')
        .upsert(batch, { onConflict: 'date,page_url,query' })
      if (error) throw error
      synced += batch.length
    }

    res.json({ success: true, configured: true, synced, dateRange: { startDate, endDate } })
  } catch (err) {
    console.error('[admin-growth-os/gsc-sync]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/growth-os/image-prompts ───────────────────────────────────
// Text-only prompt generation for a blog topic — does not call an image API.

router.post('/image-prompts', requireAuth, requireAdmin, async (req, res) => {
  const { topic, style } = req.body
  if (!topic) return res.status(400).json({ success: false, error: 'topic is required' })

  try {
    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      max_tokens: 700,
      messages: [{
        role: 'system',
        content: `You write AI image-generation prompts for a blog's featured/social images. Style requested: ${style || 'Blog header'}.
Return ONLY valid JSON: { "prompts": ["string", "string", "string", "string", "string"] }
Exactly 5 prompts, each a single detailed sentence describing composition, subject, and mood — suitable to paste into an AI image generator.`,
      }, {
        role: 'user',
        content: `Blog topic: ${topic}`,
      }],
    }, { timeout: AI_CALL_TIMEOUT_MS })
    const raw    = completion.choices[0]?.message?.content || ''
    const parsed = parseAIJson(raw)
    res.json({ success: true, prompts: parsed.prompts || [] })
  } catch (err) {
    console.error('[admin-growth-os/image-prompts]', err.message)
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
})

// ── Additive export for reuse by admin-blog-bulk-audit.js's CTR Optimizer
// (Batch 53) — attached to the router object so `require('./admin-growth-os')`
// call sites that only expect the router keep working unchanged.
router.fetchSearchPerformance = fetchSearchPerformance

module.exports = router
