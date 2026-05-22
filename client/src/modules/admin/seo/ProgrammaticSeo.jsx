import { useState } from 'react'
import { TOOL_REGISTRY } from '../../../data/toolRegistry'
import api from '../../../services/api.service'

const CITIES        = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']
const FAQ_CATS      = ['PDF', 'Calculators', 'AI Tools', 'Converters', 'Productivity']

const PAGE_TYPES = [
  {
    id:       'comparison',
    icon:     '⚖️',
    title:    'Tool vs Tool Comparison',
    desc:     'Generate: /compare/[tool-a]-vs-[tool-b]',
    example:  'e.g. Merge PDF vs Split PDF',
    minWords: '800 words + comparison table',
  },
  {
    id:       'city',
    icon:     '🏙️',
    title:    'City-Specific Tool Page',
    desc:     'Generate: /tools/[tool]/[city]',
    example:  'e.g. GST Calculator for Mumbai businesses',
    minWords: '600 words + local examples',
  },
  {
    id:       'faq-category',
    icon:     '❓',
    title:    'Category FAQ Page',
    desc:     'Generate: /faq/[category]',
    example:  'e.g. PDF Tools FAQ — 10 comprehensive answers',
    minWords: '1000 words + 10 FAQs',
  },
]

function ContentPreview({ content, faqs }) {
  return (
    <div className="space-y-3 text-sm">
      {(content || []).map((block, i) => {
        if (block.type === 'h1') return (
          <h1 key={i} className="text-lg font-bold text-white">{block.text}</h1>
        )
        if (block.type === 'h2') return (
          <h2 key={i} className="text-base font-semibold text-indigo-300 mt-4">{block.text}</h2>
        )
        if (block.type === 'p') return (
          <p key={i} className="text-gray-400 leading-relaxed">{block.text}</p>
        )
        if (block.type === 'table') return (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {(block.headers || []).map((h, j) => (
                    <th key={j} className="bg-gray-700 text-gray-300 px-3 py-2 text-left border border-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(block.rows || []).map((row, j) => (
                  <tr key={j} className="even:bg-gray-800/50">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2 border border-gray-700 text-gray-400">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        return null
      })}
      {(faqs || []).length > 0 && (
        <div className="mt-4 space-y-3">
          <h2 className="text-base font-semibold text-indigo-300">FAQs</h2>
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-700 rounded-lg p-3">
              <p className="text-white font-medium text-sm">{faq.q}</p>
              <p className="text-gray-400 text-sm mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProgrammaticSeo() {
  const [selectedType,  setSelectedType]  = useState(null)
  const [form,          setForm]          = useState({})
  const [generating,    setGenerating]    = useState(false)
  const [generatedPage, setGeneratedPage] = useState(null)
  const [error,         setError]         = useState(null)
  const [publishedPages, setPublishedPages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_programmatic_pages') || '[]') } catch { return [] }
  })

  const activeTools = TOOL_REGISTRY.filter(t => !t.comingSoon)

  function selectType(id) {
    setSelectedType(id)
    setForm({})
    setGeneratedPage(null)
    setError(null)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setGeneratedPage(null)
    try {
      const res = await api.post('/api/admin/seo/generate-programmatic', {
        pageType:     selectedType,
        tool1Slug:    form.tool1Slug    || '',
        tool2Slug:    form.tool2Slug    || '',
        tool1Name:    form.tool1Name    || '',
        tool2Name:    form.tool2Name    || '',
        cityName:     form.cityName     || '',
        categoryName: form.categoryName || '',
      })
      if (res.data.success) setGeneratedPage(res.data.page)
      else setError(res.data.error || 'Generation failed')
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function handlePublish() {
    if (!generatedPage) return
    const pathPrefix = selectedType === 'comparison' ? 'compare'
                     : selectedType === 'city'       ? 'tools'
                     :                                 'faq'
    const record = {
      type:      selectedType,
      title:     generatedPage.title || generatedPage.slug,
      slug:      generatedPage.slug,
      url:       `https://awe-os.com/${pathPrefix}/${generatedPage.slug}`,
      date:      new Date().toISOString().split('T')[0],
      wordCount: generatedPage.wordCount || 0,
    }
    const updated = [record, ...publishedPages]
    setPublishedPages(updated)
    localStorage.setItem('awe_programmatic_pages', JSON.stringify(updated))
    setGeneratedPage(null)
    setSelectedType(null)
    setForm({})
  }

  function handleDelete(slug) {
    const updated = publishedPages.filter(p => p.slug !== slug)
    setPublishedPages(updated)
    localStorage.setItem('awe_programmatic_pages', JSON.stringify(updated))
  }

  const canGenerate =
    selectedType === 'comparison'  ? !!(form.tool1Slug && form.tool2Slug && form.tool1Slug !== form.tool2Slug) :
    selectedType === 'city'        ? !!(form.tool1Slug && form.cityName) :
    selectedType === 'faq-category'? !!(form.categoryName) :
    false

  const wordCount     = generatedPage?.wordCount || 0
  const qualityOk     = wordCount >= 600

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Programmatic SEO</h1>

      {/* Quality warning */}
      <div className="flex items-start gap-3 bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
        <span className="text-yellow-400 text-lg shrink-0">⚡</span>
        <div>
          <p className="text-yellow-300 font-medium text-sm">Quality First</p>
          <p className="text-yellow-200/80 text-sm">All generated pages must be 600+ words with genuine value. No thin content.</p>
        </div>
      </div>

      {/* Page type cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Select Page Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PAGE_TYPES.map(pt => (
            <div
              key={pt.id}
              onClick={() => selectType(pt.id)}
              className={`cursor-pointer rounded-xl border p-5 transition-all ${
                selectedType === pt.id
                  ? 'border-indigo-500 bg-indigo-900/30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-3">{pt.icon}</div>
              <h3 className="text-white font-semibold mb-1 text-sm">{pt.title}</h3>
              <p className="text-indigo-400 text-xs mb-1">{pt.desc}</p>
              <p className="text-gray-500 text-xs mb-3">{pt.example}</p>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">Min: {pt.minWords}</span>
              {selectedType === pt.id && (
                <div className="mt-3">
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">✓ Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      {selectedType && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            {selectedType === 'comparison'   ? 'Configure Comparison Page' :
             selectedType === 'city'         ? 'Configure City Page' :
                                              'Configure FAQ Page'}
          </h2>

          {selectedType === 'comparison' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tool 1</label>
                <select
                  value={form.tool1Slug || ''}
                  onChange={e => {
                    const t = activeTools.find(t => t.slug === e.target.value)
                    setForm(prev => ({ ...prev, tool1Slug: e.target.value, tool1Name: t?.name || '' }))
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Tool 1</option>
                  {activeTools.map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tool 2</label>
                <select
                  value={form.tool2Slug || ''}
                  onChange={e => {
                    const t = activeTools.find(t => t.slug === e.target.value)
                    setForm(prev => ({ ...prev, tool2Slug: e.target.value, tool2Name: t?.name || '' }))
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Tool 2</option>
                  {activeTools
                    .filter(t => t.slug !== form.tool1Slug)
                    .map(t => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                </select>
              </div>
              {form.tool1Slug && form.tool2Slug && form.tool1Slug !== form.tool2Slug && (
                <div className="md:col-span-2 text-xs text-gray-500">
                  Preview URL: /compare/{form.tool1Slug}-vs-{form.tool2Slug}
                </div>
              )}
            </div>
          )}

          {selectedType === 'city' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tool</label>
                <select
                  value={form.tool1Slug || ''}
                  onChange={e => {
                    const t = activeTools.find(t => t.slug === e.target.value)
                    setForm(prev => ({ ...prev, tool1Slug: e.target.value, tool1Name: t?.name || '' }))
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Tool</option>
                  {activeTools.map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">City</label>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, cityName: city }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.cityName === city
                          ? 'border-indigo-500 bg-indigo-900/50 text-indigo-300'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              {form.tool1Slug && form.cityName && (
                <p className="text-xs text-gray-500">
                  Preview URL: /tools/{form.tool1Slug}/{form.cityName.toLowerCase().replace(/\s+/g, '-')}
                </p>
              )}
            </div>
          )}

          {selectedType === 'faq-category' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {FAQ_CATS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, categoryName: cat }))}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                      form.categoryName === cat
                        ? 'border-indigo-500 bg-indigo-900/50 text-indigo-300'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {form.categoryName && (
                <p className="text-xs text-gray-500 mt-3">
                  Preview URL: /faq/{form.categoryName.toLowerCase().replace(/\s+/g, '-')}-faq
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="mt-6 w-full py-3 rounded-xl font-medium text-white transition-all
              bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating... (may take 30s)
              </span>
            ) : (
              `Generate ${
                selectedType === 'comparison'    ? 'Comparison Page' :
                selectedType === 'city'          ? 'City Page' :
                                                  'FAQ Page'
              }`
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Output section */}
      {generatedPage && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="min-w-0">
              <h2 className="text-white font-semibold">{generatedPage.title}</h2>
              <p className="text-gray-500 text-xs mt-1">/{generatedPage.slug}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full shrink-0 ${
              qualityOk
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : 'bg-red-900/50 text-red-400 border border-red-700'
            }`}>
              {wordCount.toLocaleString()} words
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Meta Title</p>
              <p className="text-sm text-white">{generatedPage.metaTitle}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Meta Description</p>
              <p className="text-sm text-gray-300">{generatedPage.metaDescription}</p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg p-4 mb-4">
            <ContentPreview content={generatedPage.content} faqs={generatedPage.faqs} />
          </div>

          {!qualityOk && (
            <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
              ⚠️ Content is below 600-word minimum. Regenerate for higher quality.
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={!qualityOk}
            className="w-full py-3 rounded-xl font-medium text-white transition-all
              bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🚀 Publish Page
          </button>
        </div>
      )}

      {/* Published pages list */}
      {publishedPages.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Published Pages ({publishedPages.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">URL</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Words</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {publishedPages.map(page => (
                  <tr key={page.slug} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4">
                      <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
                        {page.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-white max-w-[180px]">
                      <span className="line-clamp-1">{page.title}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 text-xs max-w-[200px]">
                      <span className="line-clamp-1">{page.url}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{page.date}</td>
                    <td className="py-3 pr-4">
                      <span className={(page.wordCount || 0) >= 600 ? 'text-green-400' : 'text-red-400'}>
                        {(page.wordCount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-3">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          View Live
                        </a>
                        <button
                          onClick={() => handleDelete(page.slug)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
