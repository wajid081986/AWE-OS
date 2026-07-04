const express      = require('express')
const requireAuth  = require('../middleware/auth')
const { postTweet } = require('../services/twitter.service')
const { createPin }  = require('../services/pinterest.service')

const router = express.Router()

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }
  next()
}

// ── POST /api/social/post-twitter ─────────────────────────────────────────────

router.post('/post-twitter', requireAuth, requireAdmin, async (req, res) => {
  const { text, toolUrl } = req.body
  if (!text) return res.status(400).json({ success: false, error: 'text is required' })

  try {
    const { tweetId, tweetUrl } = await postTweet(text, toolUrl)
    return res.json({ success: true, tweetId, tweetUrl })
  } catch (err) {
    console.error('[social/post-twitter]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/social/post-pinterest ──────────────────────────────────────────

router.post('/post-pinterest', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, link, boardId } = req.body
  if (!title) return res.status(400).json({ success: false, error: 'title is required' })

  try {
    const { pinId, pinUrl } = await createPin({ title, description, link, boardId })
    return res.json({ success: true, pinId, pinUrl })
  } catch (err) {
    console.error('[social/post-pinterest]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/social/post-all ─────────────────────────────────────────────────

router.post('/post-all', requireAuth, requireAdmin, async (req, res) => {
  const { toolName, toolUrl, twitterText, pinterestTitle, pinterestDescription } = req.body

  const [twitterResult, pinterestResult] = await Promise.allSettled([
    postTweet(twitterText || `${toolName || 'AWE-OS'} — free online tool! Try it now`, toolUrl),
    createPin({
      title:       pinterestTitle || toolName || 'AWE-OS Tool',
      description: pinterestDescription,
      link:        toolUrl,
    }),
  ])

  return res.json({
    twitter: twitterResult.status === 'fulfilled'
      ? { success: true, ...twitterResult.value }
      : { success: false, error: twitterResult.reason?.message || 'Twitter failed' },
    pinterest: pinterestResult.status === 'fulfilled'
      ? { success: true, ...pinterestResult.value }
      : { success: false, error: pinterestResult.reason?.message || 'Pinterest failed' },
  })
})

module.exports = router
