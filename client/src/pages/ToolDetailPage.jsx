import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ToolCard     from '../components/ToolCard'
import AdContainer  from '../components/tool-engine/AdContainer'
import { MOCK_TOOLS } from './mockTools'
import api from '../services/api.service'
import { SITE_URL, getToolCanonical } from '../utils/canonicalUrl'
import { generateToolSchema, generateBreadcrumbSchema } from '../utils/schema'

function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false)
  const enc  = encodeURIComponent
  const tweet = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`
  const wa    = `https://wa.me/?text=${enc(title + ' ' + url)}`

  const copyLink = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <p className="text-sm font-medium text-gray-700 w-full">Share this tool</p>
      <a href={tweet} target="_blank" rel="noopener noreferrer"
        aria-label="Share on Twitter"
        className="flex-1 text-center text-xs bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-medium transition-colors">
        Twitter
      </a>
      <a href={wa} target="_blank" rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="flex-1 text-center text-xs bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors">
        WhatsApp
      </a>
      <button
        onClick={copyLink}
        aria-label={copied ? 'Link copied!' : 'Copy link to clipboard'}
        className="flex-1 text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors">
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}

function ToolInterface({ tool }) {
  const [input, setInput]   = useState('')
  const [output, setOutput] = useState('')
  const [busy, setBusy]     = useState(false)

  const run = async () => {
    if (!input.trim()) return
    setBusy(true)
    try {
      const res = await api.post(`/api/tools/${tool.slug}/run`, { input })
      setOutput(res.data?.result || res.data?.output || 'Done!')
    } catch {
      setOutput('This tool requires an account. Please log in to continue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Input</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Enter your input for ${tool.name}…`}
          rows={5}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>
      <button
        onClick={run}
        disabled={busy || !input.trim()}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        {busy ? 'Processing…' : `Run ${tool.name}`}
      </button>
      {output && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
          <div className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 whitespace-pre-wrap min-h-[80px]">
            {output}
          </div>
        </div>
      )}
    </div>
  )
}

const FAQS = (toolName) => [
  { q: `Is ${toolName} free to use?`,               a: `Yes! ${toolName} is completely free for basic use. Create a free account to unlock unlimited access and save your history.` },
  { q: `Do I need to create an account?`,            a: 'Most tools work without an account. Sign up free to save results, access history, and get premium features.' },
  { q: `Is my data safe?`,                           a: 'Yes. We do not store your input data on our servers unless you are logged in and explicitly save your work.' },
  { q: `How accurate are the AI-powered results?`,   a: `${toolName} uses state-of-the-art AI models. Results are highly accurate but we recommend reviewing output before final use.` },
  { q: `Can I use this tool on mobile?`,             a: 'Yes — all AWE-OS tools are fully responsive and work on any device without requiring an app download.' },
]

export default function ToolDetailPage() {
  const { slug }            = useParams()
  const [tool, setTool]     = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo(0, 0)

    api.get(`/api/tools/public/${slug}`)
      .then(r => {
        const t = r.data?.data || r.data?.tool
        if (t) { setTool(t); return }
        throw new Error('not found')
      })
      .catch(() => {
        const t = MOCK_TOOLS.find(m => m.slug === slug) || null
        setTool(t)
      })
      .finally(() => setLoading(false))

    // Fetch related
    api.get('/api/tools/public').then(r => {
      const all = r.data?.data || r.data?.tools || MOCK_TOOLS
      setRelated(all.filter(t => t.slug !== slug).slice(0, 5))
    }).catch(() => {
      setRelated(MOCK_TOOLS.filter(t => t.slug !== slug).slice(0, 5))
    })
  }, [slug])

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading tool">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        </div>
      </>
    )
  }

  if (!tool) {
    return (
      <>
        <Helmet><title>Tool Not Found — AWE-OS</title></Helmet>
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Tool Not Found</h1>
          <p className="text-gray-500 mb-6">This tool doesn&apos;t exist or may have moved.</p>
          <Link to="/tools" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            Browse All Tools →
          </Link>
        </div>
      </>
    )
  }

  const pageUrl  = getToolCanonical(tool.slug)
  const seoTitle = `${tool.name} — Free Online Tool | AWE-OS`
  const seoDesc  = `${tool.description} Free, fast and easy to use. No sign-up required.`

  const toolSchema = generateToolSchema({
    name:        tool.name,
    description: tool.description,
    url:         pageUrl,
  })
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home',      url: SITE_URL },
    { name: 'Tools',     url: `${SITE_URL}/tools` },
    { name: tool.name,   url: pageUrl },
  ])
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: FAQS(tool.name).map(({ q, a }) => ({
      '@type':        'Question',
      name:           q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const steps    = [
    'Enter your content or upload your file in the input area below.',
    `Click the "${tool.name}" button to process your request.`,
    'Review the generated output and copy or download as needed.',
    'Create a free account to save results and access your history.',
  ]

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description"        content={seoDesc} />
        <link rel="canonical"           href={pageUrl} />
        <meta property="og:title"       content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url"         content={pageUrl} />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        <script type="application/ld+json">{JSON.stringify(toolSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/tools" className="hover:text-gray-600">Tools</Link>
          <span aria-hidden="true">/</span>
          <span className="text-gray-700 font-medium" aria-current="page">{tool.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── LEFT: Main content (70%) ───────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Tool header */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl shrink-0">{tool.icon || '🛠️'}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{tool.name}</h1>
                <p className="text-gray-500 mt-1">{tool.description}</p>
                {tool.usageCount && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {(tool.usageCount || 0).toLocaleString()} uses · Free
                  </p>
                )}
              </div>
            </div>

            {/* Ad above tool */}
            <AdContainer slot="top-banner" eager />

            {/* Tool interface */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Use {tool.name}</h2>
              <ToolInterface tool={tool} />
            </div>

            {/* How to use */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use {tool.name}</h2>
              <p className="text-gray-600 text-sm mb-4">
                {tool.name} is a free online tool that helps you {tool.description?.toLowerCase() || 'complete your task quickly'}. Follow these simple steps to get started:
              </p>
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-gray-600 text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* About section (content for SEO) */}
            <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About {tool.name}</h2>
              <div className="text-gray-600 text-sm leading-relaxed space-y-3">
                <p>
                  {tool.name} is one of the most popular free tools available on AWE-OS.
                  Designed for professionals, students and everyday users, it makes {tool.description?.toLowerCase()} easier than ever before.
                </p>
                <p>
                  Unlike other online tools, {tool.name} is completely free with no hidden charges.
                  You don&apos;t need to install any software or create an account to get started — simply open the tool and begin working immediately.
                </p>
                <p>
                  Our AI-powered engine ensures fast, accurate results every time. Whether you&apos;re a first-time user or a power user, {tool.name} scales to meet your needs. Join over {((tool.usageCount || 5000)).toLocaleString()} users who already rely on this tool every day.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {FAQS(tool.name).map(({ q, a }) => (
                  <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none">
                      <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
                      <span className="text-gray-400 text-xl shrink-0 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Sidebar (30%) ──────────────────────────── */}
          <aside className="lg:w-72 shrink-0 space-y-6">
            {/* Ad unit */}
            <div className="sticky top-20">
              <AdContainer slot="sidebar-rectangle" />

              {/* Share */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
                <ShareButtons url={pageUrl} title={`Check out ${tool.name} — free online tool`} />
              </div>

              {/* Related tools */}
              {related.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Tools</h3>
                  <div className="space-y-2">
                    {related.map(t => (
                      <Link
                        key={t.id || t.slug}
                        to={`/tools/${t.slug}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xl shrink-0">{t.icon || '🛠️'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate transition-colors">{t.name}</p>
                          <p className="text-xs text-gray-400 truncate">{t.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
