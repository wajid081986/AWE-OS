import { useState } from 'react'
import api from '../../../services/api.service'

const AWE_TOOLS = [
  { slug: 'merge-pdf',          name: 'Merge PDF'            },
  { slug: 'compress-pdf',       name: 'Compress PDF'         },
  { slug: 'gst-calculator',     name: 'GST Calculator'       },
  { slug: 'sip-calculator',     name: 'SIP Calculator'       },
  { slug: 'tax-calculator',     name: 'Income Tax Calculator' },
  { slug: 'bmi-calculator',     name: 'BMI Calculator'       },
  { slug: 'invoice-generator',  name: 'Invoice Generator'    },
  { slug: 'resume-builder',     name: 'AI Resume Builder'    },
  { slug: 'qr-code-generator',  name: 'QR Code Generator'   },
  { slug: 'custom',             name: 'Custom Topic'         },
]

const AUDIENCES = [
  'Indian Professionals',
  'Students',
  'Small Business Owners',
  'Freelancers',
  'Indian Investors',
  'General Indian Users',
]

const POST_TYPES = ['Question', 'Discussion', 'Resource Share', 'Personal Story']

// Best time to post per subreddit (hardcoded smart defaults)
const BEST_TIMES = {
  'r/india':                   '8–10 pm IST (Mon–Fri)',
  'r/indiainvestments':        '7–9 pm IST (Tue–Thu)',
  'r/IndiaInvestments':        '7–9 pm IST (Tue–Thu)',
  'r/personalfinance':         '7–9 am EST (Mon–Wed)',
  'r/financialindependence':   '8–10 am EST (Mon)',
  'r/tax':                     '6–8 pm EST (Mon–Wed)',
  'r/smallbusiness':           '9–11 am EST (Mon–Tue)',
  'r/freelance':               '10 am–12 pm EST (Mon–Wed)',
  'r/students':                '4–6 pm IST (Mon–Fri)',
  'r/learnprogramming':        '7–10 pm EST (Mon–Thu)',
  'r/sysadmin':                '9–11 am EST (Mon–Fri)',
  'r/careerguidance':          '7–9 pm EST (Mon–Wed)',
  'r/jobs':                    '9–11 am EST (Mon–Wed)',
  'r/povertyfinance':          '8–10 pm EST (Mon–Thu)',
  'r/digitalnomad':            '9 am–12 pm EST (Mon–Wed)',
  'r/humanresources':          '9–11 am EST (Mon)',
  'r/mba':                     '8–10 pm IST (Mon–Wed)',
  'r/iim':                     '8–10 pm IST (Mon–Thu)',
  'r/indiabusiness':           '7–9 pm IST (Tue–Thu)',
}

function getBestTime(subName) {
  const key = subName.startsWith('r/') ? subName.toLowerCase() : `r/${subName.toLowerCase()}`
  return BEST_TIMES[key] || BEST_TIMES[subName] || '7–10 pm IST (Mon–Thu)'
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const HISTORY_KEY        = 'awe_reddit_history'
const CLAUDE_HISTORY_KEY = 'awe_claude_reddit_history'

function loadHistory(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveHistory(key, items, max = 20) {
  try { localStorage.setItem(key, JSON.stringify(items.slice(0, max))) } catch {}
}

function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}) }

function StarScore({ score }) {
  const full  = Math.round(score / 2)
  const stars = Array.from({ length: 5 }, (_, i) => i < full ? '⭐' : '☆')
  return <span className="text-sm">{stars.join('')} <span className="text-gray-400 text-xs">({score}/10)</span></span>
}

