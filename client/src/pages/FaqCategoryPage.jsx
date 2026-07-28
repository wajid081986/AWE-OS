import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FAQ_PAGES } from '../data/faqPages'
import { getCanonicalUrl } from '../utils/canonicalUrl'

function renderBlock(block, i) {
  switch (block.type) {
    case 'h2': return (
      <h2 key={i} className="text-2xl font-bold text-gray-800 mt-10 mb-4">{block.text}</h2>
    )
    case 'p': return (
      <p key={i} className="text-gray-700 leading-relaxed mb-4">{block.text}</p>
    )
    case 'ul': return (
      <ul key={i} className="list-disc list-inside space-y-2 mb-4 text-gray-700">
        {(block.items || []).map((item, j) => <li key={j}>{item}</li>)}
      </ul>
    )
    default: return null
  }
}

export default function FaqCategoryPage() {
  const { slug } = useParams()
  const page = FAQ_PAGES.find(p => p.slug === slug)

  if (!page) return <Navigate to="/404" replace />

  const pageUrl = getCanonicalUrl(`/faq/${page.slug}`)

  // FAQ JSON-LD schema for rich snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (page.faqs || []).map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>{page.metaTitle || page.title}</title>
        {page.metaDescription && <meta name="description" content={page.metaDescription} />}
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title"       content={page.metaTitle || page.title} />
        {page.metaDescription && <meta property="og:description" content={page.metaDescription} />}
        <meta property="og:url"         content={pageUrl} />
        <meta property="og:type"        content="website" />
      </Helmet>

      {/* FAQ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link to="/tools" className="hover:text-indigo-600">Tools</Link>
        {page.category && (
          <>
            <span>/</span>
            <span className="text-gray-500">{page.category}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-800">FAQ</span>
      </nav>

      {/* Page heading */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{page.title}</h1>
      {page.metaDescription && (
        <p className="text-gray-600 text-lg mb-10 leading-relaxed">{page.metaDescription}</p>
      )}

      {/* Optional intro content blocks */}
      {(page.content || []).length > 0 && (
        <section className="mb-10">
          {page.content.map((block, i) => renderBlock(block, i))}
        </section>
      )}

      {/* FAQ accordion */}
      {(page.faqs || []).length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
            <span className="ml-3 text-base font-normal text-gray-400">({page.faqs.length})</span>
          </h2>
          <div className="space-y-3">
            {page.faqs.map((faq, i) => (
              <details key={i} className="bg-gray-50 border border-gray-200 rounded-xl group">
                <summary className="px-5 py-4 cursor-pointer font-medium text-gray-900 select-none list-none flex items-center justify-between gap-3">
                  <span>
                    <span className="text-indigo-500 font-bold mr-2">Q{i + 1}.</span>
                    {faq.q}
                  </span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs shrink-0">▼</span>
                </summary>
                <div className="px-5 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-200 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900 mb-1">
            {page.category ? `Try ${page.category} — 100% Free` : 'All Tools — 100% Free'}
          </p>
          <p className="text-sm text-gray-600">No signup required. Works in your browser.</p>
        </div>
        <Link
          to="/tools"
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Browse All Tools →
        </Link>
      </div>
    </main>
  )
}
