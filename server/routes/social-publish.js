const express      = require('express')
const { TwitterApi } = require('twitter-api-v2')
const requireAuth  = require('../middleware/auth')

const router = express.Router()

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

function getTwitterClient() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    throw new Error('Twitter API credentials not configured in environment')
  }
  return new TwitterApi({
    appKey:      X_API_KEY,
    appSecret:   X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  })
}

function buildTweetText(text, toolUrl) {
  if (toolUrl && !text.includes(toolUrl)) {
    const suffix = ` ${toolUrl}`
    text = (text.length + suffix.length) <= 280
      ? text + suffix
      : text.slice(0, 280 - suffix.length - 3) + '...' + suffix
  }
  if (text.length > 280) text = text.slice(0, 277) + '...'
  return text
}

function classifyTwitterError(err) {
  const msg = (err.message || '').toLowerCase()
  const status = err.data?.status || err.code
  if (status === 429 || msg.includes('rate limit'))  return 'Twitter rate limit reached. Try again in 15 minutes.'
  if (status === 401 || msg.includes('unauthorized')) return 'Twitter auth error. Check API credentials.'
  if (msg.includes('duplicate'))                      return 'Duplicate tweet. Twitter does not allow identical tweets.'
  return err.message || 'Twitter post failed'
}

// ── POST /api/social/post-twitter ─────────────────────────────────────────────

router.post('/post-twitter', requireAuth, requireAdmin, async (req, res) => {
  let { text, toolName, toolUrl } = req.body
  if (!text) return res.status(400).json({ success: false, error: 'text is required' })

  text = buildTweetText(text, toolUrl)

  try {
    const client = getTwitterClient()
    const tweet  = await client.v2.tweet(text)
    const tweetId = tweet.data.id
    return res.json({
      success:  true,
      tweetId,
      tweetUrl: `https://twitter.com/i/web/status/${tweetId}`,
    })
  } catch (err) {
    console.error('[social/post-twitter]', err.message)
    return res.status(500).json({ success: false, error: classifyTwitterError(err) })
  }
})

// ── POST /api/social/post-pinterest ──────────────────────────────────────────

router.post('/post-pinterest', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, link, boardId } = req.body
  if (!title) return res.status(400).json({ success: false, error: 'title is required' })

  const token = process.env.PINTEREST_ACCESS_TOKEN
  if (!token) return res.status(500).json({ success: false, error: 'PINTEREST_ACCESS_TOKEN not configured' })

  const headers = {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    let resolvedBoardId = boardId

    if (!resolvedBoardId) {
      const boardsRes = await fetch('https://api.pinterest.com/v5/boards?page_size=5', { headers })
      if (!boardsRes.ok) {
        const err = await boardsRes.json().catch(() => ({}))
        throw new Error(err.message || `Pinterest boards fetch failed: ${boardsRes.status}`)
      }
      const boardsData = await boardsRes.json()
      const boards = boardsData.items || []
      if (!boards.length) throw new Error('No Pinterest boards found. Create a board first.')
      resolvedBoardId = boards[0].id
    }

    const pinPayload = {
      board_id:    resolvedBoardId,
      title:       title.slice(0, 100),
      description: (description || '').slice(0, 500),
      link:        link || 'https://www.awe-os.com',
      media_source: {
        source_type: 'image_url',
        url:         'https://www.awe-os.com/og-image.png',
      },
    }

    const pinRes = await fetch('https://api.pinterest.com/v5/pins', {
      method:  'POST',
      headers,
      body:    JSON.stringify(pinPayload),
    })

    if (!pinRes.ok) {
      const err = await pinRes.json().catch(() => ({}))
      let errorMsg = err.message || `Pinterest API error: ${pinRes.status}`
      if (pinRes.status === 401) errorMsg = 'Pinterest token expired. Re-authenticate in Pinterest developer console.'
      if (pinRes.status === 404) errorMsg = 'Pinterest board not found.'
      throw new Error(errorMsg)
    }

    const pin = await pinRes.json()
    return res.json({
      success: true,
      pinId:   pin.id,
      pinUrl:  `https://pinterest.com/pin/${pin.id}`,
    })
  } catch (err) {
    console.error('[social/post-pinterest]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/social/post-all ─────────────────────────────────────────────────

router.post('/post-all', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolUrl, twitterText, pinterestTitle, pinterestDescription } = req.body

  const [twitterResult, pinterestResult] = await Promise.allSettled([

    // Twitter
    (async () => {
      const text = buildTweetText(
        twitterText || `${toolName || 'AWE-OS'} — free online tool! Try it now`,
        toolUrl
      )
      const client = getTwitterClient()
      const tweet  = await client.v2.tweet(text)
      return { tweetId: tweet.data.id, tweetUrl: `https://twitter.com/i/web/status/${tweet.data.id}` }
    })(),

    // Pinterest
    (async () => {
      const token = process.env.PINTEREST_ACCESS_TOKEN
      if (!token) throw new Error('PINTEREST_ACCESS_TOKEN not configured')
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      const boardsRes = await fetch('https://api.pinterest.com/v5/boards?page_size=5', { headers })
      if (!boardsRes.ok) throw new Error(`Pinterest boards error: ${boardsRes.status}`)
      const boardsData = await boardsRes.json()
      const boards = boardsData.items || []
      if (!boards.length) throw new Error('No Pinterest boards found')

      const pinPayload = {
        board_id:    boards[0].id,
        title:       (pinterestTitle || toolName || 'AWE-OS Tool').slice(0, 100),
        description: (pinterestDescription || '').slice(0, 500),
        link:        toolUrl || 'https://www.awe-os.com',
        media_source: { source_type: 'image_url', url: 'https://www.awe-os.com/og-image.png' },
      }

      const pinRes = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST', headers, body: JSON.stringify(pinPayload),
      })
      if (!pinRes.ok) {
        const err = await pinRes.json().catch(() => ({}))
        throw new Error(err.message || `Pinterest pin error: ${pinRes.status}`)
      }
      const pin = await pinRes.json()
      return { pinId: pin.id, pinUrl: `https://pinterest.com/pin/${pin.id}` }
    })(),
  ])

  return res.json({
    twitter: twitterResult.status === 'fulfilled'
      ? { success: true, ...twitterResult.value }
      : { success: false, error: classifyTwitterError(twitterResult.reason) },
    pinterest: pinterestResult.status === 'fulfilled'
      ? { success: true, ...pinterestResult.value }
      : { success: false, error: pinterestResult.reason?.message || 'Pinterest failed' },
  })
})

module.exports = router
