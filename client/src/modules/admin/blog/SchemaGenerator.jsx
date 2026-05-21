import { useState } from 'react'
import api from '../../../services/api.service'

const SCHEMA_TYPES = [
  { id: 'Article',    label: '📄 Article' },
  { id: 'Tool',       label: '🔧 Tool' },
  { id: 'FAQ',        label: '❓ FAQ' },
  { id: 'HowTo',      label: '📋 HowTo' },
  { id: 'Breadcrumb', label: '🍞 Breadcrumb' },
]

const INITIAL_FORMS = {
  Article: {
    headline:        '',
    description:     '',
    author:          '',
    datePublished:   '',
    dateModified:    '',
    url:             '',
    imageUrl:        '',
  },
  Tool: {
    name:            '',
    description:     '',
    url:             '',
    category:        '',
    operatingSystem: 'Windows, macOS, Linux, Android, iOS',
    price:           '0',
    priceCurrency:   'INR',
    rating:          '',
    ratingCount:     '',
  },
  FAQ: {
    pairs: [
      { q: '', a: '' },
      { q: '', a: '' },
      { q: '', a: '' },
    ],
  },
  HowTo: {
    name:        '',
    description: '',
    totalTime:   '',
    steps:       ['', '', ''],
  },
  Breadcrumb: {
    items: [
      { name: 'Home', url: 'https://awe-os.com/' },
      { name: '', url: '' },
      { name: '', url: '' },
    ],
  },
}

const VALIDATION = {
  Article: [
    'headline is present and under 110 chars',
    'author name is specified',
    'datePublished uses ISO-8601 (YYYY-MM-DD)',
    'image URL is absolute (https://)',
    '@context is schema.org',
  ],
  Tool: [
    'name matches the on-page H1',
    'url is the canonical page URL',
    'price is "0" for free tools',
    'aggregateRating has reviewCount ≥ 1',
    '@type is SoftwareApplication',
  ],
  FAQ: [
    'each question starts with a question word',
    'answers are plain text (no HTML)',
    'at least 3 FAQ pairs present',
    'questions match the on-page FAQ section',
    '@type is FAQPage',
  ],
  HowTo: [
    'name matches the page title intent',
    'totalTime uses ISO-8601 duration (e.g. PT5M)',
    'each step has a clear text description',
    'at least 2 steps present',
    '@type is HowTo',
  ],
  Breadcrumb: [
    'first item is Home with homepage URL',
    'last item matches current page',
    'all URLs are absolute (https://)',
    'item names are human-readable',
    '@type is BreadcrumbList',
  ],
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500'
const labelCls = 'block text-xs font-medium text-gray-400 mb-1'

// ── Per-type forms ─────────────────────────────────────────────────────────────

function ArticleForm({ form, setForm }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Headline *</label><input value={form.headline} onChange={e => f('headline', e.target.value)} placeholder="Article title (≤ 110 chars)" className={inputCls} /></div>
        <div><label className={labelCls}>Author Name *</label><input value={form.author} onChange={e => f('author', e.target.value)} placeholder="Wajid Khan" className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Description</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} placeholder="Brief article description" className={inputCls + ' resize-none'} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Date Published *</label><input type="date" value={form.datePublished} onChange={e => f('datePublished', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Date Modified</label><input type="date" value={form.dateModified} onChange={e => f('dateModified', e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Article URL</label><input value={form.url} onChange={e => f('url', e.target.value)} placeholder="https://awe-os.com/blog/..." className={inputCls} /></div>
      <div><label className={labelCls}>Featured Image URL</label><input value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)} placeholder="https://awe-os.com/images/..." className={inputCls} /></div>
    </div>
  )
}

function ToolForm({ form, setForm }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Tool Name *</label><input value={form.name} onChange={e => f('name', e.target.value)} placeholder="PDF Merge Tool" className={inputCls} /></div>
        <div><label className={labelCls}>Category</label><input value={form.category} onChange={e => f('category', e.target.value)} placeholder="UtilitiesApplication" className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Description *</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} placeholder="Free online tool to..." className={inputCls + ' resize-none'} /></div>
      <div><label className={labelCls}>Page URL *</label><input value={form.url} onChange={e => f('url', e.target.value)} placeholder="https://awe-os.com/tools/merge-pdf" className={inputCls} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={labelCls}>Price</label><input value={form.price} onChange={e => f('price', e.target.value)} placeholder="0" className={inputCls} /></div>
        <div><label className={labelCls}>Avg Rating (1-5)</label><input value={form.rating} onChange={e => f('rating', e.target.value)} placeholder="4.8" className={inputCls} /></div>
        <div><label className={labelCls}>Rating Count</label><input value={form.ratingCount} onChange={e => f('ratingCount', e.target.value)} placeholder="1200" className={inputCls} /></div>
      </div>
    </div>
  )
}

