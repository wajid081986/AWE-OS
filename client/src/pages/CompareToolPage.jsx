import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { COMPARISON_PAGES } from '../data/comparisonPages'

function renderBlock(block, i) {
  switch (block.type) {
    case 'h1': return (
      <h1 key={i} className="text-3xl font-bold text-gray-900 mb-6 leading-tight">{block.text}</h1>
    )
    case 'h2': return (
      <h2 key={i} className="text-2xl font-bold text-gray-800 mt-10 mb-4">{block.text}</h2>
    )
    case 'h3': return (
      <h3 key={i} className="text-xl font-semibold text-gray-800 mt-6 mb-3">{block.text}</h3>
    )
    case 'p': return (
      <p key={i} className="text-gray-700 leading-relaxed mb-4">{block.text}</p>
    )
    case 'ul': return (
      <ul key={i} className="list-disc list-inside space-y-2 mb-4 text-gray-700">
        {(block.items || []).map((item, j) => <li key={j}>{item}</li>)}
      </ul>
    )
    case 'callout': return (
      <div key={i} className="my-6 p-5 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-xl">
        <p className="text-gray-800 font-medium">{block.text}</p>
      </div>
    )
    case 'table': return (
      <div key={i} className="overflow-x-auto my-6 rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-indigo-50">
              {(block.headers || []).map((h, j) => (
                <th key={j} className="px-4 py-3 text-left text-gray-800 font-semibold border-b border-gray-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows || []).map((row, j) => (
              <tr key={j} className="even:bg-gray-50">
                {row.map((cell, k) => (
                  <td key={k} className="px-4 py-3 text-gray-700 border-b border-gray-100">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    default: return null
  }
}

export default function CompareToolPage() {
  const { slug } = useParams()
  const page = COMPARISON_PAGES.find(p => p.slug === slug)

  if (!page) return <Navigate to="/404" replace />

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://www.awe-os.com' },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://www.awe-os.com/tools' },
          { '@type': 'ListItem', position: 3, name: page.title, item: `https://www.awe-os.com/compare/${page.slug}` },
        ],
      },
      {
        '@type': 'Article',
        headline:    page.title,
        description: page.metaDescription || '',
        datePublished: page.publishedAt || '',
        author:    { '@type': 'Organization', name: 'AWE-OS' },
        publisher: { '@type': 'Organization', name: 'AWE-OS', url: 'https://www.awe-os.com' },
      },
    ],
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link to="/tools" className="hover:text-indigo-600">Tools</Link>
        <span>/</span>
        <span className="text-gray-800">{page.title}</span>
      </nav>

      {/* Content blocks */}
      <article>
        {(page.content || []).map((block, i) => renderBlock(block, i))}
      </article>

      {/* FAQs */}
      {(page.faqs || []).length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {page.faqs.map((faq, i) => (
              <details key={i} className="bg-gray-50 border border-gray-200 rounded-xl group">
                <summary className="px-5 py-4 cursor-pointer font-medium text-gray-900 select-none list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs ml-2">▼</span>
                </summary>
                <p className="px-5 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-200 pt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related tools */}
      {(page.relatedTools || []).length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Try These Tools</h2>
          <div className="flex flex-wrap gap-3">
            {page.relatedTools.map(tool => (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl text-sm font-medium text-gray-800 transition-colors"
              >
                {tool.icon && <span>{tool.icon}</span>}
                {tool.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900 mb-1">All PDF Tools — 100% Free</p>
          <p className="text-sm text-gray-600">No signup required. Works in your browser.</p>
        </div>
        <Link
          to="/tools/pdf"
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Browse All Tools →
        </Link>
      </div>
    </main>
  )
}
