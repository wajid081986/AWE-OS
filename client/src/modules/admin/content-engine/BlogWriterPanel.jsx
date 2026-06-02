import { useState } from 'react'
import api from '../../../services/api.service'

// ── All 49 AWE-OS tools ───────────────────────────────────────────────────────
const AWE_TOOLS = [
  { slug: 'merge-pdf',             name: 'Merge PDF' },
  { slug: 'split-pdf',             name: 'Split PDF' },
  { slug: 'compress-pdf',          name: 'Compress PDF' },
  { slug: 'remove-pages-pdf',      name: 'Remove PDF Pages' },
  { slug: 'extract-pages-pdf',     name: 'Extract PDF Pages' },
  { slug: 'organize-pdf',          name: 'Organize PDF' },
  { slug: 'rotate-pdf',            name: 'Rotate PDF' },
  { slug: 'watermark-pdf',         name: 'Add Watermark to PDF' },
  { slug: 'page-numbers-pdf',      name: 'Add Page Numbers to PDF' },
  { slug: 'pdf-editor',            name: 'PDF Editor' },
  { slug: 'protect-pdf',           name: 'Protect PDF' },
  { slug: 'unlock-pdf',            name: 'Unlock PDF' },
  { slug: 'jpg-to-pdf',            name: 'JPG to PDF' },
  { slug: 'word-to-pdf',           name: 'Word to PDF' },
  { slug: 'excel-to-pdf',          name: 'Excel to PDF' },
  { slug: 'powerpoint-to-pdf',     name: 'PowerPoint to PDF' },
  { slug: 'pdf-to-jpg',            name: 'PDF to JPG' },
  { slug: 'pdf-to-word',           name: 'PDF to Word' },
  { slug: 'pdf-to-text',           name: 'PDF to Text' },
  { slug: 'pdf-to-ppt',            name: 'PDF to PowerPoint' },
  { slug: 'pdf-to-excel',          name: 'PDF to Excel' },
  { slug: 'sip-calculator',        name: 'SIP Calculator' },
  { slug: 'fd-calculator',         name: 'FD Calculator' },
  { slug: 'ppf-calculator',        name: 'PPF Calculator' },
  { slug: 'roi-calculator',        name: 'ROI Calculator' },
  { slug: 'tax-calculator',        name: 'Income Tax Calculator' },
  { slug: 'gst-calculator',        name: 'GST Calculator' },
  { slug: 'loan-calculator',       name: 'Loan EMI Calculator' },
  { slug: 'percentage-calculator', name: 'Percentage Calculator' },
  { slug: 'discount-calculator',   name: 'Discount Calculator' },
  { slug: 'tip-calculator',        name: 'Tip Calculator' },
  { slug: 'bmi-calculator',        name: 'BMI Calculator' },
  { slug: 'age-calculator',        name: 'Age Calculator' },
  { slug: 'gpa-calculator',        name: 'GPA Calculator' },
  { slug: 'unit-converter',        name: 'Unit Converter' },
  { slug: 'currency-converter',    name: 'Currency Converter' },
  { slug: 'base-converter',        name: 'Number Base Converter' },
  { slug: 'csv-to-json',           name: 'CSV to JSON' },
  { slug: 'json-formatter',        name: 'JSON Formatter' },
  { slug: 'word-counter',          name: 'Word Counter' },
  { slug: 'password-generator',    name: 'Password Generator' },
  { slug: 'color-picker',          name: 'Color Picker' },
  { slug: 'qr-code-generator',     name: 'QR Code Generator' },
  { slug: 'image-compressor',      name: 'Image Compressor' },
  { slug: 'invoice-generator',     name: 'Invoice Generator' },
  { slug: 'contract-generator',    name: 'Contract Generator' },
  { slug: 'resume-builder',        name: 'AI Resume Builder' },
  { slug: 'ai-content-writer',     name: 'AI Content Writer' },
]

