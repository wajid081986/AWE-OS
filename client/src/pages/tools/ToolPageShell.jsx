/**
 * ToolPageShell — universal layout wrapper for every dedicated tool page.
 *
 * Provides:
 *   - React Helmet meta (title, description, canonical)
 *   - Schema.org JSON-LD: SoftwareApplication + HowTo + BreadcrumbList
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
import Callout                 from '../../components/primitives/Callout'
import {
  getToolBySlug,
  getCategoryMeta,
  getRelatedTools,
  getApplicationCategory,
} from '../../data/toolRegistry'
import { TOOL_GUIDE } from '../../data/toolGuideContent'
import { useTrackToolView } from '../../hooks/useTrackToolView'

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

// ── Author / testing trust box — shared across every tool page, no per-tool
// prop, matches docs/reference/tool-page-merge-pdf.html's .authorbox ────────
function AuthorBox() {
  return (
    <div className="flex gap-4 items-start bg-card border border-line rounded-m p-5 mt-9 mb-2">
      <span
        aria-hidden
        className="shrink-0 w-12 h-12 rounded-full bg-cobalt-tint text-cobalt grid place-items-center font-bold"
      >
        A
      </span>
      <div>
        <p className="font-semibold text-ink text-sm">Built &amp; maintained by Team AWE-OS</p>
        <p className="text-ink-soft text-sm mt-1 leading-relaxed">
          This tool is developed in-house and manually re-tested on Chrome, Firefox, Edge, and Safari
          after every update, following our{' '}
          <Link to="/tool-testing-policy" className="text-cobalt hover:underline">tool testing policy</Link>.
          Found a bug?{' '}
          <Link to="/contact" className="text-cobalt hover:underline">Tell us</Link> — fixes are usually
          shipped within days.
        </p>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────
export default function ToolPageShell({ slug, name, description, icon, steps, faqs, about, limitation, children }) {
  // Resolve tool and category metadata from the registry
  const toolMeta = getToolBySlug(slug)
  const catMeta  = toolMeta ? getCategoryMeta(toolMeta.category) : null
  const guide    = TOOL_GUIDE[slug] || null
  // getRelatedTools is a pure sync lookup over the static registry — computed
  // directly during render (not via useEffect+setState) so SSR and the first
  // client render produce identical output. The previous effect-driven
  // version fired a post-mount setState that raced React's Suspense-boundary
  // hydration (needed for Batch 5.6's hydrateRoot switch), throwing "This
  // Suspense boundary received an update before it finished hydrating" and
  // forcing a full client-only re-render on every tool page. See
  // docs/batches/batch-5.6-ssg-hydration.md.
  const relatedTools = toolMeta ? getRelatedTools(toolMeta, 5) : []

  useTrackToolView(slug)

  useEffect(() => {
    window.scrollTo(0, 0)
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

  const CATEGORY_DATES = {
    pdf:          { published: '2024-01-15', modified: '2026-03-01' },
    calculators:  { published: '2024-05-01', modified: '2026-04-15' },
    converters:   { published: '2024-08-01', modified: '2026-05-01' },
    productivity: { published: '2025-01-10', modified: '2026-05-15' },
    ai:           { published: '2025-03-01', modified: '2026-05-20' },
    finance:      { published: '2025-06-01', modified: '2026-06-01' },
  }
  const catDates = CATEGORY_DATES[toolMeta?.category] ?? { published: '2024-01-01', modified: '2026-06-01' }
  // Explicit locale + UTC avoids server/client locale drift, which would
  // otherwise mismatch the SSG HTML and trip a hydration error (see
  // docs/batches/batch-5.6-ssg-hydration.md).
  const updatedLabel = new Date(`${catDates.modified}T00:00:00Z`)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  const articleSchema = {
    '@context':        'https://schema.org',
    '@type':           'Article',
    headline:          `${name} — Free Online Tool | Complete Guide`,
    description:       seoDesc,
    url:               pageUrl,
    image:             OG_IMAGE,
    author:            { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name:    'AWE-OS',
      url:     SITE_URL,
      logo:    { '@type': 'ImageObject', url: `${SITE_URL}/og-image.svg` },
    },
    datePublished:     catDates.published,
    dateModified:      catDates.modified,
    mainEntityOfPage:  { '@type': 'WebPage', '@id': pageUrl },
  }

  // Collect all FAQs from both the `faqs` prop and `about.faqs` for the JSON-LD schema
  const allFaqsForSchema = [
    ...(faqs || []),
    ...((about && !Array.isArray(about) && about.faqs) ? about.faqs : []),
  ]
  const faqSchema = allFaqsForSchema.length > 0 ? {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: allFaqsForSchema.map(({ q, a }) => ({
      '@type':         'Question',
      name:            q,
      acceptedAnswer:  { '@type': 'Answer', text: a },
    })),
  } : null

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
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
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
                <span className="block mt-2 font-mono text-xs text-ink-soft">
                  Last updated: <b className="text-marigold">{updatedLabel}</b> · Tested on Chrome, Firefox, Edge, Safari
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

            {/* About section — handles legacy string[] and new structured object */}
            {about && (Array.isArray(about) ? about.length > 0 : (about.whatIsIt || about.description || about.howToUse?.length)) && (
              Array.isArray(about) ? (
                <section className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">About {name}</h2>
                  <div className="space-y-3">
                    {about.map((para, i) => (
                      <p key={i} className="text-gray-600 text-sm leading-relaxed">{para}</p>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="mb-10 space-y-4">
                  {(about.description || about.whatIsIt) && (
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">About {name}</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">{about.description || about.whatIsIt}</p>
                    </div>
                  )}
                  {about.features?.length > 0 && (
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                      <h2 className="text-base font-semibold text-gray-900 mb-3">Key Features</h2>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {about.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-blue-500 font-bold shrink-0 mt-0.5">✦</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {about.useCases?.length > 0 && (
                    <div className="p-5 bg-purple-50 rounded-xl border border-purple-200">
                      <h2 className="text-base font-semibold text-gray-900 mb-3">Who Should Use This Tool</h2>
                      <ul className="space-y-2">
                        {about.useCases.map((u, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-purple-500 font-bold shrink-0 mt-0.5">→</span>
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {about.howToUse?.length > 0 && (
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                      <h2 className="text-base font-semibold text-gray-900 mb-3">How to Use {name}</h2>
                      <ol className="space-y-2 list-decimal list-inside">
                        {about.howToUse.map((step, i) => (
                          <li key={i} className="text-gray-600 text-sm leading-relaxed">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {about.whyUseUs?.length > 0 && (
                    <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                      <h2 className="text-base font-semibold text-gray-900 mb-3">Why Choose AWE-OS {name}</h2>
                      <ul className="space-y-2">
                        {about.whyUseUs.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {about.faqs?.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
                      <div className="space-y-3">
                        {about.faqs.map((faq, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{faq.q}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )
            )}

            {/* Honest limitation callout — only when supplied, no placeholder */}
            {limitation && (
              <Callout variant="warning" className="mb-10">
                <><strong>Honest limitation:</strong> {limitation}</>
              </Callout>
            )}

            {/* Tips & Best Practices */}
            {guide?.tips?.length > 0 && (
              <section className="mb-10 p-5 bg-amber-50 rounded-xl border border-amber-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tips &amp; Best Practices for {name}</h2>
                <ul className="space-y-3">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="text-amber-500 shrink-0 mt-0.5 font-bold">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Mid-content ad */}
            <AdBanner size="leaderboard" />

            {/* Common Mistakes to Avoid */}
            {guide?.mistakes?.length > 0 && (
              <section className="mb-10 p-5 bg-red-50 rounded-xl border border-red-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Common Mistakes to Avoid with {name}</h2>
                <ul className="space-y-3">
                  {guide.mistakes.map((mistake, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="text-red-500 shrink-0 mt-0.5 font-bold">✕</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
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

            {/* Author / testing trust box */}
            <AuthorBox />

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
