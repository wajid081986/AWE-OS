import { useState } from 'react'
import api from '../../../services/api.service'

// ── Shared helpers ────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(
      typeof text === 'string' ? text : JSON.stringify(text, null, 2)
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function Spinner({ text = 'Processing…' }) {
  return (
    <div className="flex items-center gap-3 py-8 text-gray-400">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
      {msg}
    </div>
  )
}

function ScoreBar({ label, score, grade }) {
  const color =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-yellow-500' :
    score >= 40 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="w-32 text-xs text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-xs text-gray-300 text-right">{score}</span>
      {grade && <span className="w-5 text-xs font-bold text-indigo-400">{grade}</span>}
    </div>
  )
}

// ── Tab 1: Humanizer ──────────────────────────────────────────────────────────

function HumanizerTab() {
  const [content, setContent] = useState('')
  const [tone, setTone] = useState('conversational')
  const [audience, setAudience] = useState('Indian professionals')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  const run = async () => {
    if (!content.trim()) return setErr('Paste content first')
    setErr(''); setLoading(true); setResult(null)
    try {
      const { data } = await api.post('/api/admin/blog/humanize', {
        content,
        tone,
        targetAudience: audience,
        preserveKeywords: keywords ? keywords.split(',').map(k => k.trim()) : []
      })
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">AI Content Humanizer</h3>
      <p className="text-sm text-gray-400">Make AI-generated content sound genuinely human. Reduces AI detection score.</p>

      <textarea
        rows={8}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Paste your AI-generated content here…"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-y"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200">
            <option value="conversational">Conversational</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Target Audience</label>
          <select value={audience} onChange={e => setAudience(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200">
            <option value="Indian professionals">Indian professionals</option>
            <option value="Students">Students</option>
            <option value="General public">General public</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Keywords to preserve (comma separated)</label>
          <input value={keywords} onChange={e => setKeywords(e.target.value)}
            placeholder="GST, PDF editor, …"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
        </div>
      </div>

      <button onClick={run} disabled={loading}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
        Humanize Content
      </button>

      {loading && <Spinner text="Humanizing content with GPT-4o…" />}
      {err && <ErrBox msg={err} />}

      {result && (
        <div className="space-y-4 mt-4">
          {/* Score comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'AI Score Before', val: `${result.scores.beforeHumanization ?? '—'}%`, color: 'text-red-400' },
              { label: 'AI Score After',  val: `${result.scores.afterHumanization ?? '—'}%`,  color: 'text-green-400' },
              { label: 'Human Score',     val: `${result.scores.humanScore ?? '—'}/100`,       color: 'text-indigo-400' },
              { label: 'Readability',     val: `${result.scores.readability ?? '—'}/100`,      color: 'text-yellow-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{val}</p>
              </div>
            ))}
          </div>

          {/* Side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Original</span>
                <CopyBtn text={result.original} label="Copy original" />
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-400 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {result.original}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Humanized</span>
                <CopyBtn text={result.humanized} label="Copy humanized" />
              </div>
              <div className="bg-gray-900 border border-green-800 rounded-lg p-3 text-sm text-gray-200 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {result.humanized}
              </div>
            </div>
          </div>

          {/* AI patterns found */}
          {result.analysis?.patterns?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">AI Patterns Detected</p>
              <div className="space-y-1">
                {result.analysis.patterns.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex gap-2 text-xs bg-gray-800 rounded p-2">
                    <span className="text-red-400 shrink-0">{p.type}</span>
                    <span className="text-gray-400">"{p.example}"</span>
                    <span className="text-green-400">→ {p.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.improvements?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Remaining Improvements</p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                {result.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Snippet Optimizer ──────────────────────────────────────────────────

function SnippetTab() {
  const [keyword, setKeyword] = useState('')
  const [content, setContent] = useState('')
  const [snippetType, setSnippetType] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  const run = async () => {
    if (!keyword.trim() || !content.trim()) return setErr('Keyword and content required')
    setErr(''); setLoading(true); setResult(null)
    try {
      const { data } = await api.post('/api/admin/blog/snippet-optimize', {
        content, keyword, snippetType, targetCountry: 'India'
      })
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const paaText = result?.paa?.questions
    ? result.paa.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')
    : ''

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Featured Snippet Optimizer</h3>
      <p className="text-sm text-gray-400">Win Google Position Zero with optimized snippet blocks and PAA questions.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={keyword} onChange={e => setKeyword(e.target.value)}
          placeholder="Target keyword (e.g. GST calculator India)"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
        <select value={snippetType} onChange={e => setSnippetType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
          <option value="auto">Auto-detect type</option>
          <option value="paragraph">Paragraph</option>
          <option value="list">List</option>
          <option value="table">Table</option>
          <option value="steps">Steps</option>
        </select>
      </div>

      <textarea rows={6} value={content} onChange={e => setContent(e.target.value)}
        placeholder="Paste your article content here…"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-y" />

      <button onClick={run} disabled={loading}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
        Optimize for Snippet
      </button>

      {loading && <Spinner text="Analyzing keyword and generating snippet…" />}
      {err && <ErrBox msg={err} />}

      {result && (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Snippet type used:</span>
            <span className="px-2 py-0.5 bg-indigo-900 text-indigo-300 rounded text-xs font-semibold uppercase">
              {result.usedSnippetType}
            </span>
            {result.snippet.estimatedSnippetProbability && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                result.snippet.estimatedSnippetProbability === 'high' ? 'bg-green-900 text-green-300' :
                result.snippet.estimatedSnippetProbability === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {result.snippet.estimatedSnippetProbability} probability
              </span>
            )}
          </div>

          {result.snippet.h2Heading && (
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">H2 Heading to add</p>
              <p className="text-white font-semibold">{result.snippet.h2Heading}</p>
            </div>
          )}

          {result.snippet.snippetContent && (
            <div className="bg-gray-900 border border-indigo-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-400 uppercase">Snippet Block</p>
                <CopyBtn text={
                  typeof result.snippet.snippetContent.content === 'string'
                    ? result.snippet.snippetContent.content
                    : JSON.stringify(result.snippet.snippetContent.content, null, 2)
                } label="Copy snippet" />
              </div>
              <pre className="text-sm text-gray-200 whitespace-pre-wrap">
                {typeof result.snippet.snippetContent.content === 'string'
                  ? result.snippet.snippetContent.content
                  : JSON.stringify(result.snippet.snippetContent.content, null, 2)}
              </pre>
            </div>
          )}

          {result.paa?.questions?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">People Also Ask ({result.paa.questions.length})</p>
                <CopyBtn text={paaText} label="Copy all PAA as FAQ" />
              </div>
              <div className="space-y-2">
                {result.paa.questions.map((q, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-indigo-300 mb-1">{q.question}</p>
                    <p className="text-sm text-gray-400">{q.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.snippet.additionalOptimizations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Additional Optimizations</p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                {result.snippet.additionalOptimizations.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Content Brief ──────────────────────────────────────────────────────

function BriefTab() {
  const [topic, setTopic] = useState('')
  const [keyword, setKeyword] = useState('')
  const [secondary, setSecondary] = useState('')
  const [contentType, setContentType] = useState('blog')
  const [wordCount, setWordCount] = useState(1500)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  const run = async () => {
    if (!topic.trim() || !keyword.trim()) return setErr('Topic and primary keyword required')
    setErr(''); setLoading(true); setResult(null)
    try {
      const { data } = await api.post('/api/admin/blog/generate-brief', {
        topic, targetKeyword: keyword,
        secondaryKeywords: secondary ? secondary.split(',').map(k => k.trim()) : [],
        contentType, wordCount: Number(wordCount)
      })
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const brief = result?.brief || {}

  const briefMarkdown = brief.title ? `# ${brief.title}

**Meta Title:** ${brief.metaTitle}
**Meta Description:** ${brief.metaDescription}
**URL:** /${brief.url}
**Target Keyword:** ${brief.targetKeyword}
**Word Count:** ${brief.contentRequirements?.minimumWordCount}

## Outline
${(brief.outline || []).map(s => `### ${s.heading}\n- ${s.keyPoints?.join('\n- ')}`).join('\n\n')}

## FAQs
${(brief.faqs || []).map(f => `**Q:** ${f.question}\n**A:** ${f.answer}`).join('\n\n')}
` : ''

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Content Brief Generator</h3>
      <p className="text-sm text-gray-400">Generate comprehensive SEO content briefs for top-ranking articles.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="Article topic (e.g. How to calculate GST in India)"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
        <input value={keyword} onChange={e => setKeyword(e.target.value)}
          placeholder="Primary keyword"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
      </div>

      <textarea rows={2} value={secondary} onChange={e => setSecondary(e.target.value)}
        placeholder="Secondary keywords (comma separated)"
        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-none" />

      <div className="flex gap-3">
        <select value={contentType} onChange={e => setContentType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
          <option value="blog">Blog Article</option>
          <option value="tool-page">Tool Page</option>
          <option value="comparison">Comparison</option>
          <option value="faq">FAQ Page</option>
          <option value="city-page">City Page</option>
        </select>
        <select value={wordCount} onChange={e => setWordCount(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
          {[800, 1200, 1500, 2000].map(n => (
            <option key={n} value={n}>{n} words</option>
          ))}
        </select>
      </div>

      <button onClick={run} disabled={loading}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
        Generate Brief
      </button>

      {loading && <Spinner text="Generating content brief with GPT-4o…" />}
      {err && <ErrBox msg={err} />}

      {brief.title && (
        <div className="space-y-4 mt-4">
          <div className="flex justify-end">
            <CopyBtn text={briefMarkdown} label="Copy full brief (markdown)" />
          </div>

          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-lg font-bold text-white">{brief.title}</p>
            <p className="text-sm text-gray-400"><span className="text-gray-500">Meta:</span> {brief.metaTitle}</p>
            <p className="text-sm text-gray-400"><span className="text-gray-500">Desc:</span> {brief.metaDescription}</p>
            <p className="text-sm text-gray-400"><span className="text-gray-500">URL:</span> /{brief.url}</p>
            {brief.uniqueAngle && (
              <p className="text-sm text-indigo-300"><span className="text-gray-500">Angle:</span> {brief.uniqueAngle}</p>
            )}
          </div>

          {brief.outline?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-2">Outline ({brief.outline.length} sections)</p>
              <div className="space-y-2">
                {brief.outline.map((s, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-indigo-300">{s.type?.toUpperCase()} — {s.heading}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.wordCount} words</p>
                    {s.keyPoints?.length > 0 && (
                      <ul className="mt-1 text-xs text-gray-400 list-disc list-inside">
                        {s.keyPoints.map((kp, j) => <li key={j}>{kp}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.faqs?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-2">FAQs ({brief.faqs.length})</p>
              <div className="space-y-2">
                {brief.faqs.map((f, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-indigo-300">{f.question}</p>
                    <p className="text-xs text-gray-400 mt-1">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab 4: Multilingual ───────────────────────────────────────────────────────

function MultilingualTab() {
  const [mode, setMode] = useState('translate')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  // Translate mode
  const [trContent, setTrContent] = useState('')
  const [trFrom, setTrFrom] = useState('english')
  const [trTo, setTrTo] = useState('hindi')
  const [trStyle, setTrStyle] = useState('natural')

  // Hindi mode
  const [hiTopic, setHiTopic] = useState('')
  const [hiKeyword, setHiKeyword] = useState('')
  const [hiTool, setHiTool] = useState('')
  const [hiStyle, setHiStyle] = useState('hinglish')
  const [hiWords, setHiWords] = useState(800)

  // Bilingual mode
  const [biTopic, setBiTopic] = useState('')
  const [biKeyword, setBiKeyword] = useState('')
  const [biWords, setBiWords] = useState(1200)

  const run = async () => {
    setErr(''); setLoading(true); setResult(null)
    try {
      let data
      if (mode === 'translate') {
        if (!trContent.trim()) throw new Error('Content required');
        ({ data } = await api.post('/api/admin/blog/translate', {
          content: trContent, from: trFrom, to: trTo, style: trStyle
        }))
      } else if (mode === 'hindi') {
        if (!hiTopic.trim()) throw new Error('Topic required');
        ({ data } = await api.post('/api/admin/blog/hindi-content', {
          topic: hiTopic, keyword: hiKeyword, wordCount: hiWords,
          toolName: hiTool, style: hiStyle
        }))
      } else {
        if (!biTopic.trim()) throw new Error('Topic required');
        ({ data } = await api.post('/api/admin/blog/bilingual', {
          topic: biTopic, keyword: biKeyword, wordCount: biWords
        }))
      }
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Multilingual Engine</h3>
      <p className="text-sm text-gray-400">English ↔ Hindi translation and bilingual content generation for Indian SEO.</p>

      {/* Mode selector */}
      <div className="flex gap-2">
        {[
          { val: 'translate', label: 'Translate Content' },
          { val: 'hindi',     label: 'Generate Hindi' },
          { val: 'bilingual', label: 'Bilingual' },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => { setMode(val); setResult(null); setErr('') }}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              mode === val
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'translate' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <select value={trFrom} onChange={e => setTrFrom(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>
            <span className="self-center text-gray-400">→</span>
            <select value={trTo} onChange={e => setTrTo(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
            </select>
            <select value={trStyle} onChange={e => setTrStyle(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
              <option value="natural">Natural</option>
              <option value="formal">Formal</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
          <textarea rows={6} value={trContent} onChange={e => setTrContent(e.target.value)}
            placeholder="Paste content to translate…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-y" />
        </div>
      )}

      {mode === 'hindi' && (
        <div className="space-y-3">
          <input value={hiTopic} onChange={e => setHiTopic(e.target.value)}
            placeholder="Topic in English (e.g. How to use GST calculator)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input value={hiKeyword} onChange={e => setHiKeyword(e.target.value)}
              placeholder="Target keyword"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
            <input value={hiTool} onChange={e => setHiTool(e.target.value)}
              placeholder="Tool to promote (optional)"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
            <select value={hiStyle} onChange={e => setHiStyle(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
              <option value="hinglish">Hinglish</option>
              <option value="pure_hindi">Pure Hindi</option>
              <option value="formal">Formal Hindi</option>
            </select>
          </div>
          <select value={hiWords} onChange={e => setHiWords(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
            {[600, 800, 1000, 1200].map(n => <option key={n} value={n}>{n} words</option>)}
          </select>
        </div>
      )}

      {mode === 'bilingual' && (
        <div className="space-y-3">
          <input value={biTopic} onChange={e => setBiTopic(e.target.value)}
            placeholder="Topic (e.g. GST Calculator for Indian businesses)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
          <div className="flex gap-3">
            <input value={biKeyword} onChange={e => setBiKeyword(e.target.value)}
              placeholder="Target keyword (optional)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
            <select value={biWords} onChange={e => setBiWords(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
              {[800, 1200, 1500, 2000].map(n => <option key={n} value={n}>{n} words</option>)}
            </select>
          </div>
        </div>
      )}

      <button onClick={run} disabled={loading}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
        {mode === 'translate' ? 'Translate' : mode === 'hindi' ? 'Generate Hindi Article' : 'Generate Both Languages'}
      </button>

      {loading && <Spinner text="Generating multilingual content…" />}
      {err && <ErrBox msg={err} />}

      {result && mode === 'translate' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {result.wordCount?.original} → {result.wordCount?.translated} words
            </span>
            <CopyBtn text={result.translated} label="Copy translation" />
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
            {result.translated}
          </div>
        </div>
      )}

      {result && mode === 'hindi' && (
        <div className="mt-4 space-y-3">
          {result.title && <p className="font-bold text-white">{result.title}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
            <p><span className="text-gray-500">Meta:</span> {result.metaTitle}</p>
            <p><span className="text-gray-500">Desc:</span> {result.metaDescription}</p>
          </div>
          <div className="flex justify-end">
            <CopyBtn text={result.content} label="Copy article" />
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
            {result.content}
          </div>
        </div>
      )}

      {result && mode === 'bilingual' && (
        <div className="mt-4">
          <BilingualView result={result} />
        </div>
      )}
    </div>
  )
}

function BilingualView({ result }) {
  const [lang, setLang] = useState('english')
  const active = result[lang] || {}

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['english', 'hindi'].map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              lang === l ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}>
            {l === 'english' ? 'English' : 'Hindi'}
          </button>
        ))}
      </div>
      {active.title && <p className="font-bold text-white">{active.title}</p>}
      <div className="text-sm text-gray-400 space-y-1">
        <p><span className="text-gray-500">Meta:</span> {active.metaTitle}</p>
        <p><span className="text-gray-500">Desc:</span> {active.metaDescription}</p>
      </div>
      <div className="flex justify-end">
        <CopyBtn text={active.content} label={`Copy ${lang}`} />
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 max-h-80 overflow-y-auto whitespace-pre-wrap">
        {active.content}
      </div>
    </div>
  )
}

// ── Tab 5: Content Scorer ─────────────────────────────────────────────────────

function ScorerTab() {
  const [content, setContent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [contentType, setContentType] = useState('blog')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  const run = async () => {
    if (!content.trim()) return setErr('Content required')
    setErr(''); setLoading(true); setResult(null)
    try {
      const { data } = await api.post('/api/admin/blog/score-content', {
        content, targetKeyword: keyword, contentType, targetAudience: 'Indian users'
      })
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const overall = result?.overall || {}
  const scoreColor =
    overall.score >= 80 ? 'text-green-400' :
    overall.score >= 60 ? 'text-yellow-400' :
    overall.score >= 40 ? 'text-orange-400' : 'text-red-400'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Content Quality Scorer</h3>
      <p className="text-sm text-gray-400">Grade your content 0-100 across SEO, readability, engagement, E-E-A-T, and India relevance.</p>

      <textarea rows={8} value={content} onChange={e => setContent(e.target.value)}
        placeholder="Paste full article content here…"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-y" />

      <div className="flex gap-3">
        <input value={keyword} onChange={e => setKeyword(e.target.value)}
          placeholder="Target keyword (optional)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
        <select value={contentType} onChange={e => setContentType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
          <option value="blog">Blog</option>
          <option value="tool-page">Tool Page</option>
          <option value="comparison">Comparison</option>
          <option value="faq">FAQ</option>
        </select>
      </div>

      <button onClick={run} disabled={loading}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
        Score Content
      </button>

      {loading && <Spinner text="Scoring content quality…" />}
      {err && <ErrBox msg={err} />}

      {result && (
        <div className="space-y-5 mt-4">
          {/* Overall score */}
          <div className="flex items-center gap-6 bg-gray-800 rounded-xl p-5">
            <div className="text-center">
              <p className={`text-5xl font-bold ${scoreColor}`}>{overall.score}</p>
              <p className={`text-2xl font-semibold ${scoreColor}`}>{overall.grade}</p>
              <p className="text-xs text-gray-500 mt-1">Overall</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300 mb-2">{overall.verdict}</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                result.readyToPublish ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              }`}>
                {result.readyToPublish ? '✅ Ready to publish' : '❌ Fix before publishing'}
              </div>
            </div>
          </div>

          {/* Dimension scores */}
          {result.scores && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-white mb-3">Dimension Scores</p>
              {[
                ['SEO',            result.scores.seo],
                ['Readability',    result.scores.readability],
                ['Engagement',     result.scores.engagement],
                ['E-E-A-T',        result.scores.eeat],
                ['India Relevance',result.scores.indiaRelevance],
              ].map(([label, dim]) => dim && (
                <ScoreBar key={label} label={label} score={dim.score} grade={dim.grade} />
              ))}
            </div>
          )}

          {/* Structural stats */}
          {result.structural && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-white mb-3">Structural Analysis</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Word Count',    val: result.structural.wordCount },
                  { label: 'Sentences',     val: result.structural.sentenceCount },
                  { label: 'Paragraphs',    val: result.structural.paragraphCount },
                  { label: 'H2 Headings',   val: result.structural.h2Count },
                  { label: 'List Items',    val: result.structural.listItems },
                  { label: 'Keyword Density', val: result.structural.keywordDensity,
                    highlight: result.structural.keywordOptimal },
                ].map(({ label, val, highlight }) => (
                  <div key={label} className="bg-gray-900 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-sm font-bold ${highlight === true ? 'text-green-400' : highlight === false ? 'text-red-400' : 'text-white'}`}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority fixes */}
          {overall.priorityFixes?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-2">Priority Fixes</p>
              <div className="space-y-2">
                {overall.priorityFixes.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-lg p-3">
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 mt-0.5 ${
                      f.impact === 'high' ? 'bg-red-900 text-red-300' :
                      f.impact === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>{f.impact}</span>
                    <p className="text-sm text-gray-300">{f.fix}</p>
                    <span className="text-xs text-gray-500 shrink-0 ml-auto">{f.effort} effort</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & issues */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {overall.topStrengths?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-400 mb-2">Strengths</p>
                <ul className="space-y-1">
                  {overall.topStrengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-green-500">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {overall.topIssues?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-400 mb-2">Issues</p>
                <ul className="space-y-1">
                  {overall.topIssues.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-red-500">✗</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.publishBlockers?.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-400 mb-1">Must fix before publishing:</p>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {result.publishBlockers.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ContentStudio component ──────────────────────────────────────────────

const TABS = [
  { id: 'humanizer', label: 'Humanizer',        icon: '🤖' },
  { id: 'snippet',   label: 'Snippet Optimizer', icon: '🎯' },
  { id: 'brief',     label: 'Content Brief',     icon: '📋' },
  { id: 'multi',     label: 'Multilingual',       icon: '🌐' },
  { id: 'scorer',    label: 'Content Scorer',     icon: '📊' },
]

export default function ContentStudio() {
  const [active, setActive] = useState('humanizer')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">AI Content Studio</h2>
        <p className="text-gray-400 text-sm mt-1">
          Humanize AI content · Win snippets · Generate briefs · Hindi/English · Score quality
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              active === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        {active === 'humanizer' && <HumanizerTab />}
        {active === 'snippet'   && <SnippetTab />}
        {active === 'brief'     && <BriefTab />}
        {active === 'multi'     && <MultilingualTab />}
        {active === 'scorer'    && <ScorerTab />}
      </div>
    </div>
  )
}
