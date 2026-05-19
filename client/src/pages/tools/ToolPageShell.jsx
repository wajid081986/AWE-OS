/**
 * ToolPageShell — universal layout wrapper for every dedicated tool page.
 *
 * Provides:
 *   - React Helmet meta (title, description, canonical)
 *   - Schema.org JSON-LD: SoftwareApplication + HowTo + FAQPage + BreadcrumbList
 *   - Category-aware breadcrumb navigation
 *   - Two-column layout (main content + sticky sidebar)
 *   - Related tools sidebar (from toolRegistry)
 *   - AdSense placements
 *   - Share buttons
 *   - Sign-up CTA
 *
 * Usage — each tool page passes static data; the shell handles all SEO/layout:
 *   <ToolPageShell slug="merge-pdf" name="Merge PDF" icon="📎"
 *     description="..." steps={STEPS} faqs={FAQS} about={ABOUT}>
 *     <MergeTool />
 *   </ToolPageShell>
 */

import { useState, useEffect, useCallback } from 'react'
import { Link }                from 'react-router-dom'
import { Helmet }              from 'react-helmet-async'
import AdBanner                from '../../components/AdBanner'
import {
  getToolBySlug,
  getCategoryMeta,
  getRelatedTools,
  getApplicationCategory,
} from '../../data/toolRegistry'

const SITE_URL  = 'https://www.awe-os.com'
const OG_IMAGE  = 'https://www.awe-os.com/og-image.svg'