function FAQForm({ form, setForm }) {
  function updatePair(i, key, val) {
    setForm(p => {
      const pairs = [...p.pairs]
      pairs[i] = { ...pairs[i], [key]: val }
      return { ...p, pairs }
    })
  }
  function addPair() { setForm(p => ({ ...p, pairs: [...p.pairs, { q: '', a: '' }] })) }
  function removePair(i) {
    if (form.pairs.length <= 1) return
    setForm(p => ({ ...p, pairs: p.pairs.filter((_, idx) => idx !== i) }))
  }
  return (
    <div className="space-y-3">
      {form.pairs.map((pair, i) => (
        <div key={i} className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Q&A #{i + 1}</span>
            {form.pairs.length > 1 && <button onClick={() => removePair(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
          </div>
          <input value={pair.q} onChange={e => updatePair(i, 'q', e.target.value)} placeholder="Question?" className={inputCls} />
          <textarea value={pair.a} onChange={e => updatePair(i, 'a', e.target.value)} rows={2} placeholder="Answer..." className={inputCls + ' resize-none'} />
        </div>
      ))}
      <button onClick={addPair} className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:text-white text-sm rounded-lg">+ Add Q&A Pair</button>
    </div>
  )
}

function HowToForm({ form, setForm }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  function updateStep(i, val) {
    setForm(p => { const steps = [...p.steps]; steps[i] = val; return { ...p, steps } })
  }
  function addStep() { setForm(p => ({ ...p, steps: [...p.steps, ''] })) }
  function removeStep(i) {
    if (form.steps.length <= 1) return
    setForm(p => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i) }))
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>How-To Title *</label><input value={form.name} onChange={e => f('name', e.target.value)} placeholder="How to merge PDF files" className={inputCls} /></div>
        <div><label className={labelCls}>Total Time (ISO-8601)</label><input value={form.totalTime} onChange={e => f('totalTime', e.target.value)} placeholder="PT5M" className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Description</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} placeholder="Step-by-step guide to..." className={inputCls + ' resize-none'} /></div>
      <div className="space-y-2">
        <label className={labelCls}>Steps *</label>
        {form.steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-2 text-xs text-gray-500 w-5 shrink-0">{i + 1}.</span>
            <input value={step} onChange={e => updateStep(i, e.target.value)} placeholder={`Step ${i + 1} description`} className={inputCls} />
            {form.steps.length > 1 && <button onClick={() => removeStep(i)} className="mt-2 text-xs text-red-400">✕</button>}
          </div>
        ))}
        <button onClick={addStep} className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:text-white text-sm rounded-lg">+ Add Step</button>
      </div>
    </div>
  )
}

function BreadcrumbForm({ form, setForm }) {
  function updateItem(i, key, val) {
    setForm(p => {
      const items = [...p.items]
      items[i] = { ...items[i], [key]: val }
      return { ...p, items }
    })
  }
  function addItem() { setForm(p => ({ ...p, items: [...p.items, { name: '', url: '' }] })) }
  function removeItem(i) {
    if (form.items.length <= 1) return
    setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  }
  return (
    <div className="space-y-2">
      <label className={labelCls}>Breadcrumb Items</label>
      {form.items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 w-4 shrink-0">{i + 1}</span>
          <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Label" className={inputCls} />
          <input value={item.url} onChange={e => updateItem(i, 'url', e.target.value)} placeholder="https://..." className={inputCls} />
          {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-xs text-red-400 shrink-0">✕</button>}
        </div>
      ))}
      <button onClick={addItem} className="w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:text-white text-sm rounded-lg">+ Add Item</button>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SchemaGenerator() {
  const [schemaType, setSchemaType] = useState('Article')
  const [forms, setForms] = useState(INITIAL_FORMS)
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  function updateForm(data) {
    setForms(p => ({ ...p, [schemaType]: data }))
  }
  const form = forms[schemaType]

  async function handleGenerate() {
    setLoading(true); setError(null); setOutput(null)
    try {
      const res = await api.post('/api/admin/blog/generate-schema', {
        schemaType,
        formData: form,
      })
      if (res.data.success) setOutput(res.data.schema)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Schema generation failed.')
    } finally {
      setLoading(false)
    }
  }

  function copySchema() {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const googleTestUrl = `https://search.google.com/test/rich-results`

  return (
    <div className="space-y-5">

      {/* Type selector */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Schema Type</p>
        <div className="flex flex-wrap gap-2">
          {SCHEMA_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setSchemaType(t.id); setOutput(null); setError(null) }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                schemaType === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic form */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        {schemaType === 'Article'    && <ArticleForm    form={form} setForm={updateForm} />}
        {schemaType === 'Tool'       && <ToolForm       form={form} setForm={updateForm} />}
        {schemaType === 'FAQ'        && <FAQForm        form={form} setForm={updateForm} />}
        {schemaType === 'HowTo'      && <HowToForm      form={form} setForm={updateForm} />}
        {schemaType === 'Breadcrumb' && <BreadcrumbForm form={form} setForm={updateForm} />}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate} disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner /> Generating Schema…</> : '⚙️ Generate Schema'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Output */}
      {output && (
        <div className="grid grid-cols-5 gap-4">

          {/* JSON-LD code — 3 cols */}
          <div className="col-span-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">JSON-LD Output</p>
            <div className="relative bg-gray-950 border border-gray-700 rounded-xl overflow-hidden">
              <pre className="text-xs text-green-300 font-mono p-4 overflow-auto max-h-80 leading-relaxed whitespace-pre-wrap break-all">
                {output}
              </pre>
            </div>
          </div>

          {/* Actions + Checklist — 2 cols */}
          <div className="col-span-2 space-y-4">

            {/* Action buttons */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Actions</p>
              <div className="space-y-2">
                <button
                  onClick={copySchema}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg"
                >
                  {copied ? '✓ Copied!' : '📋 Copy JSON-LD'}
                </button>
                <a
                  href={googleTestUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-1"
                >
                  🔍 Test on Google →
                </a>
              </div>
            </div>

            {/* Validation checklist */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Validation Checklist</p>
              <ul className="space-y-1.5">
                {(VALIDATION[schemaType] || []).map((check, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
