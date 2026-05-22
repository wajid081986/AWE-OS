import { useParams, Link } from 'react-router-dom'
import { CITY_PAGES } from '../data/cityPages'

function renderBlock(block, i) {
  switch (block.type) {
    case 'h1': return (
      <h1 key={i} className="text-3xl font-bold text-gray-900 mb-6 leading-tight">{block.text}</h1>
    )
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

export default function CityToolPage() {
  const { toolSlug, city } = useParams()

  const page = CITY_PAGES.find(p =>
    p.slug === `${toolSlug}/${city}` ||
    (p.toolSlug === toolSlug &&
      (p.cityName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === city)
  )

  const cityLabel  = (city || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const toolLabel  = (toolSlug || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  if (!page) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🏙️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{toolLabel} for {cityLabel}</h1>
        <p className="text-gray-500 mb-8">This city-specific page is being prepared — check back soon.</p>
        <div className="flex gap-4 justify-center">
          <Link to={`/tools/${toolSlug}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Use {toolLabel} Free →
          </Link>
          <Link to="/tools" className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors">
            All Tools
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link to="/tools" className="hover:text-indigo-600">Tools</Link>
        <span>/</span>
        <Link to={`/tools/${toolSlug}`} className="hover:text-indigo-600 capitalize">{toolLabel}</Link>
        <span>/</span>
        <span className="text-gray-800 capitalize">{cityLabel}</span>
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

      {/* CTA */}
      <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900 mb-1">Try {toolLabel} — 100% Free</p>
          <p className="text-sm text-gray-600">No signup required. Works in your browser.</p>
        </div>
        <Link
          to={`/tools/${toolSlug}`}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Open Free Tool →
        </Link>
      </div>
    </main>
  )
}