// ── localStorage helpers (max 10 drafts) ─────────────────────────────────────
const DRAFTS_KEY = 'awe_content_drafts'
function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch { return [] }
}
function persistDraft(draft) {
  const all = loadDrafts()
  const next = [{ ...draft, savedAt: new Date().toISOString() }, ...all].slice(0, 10)
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(next)) } catch {}
  return next
}

// ── Difficulty badge ──────────────────────────────────────────────────────────
function DiffBadge({ level }) {
  const cls = level === 'Low'    ? 'bg-green-900/50 text-green-300 border-green-700/60'
            : level === 'Medium' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/60'
            :                      'bg-red-900/50 text-red-300 border-red-700/60'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cls}`}>
      {level === 'Low' ? '🟢' : level === 'Medium' ? '🟡' : '🔴'} {level}
    </span>
  )
}

// ── Intent pill ───────────────────────────────────────────────────────────────
function IntentPill({ intent }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 border border-gray-600">
      {intent}
    </span>
  )
}

// ── Render article content with markdown links highlighted in orange ───────────
function RichParagraph({ text }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (m) {
          const isOurs = m[2].includes('awe-os.com')
          return (
            <a
              key={i}
              href={m[2]}
              target="_blank"
              rel="noopener noreferrer"
              className={isOurs
                ? 'text-orange-400 hover:text-orange-300 font-medium underline underline-offset-2'
                : 'text-blue-400 hover:text-blue-300 underline underline-offset-2'}
            >
              {m[1]}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function ArticleSection({ h2, content }) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean)
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-white mb-3 pb-2 border-b border-gray-700">{h2}</h2>
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-gray-300 leading-relaxed">
            <RichParagraph text={p} />
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Copy helpers ──────────────────────────────────────────────────────────────
function buildMarkdown(article) {
  let md = `# ${article.title}\n\n`
  md += `**Meta Description:** ${article.metaDescription}\n`
  md += `**Slug:** /blog/${article.slug}\n\n`
  for (const s of article.sections || []) {
    md += `## ${s.h2}\n\n${s.content}\n\n`
  }
  if (article.faqSection?.length) {
    md += `## Frequently Asked Questions\n\n`
    for (const f of article.faqSection) {
      md += `**Q: ${f.q}**\n\nA: ${f.a}\n\n`
    }
  }
  return md
}

function buildHTML(article) {
  let html = `<article>\n  <h1>${article.title}</h1>\n\n`
  for (const s of article.sections || []) {
    const paras = s.content.split(/\n\n+/).filter(Boolean)
      .map(p => `  <p>${p.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')}</p>`)
      .join('\n')
    html += `  <h2>${s.h2}</h2>\n${paras}\n\n`
  }
  if (article.faqSection?.length) {
    html += `  <section class="faq">\n    <h2>Frequently Asked Questions</h2>\n`
    for (const f of article.faqSection) {
      html += `    <details>\n      <summary>${f.q}</summary>\n      <p>${f.a}</p>\n    </details>\n`
    }
    html += `  </section>\n`
  }
  html += `</article>`
  return html
}