// ── Share buttons ─────────────────────────────────────────────────────────────
function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent
  const copy = useCallback(() => {
    try { navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [url])
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">Share this tool</p>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}
          target="_blank" rel="noopener noreferrer"
          className="text-center text-xs bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-medium transition-colors"
        >
          Twitter / X
        </a>
        <a
          href={`https://wa.me/?text=${enc(title + ' ' + url)}`}
          target="_blank" rel="noopener noreferrer"
          className="text-center text-xs bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
        >
          WhatsApp
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
          target="_blank" rel="noopener noreferrer"
          className="text-center text-xs bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg font-medium transition-colors"
        >
          LinkedIn
        </a>
        <button
          onClick={copy}
          className="text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}

// ── Embed code ────────────────────────────────────────────────────────────────
function EmbedCode({ url, name }) {
  const [copied, setCopied] = useState(false)
  const code =
    `<iframe src="${url}" width="100%" height="600" style="border:none;border-radius:8px;" loading="lazy" title="${name} — AWE-OS Free Tool"></iframe>\n` +
    `<p style="text-align:center;margin-top:8px;font-size:13px;color:#6b7280;">` +
    `Free tool by <a href="https://www.awe-os.com" target="_blank" rel="noopener">AWE-OS</a></p>`

  const copy = useCallback(() => {
    try { navigator.clipboard.writeText(code) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">Embed This Tool</p>
      <p className="text-xs text-gray-500">Add this free tool to your website.</p>
      <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all text-gray-600 max-h-20 leading-relaxed">
        {code}
      </pre>
      <button
        onClick={copy}
        className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
      >
        {copied ? '✓ Copied!' : 'Copy Embed Code'}
      </button>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export default function ToolPageShell({ slug, name, description, icon, steps, faqs, about, children }) {
  const [relatedTools, setRelatedTools] = useState([])

  // Resolve tool and category metadata from the registry
  const toolMeta = getToolBySlug(slug)
  const catMeta  = toolMeta ? getCategoryMeta(toolMeta.category) : null

  useEffect(() => {
    window.scrollTo(0, 0)
    // Use registry related tools first; fall back to an empty list
    if (toolMeta) {
      setRelatedTools(getRelatedTools(toolMeta, 5))
    }
  }, [slug])

  const pageUrl     = `${SITE_URL}/tools/${slug}`
  const seoTitle    = toolMeta?.seo?.title    || `${name} — Free Online Tool | AWE-OS`
  const seoDesc     = toolMeta?.seo?.description
                       || `Free online ${name}. ${description} No sign-up required, works instantly in your browser.`
  const appCategory = getApplicationCategory(toolMeta)

  // ── Schema.org JSON-LD ─────────────────────────────────────────────────────

  const softwareSchema = {
    '@context':          'https://schema.org',
    '@type':             'SoftwareApplication',
    name,
    description,
    url:                 pageUrl,
    applicationCategory: appCategory,
    operatingSystem:     'Web Browser',
    offers:      { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    image:       { '@type': 'ImageObject', url: OG_IMAGE, width: 1200, height: 630 },
    author: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
    ...(toolMeta?.tags?.length && { keywords: toolMeta.tags.join(', ') }),
  }

  const howToSchema = steps?.length ? {
    '@context': 'https://schema.org',
    '@type':    'HowTo',
    name:       `How to Use ${name}`,
    description: `Step-by-step guide to using the ${name} tool on AWE-OS.`,
    step: steps.map((text, i) => ({
      '@type':    'HowToStep',
      position:   i + 1,
      name:       `Step ${i + 1}`,
      text,
    })),
  } : null

  const faqSchema = faqs?.length ? {
    '@context':  'https://schema.org',
    '@type':     'FAQPage',
    mainEntity:  faqs.map(({ q, a }) => ({
      '@type':         'Question',
      name:            q,
      acceptedAnswer:  { '@type': 'Answer', text: a },
    })),
  } : null

  // Breadcrumb includes category if available
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
    ...(catMeta ? [{ '@type': 'ListItem', position: 3, name: catMeta.name, item: `${SITE_URL}/tools/${catMeta.slug}` }] : []),
    {
      '@type':    'ListItem',
      position:   catMeta ? 4 : 3,
      name,
      item:       pageUrl,
    },
  ]

  const breadcrumbSchema = {
    '@context':      'https://schema.org',
    '@type':         'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={pageUrl} />
        {/* OpenGraph */}
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content={seoTitle} />
        <meta property="og:description"  content={seoDesc} />
        <meta property="og:url"          content={pageUrl} />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content={OG_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content={`${name} — AWE-OS`} />
        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        <meta name="twitter:image"       content={OG_IMAGE} />
        <meta name="twitter:image:alt"   content={`${name} — AWE-OS`} />
        {/* Schema.org */}
        <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
        {howToSchema    && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
        {faqSchema      && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Breadcrumb nav ─────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap">
          <Link to="/"      className="hover:text-gray-700 transition-colors">Home</Link>
          <span aria-hidden>/</span>
          <Link to="/tools" className="hover:text-gray-700 transition-colors">Tools</Link>
          {catMeta && (
            <>
              <span aria-hidden>/</span>
              <Link to={`/tools/${catMeta.slug}`} className="hover:text-gray-700 transition-colors">
                {catMeta.name}
              </Link>
            </>
          )}
          <span aria-hidden>/</span>
          <span className="text-gray-800 font-medium">{name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main column ──────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Tool header */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl shrink-0 leading-none" aria-hidden>{icon}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
                <p className="text-gray-500 mt-1 text-sm leading-relaxed">{description}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full font-medium">
                  ✓ Free · No sign-up · Works in browser
                </span>
              </div>
            </div>

            {/* Ad above tool */}
            <AdBanner size="leaderboard" />

            {/* Tool interface */}
            <section className="mb-10" aria-label={`${name} tool`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Use {name}</h2>
              {children}
            </section>

            {/* How to use */}
            {steps?.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use {name}</h2>
                <ol className="space-y-3">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <p className="text-gray-600 text-sm leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Related tools grid */}
            {relatedTools.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">You Might Also Like</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {relatedTools.slice(0, 4).map(t => (
                    <Link
                      key={t.slug}
                      to={`/tools/${t.slug}`}
                      className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <span className="text-3xl leading-none" aria-hidden>{t.icon || '🛠️'}</span>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>
                    </Link>
                  ))}
                </div>
                {catMeta && (
                  <div className="mt-3 text-right">
                    <Link
                      to={`/tools/${catMeta.slug}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Browse all {catMeta.name} →
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* About section */}
            {about?.length > 0 && (
              <section className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About {name}</h2>
                <div className="space-y-3">
                  {about.map((para, i) => (
                    <p key={i} className="text-gray-600 text-sm leading-relaxed">{para}</p>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ accordion */}
            {faqs?.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-5">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {faqs.map(({ q, a }) => (
                    <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-white hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
                        <span
                          className="text-gray-400 text-xl shrink-0 group-open:rotate-45 transition-transform duration-200"
                          aria-hidden
                        >+</span>
                      </summary>
                      <div className="px-5 pb-4 pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                        {a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

          </main>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className="lg:w-72 shrink-0" aria-label="Sidebar">
            <div className="sticky top-20 space-y-4">

              {/* Sidebar ad */}
              <AdBanner size="rectangle" />

              {/* Share */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <ShareButtons url={pageUrl} title={`Free ${name} — use it on AWE-OS`} />
              </div>

              {/* Embed */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <EmbedCode url={pageUrl} name={name} />
              </div>

              {/* Related tools */}
              {relatedTools.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Tools</h3>
                  <div className="space-y-1">
                    {relatedTools.map(t => (
                      <Link
                        key={t.slug}
                        to={`/tools/${t.slug}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xl shrink-0" aria-hidden>{t.icon || '🛠️'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate transition-colors">
                            {t.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{t.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {catMeta && (
                    <Link
                      to={`/tools/${catMeta.slug}`}
                      className="mt-3 flex items-center justify-center w-full text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
                    >
                      All {catMeta.name} →
                    </Link>
                  )}
                </div>
              )}

              {/* Sign-up CTA */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-blue-900 mb-1">Want more tools?</p>
                <p className="text-xs text-blue-700 mb-3">
                  Create a free account to save your work, access history, and unlock 100+ AI tools.
                </p>
                <Link
                  to="/login"
                  className="inline-block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
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
