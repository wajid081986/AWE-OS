import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import AdBanner from '../../components/AdBanner'
import api from '../../services/api.service'

function ShareButtons({ url, title }) {
  const enc = encodeURIComponent
  const copy = () => { try { navigator.clipboard.writeText(url) } catch {} }
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">Share this tool</p>
      <div className="flex gap-2">
        <a href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}
           target="_blank" rel="noopener noreferrer"
           className="flex-1 text-center text-xs bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-medium transition-colors">
          Twitter
        </a>
        <a href={`https://wa.me/?text=${enc(title + ' ' + url)}`}
           target="_blank" rel="noopener noreferrer"
           className="flex-1 text-center text-xs bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors">
          WhatsApp
        </a>
        <button onClick={copy}
           className="flex-1 text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors">
          Copy Link
        </button>
      </div>
    </div>
  )
}

export default function ToolPageShell({ slug, name, description, icon, steps, faqs, about, children }) {
  const [related, setRelated] = useState([])

  useEffect(() => {
    window.scrollTo(0, 0)
    api.get('/api/tools/public').then(r => {
      const all = r.data?.data || r.data?.tools || []
      setRelated(all.filter(t => t.slug !== slug).slice(0, 5))
    }).catch(() => {})
  }, [slug])

  const pageUrl = `https://awe-os.com/tools/${slug}`

  return (
    <>
      <Helmet>
        <title>{name} — Free Online Tool | AWE-OS</title>
        <meta name="description" content={`Free online ${name}. ${description} No sign-up required, works instantly in your browser.`} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <span>/</span>
          <Link to="/tools" className="hover:text-gray-600">Tools</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Main ── */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl shrink-0 leading-none">{icon}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
                <p className="text-gray-500 mt-1 text-sm">{description}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ Free · No sign-up · Works offline
                </span>
              </div>
            </div>

            {/* Ad */}
            <AdBanner size="leaderboard" />

            {/* Tool UI */}
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Use {name}</h2>
              {children}
            </div>

            {/* How to use */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use {name}</h2>
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-gray-600 text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* About */}
            {about?.length > 0 && (
              <div className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About {name}</h2>
                <div className="space-y-3">
                  {about.map((para, i) => (
                    <p key={i} className="text-gray-600 text-sm leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faqs.map(({ q, a }) => (
                  <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-white hover:bg-gray-50 transition-colors">
                      <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
                      <span className="text-gray-400 text-xl shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                    </summary>
                    <div className="px-5 pb-4 pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-20 space-y-4">
              <AdBanner size="rectangle" />
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <ShareButtons url={pageUrl} title={`Free ${name} — use it on AWE-OS`} />
              </div>
              {related.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Tools</h3>
                  <div className="space-y-1">
                    {related.map(t => (
                      <Link key={t.slug} to={`/tools/${t.slug}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-blue-900 mb-1">Want more tools?</p>
                <p className="text-xs text-blue-700 mb-3">Create a free account to unlock 100+ AI-powered tools.</p>
                <Link to="/login"
                  className="inline-block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Create Free Account
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