export default function RedditGrowth() {
  // ── Subreddit finder state ──────────────────────────────────────────────────
  const [toolSlug,     setToolSlug]     = useState('sip-calculator')
  const [customTopic,  setCustomTopic]  = useState('')
  const [audience,     setAudience]     = useState('Indian Professionals')
  const [subLoading,   setSubLoading]   = useState(false)
  const [subError,     setSubError]     = useState(null)
  const [subreddits,   setSubreddits]   = useState([])

  // ── OpenAI post generator state ─────────────────────────────────────────────
  const [selectedSub,  setSelectedSub]  = useState(null)
  const [postType,     setPostType]     = useState('Discussion')
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError,   setPostsError]   = useState(null)
  const [posts,        setPosts]        = useState([])
  const [comments,     setComments]     = useState([])
  const [copiedKey,    setCopiedKey]    = useState(null)

  const [history, setHistory] = useState(() => loadHistory(HISTORY_KEY))

  // ── Claude AI post generator state ─────────────────────────────────────────
  const [claudeSub,     setClaudeSub]     = useState(null)
  const [claudeLoading, setClaudeLoading] = useState(false)
  const [claudeError,   setClaudeError]   = useState(null)
  const [claudeTitle,   setClaudeTitle]   = useState('')
  const [claudeBody,    setClaudeBody]    = useState('')
  const [claudeCopied,  setClaudeCopied]  = useState(false)

  const [claudeHistory, setClaudeHistory] = useState(() => loadHistory(CLAUDE_HISTORY_KEY))

  // ── Derived values ──────────────────────────────────────────────────────────
  const tool     = AWE_TOOLS.find(t => t.slug === toolSlug)
  const isCustom = toolSlug === 'custom'
  const topic    = isCustom ? customTopic : tool?.name || ''
  const toolUrl  = isCustom ? 'https://awe-os.com' : `https://awe-os.com/tools/${toolSlug}`

  // ── Handlers: subreddit finder ──────────────────────────────────────────────
  async function handleFindSubs() {
    if (!topic.trim()) { setSubError('Select a tool or enter a custom topic.'); return }
    setSubLoading(true)
    setSubError(null)
    setSubreddits([])
    setSelectedSub(null)
    setPosts([])
    setClaudeSub(null)
    setClaudeTitle('')
    setClaudeBody('')
    try {
      const res = await api.post('/api/admin/traffic/reddit-subreddits', {
        topic, toolName: topic, toolSlug, targetAudience: audience,
      })
      if (res.data.success) setSubreddits(res.data.subreddits)
      else setSubError(res.data.error)
    } catch (err) {
      setSubError(err.response?.data?.error || 'Failed to find subreddits.')
    } finally {
      setSubLoading(false)
    }
  }

  // ── Handlers: OpenAI post generator ────────────────────────────────────────
  async function handleGeneratePosts(sub) {
    setSelectedSub(sub)
    setPostsLoading(true)
    setPostsError(null)
    setPosts([])
    setComments([])
    try {
      const res = await api.post('/api/admin/traffic/reddit-posts', {
        topic, toolName: topic, toolSlug, toolUrl,
        subreddit: sub.name, postType, targetAudience: audience,
      })
      if (res.data.success) {
        setPosts(res.data.posts)
        setComments(res.data.commentTemplates || [])
      } else {
        setPostsError(res.data.error)
      }
    } catch (err) {
      setPostsError(err.response?.data?.error || 'Failed to generate posts.')
    } finally {
      setPostsLoading(false)
    }
  }

  function handleCopy(key, text) {
    copyText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function handleSaveHistory(post) {
    const entry = { id: Date.now(), date: new Date().toLocaleDateString('en-IN'), subreddit: post.subreddit || selectedSub?.name, title: post.title, body: post.body }
    const updated = [entry, ...history]
    setHistory(updated)
    saveHistory(HISTORY_KEY, updated)
  }

  function handleDeleteHistory(id) {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    saveHistory(HISTORY_KEY, updated)
  }

  // ── Handlers: Claude AI post generator ─────────────────────────────────────
  async function handleClaudeGenerate(sub = claudeSub) {
    if (!sub) return
    setClaudeSub(sub)
    setClaudeLoading(true)
    setClaudeError(null)
    setClaudeTitle('')
    setClaudeBody('')
    try {
      const res = await api.post('/api/admin/traffic/reddit-post-claude', {
        toolName: topic,
        toolSlug,
        toolUrl,
        subreddit: sub.name,
        targetAudience: audience,
      })
      if (res.data.success) {
        setClaudeTitle(res.data.post.title)
        setClaudeBody(res.data.post.body)
      } else {
        setClaudeError(res.data.error)
      }
    } catch (err) {
      setClaudeError(err.response?.data?.error || 'Failed to generate Claude post.')
    } finally {
      setClaudeLoading(false)
    }
  }

  function handleClaudeCopy() {
    copyText(`${claudeTitle}\n\n${claudeBody}`)
    setClaudeCopied(true)
    setTimeout(() => setClaudeCopied(false), 2000)
  }

  function handleClaudeSaveHistory() {
    if (!claudeTitle && !claudeBody) return
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-IN'),
      subreddit: claudeSub?.name || '',
      title: claudeTitle,
      body: claudeBody,
    }
    const updated = [entry, ...claudeHistory]
    setClaudeHistory(updated)
    saveHistory(CLAUDE_HISTORY_KEY, updated, 5)
  }

  function handleDeleteClaudeHistory(id) {
    const updated = claudeHistory.filter(h => h.id !== id)
    setClaudeHistory(updated)
    saveHistory(CLAUDE_HISTORY_KEY, updated, 5)
  }

  const varLabels = { 1: 'Value-First', 2: 'Question Hook', 3: 'Story Format' }
  const varColors = { 1: 'bg-blue-900/40 text-blue-300 border-blue-700', 2: 'bg-purple-900/40 text-purple-300 border-purple-700', 3: 'bg-green-900/40 text-green-300 border-green-700' }

  return (
    <div className="space-y-6">

      {/* ── Subreddit Finder ─────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">🔴 Reddit Subreddit Finder</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">AWE-OS Tool</label>
            <select value={toolSlug} onChange={e => setToolSlug(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500">
              {AWE_TOOLS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
          {isCustom && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Custom Topic</label>
              <input type="text" value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                placeholder="e.g. tax saving tips India"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-orange-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500">
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {subError && <p className="text-red-400 text-xs">{subError}</p>}

        <button onClick={handleFindSubs} disabled={subLoading}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
          {subLoading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Finding Subreddits...</>
            : '🔍 Find Best Subreddits'}
        </button>
      </div>

      {/* ── Subreddits grid ──────────────────────────────────────────────────── */}
      {subreddits.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">📋 Best Subreddits ({subreddits.length} found)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subreddits.map((sub, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-orange-400 font-bold text-base">{sub.name}</span>
                  <span className="text-xs text-gray-400">{sub.members}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <StarScore score={sub.relevanceScore} />
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${sub.indianUsers ? 'bg-green-900/60 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {sub.indianUsers ? '🇮🇳 Indian users' : 'Global'}
                  </span>
                  <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded">{sub.bestPostType}</span>
                </div>
                <p className="text-xs text-gray-400 italic">{sub.whyRelevant}</p>
                {sub.postingRules?.length > 0 && (
                  <ul className="space-y-0.5">
                    {sub.postingRules.slice(0, 3).map((r, j) => (
                      <li key={j} className="text-[11px] text-gray-500 flex gap-1"><span>•</span>{r}</li>
                    ))}
                  </ul>
                )}
                {/* Two action buttons: OpenAI variations + Claude single post */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleGeneratePosts(sub)}
                    className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-md transition-colors">
                    📝 3 Variations
                  </button>
                  <button onClick={() => handleClaudeGenerate(sub)}
                    className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1">
                    🤖 Claude Post
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Claude AI Post Generator ─────────────────────────────────────────── */}
      {(claudeSub || claudeLoading) && (
        <div className="bg-gray-800 border border-orange-600/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              🤖 <span>Claude AI Post for <span className="text-orange-400">{claudeSub?.name}</span></span>
            </h2>
            {/* Best time badge */}
            {claudeSub && (
              <span className="text-[11px] bg-orange-900/30 border border-orange-700/40 text-orange-300 px-2.5 py-1 rounded-full">
                ⏰ Best time: {getBestTime(claudeSub.name)}
              </span>
            )}
          </div>

          {claudeError && <p className="text-red-400 text-xs">{claudeError}</p>}

          {/* Generate / Regenerate button */}
          {!claudeBody && (
            <button onClick={() => handleClaudeGenerate(claudeSub)} disabled={claudeLoading}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
              {claudeLoading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating with Claude...</>
                : '✨ Generate Reddit Post'}
            </button>
          )}

          {/* Generated post — shown once body exists */}
          {claudeBody && (
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1">TITLE</label>
                <input
                  type="text"
                  value={claudeTitle}
                  onChange={e => setClaudeTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-semibold text-gray-400">BODY</label>
                  <span className="text-[10px] text-gray-500">{claudeBody.trim().split(/\s+/).length} words</span>
                </div>
                <textarea
                  value={claudeBody}
                  onChange={e => setClaudeBody(e.target.value)}
                  rows={8}
                  className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
                />
              </div>

              {/* Action row */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleClaudeCopy}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg transition-colors">
                  {claudeCopied ? '✅ Copied!' : '📋 Copy Post'}
                </button>
                <button
                  onClick={() => handleClaudeGenerate(claudeSub)}
                  disabled={claudeLoading}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                  {claudeLoading
                    ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Regenerating...</>
                    : '🔄 Regenerate'}
                </button>
                <button
                  onClick={() => { handleClaudeCopy(); handleClaudeSaveHistory() }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors ml-auto">
                  💾 Copy &amp; Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OpenAI Post type selector ─────────────────────────────────────────── */}
      {selectedSub && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">✍️ Generate 3 Variations for <span className="text-orange-400">{selectedSub.name}</span></h2>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Post Type</label>
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map(pt => (
                <button key={pt} onClick={() => setPostType(pt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${postType === pt ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  {pt}
                </button>
              ))}
            </div>
          </div>
          {postsError && <p className="text-red-400 text-xs">{postsError}</p>}
          <button onClick={() => handleGeneratePosts(selectedSub)} disabled={postsLoading}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
            {postsLoading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating Posts...</>
              : '✨ Generate 3 Post Variations'}
          </button>
        </div>
      )}

      {/* ── OpenAI Post cards ────────────────────────────────────────────────── */}
      {posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={i} className={`bg-gray-800 border rounded-xl p-5 space-y-3 ${varColors[post.variation] || 'border-gray-700'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${varColors[post.variation] || 'border-gray-700 text-gray-300'}`}>
                  V{post.variation}
                </span>
                <span className="text-xs text-gray-400">{varLabels[post.variation]}</span>
                <span className="ml-auto text-xs text-gray-500">⏰ {post.bestTime}</span>
                <span className="text-xs text-gray-500">👍 {post.expectedUpvotes}</span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1">TITLE</label>
                <input type="text" defaultValue={post.title}
                  className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500" />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1">BODY</label>
                <textarea defaultValue={post.body} rows={6}
                  className="w-full bg-gray-900 border border-gray-600 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 resize-none" />
              </div>

              {post.linkPlacement && (
                <div className="bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-green-400 mb-0.5">LINK TIP</p>
                  <p className="text-xs text-green-300">{post.linkPlacement}</p>
                  {post.linkText && <p className="text-xs text-green-400 mt-0.5 italic">"{post.linkText}"</p>}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleCopy(`title-${i}`, post.title)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">
                  {copiedKey === `title-${i}` ? '✅ Copied' : '📋 Copy Title'}
                </button>
                <button onClick={() => handleCopy(`body-${i}`, post.body)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">
                  {copiedKey === `body-${i}` ? '✅ Copied' : '📋 Copy Body'}
                </button>
                <button onClick={() => { handleCopy(`full-${i}`, `${post.title}\n\n${post.body}`); handleSaveHistory(post) }}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  {copiedKey === `full-${i}` ? '✅ Copied!' : '📋 Copy Full Post'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Comment templates ────────────────────────────────────────────────── */}
      {comments.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">💬 Comment Reply Templates</h2>
          <p className="text-xs text-gray-500">Use these when people comment on your post</p>
          {comments.map((c, i) => (
            <div key={i} className="bg-gray-900 rounded-lg p-3 space-y-2">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">{c}</pre>
              <button onClick={() => handleCopy(`comment-${i}`, c)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">
                {copiedKey === `comment-${i}` ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Claude Post History (last 5) ─────────────────────────────────────── */}
      {claudeHistory.length > 0 && (
        <div className="bg-gray-800 border border-orange-700/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">🤖 Claude Post History <span className="text-gray-500 font-normal text-xs ml-1">(last 5)</span></h2>
            <span className="text-[10px] text-gray-500">{claudeHistory.length}/5 saved</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Date', 'Subreddit', 'Title', '', ''].map((h, i) => (
                    <th key={i} className="text-left py-2 px-2 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claudeHistory.map(h => (
                  <tr key={h.id} className="border-b border-gray-700/40">
                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">{h.date}</td>
                    <td className="py-2 px-2 text-orange-400 whitespace-nowrap">{h.subreddit}</td>
                    <td className="py-2 px-2 text-gray-300 max-w-[200px] truncate">{h.title}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => { copyText(`${h.title}\n\n${h.body}`); handleCopy(`claude-hist-${h.id}`, `${h.title}\n\n${h.body}`) }}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
                        {copiedKey === `claude-hist-${h.id}` ? '✅' : '📋'}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleDeleteClaudeHistory(h.id)}
                        className="px-2 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded transition-colors">
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── OpenAI Post History ──────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">📚 Post History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Date', 'Subreddit', 'Title', '', ''].map((h, i) => (
                    <th key={i} className="text-left py-2 px-2 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-gray-700/40">
                    <td className="py-2 px-2 text-gray-400">{h.date}</td>
                    <td className="py-2 px-2 text-orange-400">{h.subreddit}</td>
                    <td className="py-2 px-2 text-gray-300 max-w-[200px] truncate">{h.title}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleCopy(`hist-${h.id}`, `${h.title}\n\n${h.body}`)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
                        {copiedKey === `hist-${h.id}` ? '✅' : '📋'}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleDeleteHistory(h.id)}
                        className="px-2 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded transition-colors">
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
