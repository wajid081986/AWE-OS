import { useState } from 'react'
import api from '../../../services/api.service'

// ── Data ──────────────────────────────────────────────────────────────────────
// Tool list is fetched live from /api/tools (same endpoint AgentControlPage's
// OptimizationTab uses) instead of a hardcoded array — a hardcoded list here
// previously drifted out of sync with the actual tools table.

const PLATFORMS = ['Twitter/X', 'LinkedIn', 'Instagram', 'Facebook', 'WhatsApp', 'Telegram']
const LANGUAGES = ['English', 'Hindi', 'Hinglish']

const TONES = [
  { value: 'funny',         label: '😄 Funny — Humorous, relatable'         },
  { value: 'viral',         label: '🔥 Viral — Hook-driven, shareable'       },
  { value: 'informative',   label: '📚 Informative — Educational, helpful'   },
  { value: 'emotional',     label: '❤️ Emotional — Connects with feelings'   },
  { value: 'fomo',          label: '⚡ FOMO — Fear of missing out, urgency'  },
  { value: 'inspirational', label: '✨ Inspirational — Motivating, uplifting' },
]

const POST_TYPES = [
  { value: 'problem-solution', label: '🎯 Problem + Solution — Show pain point, AWE-OS solves it' },
  { value: 'tool-highlight',   label: '🛠️ Tool Highlight — Feature spotlight with CTA'            },
  { value: 'before-after',     label: '↔️ Before vs After — Without AWE-OS vs With AWE-OS'        },
  { value: 'quick-tip',        label: '💡 Quick Tip — Short useful tip, tool as solution'          },
  { value: 'comparison',       label: '⚖️ Comparison — AWE-OS vs other tools/methods'             },
  { value: 'cta-post',         label: '📣 Direct CTA — Strong call to action, drive clicks'       },
]

const TABS = [
  { id: 'tool',    label: '🛠️ Tool Promoter' },
  { id: 'blog',    label: '📝 Blog Promoter'  },
  { id: 'history', label: '🕒 Post History'   },
]

const STORAGE_KEY = 'awe_marketing_history'
const MAX_HISTORY = 50

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function addToHistory(entries) {
  const existing = loadHistory()
  const updated  = [...entries, ...existing].slice(0, MAX_HISTORY)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
      >
        {options.map(o => {
          const val = typeof o === 'string' ? o : o.value
          const lbl = typeof o === 'string' ? o : o.label
          return <option key={val} value={val}>{lbl}</option>
        })}
      </select>
    </div>
  )
}

function SharedFields({ form, setForm }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectField label="Platform" value={form.platform} onChange={v => setForm(f => ({ ...f, platform: v }))} options={PLATFORMS} />
      <SelectField label="Tone"     value={form.tone}     onChange={v => setForm(f => ({ ...f, tone:     v }))} options={TONES}     />
      <SelectField label="Language" value={form.language} onChange={v => setForm(f => ({ ...f, language: v }))} options={LANGUAGES} />
      <SelectField label="Post Type" value={form.postType} onChange={v => setForm(f => ({ ...f, postType: v }))} options={POST_TYPES} />
    </div>
  )
}

function GenerateButton({ loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Generating…
        </>
      ) : '✨ Generate 3 Posts'}
    </button>
  )
}

function PostCard({ post, index, onSave }) {
  const [edited, setEdited] = useState(post)
  const [copied, setCopied] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function handleCopy() {
    copyText(edited)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    onSave(edited)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-indigo-400">Variation {index + 1}</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-xs px-2.5 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button onClick={handleSave} className="text-xs px-2.5 py-1 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white transition-colors">
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
      <textarea
        value={edited}
        onChange={e => setEdited(e.target.value)}
        rows={6}
        className="w-full bg-transparent text-sm text-gray-200 leading-relaxed resize-none focus:outline-none"
      />
      <p className="text-right text-[10px] text-gray-600 mt-1">{edited.length} chars</p>
    </div>
  )
}

function PostResults({ posts, onSave }) {
  if (!posts.length) return null
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">Generated Posts</h3>
      {posts.map((post, i) => (
        <PostCard key={i} post={post} index={i} onSave={onSave} />
      ))}
    </div>
  )
}

// ── Tab 1: Tool Promoter ──────────────────────────────────────────────────────

const DEFAULT_TOOL_FORM = { toolSlug: '', platform: 'LinkedIn', tone: 'funny', language: 'English', postType: 'problem-solution' }

