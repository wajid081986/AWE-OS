import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api.service'

// ── Constants ─────────────────────────────────────────────────────────────────

const AWE_TOOLS = [
  { slug: 'sip-calculator',        name: 'SIP Calculator'          },
  { slug: 'fd-calculator',         name: 'FD Calculator'           },
  { slug: 'ppf-calculator',        name: 'PPF Calculator'          },
  { slug: 'tax-calculator',        name: 'Income Tax Calculator'   },
  { slug: 'emi-calculator',        name: 'EMI Calculator'          },
  { slug: 'bmi-calculator',        name: 'BMI Calculator'          },
  { slug: 'age-calculator',        name: 'Age Calculator'          },
  { slug: 'percentage-calculator', name: 'Percentage Calculator'   },
  { slug: 'pdf-to-word',           name: 'PDF to Word Converter'   },
  { slug: 'merge-pdf',             name: 'Merge PDF'               },
  { slug: 'compress-pdf',          name: 'Compress PDF'            },
  { slug: 'image-compressor',      name: 'Image Compressor'        },
  { slug: 'word-counter',          name: 'Word Counter'            },
  { slug: 'qr-code-generator',     name: 'QR Code Generator'       },
  { slug: 'password-generator',    name: 'Password Generator'      },
  { slug: 'unit-converter',        name: 'Unit Converter'          },
  { slug: 'color-picker',          name: 'Color Picker'            },
  { slug: 'ai-content-writer',     name: 'AI Content Writer'       },
  { slug: 'resume-builder',        name: 'AI Resume Builder'       },
  { slug: 'gst-calculator',        name: 'GST Calculator'          },
]

const TONES = [
  { value: 'beginner',       label: '🙋 Beginner Friendly' },
  { value: 'expert',         label: '🎓 Expert Deep Dive'  },
  { value: 'conversational', label: '💬 Conversational'    },
  { value: 'quickguide',     label: '⚡ Quick Guide'       },
]

const CATEGORIES = ['Finance', 'PDF Tools', 'Calculators', 'AI Tools', 'Health', 'General']

const IDEA_CATS = ['All', 'Finance', 'PDF Tools', 'Calculators', 'AI Tools', 'Health']

const WORD_COUNTS = [800, 1200, 1500]

const TABS = [
  { id: 'write',    label: '✍️ AI Blog Writer'    },
  { id: 'ideas',    label: '💡 Idea Generator'    },
  { id: 'calendar', label: '📅 Content Calendar'  },
  { id: 'seo',      label: '🔍 SEO Booster'       },
]

const STATUS_COLORS = {
  planned:   'bg-gray-700 text-gray-300',
  writing:   'bg-yellow-900/60 text-yellow-300',
  published: 'bg-green-900/60 text-green-300',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function blocksToText(blocks = []) {
  return blocks.map(b => {
    if (b.type === 'p')       return b.text
    if (b.type === 'h2')      return `\n## ${b.text}`
    if (b.type === 'ul')      return (b.items || []).map(i => `• ${i}`).join('\n')
    if (b.type === 'table')   return `[Table: ${(b.headers || []).join(' | ')}]`
    if (b.type === 'callout') return `💡 ${b.text}`
    return ''
  }).filter(Boolean).join('\n\n')
}

function wordCount(text = '') {
  return text.split(/\s+/).filter(Boolean).length
}

function readingTime(wc) {
  return `${Math.max(1, Math.ceil(wc / 200))} min read`
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function postToJsObject(post) {
  return JSON.stringify(post, null, 2)
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, required }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
    />
  )
}

function Select({ value, onChange, options }) {
  return (
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
  )
}

function Spinner({ small }) {
  return (
    <span className={`inline-block border-2 border-white border-t-transparent rounded-full animate-spin ${small ? 'w-3 h-3' : 'w-4 h-4'}`} />
  )
}