function useCopy(text) {
  const [label, setLabel] = useState(null)
  function trigger(displayLabel) {
    navigator.clipboard.writeText(text).catch(() => {})
    setLabel(displayLabel + ' ✓')
    setTimeout(() => setLabel(null), 2000)
  }
  return [label, trigger]
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BlogWriterPanel() {
  // ── Left panel ────────────────────────────────────────────────────────────
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [leftToolSlug, setLeftToolSlug]   = useState(AWE_TOOLS[0].slug)
  const [keywords, setKeywords]           = useState([])
  const [kfLoading, setKfLoading]         = useState(false)
  const [kfError, setKfError]             = useState('')

  // ── Right panel ───────────────────────────────────────────────────────────
  const [keyword, setKeyword]             = useState('')
  const [rightToolSlug, setRightToolSlug] = useState(AWE_TOOLS[0].slug)
  const [article, setArticle]             = useState(null)
  const [bwLoading, setBwLoading]         = useState(false)
  const [bwError, setBwError]             = useState('')

  // ── Drafts ────────────────────────────────────────────────────────────────
  const [drafts, setDrafts]       = useState(loadDrafts)
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')

  const leftTool  = AWE_TOOLS.find(t => t.slug === leftToolSlug)  || AWE_TOOLS[0]
  const rightTool = AWE_TOOLS.find(t => t.slug === rightToolSlug) || AWE_TOOLS[0]

  const mdCopy   = buildMarkdown(article || { sections: [], faqSection: [] })
  const htmlCopy = buildHTML(article    || { sections: [], faqSection: [] })
  const [mdLabel,   triggerMd]   = useCopy(mdCopy)
  const [htmlLabel, triggerHtml] = useCopy(htmlCopy)

  // ── Keyword finder ────────────────────────────────────────────────────────
  async function findKeywords() {
    if (!competitorUrl.trim()) { setKfError('Enter a competitor URL'); return }
    setKfLoading(true); setKfError(''); setKeywords([])
    try {
      const res = await api.post('/api/admin/seo-keywords-claude', {
        competitorUrl: competitorUrl.trim(),
        toolName: leftTool.name,
      })
      setKeywords(res.data.keywords || [])
    } catch (err) {
      setKfError(err.response?.data?.error || err.message)
    } finally {
      setKfLoading(false)
    }
  }

  function pickKeyword(kw) {
    setKeyword(kw.keyword)
    setRightToolSlug(leftToolSlug)
  }

  // ── Blog writer ───────────────────────────────────────────────────────────
  async function generateArticle() {
    if (!keyword.trim()) { setBwError('Enter or pick a keyword from the left panel'); return }
    setBwLoading(true); setBwError(''); setArticle(null)
    try {
      const res = await api.post('/api/admin/blog-writer-claude', {
        keyword: keyword.trim(),
        toolName: rightTool.name,
        toolSlug: rightTool.slug,
      })
      setArticle(res.data)
    } catch (err) {
      setBwError(err.response?.data?.error || err.message)
    } finally {
      setBwLoading(false)
    }
  }

  function saveDraft() {
    if (!article) return
    const next = persistDraft({ keyword, toolSlug: rightToolSlug, ...article })
    setDrafts(next)
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  function loadDraft(d) {
    setKeyword(d.keyword || '')
    setRightToolSlug(d.toolSlug || AWE_TOOLS[0].slug)
    setArticle({
      title: d.title, metaDescription: d.metaDescription, slug: d.slug,
      wordCount: d.wordCount, sections: d.sections, faqSection: d.faqSection
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-2 gap-5 min-h-0" style={{ gridTemplateRows: 'auto' }}>

      {/* ══ LEFT: SEO Keyword Opportunities ══════════════════════════════════ */}
      <div className="flex flex-col gap-4">

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <span className="text-base">🔍</span> SEO Keyword Opportunities
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Enter a competitor's domain. Claude will surface 5 rankable gaps for your tool.
          </p>

          <label className="block text-xs font-medium text-gray-400 mb-1.5">Competitor URL</label>
          <input
            type="url"
            value={competitorUrl}
            onChange={e => setCompetitorUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && findKeywords()}
            placeholder="e.g. ilovepdf.com"
            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 mb-3 transition"
          />

          <label className="block text-xs font-medium text-gray-400 mb-1.5">AWE-OS Tool to Promote</label>
          <select
            value={leftToolSlug}
            onChange={e => setLeftToolSlug(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 mb-4 transition"
          >
            {AWE_TOOLS.map(t => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={findKeywords}
            disabled={kfLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {kfLoading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finding keywords…</>
              : '🔎 Find Keywords'}
          </button>

          {kfError && (
            <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              {kfError}
            </p>
          )}
        </div>

        {/* Keyword cards */}
        {keywords.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs text-gray-500 px-1">
              Click a card to use it in the Blog Writer →
            </p>
            {keywords.map((kw, i) => (
              <button
                key={i}
                onClick={() => pickKeyword(kw)}
                className={`text-left bg-gray-800 border rounded-xl p-4 transition-all hover:border-orange-500/70 hover:shadow-lg hover:shadow-orange-900/20 ${
                  keyword === kw.keyword
                    ? 'border-orange-500 ring-1 ring-orange-500/30 bg-orange-900/5'
                    : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold text-white leading-snug flex-1">
                    {kw.keyword}
                  </span>
                  <DiffBadge level={kw.difficulty} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">📊 {kw.estimatedMonthlySearches}/mo</span>
                  <IntentPill intent={kw.searchIntent} />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                  {kw.whyItWorks}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Drafts section */}
        {drafts.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <button
              onClick={() => setDraftsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-750 transition-colors"
            >
              <span className="flex items-center gap-2">
                💾 Saved Drafts
                <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {drafts.length}
                </span>
              </span>
              <span className={`text-gray-500 transition-transform ${draftsOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {draftsOpen && (
              <div className="border-t border-gray-700 divide-y divide-gray-700/50">
                {drafts.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => loadDraft(d)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors"
                  >
                    <p className="text-xs font-medium text-white truncate">{d.title || d.keyword}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {d.keyword} · {new Date(d.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ RIGHT: AI Blog Writer ════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 min-h-0">

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <span className="text-base">✏️</span> AI Blog Writer
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Select a keyword → Claude writes a full 700-800 word SEO article with structured sections.
          </p>

          <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="← click a keyword card, or type one"
            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 mb-3 transition"
          />

          <label className="block text-xs font-medium text-gray-400 mb-1.5">AWE-OS Tool Context</label>
          <select
            value={rightToolSlug}
            onChange={e => setRightToolSlug(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 mb-4 transition"
          >
            {AWE_TOOLS.map(t => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={generateArticle}
            disabled={bwLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {bwLoading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating article…</>
              : '🤖 Generate Article'}
          </button>

          {bwError && (
            <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              {bwError}
            </p>
          )}
        </div>

        {/* Article output */}
        {article && (
          <div className="flex flex-col gap-4 flex-1">

            {/* Meta strip */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 mb-0.5">Page Title</p>
                  <p className="text-sm font-bold text-white leading-snug">{article.title}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-gray-500 mb-0.5">Words</p>
                  <p className="text-sm font-bold text-orange-400">{article.wordCount || '—'}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mb-0.5">Meta Description ({article.metaDescription?.length || 0} chars)</p>
              <p className="text-xs text-gray-300 leading-relaxed">{article.metaDescription}</p>
              <p className="text-[10px] text-gray-600 mt-1.5">
                /blog/{article.slug}
              </p>
            </div>

            {/* Rendered article body */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 overflow-y-auto" style={{ maxHeight: '420px' }}>
              <h1 className="text-lg font-bold text-white mb-6 leading-tight">{article.title}</h1>

              {(article.sections || []).map((s, i) => (
                <ArticleSection key={i} h2={s.h2} content={s.content} />
              ))}

              {article.faqSection?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h2 className="text-base font-bold text-white mb-4">Frequently Asked Questions</h2>
                  <div className="space-y-4">
                    {article.faqSection.map((f, i) => (
                      <div key={i}>
                        <p className="text-sm font-semibold text-orange-400 mb-1">Q: {f.q}</p>
                        <p className="text-sm text-gray-300 leading-relaxed">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 flex items-center gap-2">
              <button
                onClick={() => triggerMd('Copied')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                📋 {mdLabel || 'Copy as Markdown'}
              </button>
              <button
                onClick={() => triggerHtml('Copied')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                🖥️ {htmlLabel || 'Copy HTML'}
              </button>
              <button
                onClick={saveDraft}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                💾 {saveMsg || 'Save Draft'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