function ToolPromoterTab() {
  const [tools,   setTools]   = useState([])
  const [form,    setForm]    = useState(DEFAULT_TOOL_FORM)
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/api/tools')
      .then(res => {
        const list = (res.data?.tools || []).map(t => ({ slug: t.slug, name: t.name, desc: t.description || '' }))
        setTools(list)
        setForm(f => (f.toolSlug || !list.length) ? f : { ...f, toolSlug: list[0].slug })
      })
      .catch(() => setTools([]))
  }, [])

  const tool = tools.find(t => t.slug === form.toolSlug)

  async function handleGenerate() {
    if (!tool) { setError('Pick a tool first.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/tools/generate', {
        tool: 'marketing-assistant',
        data: { mode: 'tool', toolName: tool.name, toolDesc: tool.desc, toolUrl: `https://awe-os.com/tools/${tool.slug}`, ...form },
      })
      if (res.data.success && Array.isArray(res.data.posts)) {
        setPosts(res.data.posts)
      } else {
        setError('Unexpected response. Please try again.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave(text) {
    addToHistory([{ id: `${Date.now()}-${Math.random()}`, text, savedAt: new Date().toISOString(), meta: `${tool.name} · ${form.platform} · ${form.tone} · ${form.language}` }])
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Promote a Tool</h2>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Select Tool</label>
          <select
            value={form.toolSlug}
            onChange={e => setForm(f => ({ ...f, toolSlug: e.target.value }))}
            disabled={!tools.length}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            {tools.length === 0 && <option value="">Loading tools…</option>}
            {tools.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
          {tool && <p className="text-xs text-gray-500 mt-1">{tool.desc}</p>}
        </div>
        <SharedFields form={form} setForm={setForm} />
        <GenerateButton loading={loading} onClick={handleGenerate} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
      <PostResults posts={posts} onSave={handleSave} />
    </div>
  )
}

// ── Tab 2: Blog Promoter ──────────────────────────────────────────────────────

const DEFAULT_BLOG_FORM = { blogTitle: '', blogUrl: '', keyInsight: '', platform: 'LinkedIn', tone: 'funny', language: 'English', postType: 'problem-solution' }

function BlogPromoterTab() {
  const [form,    setForm]    = useState(DEFAULT_BLOG_FORM)
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleGenerate() {
    if (!form.blogTitle.trim()) { setError('Blog title is required.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/tools/generate', {
        tool: 'marketing-assistant',
        data: { mode: 'blog', blogTitle: form.blogTitle, blogUrl: form.blogUrl || 'https://awe-os.com/blog', keyInsight: form.keyInsight, platform: form.platform, tone: form.tone, language: form.language, postType: form.postType },
      })
      if (res.data.success && Array.isArray(res.data.posts)) {
        setPosts(res.data.posts)
      } else {
        setError('Unexpected response. Please try again.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave(text) {
    addToHistory([{ id: `${Date.now()}-${Math.random()}`, text, savedAt: new Date().toISOString(), meta: `Blog: ${form.blogTitle} · ${form.platform} · ${form.tone}` }])
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Promote a Blog Post</h2>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Blog Title *</label>
          <input
            type="text"
            value={form.blogTitle}
            onChange={e => setForm(f => ({ ...f, blogTitle: e.target.value }))}
            placeholder="e.g. SIP vs FD in 2025: Which Gives Better Returns?"
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Blog URL</label>
          <input
            type="text"
            value={form.blogUrl}
            onChange={e => setForm(f => ({ ...f, blogUrl: e.target.value }))}
            placeholder="https://awe-os.com/blog/sip-vs-fd-india-2025"
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Key Insight / Hook</label>
          <textarea
            value={form.keyInsight}
            onChange={e => setForm(f => ({ ...f, keyInsight: e.target.value }))}
            placeholder="e.g. ₹5,000/month SIP for 20 years grows to ₹49 lakhs vs FD's ₹22 lakhs"
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <SharedFields form={form} setForm={setForm} />
        <GenerateButton loading={loading} onClick={handleGenerate} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
      <PostResults posts={posts} onSave={handleSave} />
    </div>
  )
}

// ── Tab 3: Post History ───────────────────────────────────────────────────────

function PostHistoryTab() {
  const [history, setHistory] = useState(loadHistory)
  const [copied,  setCopied]  = useState(null)

  function handleCopy(id, text) {
    copyText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleDelete(id) {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function handleClearAll() {
    if (!window.confirm('Clear all saved posts? This cannot be undone.')) return
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  if (!history.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-gray-400 text-sm">No saved posts yet. Generate posts in the other tabs and click Save.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{history.length} saved post{history.length !== 1 ? 's' : ''}</p>
        <button onClick={handleClearAll} className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 transition-colors">
          Clear All
        </button>
      </div>

      {history.map(entry => (
        <div key={entry.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs text-indigo-400 font-medium">{entry.meta}</p>
              <p className="text-[10px] text-gray-600">{new Date(entry.savedAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleCopy(entry.id, entry.text)}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                {copied === entry.id ? '✓' : 'Copy'}
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-xs px-2.5 py-1 rounded-md bg-red-900/50 hover:bg-red-900/70 text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MarketingAssistant() {
  const [activeTab, setActiveTab] = useState('tool')

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Marketing Assistant</h1>
          <p className="text-sm text-gray-400">Generate social media posts for AWE-OS tools and blog content.</p>
        </div>

        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'tool'    && <ToolPromoterTab />}
        {activeTab === 'blog'    && <BlogPromoterTab />}
        {activeTab === 'history' && <PostHistoryTab />}
      </div>
    </div>
  )
}