function DiffBadge({ level }) {
  const cls = level === 'Easy' ? 'bg-green-900/60 text-green-300' : level === 'Hard' ? 'bg-red-900/60 text-red-300' : 'bg-yellow-900/60 text-yellow-300'
  return <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${cls}`}>{level}</span>
}

// ── TAB 1: AI Blog Writer ─────────────────────────────────────────────────────

const DEFAULT_FORM = {
  topic: '', keyword: '', toolSlug: '', wordCount: 1200,
  tone: 'beginner', category: 'Finance', indianContext: true,
}

function AIBlogWriterTab({ onPreFill }) {
  const [form,        setForm]        = useState(DEFAULT_FORM)
  const [generating,  setGenerating]  = useState(false)
  const [post,        setPost]        = useState(null)
  const [meta,        setMeta]        = useState({})
  const [publishing,  setPublishing]  = useState(false)
  const [pubResult,   setPubResult]   = useState(null)
  const [copied,      setCopied]      = useState(false)
  const [genError,    setGenError]    = useState(null)

  // When Tab 2 sends a pre-fill
  useEffect(() => {
    if (onPreFill?.topic) {
      setForm(f => ({ ...f, topic: onPreFill.topic, keyword: onPreFill.keyword || '', toolSlug: onPreFill.toolSlug || '' }))
      setPost(null)
      setPubResult(null)
    }
  }, [onPreFill])

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  async function handleGenerate() {
    if (!form.topic.trim()) { setGenError('Topic is required.'); return }
    setGenerating(true)
    setGenError(null)
    setPost(null)
    setPubResult(null)
    try {
      const tool = AWE_TOOLS.find(t => t.slug === form.toolSlug)
      const res  = await api.post('/api/admin/blog/generate', {
        ...form,
        toolName: tool?.name || '',
      })
      if (res.data.success) {
        setPost(res.data.post)
        setMeta({
          title:           res.data.post.title,
          metaTitle:       res.data.post.metaTitle,
          metaDescription: res.data.post.metaDescription,
          slug:            res.data.post.slug,
          excerpt:         res.data.post.excerpt,
          category:        res.data.post.category,
          readTime:        res.data.post.readTime,
        })
      } else {
        setGenError(res.data.error || 'Generation failed.')
      }
    } catch (err) {
      setGenError(err.response?.data?.error || 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    if (!post) return
    setPublishing(true)
    setPubResult(null)
    try {
      const finalPost = { ...post, ...meta }
      const res = await api.post('/api/admin/blog/publish', { post: finalPost })
      setPubResult(res.data)
    } catch (err) {
      setPubResult({ success: false, error: err.response?.data?.error || 'Publish failed.' })
    } finally {
      setPublishing(false)
    }
  }

  function handleCopyJs() {
    if (!post) return
    const finalPost = { ...post, ...meta }
    copyText(postToJsObject(finalPost))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const articleText    = post ? blocksToText(post.content) : ''
  const articleWc      = wordCount(articleText)
  const articleReadTime = readingTime(articleWc)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Left: Form ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Article Setup</h2>

        <Field label="Topic *">
          <Input value={form.topic} onChange={set('topic')} placeholder="New Tax Regime vs Old Tax Regime 2025" />
        </Field>

        <Field label="Target Keyword">
          <Input value={form.keyword} onChange={set('keyword')} placeholder="new vs old tax regime 2025" />
        </Field>

        <Field label="AWE-OS Tool to Promote">
          <Select value={form.toolSlug} onChange={set('toolSlug')} options={[{ value: '', label: '— None / General —' }, ...AWE_TOOLS.map(t => ({ value: t.slug, label: t.name }))]} />
        </Field>

        <Field label="Word Count">
          <div className="flex gap-2">
            {WORD_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => set('wordCount')(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.wordCount === n ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tone">
            <Select value={form.tone} onChange={set('tone')} options={TONES} />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={set('category')} options={CATEGORIES} />
          </Field>
        </div>

        <div className="flex items-center justify-between py-2 px-3 bg-gray-900 rounded-lg border border-gray-700">
          <div>
            <p className="text-sm text-white font-medium">Indian Context</p>
            <p className="text-[11px] text-gray-500">₹ examples, SEBI/RBI, Indian regulations</p>
          </div>
          <button
            onClick={() => set('indianContext')(!form.indianContext)}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.indianContext ? 'bg-indigo-600' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.indianContext ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {generating ? <><Spinner />Generating…</> : '✨ Generate Article'}
        </button>

        {genError && <p className="text-red-400 text-sm">{genError}</p>}
      </div>

      {/* ── Right: Preview ── */}
      {post ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4 overflow-auto max-h-[80vh]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Article Preview</h2>
            <span className="text-xs text-gray-500">{articleWc} words · {articleReadTime}</span>
          </div>

          <Field label="Title">
            <Input value={meta.title || ''} onChange={v => setMeta(m => ({ ...m, title: v }))} />
          </Field>

          <Field label={`Meta Title (${(meta.metaTitle || '').length}/60)`}>
            <Input value={meta.metaTitle || ''} onChange={v => setMeta(m => ({ ...m, metaTitle: v }))} />
          </Field>

          <Field label={`Meta Description (${(meta.metaDescription || '').length}/155)`}>
            <textarea
              value={meta.metaDescription || ''}
              onChange={e => setMeta(m => ({ ...m, metaDescription: e.target.value }))}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug">
              <Input value={meta.slug || ''} onChange={v => setMeta(m => ({ ...m, slug: v }))} />
            </Field>
            <Field label="Category">
              <Select value={meta.category || 'Finance'} onChange={v => setMeta(m => ({ ...m, category: v }))} options={CATEGORIES} />
            </Field>
          </div>

          <Field label="Excerpt">
            <textarea
              value={meta.excerpt || ''}
              onChange={e => setMeta(m => ({ ...m, excerpt: e.target.value }))}
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </Field>

          <Field label="Article Content (read-only preview)">
            <textarea
              value={articleText}
              readOnly
              rows={8}
              className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 resize-none focus:outline-none font-mono leading-relaxed"
            />
          </Field>

          {post.faqs?.length > 0 && (
            <p className="text-xs text-gray-500">{post.faqs.length} FAQs · {post.content?.length || 0} content blocks</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCopyJs}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {copied ? '✓ Copied!' : '📋 Copy as JS Object'}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {publishing ? <><Spinner />Publishing…</> : '🚀 Publish to Website'}
            </button>
          </div>

          {pubResult && (
            pubResult.success ? (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                <p className="text-green-400 font-semibold text-sm mb-1">
                  {pubResult.partial ? '⚠️ File saved — push manually to deploy' : '✅ Published!'}
                </p>
                {pubResult.partial && <p className="text-yellow-400 text-xs mb-2">{pubResult.warning}</p>}
                <a href={pubResult.liveUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs underline">
                  {pubResult.liveUrl}
                </a>
                <p className="text-gray-500 text-[11px] mt-1">Live in ~2 min after Vercel rebuilds.</p>
              </div>
            ) : (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
                <p className="text-red-400 text-sm font-semibold mb-1">❌ Publish failed</p>
                <p className="text-red-300 text-xs">{pubResult.error}</p>
                <p className="text-gray-500 text-xs mt-2">Use "Copy as JS Object" to paste manually into blogPosts.js.</p>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-400 text-sm">Fill the form and click Generate Article.</p>
          <p className="text-gray-600 text-xs mt-1">The AI will write a full SEO-optimised blog post.</p>
        </div>
      )}
    </div>
  )
}

// ── TAB 2: Idea Generator ─────────────────────────────────────────────────────

function IdeaGeneratorTab({ onWriteIdea }) {
  const [activecat,  setActiveCat] = useState('All')
  const [ideas,      setIdeas]     = useState([])
  const [loading,    setLoading]   = useState(false)
  const [error,      setError]     = useState(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/admin/blog/ideas', { category: activecat, count: 30 })
      if (res.data.success) setIdeas(res.data.ideas)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate ideas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {IDEA_CATS.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activecat === c ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner />Generating 30 ideas…</> : '✨ Generate 30 Ideas'}
        </button>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Ideas grid */}
      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white leading-snug flex-1">{idea.title}</p>
                <DiffBadge level={idea.difficulty} />
              </div>
              <p className="text-xs text-indigo-400">{idea.keyword}</p>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">{idea.angle}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-600">~{idea.estimatedSearches}</span>
                <button
                  onClick={() => onWriteIdea({ topic: idea.title, keyword: idea.keyword, toolSlug: idea.toolSlug || '' })}
                  className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  Write This →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TAB 3: Content Calendar ───────────────────────────────────────────────────

function ContentCalendarTab({ onWriteArticle }) {
  const [calendar, setCalendar] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    api.get('/api/admin/blog/calendar')
      .then(r => { if (r.data.success) setCalendar(r.data.calendar) })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/admin/blog/calendar', {})
      if (res.data.success) setCalendar(res.data.calendar)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate plan.')
    } finally {
      setLoading(false)
    }
  }

  async function cycleStatus(day, current) {
    const next = current === 'planned' ? 'writing' : current === 'writing' ? 'published' : 'planned'
    try {
      const res = await api.patch(`/api/admin/blog/calendar/${day}`, { status: next })
      if (res.data.success) setCalendar(res.data.calendar)
    } catch {}
  }

  const published = calendar.filter(e => e.status === 'published').length
  const planned   = calendar.filter(e => e.status === 'planned').length
  const writing   = calendar.filter(e => e.status === 'writing').length

  return (
    <div className="space-y-6">
      {/* Stats + generate */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        {calendar.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[['✅ Published', published, 'text-green-400'], ['✍️ Writing', writing, 'text-yellow-400'], ['📋 Planned', planned, 'text-gray-400']].map(([label, val, cls]) => (
              <div key={label} className="bg-gray-900 rounded-lg p-3 text-center border border-gray-700">
                <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner />Generating 30-day plan…</> : '📅 Generate 30-Day Plan'}
        </button>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Calendar entries */}
      {fetching ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : calendar.length > 0 ? (
        <div className="space-y-2">
          {calendar.map(entry => (
            <div key={entry.day} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 shrink-0 text-center">
                <p className="text-lg font-bold text-white">{entry.day}</p>
                <p className="text-[10px] text-gray-600">{entry.date?.slice(5)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                <p className="text-xs text-indigo-400">{entry.keyword}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-400 shrink-0">{entry.category}</span>
              <button
                onClick={() => cycleStatus(entry.day, entry.status)}
                className={`text-[10px] px-2.5 py-1 rounded font-semibold shrink-0 transition-colors ${STATUS_COLORS[entry.status] || STATUS_COLORS.planned}`}
              >
                {entry.status || 'planned'}
              </button>
              <button
                onClick={() => onWriteArticle({ topic: entry.title, keyword: entry.keyword, toolSlug: entry.toolSlug || '' })}
                className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg shrink-0 transition-colors"
              >
                Write →
              </button>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-400 text-sm">No calendar yet. Click Generate to create a 30-day content plan.</p>
        </div>
      )}
    </div>
  )
}

// ── TAB 4: SEO Booster ────────────────────────────────────────────────────────

function SEOBoosterTab() {
  const [articleText,  setArticleText]  = useState('')
  const [seoTitle,     setSeoTitle]     = useState('')
  const [seoKeyword,   setSeoKeyword]   = useState('')
  const [analyzing,    setAnalyzing]    = useState(false)
  const [seoResult,    setSeoResult]    = useState(null)
  const [seoError,     setSeoError]     = useState(null)

  const [kwTopic,      setKwTopic]      = useState('')
  const [kwLoading,    setKwLoading]    = useState(false)
  const [keywords,     setKeywords]     = useState([])
  const [kwError,      setKwError]      = useState(null)

  async function handleAnalyze() {
    if (!articleText.trim()) { setSeoError('Paste article text first.'); return }
    setAnalyzing(true)
    setSeoError(null)
    setSeoResult(null)
    try {
      const res = await api.post('/api/admin/blog/seo-analyze', { text: articleText, title: seoTitle, keyword: seoKeyword })
      if (res.data.success) setSeoResult(res.data.result)
      else setSeoError(res.data.error)
    } catch (err) {
      setSeoError(err.response?.data?.error || 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleKeywords() {
    if (!kwTopic.trim()) { setKwError('Enter a topic first.'); return }
    setKwLoading(true)
    setKwError(null)
    setKeywords([])
    try {
      const res = await api.post('/api/admin/blog/keywords', { topic: kwTopic })
      if (res.data.success) setKeywords(res.data.keywords)
      else setKwError(res.data.error)
    } catch (err) {
      setKwError(err.response?.data?.error || 'Keyword research failed.')
    } finally {
      setKwLoading(false)
    }
  }

  const scoreColor = seoResult?.readabilityScore === 'Good' ? 'text-green-400' : seoResult?.readabilityScore === 'Fair' ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Section A: Article Optimizer */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">📊 Article Optimizer</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Article Title">
            <Input value={seoTitle} onChange={setSeoTitle} placeholder="Your article title" />
          </Field>
          <Field label="Target Keyword">
            <Input value={seoKeyword} onChange={setSeoKeyword} placeholder="primary keyword" />
          </Field>
        </div>

        <Field label="Paste Article Text">
          <textarea
            value={articleText}
            onChange={e => setArticleText(e.target.value)}
            rows={6}
            placeholder="Paste the full article text here..."
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </Field>

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          {analyzing ? <><Spinner />Analyzing…</> : '🔍 Analyze & Improve'}
        </button>
        {seoError && <p className="text-red-400 text-sm">{seoError}</p>}

        {seoResult && (
          <div className="space-y-4 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-white">Readability:</p>
              <span className={`text-sm font-bold ${scoreColor}`}>{seoResult.readabilityScore}</span>
              <span className="text-xs text-gray-500">{seoResult.readabilityNotes}</span>
            </div>

            {seoResult.metaTitleSuggestion && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Suggested Meta Title</p>
                <p className="text-sm text-indigo-300 bg-gray-900 rounded-lg px-3 py-2">{seoResult.metaTitleSuggestion}</p>
              </div>
            )}

            {seoResult.metaDescSuggestion && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Suggested Meta Description</p>
                <p className="text-sm text-indigo-300 bg-gray-900 rounded-lg px-3 py-2">{seoResult.metaDescSuggestion}</p>
              </div>
            )}

            {seoResult.missingKeywords?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Missing Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {seoResult.missingKeywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-yellow-900/40 text-yellow-300 rounded-lg">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {seoResult.faqSuggestions?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Suggested FAQs to Add</p>
                <div className="space-y-2">
                  {seoResult.faqSuggestions.map((faq, i) => (
                    <div key={i} className="bg-gray-900 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-white">{faq.q}</p>
                      <p className="text-xs text-gray-400 mt-1">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {seoResult.internalLinkSuggestions?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Internal Links to Add</p>
                <div className="space-y-1">
                  {seoResult.internalLinkSuggestions.map((l, i) => (
                    <p key={i} className="text-xs text-gray-300">
                      Link <span className="text-indigo-400">"{l.anchor}"</span> → /tools/{l.toolSlug} ({l.toolName})
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section B: Keyword Research */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">🔎 Keyword Research</h2>

        <div className="flex gap-3">
          <div className="flex-1">
            <Input value={kwTopic} onChange={setKwTopic} placeholder="e.g. SIP investment for beginners" />
          </div>
          <button
            onClick={handleKeywords}
            disabled={kwLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
          >
            {kwLoading ? <Spinner small /> : '🔍'} Find Keywords
          </button>
        </div>

        {kwError && <p className="text-red-400 text-sm">{kwError}</p>}

        {keywords.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Keyword', 'Intent', 'Difficulty', 'Est. Searches', 'Article Angle'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="py-2 px-2 text-white font-medium">{kw.keyword}</td>
                    <td className="py-2 px-2 text-gray-400">{kw.intent}</td>
                    <td className="py-2 px-2"><DiffBadge level={kw.difficulty} /></td>
                    <td className="py-2 px-2 text-gray-400">{kw.estimatedSearches}</td>
                    <td className="py-2 px-2 text-gray-500 max-w-[200px]">{kw.angle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BlogAssistant() {
  const [activeTab, setActiveTab] = useState('write')
  const [preFill,   setPreFill]   = useState(null)

  function handleWriteIdea(data) {
    setPreFill({ ...data, _ts: Date.now() })
    setActiveTab('write')
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Blog Assistant</h1>
          <p className="text-sm text-gray-400">Generate, plan, and publish SEO blog posts for AWE-OS.</p>
        </div>

        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'write'    && <AIBlogWriterTab   onPreFill={preFill} />}
        {activeTab === 'ideas'    && <IdeaGeneratorTab  onWriteIdea={handleWriteIdea} />}
        {activeTab === 'calendar' && <ContentCalendarTab onWriteArticle={handleWriteIdea} />}
        {activeTab === 'seo'      && <SEOBoosterTab />}
      </div>
    </div>
  )
}
