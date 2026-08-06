import { useState, useEffect } from 'react'
import api from '../../../services/api.service'
import ContentStudio from '../blog/ContentStudio'
import SocialBlast    from '../content-engine/SocialBlast'
import SeoAuditor      from '../blog/SeoAuditor'
import { getAllTools } from '../../../data/toolRegistry'

// Blog Assistant's own /generate route only recognises this fixed category
// set (see BlogAssistant.jsx's CATEGORIES) — map toolRegistry's category
// slugs onto it rather than passing toolRegistry's own display names
// ('Converters & Tools', 'Productivity'), which aren't valid blog categories.
const BLOG_CATEGORY_BY_TOOL_CATEGORY = {
  pdf:         'PDF Tools',
  calculators: 'Calculators',
  ai:          'AI Tools',
  converters:  'General',
  productivity: 'General',
}
const TOOL_CATEGORY_BY_SLUG = Object.fromEntries(getAllTools().map(t => [t.slug, t.category]))

// Same localStorage key BlogWriterPanel/SocialBlast already use for drafts —
// so a Growth OS-generated post shows up in the Publishing Queue (Grow tab)
// and in SocialBlast's "import from draft" dropdown without a DB round-trip.
const DRAFTS_KEY = 'awe_content_drafts'
function persistDraft(draft) {
  let all = []
  try { all = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch {}
  const next = [{ ...draft, savedAt: new Date().toISOString() }, ...all].slice(0, 10)
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(next)) } catch {}
  return next
}

const SUB_SECTIONS = [
  { id: 'blog',    label: '✏️ Blog Creator'    },
  { id: 'humanize', label: '🤖 Humanizer'        },
  { id: 'social',  label: '📡 Social Content'   },
  { id: 'images',  label: '🖼️ Image Prompts'    },
  { id: 'seo',     label: '🔍 SEO Optimizer'    },
]

const TONES       = [
  { value: 'beginner',       label: '🙋 Beginner Friendly' },
  { value: 'expert',         label: '🎓 Expert Deep Dive'  },
  { value: 'conversational', label: '💬 Conversational'    },
]
const WORD_COUNTS = [800, 1200, 1500, 2000]

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

// ── Blog Creator ────────────────────────────────────────────────────────────

