import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getAllTools, CATEGORY_META } from '../data/toolRegistry'

const SITE_URL = 'https://www.awe-os.com'

const CATEGORY_ORDER = ['pdf', 'calculators', 'converters']

// AI tools require a login and, beyond a free plan, payment — they don't belong
// on a page that promises "no account, no fees, ever."
const PAID_TOOL_SLUGS = ['resume-builder', 'ai-content-writer']

export default function FreeToolsPage() {
  const [search, setSearch] = useState('')

  const tools = useMemo(
    () => getAllTools().filter(t => t.slug !== 'test-ai-tool' && !PAID_TOOL_SLUGS.includes(t.slug)),
    [],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return tools
    return tools.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.includes(q)),
    )
  }, [tools, search])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(t => {
      if (!map[t.category]) map[t.category] = []
      map[t.category].push(t)
    })
    return map
  }, [filtered])

  const orderedCategories = CATEGORY_ORDER.filter(c => grouped[c])

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All Free Online Tools — No Sign Up Required',
    url: `${SITE_URL}/tools/free`,
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      url: `${SITE_URL}/tools/${t.slug}`,
      description: t.description,
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',  item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: 'Free Tools', item: `${SITE_URL}/tools/free` },
    ],
  }

  return (
    <>
      <Helmet>
        <title>All Free Online Tools — No Sign Up Required | AWE-OS</title>
        <meta name="description" content={`Browse all ${tools.length}+ free online tools — PDF tools, calculators, converters, and AI tools. No sign-up required. Works instantly in your browser.`} />
        <link rel="canonical" href={`${SITE_URL}/tools/free`} />
        <meta property="og:site_name"   content="AWE-OS" />
        <meta property="og:locale"      content="en_US" />
        <meta property="og:title"       content="All Free Online Tools — No Sign Up Required | AWE-OS" />
        <meta property="og:description" content={`${tools.length}+ free tools with no account needed. PDF, calculators, converters, AI — works in any browser.`} />
        <meta property="og:url"         content={`${SITE_URL}/tools/free`} />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"       content="summary_large_image" />
        <meta name="twitter:title"      content="All Free Online Tools — No Sign Up Required | AWE-OS" />
        <meta name="twitter:description" content={`${tools.length}+ free tools. No account. Works in browser.`} />
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400 mb-8 flex-wrap">
          <Link to="/"      className="hover:text-gray-700 transition-colors">Home</Link>
          <span aria-hidden>/</span>
          <Link to="/tools" className="hover:text-gray-700 transition-colors">Tools</Link>
          <span aria-hidden>/</span>
          <span className="text-gray-800 font-medium">Free Tools</span>
        </nav>

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            All Free Tools —<br className="sm:hidden" /> No Sign Up Required
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto mb-6">
            {tools.length}+ free online tools. No account, no downloads, no fees — ever.
            Everything runs instantly in your browser.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative mb-6">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search free tools…"
              aria-label="Search tools"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category jump links */}
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORY_ORDER.filter(c => CATEGORY_META[c]).map(cat => {
              const m = CATEGORY_META[cat]
              return (
                <a
                  key={cat}
                  href={`#${cat}`}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  {m.icon} {m.name}
                </a>
              )
            })}
          </div>
        </div>

        {/* Why Free section */}
        {!search && (
          <section className="mb-10 bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Why Are AWE-OS Tools Free?</h2>
            <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>AWE-OS was built with a simple belief: professional-grade tools should be accessible to everyone in India — students, freelancers, teachers, homemakers, and small business owners — regardless of their income or technical background. Every tool on this page is 100% free with no hidden fees, no subscription tiers, and no features locked behind a paywall. (Our AI-powered tools, like the Resume Builder and Content Writer, are the exception — they require a free account and, for heavy use, a paid plan.)</p>
              <p>Unlike most "free" tool sites that limit you to 3 downloads per day or watermark your output files, AWE-OS tools have no such restrictions. Merge 50 PDFs, calculate your EMI 100 times, generate unlimited QR codes — everything runs without usage counters or artificial limits. The tools process your files entirely in your browser using JavaScript, which means no server costs are passed on to you and your files never leave your device.</p>
              <p>AWE-OS is funded by advertising and by digital products we build and sell in our Store. The free tools have no usage limits, no watermarks, and no hidden fees — and that won't change.</p>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Popular Free Tools You Can Use Right Now</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { slug: 'merge-pdf',        label: 'Merge PDF',              desc: 'combine multiple PDFs into one file'                },
                    { slug: 'compress-pdf',      label: 'Compress PDF',           desc: 'reduce file size without quality loss'              },
                    { slug: 'sip-calculator',    label: 'SIP Calculator',         desc: 'plan mutual fund SIP investments'                   },
                    { slug: 'bmi-calculator',    label: 'BMI Calculator',         desc: 'check weight using Indian ICMR thresholds'          },
                    { slug: 'tax-calculator',    label: 'Income Tax Calculator',  desc: 'compare Old and New regime for FY 2025-26'          },
                    { slug: 'invoice-generator', label: 'Invoice Generator',      desc: 'GST-compliant invoices in seconds'                  },
                    { slug: 'password-generator',label: 'Password Generator',     desc: 'cryptographically secure passwords'                 },
                    { slug: 'qr-code-generator', label: 'QR Code Generator',      desc: 'print-ready QR codes for any content'              },
                  ].map(({ slug, label, desc }) => (
                    <li key={slug} className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5">✦</span>
                      <span><Link to={`/tools/${slug}`} className="text-blue-600 hover:underline font-medium">{label}</Link> — {desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-2 pt-4 border-t border-gray-100 space-y-3">
                <h3 className="text-base font-semibold text-gray-900">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm mb-1">Are these tools really free — no hidden charges?</p>
                    <p>Yes — completely free. No credit card, no trial period, no email signup required. Open any tool and start using it immediately with zero restrictions.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm mb-1">Do I need to create an account?</p>
                    <p>No. Every tool works without an account. Creating a free account is optional and only needed if you want to save your work history or access advanced AI-powered features.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm mb-1">How do you make money if the tools are free?</p>
                    <p>AWE-OS is funded by advertising and by digital products we build and sell in our Store. The free tools have no usage limits, no watermarks, and no hidden fees — and that won't change.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* No results */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-medium text-gray-600">No tools match &ldquo;{search}&rdquo;</p>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Tool groups */}
        {orderedCategories.map(cat => {
          const m = CATEGORY_META[cat]
          const catTools = grouped[cat]
          return (
            <section key={cat} id={cat} className="mb-14 scroll-mt-20">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl" aria-hidden>{m.icon}</span>
                <h2 className="text-xl font-bold text-gray-900">{m.name}</h2>
                <span className="text-sm text-gray-400 font-normal">({catTools.length} tools)</span>
                <Link to={`/tools/${m.slug}`} className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Browse category →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catTools.map(t => (
                  <Link
                    key={t.slug}
                    to={`/tools/${t.slug}`}
                    className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <span className="text-3xl shrink-0 leading-none mt-0.5" aria-hidden>{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {t.name}
                        </span>
                        <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                          FREE
                        </span>
                        {t.isNew && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {/* CTA strip */}
        <div className="bg-blue-600 rounded-2xl p-8 text-center mt-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">New tools added every week</h2>
          <p className="text-blue-100 text-sm mb-6">
            Create a free account to save your work, access history, and unlock our AI-powered tools.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-3 bg-white text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
            >
              Create Free Account →
            </Link>
            <Link
              to="/tools"
              className="px-6 py-3 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors border border-blue-500"
            >
              Browse All Tools
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}
