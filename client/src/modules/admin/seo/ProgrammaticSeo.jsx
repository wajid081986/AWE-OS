import { useState, useRef } from 'react'
import { TOOL_REGISTRY } from '../../../data/toolRegistry'
import { CITY_PAGES } from '../../../data/cityPages'
import api from '../../../services/api.service'

const INDIAN_CITIES = [
  'Mumbai',       'Delhi',        'Bengaluru',    'Hyderabad',    'Chennai',
  'Pune',         'Kolkata',      'Ahmedabad',    'Jaipur',       'Surat',
  'Lucknow',      'Kanpur',       'Nagpur',       'Indore',       'Bhopal',
  'Chandigarh',   'Kochi',        'Coimbatore',   'Visakhapatnam','Patna',
]

const FAQ_CATS = ['PDF', 'Calculators', 'AI Tools', 'Converters', 'Productivity']

const BULK_TOOLS = [
  { slug: 'sip-calculator',  name: 'SIP Calculator'  },
  { slug: 'bmi-calculator',  name: 'BMI Calculator'  },
  { slug: 'loan-calculator', name: 'Loan Calculator'  },
  { slug: 'tax-calculator',  name: 'Tax Calculator'   },
  { slug: 'gst-calculator',  name: 'GST Calculator'   },
  { slug: 'fd-calculator',   name: 'FD Calculator'    },
  { slug: 'ppf-calculator',  name: 'PPF Calculator'   },
  { slug: 'roi-calculator',  name: 'ROI Calculator'   },
]

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
    minWords: '1200 words + local examples',
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

function toSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

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
  const [selectedType,    setSelectedType]    = useState(null)
  const [form,            setForm]            = useState({})
  const [selectedCities,  setSelectedCities]  = useState([])
  const [customCityInput, setCustomCityInput] = useState('')
  const [showCustom,      setShowCustom]      = useState(false)
  const [generating,      setGenerating]      = useState(false)
  const [publishing,      setPublishing]      = useState(false)
  const [generatedPage,   setGeneratedPage]   = useState(null)
  const [error,           setError]           = useState(null)
  const [bulkProgress,    setBulkProgress]    = useState({
    isRunning: false, total: 0, completed: 0, current: '', results: [], errors: [],
  })
  const [isPaused,        setIsPaused]        = useState(false)
  const [bulkMode,        setBulkMode]        = useState(false)
  const [selectedBulkTools, setSelectedBulkTools] = useState([])
  const [publishedPages,  setPublishedPages]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_programmatic_pages') || '[]') } catch { return [] }
  })
  const pauseRef = useRef(false)

  const activeTools = TOOL_REGISTRY.filter(t => !t.comingSoon)

  // ── Type selection ──────────────────────────────────────────────────────────

  function selectType(id) {
    setSelectedType(id)
    setForm({})
    setSelectedCities([])
    setGeneratedPage(null)
    setError(null)
    setBulkProgress({ isRunning: false, total: 0, completed: 0, current: '', results: [], errors: [] })
    setIsPaused(false)
    pauseRef.current = false
  }

  // ── City helpers ────────────────────────────────────────────────────────────

  function toggleCity(city) {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  function addCustomCities() {
    const parsed = customCityInput
      .split(/[,\n]/)
      .map(c => c.trim())
      .filter(Boolean)
    if (parsed.length === 0) return
    setSelectedCities(prev => [...new Set([...prev, ...parsed])])
    setCustomCityInput('')
    setShowCustom(false)
  }

  function removeCity(city) {
    setSelectedCities(prev => prev.filter(c => c !== city))
  }

  // ── Save published page ─────────────────────────────────────────────────────

  function savePublishedRecord(record) {
    setPublishedPages(prev => {
      const updated = [record, ...prev]
      localStorage.setItem('awe_programmatic_pages', JSON.stringify(updated))
      return updated
    })
  }

  function handleDelete(slug) {
    setPublishedPages(prev => {
      const updated = prev.filter(p => p.slug !== slug)
      localStorage.setItem('awe_programmatic_pages', JSON.stringify(updated))
      return updated
    })
  }

  // ── Single generate (comparison + faq) ─────────────────────────────────────

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
        cityName:     '',
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

  async function handlePublish() {
    if (!generatedPage) return
    setPublishing(true)
    setError(null)
    try {
      const endpoint = selectedType === 'comparison'
        ? '/api/admin/seo/publish-comparison'
        : '/api/admin/seo/publish-faq'
      const res = await api.post(endpoint, { page: generatedPage, slug: generatedPage.slug })
      if (!res.data.success) throw new Error(res.data.error || 'Publish failed')

      const pathPrefix = selectedType === 'comparison' ? 'compare' : 'faq'
      savePublishedRecord({
        type:      selectedType,
        title:     generatedPage.title || generatedPage.slug,
        slug:      generatedPage.slug,
        url:       `https://awe-os.com/${pathPrefix}/${generatedPage.slug}`,
        date:      new Date().toISOString().split('T')[0],
        wordCount: generatedPage.wordCount || 0,
      })
      setGeneratedPage(null)
      setSelectedType(null)
      setForm({})
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  // ── Bulk generation (city) ──────────────────────────────────────────────────

  async function runBulkForCities(cities, overrideToolSlug, overrideToolName) {
    const toolSlug = overrideToolSlug || form.tool1Slug
    const toolName = overrideToolName || form.tool1Name || ''
    if (!toolSlug || cities.length === 0) return

    pauseRef.current = false
    setIsPaused(false)
    setBulkProgress({
      isRunning: true, total: cities.length, completed: 0,
      current: '', results: [], errors: [],
    })

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i]

      // Pause check — waits here until unpaused
      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 500))
      }

      setBulkProgress(prev => ({ ...prev, current: city }))

      try {
        const genRes = await api.post('/api/admin/seo/generate-programmatic', {
          pageType: 'city', tool1Slug: toolSlug, tool1Name: toolName, cityName: city,
        })

        if (!genRes.data.success) throw new Error(genRes.data.error || 'Generation failed')

        const page = genRes.data.page
        const slug = `${toolSlug}/${toSlug(city)}`

        if ((page.wordCount || 0) >= 1200) {
          // Attempt GitHub publish (non-fatal on failure)
          try {
            await api.post('/api/admin/seo/publish-programmatic', { page, slug })
          } catch (publishErr) {
            console.warn('[bulk] GitHub publish error for', city, publishErr.message)
          }

          savePublishedRecord({
            type:      'city',
            title:     page.title || `${toolName || toolSlug} for ${city}`,
            slug:      page.slug || slug,
            url:       `https://awe-os.com/${slug}`,
            date:      new Date().toISOString().split('T')[0],
            wordCount: page.wordCount || 0,
          })

          setBulkProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
            results: [...prev.results, {
              city, status: 'published',
              url:      `/${slug}`,
              wordCount: page.wordCount,
            }],
          }))
        } else {
          setBulkProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
            errors: [...prev.errors, {
              city,
              slug:          `${toolSlug}/${toSlug(city)}`,
              reason:        `Below 1200 words (got ${page.wordCount || 0})`,
              generatedData: page,
              wordCount:     page.wordCount || 0,
              status:        'word_count_fail',
            }],
          }))
        }
      } catch (err) {
        setBulkProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
          errors: [...prev.errors, { city, reason: err.message || 'Request failed' }],
        }))
      }

      if (i < cities.length - 1) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    setBulkProgress(prev => ({ ...prev, isRunning: false, current: '' }))
  }

  function generateBulk() {
    runBulkForCities(selectedCities)
  }

  function retryFailed() {
    const failedCities = bulkProgress.errors.map(e => e.city)
    if (failedCities.length > 0) runBulkForCities(failedCities)
  }

  async function runMultiToolBulk() {
    const tools = selectedBulkTools
    if (!tools.length || !selectedCities.length) return
    const total = tools.length * selectedCities.length
    pauseRef.current = false
    setIsPaused(false)
    setBulkProgress({
      isRunning: true, total, completed: 0, current: '',
      results: [], errors: [],
      toolIndex: 1, toolTotal: tools.length, currentTool: tools[0].name,
    })
    let done = 0
    for (let ti = 0; ti < tools.length; ti++) {
      const { slug: toolSlug, name: toolName } = tools[ti]
      setBulkProgress(prev => ({ ...prev, toolIndex: ti + 1, currentTool: toolName }))
      for (let ci = 0; ci < selectedCities.length; ci++) {
        const city = selectedCities[ci]
        while (pauseRef.current) await new Promise(r => setTimeout(r, 500))
        setBulkProgress(prev => ({ ...prev, current: `${toolName} — ${city}` }))
        try {
          const genRes = await api.post('/api/admin/seo/generate-programmatic', {
            pageType: 'city', tool1Slug: toolSlug, tool1Name: toolName, cityName: city,
          })
          if (!genRes.data.success) throw new Error(genRes.data.error || 'Generation failed')
          const page = genRes.data.page
          const slug = `${toolSlug}/${toSlug(city)}`
          if ((page.wordCount || 0) >= 1200) {
            try { await api.post('/api/admin/seo/publish-programmatic', { page, slug }) } catch {}
            savePublishedRecord({
              type: 'city', title: page.title || `${toolName} for ${city}`,
              slug: page.slug || slug, url: `https://awe-os.com/${slug}`,
              date: new Date().toISOString().split('T')[0], wordCount: page.wordCount || 0,
            })
            done++
            setBulkProgress(prev => ({
              ...prev, completed: done,
              results: [...prev.results, { city, tool: toolName, status: 'published', url: `/${slug}`, wordCount: page.wordCount }],
            }))
          } else {
            done++
            setBulkProgress(prev => ({
              ...prev, completed: done,
              errors: [...prev.errors, { city, tool: toolName, slug, reason: `Below 1200 words (got ${page.wordCount || 0})`, wordCount: page.wordCount || 0 }],
            }))
          }
        } catch (err) {
          done++
          setBulkProgress(prev => ({
            ...prev, completed: done,
            errors: [...prev.errors, { city, tool: toolName, reason: err.message || 'Request failed' }],
          }))
        }
        await new Promise(r => setTimeout(r, 500))
      }
    }
    setBulkProgress(prev => ({ ...prev, isRunning: false, current: '', currentTool: '' }))
  }

  async function regenerateLowQuality() {
    const low = CITY_PAGES.filter(p => (p.wordCount || 0) < 1200)
    if (!low.length) return
    // Group by toolSlug → run bulk sequentially per tool
    // Derive toolSlug/cityName from slug for existing entries that predate the metadata fields
    const byTool = {}
    for (const p of low) {
      const parts = (p.slug || '').split('/')
      const ts = p.toolSlug || parts[0] || ''
      const tn = p.toolName || ts
      const cn = p.cityName || (parts[1] || '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
      if (!ts || !cn) continue
      if (!byTool[ts]) byTool[ts] = { toolName: tn, cities: [] }
      byTool[ts].cities.push(cn)
    }
    for (const [ts, { toolName: tn, cities }] of Object.entries(byTool)) {
      await runBulkForCities(cities, ts, tn)
    }
  }

  async function handleManualAccept(err) {
    const { city, slug: errSlug, generatedData } = err
    setBulkProgress(prev => ({
      ...prev,
      errors: prev.errors.map(e => e.city === city ? { ...e, status: 'publishing' } : e),
    }))
    try {
      await api.post('/api/admin/seo/publish-programmatic', {
        page: generatedData, slug: errSlug, force: true,
      })
      setBulkProgress(prev => ({
        ...prev,
        errors:  prev.errors.map(e => e.city === city ? { ...e, status: 'published' } : e),
        results: [...prev.results, { city, status: 'published', url: `/${errSlug}`, wordCount: err.wordCount }],
      }))
      savePublishedRecord({
        type:      'city',
        title:     generatedData.title || `Tool for ${city}`,
        slug:      errSlug,
        url:       `https://awe-os.com/${errSlug}`,
        date:      new Date().toISOString().split('T')[0],
        wordCount: err.wordCount || 0,
      })
    } catch (e) {
      setBulkProgress(prev => ({
        ...prev,
        errors: prev.errors.map(er => er.city === city ? { ...er, status: 'force_failed', reason: e.message } : er),
      }))
    }
  }

  function handleManualReject(err) {
    setBulkProgress(prev => ({
      ...prev,
      errors: prev.errors.map(e => e.city === err.city ? { ...e, status: 'skipped' } : e),
    }))
  }

  function pauseResume() {
    if (isPaused) {
      pauseRef.current = false
      setIsPaused(false)
    } else {
      pauseRef.current = true
      setIsPaused(true)
    }
  }

  function copyAllUrls() {
    const urls = bulkProgress.results
      .map(r => `https://awe-os.com${r.url}`)
      .join('\n')
    navigator.clipboard.writeText(urls).catch(() => {})
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const canGenerate =
    selectedType === 'comparison'    ? !!(form.tool1Slug && form.tool2Slug && form.tool1Slug !== form.tool2Slug) :
    selectedType === 'city'          ? (bulkMode ? !!(selectedBulkTools.length && selectedCities.length) : !!(form.tool1Slug && selectedCities.length > 0)) :
    selectedType === 'faq-category'  ? !!(form.categoryName) :
    false

  const wordCount     = generatedPage?.wordCount || 0
  const qualityGreen  = wordCount >= 1200
  const qualityYellow = wordCount >= 800 && wordCount < 1200
  const qualityRed    = wordCount > 0 && wordCount < 800
  const qualityOk     = wordCount >= 800   // can publish at 800+
  const lowQualityPages = CITY_PAGES.filter(p => (p.wordCount || 0) < 1200)

  const cityUrlPreviews = form.tool1Slug
    ? selectedCities.map(city => `/${form.tool1Slug}/${toSlug(city)}`)
    : []

  const customCities = selectedCities.filter(c => !INDIAN_CITIES.includes(c))

  // City status map for progress UI
  const cityStatusMap = selectedCities.reduce((acc, city) => {
    const result  = bulkProgress.results.find(r => r.city === city)
    const err     = bulkProgress.errors.find(e => e.city === city)
    const current = bulkProgress.current === city
    if (result) {
      acc[city] = { icon: '✅', detail: `published → ${result.url}`, cls: 'text-green-400' }
    } else if (err) {
      if (err.status === 'publishing')   acc[city] = { icon: '⏳', detail: 'publishing...', cls: 'text-blue-400' }
      else if (err.status === 'published')  acc[city] = { icon: '✅', detail: 'force published', cls: 'text-green-400' }
      else if (err.status === 'skipped')    acc[city] = { icon: '⏭️', detail: 'manually skipped', cls: 'text-gray-400' }
      else if (err.status === 'force_failed') acc[city] = { icon: '❌', detail: err.reason, cls: 'text-red-400' }
      else if (err.generatedData && (err.wordCount || 0) >= 1100)
        acc[city] = { icon: '⚠️', detail: `${err.wordCount} words — decide below`, cls: 'text-yellow-400' }
      else acc[city] = { icon: '❌', detail: err.reason, cls: 'text-red-400' }
    } else if (current) {
      acc[city] = { icon: '⏳', detail: 'generating...', cls: 'text-yellow-400' }
    } else {
      acc[city] = { icon: isPaused ? '⏸️' : '⬜', detail: 'waiting', cls: 'text-gray-500' }
    }
    return acc
  }, {})

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Programmatic SEO</h1>

      {/* Quality warning */}
      <div className="flex items-start gap-3 bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
        <span className="text-yellow-400 text-lg shrink-0">⚡</span>
        <div>
          <p className="text-yellow-300 font-medium text-sm">Quality First</p>
          <p className="text-yellow-200/80 text-sm">All city pages require 1200+ words for best SEO. 800–1199 words is acceptable. Below 800 is rejected.</p>
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
            {selectedType === 'comparison'    ? 'Configure Comparison Page' :
             selectedType === 'city'          ? 'Configure City Pages' :
                                               'Configure FAQ Page'}
          </h2>

          {/* ── Comparison form ── */}
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
                  {activeTools.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
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
                  {activeTools.filter(t => t.slug !== form.tool1Slug)
                    .map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>
              </div>
              {form.tool1Slug && form.tool2Slug && form.tool1Slug !== form.tool2Slug && (
                <div className="md:col-span-2 text-xs text-gray-500">
                  Preview URL: /compare/{form.tool1Slug}-vs-{form.tool2Slug}
                </div>
              )}
            </div>
          )}

          {/* ── City form ── */}
          {selectedType === 'city' && (
            <div className="space-y-5">

              {/* Bulk Mode toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setBulkMode(prev => !prev); setSelectedBulkTools([]) }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${bulkMode ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${bulkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-300">
                  Bulk Mode {bulkMode ? <span className="text-indigo-400 font-medium">ON — Multi-Tool</span> : <span className="text-gray-500">OFF — Single Tool</span>}
                </span>
              </div>

              {/* Tool select (single mode) */}
              {!bulkMode && (
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
                  {activeTools.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>
              </div>
              )}

              {/* Tool checkboxes (bulk mode) */}
              {bulkMode && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">
                    Select Tools
                    {selectedBulkTools.length > 0 && (
                      <span className="ml-2 text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full">
                        {selectedBulkTools.length} selected
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedBulkTools(BULK_TOOLS)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Select All Calculators
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BULK_TOOLS.map(t => {
                    const checked = selectedBulkTools.some(s => s.slug === t.slug)
                    return (
                      <label key={t.slug} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedBulkTools(prev =>
                            checked ? prev.filter(s => s.slug !== t.slug) : [...prev, t]
                          )}
                          className="accent-indigo-500"
                        />
                        <span className="text-sm">{t.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              )}

              {/* Multi-select cities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">
                    Cities
                    {selectedCities.length > 0 && (
                      <span className="ml-2 text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full">
                        {selectedCities.length} selected
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCities(INDIAN_CITIES)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCities([])}
                      className="text-xs text-gray-500 hover:text-gray-300 underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INDIAN_CITIES.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleCity(city)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                        selectedCities.includes(city)
                          ? 'border-indigo-500 bg-indigo-900/50 text-indigo-300'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {selectedCities.includes(city) && <span className="text-indigo-400">✓</span>}
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom city chips (from CSV input) */}
              {customCities.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Custom cities:</p>
                  <div className="flex flex-wrap gap-2">
                    {customCities.map(city => (
                      <span key={city} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-purple-700 bg-purple-900/30 text-purple-300">
                        {city}
                        <button
                          type="button"
                          onClick={() => removeCity(city)}
                          className="text-purple-400 hover:text-purple-200 ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CSV / paste input (collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCustom(prev => !prev)}
                  className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                  <span>{showCustom ? '▾' : '▸'}</span>
                  + Add custom cities (paste or CSV)
                </button>
                {showCustom && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={customCityInput}
                      onChange={e => setCustomCityInput(e.target.value)}
                      rows={4}
                      placeholder={`Paste city names separated by comma or newline:\nNoida, Gurgaon, Faridabad\nOR one per line`}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm resize-none placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomCities}
                      className="text-sm bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add Cities
                    </button>
                  </div>
                )}
              </div>

              {/* URL preview list */}
              {form.tool1Slug && selectedCities.length > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">
                    Pages that will be generated ({selectedCities.length} pages):
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {cityUrlPreviews.map(url => (
                      <p key={url} className="text-xs text-indigo-400 font-mono">{url}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Low-quality pages warning */}
              {lowQualityPages.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4">
                  <p className="text-yellow-300 text-sm font-medium mb-2">
                    ⚠️ {lowQualityPages.length} existing {lowQualityPages.length === 1 ? 'page has' : 'pages have'} less than 1200 words.
                    Regenerate them for better SEO performance.
                  </p>
                  <button
                    type="button"
                    onClick={regenerateLowQuality}
                    disabled={bulkProgress.isRunning}
                    className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🔄 Regenerate {lowQualityPages.length} Low-Quality {lowQualityPages.length === 1 ? 'Page' : 'Pages'}
                  </button>
                </div>
              )}

              {/* Bulk generate button */}
              <button
                onClick={bulkMode ? runMultiToolBulk : generateBulk}
                disabled={bulkMode ? (!selectedBulkTools.length || !selectedCities.length || bulkProgress.isRunning) : (!canGenerate || bulkProgress.isRunning)}
                className="w-full py-3 rounded-xl font-medium text-white transition-all
                  bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkProgress.isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {bulkProgress.currentTool ? `🔄 Tool ${bulkProgress.toolIndex}/${bulkProgress.toolTotal}: ${bulkProgress.currentTool} — ${bulkProgress.current}` : 'Generating...'}
                  </span>
                ) : bulkMode ? (
                  `⚡ Generate [${selectedBulkTools.length} tools × ${selectedCities.length} cities = ${selectedBulkTools.length * selectedCities.length} pages]`
                ) : (
                  `⚡ Generate All ${selectedCities.length || 0} City Pages`
                )}
              </button>
            </div>
          )}

          {/* ── FAQ form ── */}
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

          {/* Single generate button (comparison + faq only) */}
          {selectedType !== 'city' && (
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
                `Generate ${selectedType === 'comparison' ? 'Comparison Page' : 'FAQ Page'}`
              )}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Bulk Progress UI ── */}
      {selectedType === 'city' && (bulkProgress.isRunning || bulkProgress.completed > 0) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Bulk Generation Progress</h2>
            <div className="flex gap-2">
              {bulkProgress.isRunning && (
                <button
                  onClick={pauseResume}
                  className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg"
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
              )}
              {!bulkProgress.isRunning && bulkProgress.results.length > 0 && (
                <button
                  onClick={copyAllUrls}
                  className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg"
                >
                  📋 Copy All URLs
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>
                {bulkProgress.isRunning
                  ? (bulkProgress.toolTotal > 1
                    ? `🔄 Tool ${bulkProgress.toolIndex}/${bulkProgress.toolTotal}: ${bulkProgress.currentTool || ''} — ${bulkProgress.current}`
                    : `Generating: ${bulkProgress.current}`)
                  : 'Complete'}
              </span>
              <span>{bulkProgress.completed} / {bulkProgress.total}</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: bulkProgress.total ? `${(bulkProgress.completed / bulkProgress.total) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Per-city status list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {selectedCities.map(city => {
              const s = cityStatusMap[city] || { icon: '⬜', detail: 'waiting', cls: 'text-gray-500' }
              const err = bulkProgress.errors.find(e => e.city === city)
              const showAcceptUI = err?.generatedData && (err?.wordCount || 0) >= 1100
                && !['publishing', 'published', 'skipped', 'force_failed'].includes(err?.status)
              return (
                <div key={city} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0">{s.icon}</span>
                    <span className="text-white font-medium w-28 shrink-0">{city}</span>
                    <span className={`text-xs ${s.cls} truncate`}>{s.detail}</span>
                  </div>
                  {showAcceptUI && (
                    <div className="ml-7 mt-1 flex items-center gap-2">
                      <span className="text-xs text-yellow-300">⚠️ {err.wordCount} words — Accept anyway?</span>
                      <button
                        onClick={() => handleManualAccept(err)}
                        className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded"
                      >
                        ✅ Accept
                      </button>
                      <button
                        onClick={() => handleManualReject(err)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-0.5 rounded"
                      >
                        ❌ Skip
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary after completion */}
          {!bulkProgress.isRunning && bulkProgress.completed > 0 && (
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm font-medium">
                  ✅ {bulkProgress.results.length} / {bulkProgress.total} pages published
                </span>
                {bulkProgress.errors.length > 0 && (
                  <span className="text-red-400 text-sm">
                    · ❌ {bulkProgress.errors.length} failed
                  </span>
                )}
              </div>
              {bulkProgress.errors.length > 0 && (
                <button
                  onClick={retryFailed}
                  className="text-sm bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                >
                  🔄 Retry {bulkProgress.errors.length} Failed
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Single page output (comparison + faq) ── */}
      {generatedPage && selectedType !== 'city' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="min-w-0">
              <h2 className="text-white font-semibold">{generatedPage.title}</h2>
              <p className="text-gray-500 text-xs mt-1">/{generatedPage.slug}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full shrink-0 ${
              qualityGreen
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : qualityYellow
                ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                : 'bg-red-900/50 text-red-400 border border-red-700'
            }`}>
              {wordCount.toLocaleString()} words {qualityGreen ? '✅' : qualityYellow ? '⚠️' : '❌'}
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

          {wordCount > 0 && !qualityGreen && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${
              qualityRed
                ? 'bg-red-900/30 border border-red-800 text-red-300'
                : 'bg-yellow-900/30 border border-yellow-800 text-yellow-300'
            }`}>
              {qualityRed
                ? '❌ Content is below 800 words — cannot publish. Regenerate for higher quality.'
                : '⚠️ Content is 800–1199 words (acceptable). Regenerate for 1200+ words for best SEO performance.'}
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={wordCount < 800 || publishing}
            className="w-full py-3 rounded-xl font-medium text-white transition-all
              bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing to GitHub…
              </span>
            ) : '🚀 Publish Page'}
          </button>
        </div>
      )}

      {/* ── Published pages list ── */}
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
                      <span className={(page.wordCount || 0) >= 1200 ? 'text-green-400' : (page.wordCount || 0) >= 800 ? 'text-yellow-400' : 'text-red-400'}>
                        {(page.wordCount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-3">
                        <a href={page.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300">View Live</a>
                        <button onClick={() => handleDelete(page.slug)}
                          className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