function BlogCreatorPanel({ prefill, onPrefillConsumed }) {
  const [form, setForm] = useState({
    topic: '', keyword: '', toolSlug: '', toolName: '', wordCount: 1200, tone: 'beginner', autoHumanize: true,
  })
  const [generating, setGenerating] = useState(false)
  const [post,       setPost]       = useState(null)
  const [publishing,  setPublishing] = useState(false)
  const [pubResult,   setPubResult]  = useState(null)
  const [error,       setError]      = useState(null)

  useEffect(() => {
    if (prefill?.topic) {
      setForm(f => ({ ...f, topic: prefill.topic, keyword: prefill.keyword || '', toolSlug: prefill.toolSlug || '', toolName: prefill.toolName || '' }))
      onPrefillConsumed?.()
    }
  }, [prefill])

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  async function handleGenerate() {
    if (!form.topic.trim()) { setError('Topic is required.'); return }
    setGenerating(true)
    setError(null)
    setPost(null)
    setPubResult(null)
    try {
      const category = BLOG_CATEGORY_BY_TOOL_CATEGORY[TOOL_CATEGORY_BY_SLUG[form.toolSlug]] || 'Finance'
      const res = await api.post('/api/admin/blog/generate', { ...form, category, indianContext: true })
      if (res.data.success) {
        setPost(res.data.post)
        persistDraft({ keyword: form.keyword, toolSlug: form.toolSlug, toolName: form.toolName, ...res.data.post })
      } else {
        setError(res.data.error || 'Generation failed.')
      }
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')
      setError(isTimeout
        ? 'Generation is taking longer than expected — this can happen with Auto-Humanize on long articles. Try again, or turn off Auto-Humanize and run it separately from the Humanizer tab.'
        : err.response?.data?.error || 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    if (!post) return
    setPublishing(true)
    setPubResult(null)
    try {
      const res = await api.post('/api/admin/blog/publish-db', {
        title: post.title, slug: post.slug, content: post.content,
        meta_title: post.metaTitle, meta_description: post.metaDescription,
        category: post.category, excerpt: post.excerpt, read_time: post.readTime,
        faqs: post.faqs, related_tools: post.relatedTools,
        image_url: post.imageUrl, image_credit: post.imageCredit, image_credit_url: post.imageCreditUrl,
      })
      setPubResult(res.data)
    } catch (err) {
      setPubResult({ success: false, error: err.response?.data?.error || 'Publish failed.' })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Blog Creator</h2>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Topic *</label>
          <input value={form.topic} onChange={e => set('topic')(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Target Keyword</label>
          <input value={form.keyword} onChange={e => set('keyword')(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Word Count</label>
          <div className="flex gap-2">
            {WORD_COUNTS.map(n => (
              <button key={n} onClick={() => set('wordCount')(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.wordCount === n ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Tone</label>
          <select value={form.tone} onChange={e => set('tone')(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500">
            {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between py-2 px-3 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-sm text-white font-medium">🤖 Auto-Humanize</p>
          <button onClick={() => set('autoHumanize')(!form.autoHumanize)}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.autoHumanize ? 'bg-indigo-600' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.autoHumanize ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        <button onClick={handleGenerate} disabled={generating}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
          {generating ? <><Spinner />Generating…</> : '✨ Generate Article'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {post ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4 overflow-auto max-h-[80vh]">
          <h2 className="text-sm font-semibold text-white">{post.title}</h2>
          <p className="text-xs text-gray-500">{post.excerpt}</p>
          <div className="flex gap-3 pt-2">
            <button onClick={handlePublish} disabled={publishing}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
              {publishing ? <><Spinner />Publishing…</> : '🗄️ Publish to Blog'}
            </button>
          </div>
          {pubResult && (
            pubResult.success
              ? <p className="text-green-400 text-sm">✅ Published — <a className="underline" href={pubResult.liveUrl} target="_blank" rel="noopener noreferrer">{pubResult.liveUrl}</a></p>
              : <p className="text-red-400 text-sm">❌ {pubResult.error}</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-400 text-sm">Fill the form and click Generate Article.</p>
        </div>
      )}
    </div>
  )
}

// ── Image Prompt Generator ───────────────────────────────────────────────────

const IMAGE_STYLES = ['Infographic', 'Social post', 'Blog header', 'Pinterest pin']

function ImagePromptsPanel() {
  const [topic,   setTopic]   = useState('')
  const [style,   setStyle]   = useState(IMAGE_STYLES[0])
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [error,   setError]   = useState(null)

  async function generate() {
    if (!topic.trim()) { setError('Enter a blog topic first.'); return }
    setLoading(true); setError(null); setPrompts([])
    try {
      const res = await api.post('/api/admin/growth-os/image-prompts', { topic, style })
      if (res.data.success) setPrompts(res.data.prompts)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate prompts.')
    } finally {
      setLoading(false)
    }
  }

  function copy(text) { navigator.clipboard.writeText(text).catch(() => {}) }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4 max-w-3xl">
      <h2 className="text-sm font-semibold text-white">🖼️ Image Prompt Generator</h2>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Blog Topic</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. SIP Calculator for Beginners"
          className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Style</label>
        <div className="flex flex-wrap gap-2">
          {IMAGE_STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${style === s ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <button onClick={generate} disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
        {loading ? <><Spinner />Generating…</> : '🖼️ Generate 5 Prompts'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {prompts.length > 0 && (
        <div className="space-y-2">
          {prompts.map((p, i) => (
            <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-start justify-between gap-3">
              <p className="text-xs text-gray-300 flex-1">{p}</p>
              <button onClick={() => copy(p)} className="text-xs px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded shrink-0">📋 Copy</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CreateTab({ prefill, onPrefillConsumed }) {
  const [section, setSection] = useState('blog')

  useEffect(() => {
    if (prefill?.topic) setSection('blog')
  }, [prefill])

  return (
    <div className="flex gap-5">
      <aside className="w-48 shrink-0 space-y-1">
        {SUB_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              section === s.id ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
          >
            {s.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        {section === 'blog'     && <BlogCreatorPanel prefill={prefill} onPrefillConsumed={onPrefillConsumed} />}
        {section === 'humanize' && <ContentStudio />}
        {section === 'social'   && <SocialBlast />}
        {section === 'images'   && <ImagePromptsPanel />}
        {section === 'seo'      && <SeoAuditor />}
      </div>
    </div>
  )
}
