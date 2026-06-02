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

// ── localStorage library (max 20) ─────────────────────────────────────────────
const LIB_KEY = 'awe_lp_library'

function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]') } catch { return [] }
}
function addToLibrary(entry) {
  const lib = loadLibrary()
  const next = [{ ...entry, savedAt: new Date().toISOString() }, ...lib].slice(0, 20)
  try { localStorage.setItem(LIB_KEY, JSON.stringify(next)) } catch {}
  return next
}

// ── HTML builder ──────────────────────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function buildHtml(data, toolName, toolSlug, location) {
  const toolUrl = `https://www.awe-os.com/tools/${toolSlug}`
  const faqLd   = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (data.faqSection || []).map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer }
    }))
  }, null, 2)

  const stepsHtml = (data.howItWorks || []).map(s => `
    <div class="step">
      <div class="step-num">${s.step}</div>
      <div class="step-body">
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.description)}</p>
      </div>
    </div>`).join('')

  const featHtml = (data.keyFeatures || []).map(f => `
    <div class="feature">
      <div class="feat-icon">${esc(f.icon)}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.description)}</p>
    </div>`).join('')

  const ucHtml = (data.useCases || []).map(u => `
    <div class="use-case">
      <h3>${esc(u.title)}</h3>
      <p>${esc(u.description)}</p>
    </div>`).join('')

  const faqHtml = (data.faqSection || []).map(f => `
    <details class="faq-item">
      <summary>${esc(f.question)}</summary>
      <p>${esc(f.answer)}</p>
    </details>`).join('')

  const relHtml = (data.relatedTools || []).map(t => {
    const slug = String(t).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return `<a class="rel-tool" href="https://www.awe-os.com/tools/${slug}">${esc(t)}</a>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(data.pageTitle)}</title>
  <meta name="description" content="${esc(data.metaDescription)}">
  <meta name="keywords" content="${esc((data.seoKeywords || []).join(', '))}">
  <link rel="canonical" href="${toolUrl}">
  <script type="application/ld+json">
${faqLd}
  </script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;background:#fff;line-height:1.6}
    .container{max-width:1080px;margin:0 auto;padding:0 24px}
    h1{font-size:2.4rem;font-weight:800;line-height:1.2;color:#111827}
    h2{font-size:1.6rem;font-weight:700;color:#111827;margin-bottom:1.5rem}
    h3{font-size:1rem;font-weight:600;color:#111827;margin-bottom:.4rem}
    p{color:#4b5563;font-size:.95rem}
    a{color:#f97316;text-decoration:none}
    /* Hero */
    .hero{background:linear-gradient(135deg,#fff7ed 0%,#fff 60%);padding:80px 0 60px;border-bottom:1px solid #f3f4f6}
    .hero p{font-size:1.15rem;color:#374151;margin:16px 0 32px;max-width:680px}
    .btn{display:inline-block;background:#f97316;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:1rem;transition:background .2s}
    .btn:hover{background:#ea6c0a}
    /* Sections */
    section{padding:64px 0}
    section:nth-child(even){background:#f9fafb}
    /* Steps */
    .steps{display:flex;flex-direction:column;gap:24px;margin-top:24px}
    .step{display:flex;gap:20px;align-items:flex-start;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px}
    .step-num{min-width:40px;height:40px;background:#f97316;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;flex-shrink:0}
    /* Features */
    .features-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:24px}
    .feature{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px}
    .feat-icon{font-size:2rem;margin-bottom:12px}
    /* Use cases */
    .use-cases-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px}
    .use-case{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;border-top:3px solid #f97316}
    /* FAQ */
    .faq-list{margin-top:24px;display:flex;flex-direction:column;gap:12px}
    .faq-item{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
    .faq-item summary{padding:16px 20px;font-weight:600;cursor:pointer;color:#111827;list-style:none}
    .faq-item summary::-webkit-details-marker{display:none}
    .faq-item p{padding:0 20px 16px;color:#4b5563}
    /* Related */
    .rel-grid{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
    .rel-tool{background:#fff7ed;border:1px solid #fed7aa;color:#ea580c;padding:10px 20px;border-radius:8px;font-weight:600;font-size:.9rem}
    .rel-tool:hover{background:#ffedd5}
    /* Keywords */
    .kw-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .kw{background:#f3f4f6;color:#374151;padding:6px 14px;border-radius:20px;font-size:.8rem}
    @media(max-width:768px){
      h1{font-size:1.8rem}
      .features-grid,.use-cases-grid{grid-template-columns:1fr}
    }
  </style>
</head>
<body>

  <!-- HERO -->
  <section class="hero">
    <div class="container">
      <h1>${esc(data.h1)}</h1>
      <p>${esc(data.heroSubtext)}</p>
      <a class="btn" href="${toolUrl}">Use ${esc(toolName)} Free →</a>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section>
    <div class="container">
      <h2>How It Works</h2>
      <div class="steps">${stepsHtml}</div>
    </div>
  </section>

  <!-- KEY FEATURES -->
  <section>
    <div class="container">
      <h2>Key Features</h2>
      <div class="features-grid">${featHtml}</div>
    </div>
  </section>

  <!-- USE CASES -->
  <section>
    <div class="container">
      <h2>Who Uses ${esc(toolName)}${location ? ' in ' + esc(location) : ''}?</h2>
      <div class="use-cases-grid">${ucHtml}</div>
    </div>
  </section>

  <!-- FAQ -->
  <section>
    <div class="container">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">${faqHtml}</div>
    </div>
  </section>

  <!-- RELATED TOOLS -->
  <section>
    <div class="container">
      <h2>Related Free Tools</h2>
      <div class="rel-grid">${relHtml}</div>
    </div>
  </section>

  <!-- SEO KEYWORDS (hidden, for reference) -->
  <!-- Target keywords: ${esc((data.seoKeywords || []).join(', '))} -->

</body>
</html>`
}

// ── SEO Checklist component ───────────────────────────────────────────────────
function SeoChecklist({ data, toolName }) {
  const keyword = ((data.seoKeywords || [])[0] || toolName || '').toLowerCase()
  const title   = (data.pageTitle || '').toLowerCase()
  const meta    = data.metaDescription || ''
  const h1      = (data.h1 || '').toLowerCase()

  const checks = [
    {
      label: 'Title tag ≤ 60 chars',
      detail: `${data.pageTitle?.length || 0} chars`,
      pass: (data.pageTitle?.length || 0) > 0 && (data.pageTitle?.length || 0) <= 60,
    },
    {
      label: 'Meta description ≤ 155 chars',
      detail: `${meta.length} chars`,
      pass: meta.length > 0 && meta.length <= 155,
    },
    {
      label: 'H1 tag present',
      detail: data.h1 ? 'Found' : 'Missing',
      pass: !!data.h1,
    },
    {
      label: 'FAQ section (FAQPage schema eligible)',
      detail: `${data.faqSection?.length || 0} / 5 questions`,
      pass: (data.faqSection?.length || 0) >= 5,
    },
    {
      label: 'Primary keyword in page title',
      detail: title.includes(keyword) ? 'Found' : 'Missing',
      pass: title.includes(keyword),
    },
    {
      label: 'Primary keyword in H1',
      detail: h1.includes(keyword) ? 'Found' : 'Missing',
      pass: h1.includes(keyword),
    },
    {
      label: 'How It Works steps (3 required)',
      detail: `${data.howItWorks?.length || 0} steps`,
      pass: (data.howItWorks?.length || 0) >= 3,
    },
    {
      label: 'Key features section (4 required)',
      detail: `${data.keyFeatures?.length || 0} features`,
      pass: (data.keyFeatures?.length || 0) >= 4,
    },
  ]

  const score = checks.filter(c => c.pass).length
  const pct   = Math.round((score / checks.length) * 100)
  const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-3">
      {/* Score bar */}
      <div className="bg-gray-700/60 rounded-xl p-4 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white uppercase tracking-wide">SEO Score</span>
          <span className={`text-xl font-black ${color}`}>{pct}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2 mb-1">
          <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400">{score} of {checks.length} checks passed</p>
      </div>

      {/* Primary keyword detected */}
      {data.seoKeywords?.length > 0 && (
        <div className="bg-gray-700/30 rounded-lg px-3 py-2 mb-1">
          <p className="text-[10px] text-gray-500 mb-0.5">Primary keyword being checked</p>
          <p className="text-xs text-orange-400 font-medium">{data.seoKeywords[0]}</p>
        </div>
      )}

      {/* Checklist */}
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-3 bg-gray-700/30 rounded-xl px-3 py-2.5">
          <span className="text-base shrink-0">{c.pass ? '✅' : '❌'}</span>
          <p className="flex-1 text-xs text-gray-200">{c.label}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
            c.pass ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {c.detail}
          </span>
        </div>
      ))}

      {/* Keywords list */}
      {data.seoKeywords?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-400 mb-2">Target SEO Keywords ({data.seoKeywords.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {data.seoKeywords.map((kw, i) => (
              <span key={i} className="text-[10px] bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full border border-gray-600">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Landing page preview (white bg, simulates real page) ──────────────────────
function PagePreview({ data, toolName, toolSlug }) {
  const toolUrl = `https://www.awe-os.com/tools/${toolSlug}`
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 text-gray-900 font-sans">
      {/* Browser chrome mockup */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 border border-gray-200 truncate">
          awe-os.com/tools/{toolSlug}
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-50 to-white px-8 py-10 border-b border-gray-100">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-3">AWE-OS Free Tool</p>
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-4 max-w-xl">{data.h1}</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-lg">{data.heroSubtext}</p>
        <a href={toolUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-orange-500 text-white text-sm font-bold px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors">
          Use {toolName} Free →
        </a>
      </div>

      {/* How It Works */}
      {data.howItWorks?.length > 0 && (
        <div className="px-8 py-8 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">How It Works</h2>
          <div className="flex flex-col gap-4">
            {data.howItWorks.map((s, i) => (
              <div key={i} className="flex gap-4 items-start bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-black flex items-center justify-center shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Features */}
      {data.keyFeatures?.length > 0 && (
        <div className="px-8 py-8 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Key Features</h2>
          <div className="grid grid-cols-2 gap-3">
            {data.keyFeatures.map((f, i) => (
              <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <span className="text-2xl mb-2 block">{f.icon}</span>
                <p className="text-sm font-semibold text-gray-900 mb-1">{f.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use Cases */}
      {data.useCases?.length > 0 && (
        <div className="px-8 py-8 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Who Uses This?</h2>
          <div className="grid grid-cols-3 gap-3">
            {data.useCases.map((u, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 border-t-2 border-t-orange-400">
                <p className="text-sm font-semibold text-gray-900 mb-1">{u.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{u.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      {data.faqSection?.length > 0 && (
        <div className="px-8 py-8 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {data.faqSection.map((f, i) => (
              <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-orange-600 mb-1.5">Q: {f.question}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Tools */}
      {data.relatedTools?.length > 0 && (
        <div className="px-8 py-6 bg-gray-50">
          <h2 className="text-base font-bold text-gray-900 mb-4">Related Free Tools</h2>
          <div className="flex flex-wrap gap-2">
            {data.relatedTools.map((t, i) => {
              const slug = String(t).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              return (
                <a key={i} href={`https://www.awe-os.com/tools/${slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full font-medium hover:bg-orange-100 transition-colors">
                  {t}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPageGenerator() {
  const [toolSlug, setToolSlug]     = useState(AWE_TOOLS[0].slug)
  const [location, setLocation]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [data, setData]             = useState(null)
  const [innerTab, setInnerTab]     = useState('preview')
  const [library, setLibrary]       = useState(loadLibrary)
  const [saveMsg, setSaveMsg]       = useState('')
  const [htmlCopied, setHtmlCopied] = useState(false)

  const tool    = AWE_TOOLS.find(t => t.slug === toolSlug) || AWE_TOOLS[0]
  const htmlOut = data ? buildHtml(data, tool.name, tool.slug, location) : ''

  async function generate() {
    setLoading(true); setError(''); setData(null); setInnerTab('preview')
    try {
      const res = await api.post('/api/admin/landing-page-claude', {
        toolName: tool.name,
        toolSlug: tool.slug,
        location: location.trim() || undefined,
      })
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  function saveToLib() {
    if (!data) return
    const next = addToLibrary({
      toolSlug: tool.slug,
      toolName: tool.name,
      location: location || 'India',
      pageTitle: data.pageTitle,
      data,
    })
    setLibrary(next)
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  function copyHtml() {
    navigator.clipboard.writeText(htmlOut).catch(() => {})
    setHtmlCopied(true)
    setTimeout(() => setHtmlCopied(false), 2000)
  }

  function loadFromLibrary(entry) {
    setToolSlug(entry.toolSlug)
    setLocation(entry.location === 'India' ? '' : entry.location)
    setData(entry.data)
    setInnerTab('preview')
  }

  const INNER_TABS = ['preview', 'html', 'seo']
  const INNER_LABELS = { preview: '🖥️ Preview', html: '</> HTML Code', seo: '✅ SEO Checklist' }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Config bar ──────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 shrink-0">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">AWE-OS Tool</label>
            <select
              value={toolSlug}
              onChange={e => setToolSlug(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            >
              {AWE_TOOLS.map(t => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Target Location <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Mumbai, India"
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            />
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> Generating…</>
              : '🤖 Generate Landing Page'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* ── Main layout: library sidebar + content ───────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Library sidebar */}
        <div className="w-56 shrink-0 bg-gray-800 border border-gray-700 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <p className="text-xs font-bold text-white">Library</p>
            {library.length > 0 && (
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                {library.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {library.length === 0 ? (
              <p className="text-xs text-gray-500 p-4 text-center leading-relaxed">
                Saved pages appear here.<br />Max 20 pages.
              </p>
            ) : (
              <div className="divide-y divide-gray-700/50">
                {library.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => loadFromLibrary(entry)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors ${
                      data && entry.pageTitle === data.pageTitle ? 'bg-orange-900/10' : ''
                    }`}
                  >
                    <p className="text-xs font-medium text-white leading-snug line-clamp-2">{entry.pageTitle || entry.toolName}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {entry.toolName}
                      {entry.location && entry.location !== 'India' ? ` · ${entry.location}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(entry.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
          {data ? (
            <>
              {/* Inner tab bar + actions */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex gap-1">
                  {INNER_TABS.map(t => (
                    <button
                      key={t}
                      onClick={() => setInnerTab(t)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        innerTab === t
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {INNER_LABELS[t]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyHtml}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    {htmlCopied ? 'Copied! ✓' : '📋 Copy HTML'}
                  </button>
                  <button
                    onClick={saveToLib}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    {saveMsg || '💾 Save to Library'}
                  </button>
                </div>
              </div>

              {/* Meta strip */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 grid grid-cols-3 gap-4 shrink-0 text-xs">
                <div>
                  <p className="text-gray-500 mb-0.5">Page Title ({data.pageTitle?.length || 0} chars)</p>
                  <p className="text-white font-medium truncate">{data.pageTitle}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Meta ({data.metaDescription?.length || 0} chars)</p>
                  <p className="text-gray-300 truncate">{data.metaDescription}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Location · Keywords</p>
                  <p className="text-orange-400 font-medium truncate">
                    {location || 'India'} · {data.seoKeywords?.length || 0} keywords
                  </p>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {innerTab === 'preview' && (
                  <PagePreview data={data} toolName={tool.name} toolSlug={tool.slug} />
                )}
                {innerTab === 'html' && (
                  <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-mono">
                        index.html · {htmlOut.length.toLocaleString()} chars
                      </p>
                      <button
                        onClick={copyHtml}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        {htmlCopied ? 'Copied! ✓' : '📋 Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                      {htmlOut}
                    </pre>
                  </div>
                )}
                {innerTab === 'seo' && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <SeoChecklist data={data} toolName={tool.name} />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl flex flex-col items-center justify-center text-center p-8">
              <div className="text-5xl mb-4">🏗️</div>
              <p className="text-white font-semibold mb-2">Landing Page Generator</p>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                Select a tool, optionally add a target location for local SEO, then hit Generate.
                Claude will build a complete landing page with hero copy, features, FAQs, and more.
              </p>
              {loading && (
                <div className="mt-6 flex items-center gap-3 text-sm text-orange-400">
                  <span className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                  Generating your landing page…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
