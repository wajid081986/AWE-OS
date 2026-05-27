import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api.service'

// ── Constants ─────────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { id: 'modern-saas',    name: 'Modern SaaS',      desc: 'Dark, minimal like Notion/Linear',  emoji: '🌑', preview: 'bg-slate-900 text-indigo-400'       },
  { id: 'bold-marketing', name: 'Bold Marketing',   desc: 'High-energy like ClickFunnels',     emoji: '🔥', preview: 'bg-white text-orange-500 border'    },
  { id: 'dark-tech',      name: 'Dark Tech',        desc: 'Terminal aesthetic like Vercel',    emoji: '💻', preview: 'bg-black text-green-400'            },
  { id: 'minimal-clean',  name: 'Minimal Clean',    desc: 'Whitespace-first like Apple',       emoji: '⬜', preview: 'bg-white text-gray-900 border'      },
  { id: 'indian-business',name: 'Indian Business',  desc: 'Warm, trust-focused',               emoji: '🇮🇳', preview: 'bg-orange-50 text-orange-600 border'},
  { id: 'ecommerce',      name: 'E-Commerce',       desc: 'Product-focused with urgency',      emoji: '🛒', preview: 'bg-blue-50 text-blue-600 border'    },
]

const STEPS = [
  { id: 1, label: 'Product Info',        icon: '📦' },
  { id: 2, label: 'Audience',            icon: '👥' },
  { id: 3, label: 'Features & Pricing',  icon: '✨' },
  { id: 4, label: 'Style',               icon: '🎨' },
  { id: 5, label: 'Generate',            icon: '🚀' },
]

const INDUSTRIES = [
  'SaaS / Software', 'Digital Marketing', 'E-Commerce', 'Consulting',
  'Health & Wellness', 'Education', 'Real Estate', 'Finance',
  'Restaurant / Food', 'Fashion', 'Other',
]

const AGENTS = [
  { icon: '🔬', name: 'Market Research Agent',  desc: 'Analyzing your niche & competitors...' },
  { icon: '✍️', name: 'Copywriting Agent',       desc: 'Crafting high-converting headlines...' },
  { icon: '🎨', name: 'Design Agent',            desc: 'Building your landing page HTML...'    },
  { icon: '📊', name: 'Scoring Agent',           desc: 'Analyzing conversion potential...'     },
]

const STATUS_CFG = {
  draft:      { label: 'Draft',      cls: 'bg-gray-700 text-gray-300'     },
  generating: { label: 'Generating', cls: 'bg-yellow-900/60 text-yellow-300 animate-pulse' },
  ready:      { label: 'Ready',      cls: 'bg-blue-900/60 text-blue-300'  },
  published:  { label: 'Published',  cls: 'bg-green-900/60 text-green-300'},
  failed:     { label: 'Failed',     cls: 'bg-red-900/60 text-red-300'    },
}

const DEFAULT_BRIEF = {
  productName:    '',
  tagline:        '',
  description:    '',
  industry:       '',
  targetAudience: '',
  painPoints:     ['', '', ''],
  features: [
    { title: '', description: '', icon: '⚡' },
    { title: '', description: '', icon: '🎯' },
    { title: '', description: '', icon: '🔒' },
  ],
  pricing: [
    { name: 'Starter',    price: 'Free',   period: '/month', features: ['Feature 1', 'Feature 2'], highlighted: false },
    { name: 'Pro',        price: '$49',    period: '/month', features: ['Everything in Starter', 'Feature 3', 'Feature 4'], highlighted: true  },
    { name: 'Enterprise', price: 'Custom', period: '',       features: ['Everything in Pro', 'Custom features'], highlighted: false },
  ],
  cta:          'Get Started Free',
  competitors:  '',
  testimonials: ['', '', ''],
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2 transition-all
              ${current > s.id  ? 'bg-green-600 border-green-600 text-white'
              : current === s.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
              {current > s.id ? '✓' : s.icon}
            </div>
            <span className={`text-xs mt-1.5 font-medium ${current === s.id ? 'text-indigo-400' : current > s.id ? 'text-green-400' : 'text-gray-500'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 mb-5 rounded transition-colors
              ${current > s.id ? 'bg-green-600' : 'bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function ScoreBar({ label, value = 0, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-500', green: 'bg-green-500',
    blue:   'bg-blue-500',   purple: 'bg-purple-500',
  }
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className="text-xl font-bold text-white">{value}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${colors[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function FieldInput({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingBuilderPage() {
  const navigate = useNavigate()

  const [activeTab,      setActiveTab]      = useState('builder')
  const [step,           setStep]           = useState(1)
  const [brief,          setBrief]          = useState(DEFAULT_BRIEF)
  const [stylePreset,    setStylePreset]    = useState('modern-saas')
  const [generating,     setGenerating]     = useState(false)
  const [generatingStep, setGeneratingStep] = useState(0)
  const [pageId,         setPageId]         = useState(null)
  const [generatedPage,  setGeneratedPage]  = useState(null)
  const [previewHtml,    setPreviewHtml]    = useState(null)
  const [error,          setError]          = useState(null)
  const [pages,          setPages]          = useState([])
  const [pagesLoading,   setPagesLoading]   = useState(false)

  const pollRef    = useRef(null)
  const timerRefs  = useRef([])

  // ── Load pages list ──────────────────────────────────────────────────────────
  const loadPages = useCallback(() => {
    setPagesLoading(true)
    api.get('/api/landing-pages')
      .then(r => setPages(r.data?.pages || []))
      .catch(() => {})
      .finally(() => setPagesLoading(false))
  }, [])

  useEffect(() => { loadPages() }, [loadPages])

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      timerRefs.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // ── Brief helpers ────────────────────────────────────────────────────────────
  const setField = (key) => (val) => setBrief(b => ({ ...b, [key]: val }))

  const setPainPoint = (i, val) =>
    setBrief(b => { const p = [...b.painPoints]; p[i] = val; return { ...b, painPoints: p } })

  const setFeature = (i, key, val) =>
    setBrief(b => { const f = [...b.features]; f[i] = { ...f[i], [key]: val }; return { ...b, features: f } })

  const setPricing = (i, key, val) =>
    setBrief(b => { const p = [...b.pricing]; p[i] = { ...p[i], [key]: val }; return { ...b, pricing: p } })

  const setPricingFeatures = (i, val) =>
    setPricing(i, 'features', val.split('\n').filter(Boolean))

  // ── Polling ──────────────────────────────────────────────────────────────────
  const startPolling = useCallback((id) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/landing-pages/${id}/status`)
        if (data.status === 'ready') {
          clearInterval(pollRef.current)
          // Fetch full record to get html_content
          const full = await api.get(`/api/landing-pages/${id}`)
          setGeneratedPage(full.data)
          setPreviewHtml(full.data.html_content)
          setGenerating(false)
          setGeneratingStep(5)
          loadPages()
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current)
          setGenerating(false)
          setError('Generation failed — please try again.')
        }
      } catch (_) {}
    }, 3000)
  }, [loadPages])

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!brief.productName.trim()) {
      setError('Product name is required')
      return
    }
    timerRefs.current.forEach(t => clearTimeout(t))
    timerRefs.current = []

    setGenerating(true)
    setGeneratingStep(1)
    setError(null)
    setGeneratedPage(null)
    setPreviewHtml(null)

    try {
      const { data } = await api.post('/api/landing-pages/generate', {
        brief,
        stylePreset,
        title: brief.productName,
      })

      setPageId(data.pageId)
      startPolling(data.pageId)

      // Simulate visual progress while agents run
      const delays = [8000, 20000, 40000]
      delays.forEach((delay, i) => {
        const t = setTimeout(() => setGeneratingStep(i + 2), delay)
        timerRefs.current.push(t)
      })
    } catch (err) {
      setGenerating(false)
      setError(err?.response?.data?.error || err.message || 'Generation request failed')
    }
  }

  // ── Publish ──────────────────────────────────────────────────────────────────
  const handlePublish = async (id) => {
    try {
      await api.put(`/api/landing-pages/${id}`, { status: 'published' })
      if (generatedPage?.id === id) setGeneratedPage(p => ({ ...p, status: 'published' }))
      setPages(p => p.map(pg => pg.id === id ? { ...pg, status: 'published' } : pg))
    } catch (_) {}
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this landing page permanently?')) return
    try {
      await api.delete(`/api/landing-pages/${id}`)
      setPages(p => p.filter(pg => pg.id !== id))
    } catch (_) {}
  }

  // ── Download HTML ────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!generatedPage?.html_content) return
    const blob = new Blob([generatedPage.html_content], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${generatedPage.slug || 'landing-page'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    timerRefs.current.forEach(t => clearTimeout(t))
    setGenerating(false)
    setGeneratingStep(0)
    setGeneratedPage(null)
    setPreviewHtml(null)
    setPageId(null)
    setError(null)
    setStep(1)
    setBrief(DEFAULT_BRIEF)
    setStylePreset('modern-saas')
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return brief.productName.trim().length > 0
    return true
  }

  // ── Render Helpers ────────────────────────────────────────────────────────────

  const inputCls = 'w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  // ── Step 1: Product Info ─────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">Tell us about your product</h2>
        <p className="text-gray-400 text-sm mt-1">The more detail you provide, the better your landing page will be.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Product / Company Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={brief.productName}
            onChange={e => setField('productName')(e.target.value)}
            placeholder="e.g. TaskFlow AI"
            className={`${inputCls} text-base`}
            autoFocus
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Tagline</label>
          <input
            type="text"
            value={brief.tagline}
            onChange={e => setField('tagline')(e.target.value)}
            placeholder="e.g. Ship 10× faster with AI-powered task management"
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Product Description</label>
          <textarea
            value={brief.description}
            onChange={e => setField('description')(e.target.value)}
            placeholder="Describe what your product does, its main benefits, and what makes it unique..."
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Industry</label>
          <select
            value={brief.industry}
            onChange={e => setField('industry')(e.target.value)}
            className={inputCls}
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Primary CTA Text</label>
          <input
            type="text"
            value={brief.cta}
            onChange={e => setField('cta')(e.target.value)}
            placeholder="Get Started Free"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )

  // ── Step 2: Audience ─────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">Define your target audience</h2>
        <p className="text-gray-400 text-sm mt-1">Understanding your audience drives conversion-optimized copy.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Target Audience</label>
        <textarea
          value={brief.targetAudience}
          onChange={e => setField('targetAudience')(e.target.value)}
          placeholder="e.g. Startup founders and solo developers who struggle with project management and need to ship faster without hiring a large team."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Top 3 Pain Points
          <span className="text-gray-500 font-normal ml-2">— What problems do they face?</span>
        </label>
        <div className="space-y-2.5">
          {brief.painPoints.map((pt, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-500 text-xs font-mono w-4 shrink-0">{i + 1}.</span>
              <input
                type="text"
                value={pt}
                onChange={e => setPainPoint(i, e.target.value)}
                placeholder={[
                  'e.g. Spending too many hours on manual tracking',
                  'e.g. Team meetings that produce no results',
                  'e.g. Missing deadlines due to unclear priorities',
                ][i]}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Competitors
          <span className="text-gray-500 font-normal ml-2">optional</span>
        </label>
        <input
          type="text"
          value={brief.competitors}
          onChange={e => setField('competitors')(e.target.value)}
          placeholder="e.g. Asana, Monday.com, Notion (comma-separated)"
          className={inputCls}
        />
      </div>
    </div>
  )

  // ── Step 3: Features & Pricing ────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">Features & Pricing</h2>
        <p className="text-gray-400 text-sm mt-1">Define what you offer and how much it costs.</p>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Key Features (3)</h3>
        <div className="space-y-3">
          {brief.features.map((feat, i) => (
            <div key={i} className="bg-gray-700/40 border border-gray-700 rounded-xl p-4">
              <div className="grid grid-cols-[40px_1fr_2fr] gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Icon</label>
                  <input
                    type="text"
                    value={feat.icon}
                    onChange={e => setFeature(i, 'icon', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Feature Title</label>
                  <input
                    type="text"
                    value={feat.title}
                    onChange={e => setFeature(i, 'title', e.target.value)}
                    placeholder="e.g. AI Automation"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Benefit Description</label>
                  <input
                    type="text"
                    value={feat.description}
                    onChange={e => setFeature(i, 'description', e.target.value)}
                    placeholder="e.g. Save 10 hours/week with intelligent task routing"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Pricing Plans (3)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {brief.pricing.map((plan, i) => (
            <div key={i} className={`border rounded-xl p-4 space-y-3 ${plan.highlighted ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-gray-700/40'}`}>
              {plan.highlighted && (
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">HIGHLIGHTED</span>
              )}
              <input
                type="text"
                value={plan.name}
                onChange={e => setPricing(i, 'name', e.target.value)}
                placeholder="Plan name"
                className={`${inputCls} font-semibold`}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={plan.price}
                  onChange={e => setPricing(i, 'price', e.target.value)}
                  placeholder="$49"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={plan.period}
                  onChange={e => setPricing(i, 'period', e.target.value)}
                  placeholder="/month"
                  className={inputCls}
                />
              </div>
              <textarea
                value={plan.features.join('\n')}
                onChange={e => setPricingFeatures(i, e.target.value)}
                placeholder={"Feature 1\nFeature 2\nFeature 3"}
                rows={3}
                className={`${inputCls} resize-none text-xs`}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setPricing(i, 'highlighted', !plan.highlighted)}
                  className={`relative w-8 h-4 rounded-full transition-colors ${plan.highlighted ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${plan.highlighted ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs text-gray-400">Featured plan</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Step 4: Style ─────────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">Choose your style</h2>
        <p className="text-gray-400 text-sm mt-1">The Design Agent will use this to shape colors, typography, and layout.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STYLE_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setStylePreset(preset.id)}
            className={`relative text-left rounded-xl border-2 p-4 transition-all ${
              stylePreset === preset.id
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
          >
            {stylePreset === preset.id && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</span>
            )}
            {/* Color preview swatch */}
            <div className={`w-full h-12 rounded-lg mb-3 flex items-center justify-center text-sm font-bold ${preset.preview}`}>
              {preset.emoji} {preset.name}
            </div>
            <p className="text-white text-sm font-semibold">{preset.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{preset.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Step 5: Generate (pre-generation) ────────────────────────────────────────
  const renderStep5PreGen = () => (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">Ready to generate</h2>
        <p className="text-gray-400 text-sm mt-1">4 AI agents will build your landing page. Takes ~60–90 seconds.</p>
      </div>

      {/* Summary */}
      <div className="bg-gray-700/40 border border-gray-700 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Brief Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Product</p>
            <p className="text-white font-medium">{brief.productName || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Industry</p>
            <p className="text-white font-medium">{brief.industry || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Style</p>
            <p className="text-white font-medium">{STYLE_PRESETS.find(p => p.id === stylePreset)?.name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Features</p>
            <p className="text-white font-medium">{brief.features.filter(f => f.title).length} defined</p>
          </div>
        </div>
        {brief.tagline && (
          <div>
            <p className="text-gray-500 text-xs">Tagline</p>
            <p className="text-gray-300 italic text-sm">"{brief.tagline}"</p>
          </div>
        )}
      </div>

      {/* Agent pipeline preview */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">AI Agent Pipeline</p>
        {AGENTS.map((agent, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
            <span className="text-xl">{agent.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{agent.name}</p>
              <p className="text-xs text-gray-500">{agent.desc}</p>
            </div>
            <span className="ml-auto text-xs text-gray-600">~{[15, 25, 45, 15][i]}s</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-700/40 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <button
        onClick={handleGenerate}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3"
      >
        <span className="text-xl">🚀</span>
        Generate Landing Page
      </button>
    </div>
  )

  // ── Generating State ──────────────────────────────────────────────────────────
  const renderGenerating = () => {
    const progress = Math.min(95, ((generatingStep - 1) / 4) * 100)
    return (
      <div className="py-8 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center">
            <span className="text-3xl animate-bounce">🤖</span>
          </div>
          <h2 className="text-xl font-bold text-white">AI Agents Working...</h2>
          <p className="text-gray-400 text-sm mt-1">Building your landing page. This takes ~60–90 seconds.</p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Progress</span>
            <span className="text-xs text-indigo-400 font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-2000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Agent steps */}
        <div className="space-y-3">
          {AGENTS.map((agent, i) => {
            const agentNum = i + 1
            const isDone    = generatingStep > agentNum
            const isActive  = generatingStep === agentNum
            const isPending = generatingStep < agentNum
            return (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isActive  ? 'bg-indigo-500/10 border-indigo-500/40'
                  : isDone  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-gray-800/50 border-gray-700/50 opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-indigo-500/20' : isDone ? 'bg-green-500/20' : 'bg-gray-700'
                }`}>
                  {isDone
                    ? <span className="text-green-400 text-lg">✓</span>
                    : isActive
                      ? <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />
                      : <span className="text-xl">{agent.icon}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-white' : isDone ? 'text-green-300' : 'text-gray-500'}`}>
                    {agent.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-indigo-300' : isDone ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                    {isDone ? 'Complete' : agent.desc}
                  </p>
                </div>
                {isDone && <span className="text-green-400 text-xs font-medium shrink-0">Done ✓</span>}
                {isActive && <span className="text-indigo-400 text-xs font-medium shrink-0 animate-pulse">Running…</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Generated State ───────────────────────────────────────────────────────────
  const renderGenerated = () => {
    const score = generatedPage?.generation_score || {}
    return (
      <div className="space-y-6">
        {/* Success header */}
        <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-green-300 font-semibold">Landing Page Generated!</p>
            <p className="text-gray-400 text-xs">{brief.productName} · {STYLE_PRESETS.find(p => p.id === stylePreset)?.name} style</p>
          </div>
          <StatusBadge status={generatedPage?.status || 'ready'} />
        </div>

        {/* Score cards */}
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Conversion Analysis</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ScoreBar label="Copy"       value={score.copy       || 0} color="purple" />
            <ScoreBar label="Design"     value={score.design     || 0} color="blue"   />
            <ScoreBar label="SEO"        value={score.seo        || 0} color="green"  />
            <ScoreBar label="Conversion" value={score.conversion || 0} color="indigo" />
          </div>
          {score.overall && (
            <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-between">
              <span className="text-sm text-gray-300 font-medium">Overall Score</span>
              <span className={`text-2xl font-bold ${score.overall >= 80 ? 'text-green-400' : score.overall >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score.overall}<span className="text-sm text-gray-500">/100</span>
              </span>
            </div>
          )}
          {score.tips?.length > 0 && (
            <div className="mt-2 space-y-1">
              {score.tips.map((tip, i) => (
                <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="text-indigo-400 shrink-0">💡</span> {tip}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Preview iframe */}
        {previewHtml && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Live Preview</p>
              <span className="text-xs text-gray-600">Scroll to see full page</span>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-gray-700" style={{ height: '500px' }}>
              <iframe
                srcDoc={previewHtml}
                title="Landing Page Preview"
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full bg-white"
                style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-1.5 px-3 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-xs font-medium"
          >
            <span className="text-xl">⬇️</span>
            Download HTML
          </button>
          <button
            onClick={() => handlePublish(generatedPage.id)}
            disabled={generatedPage?.status === 'published'}
            className="flex flex-col items-center gap-1.5 px-3 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-colors text-xs font-medium"
          >
            <span className="text-xl">🌐</span>
            {generatedPage?.status === 'published' ? 'Published ✓' : 'Publish Live'}
          </button>
          {generatedPage?.status === 'published' && generatedPage?.slug && (
            <a
              href={`${import.meta.env.VITE_API_URL}/p/${generatedPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 px-3 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl transition-colors text-xs font-medium text-center"
            >
              <span className="text-xl">🔗</span>
              Open Live URL
            </a>
          )}
          <button
            onClick={handleReset}
            className="flex flex-col items-center gap-1.5 px-3 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-xs font-medium"
          >
            <span className="text-xl">🔄</span>
            New Page
          </button>
        </div>
      </div>
    )
  }

  // ── Pages List Tab ────────────────────────────────────────────────────────────
  const renderPages = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">My Landing Pages</h2>
          <p className="text-gray-400 text-sm">{pages.length} page{pages.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setActiveTab('builder')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Page
        </button>
      </div>

      {pagesLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-xl">
          <p className="text-4xl mb-3">🚀</p>
          <p className="text-gray-300 font-medium">No pages yet</p>
          <p className="text-gray-500 text-sm mt-1">Generate your first landing page to see it here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3 pr-4">Title</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3 pr-4">Style</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3 pr-4">Status</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3 pr-4">Views</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3 pr-4">Score</th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3 pr-4">Created</th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wide pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pages.map(page => {
                const preset  = STYLE_PRESETS.find(p => p.id === page.style_preset)
                const score   = page.generation_score?.overall
                const created = new Date(page.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                return (
                  <tr key={page.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-white font-medium truncate max-w-[180px]">{page.title}</p>
                      <p className="text-gray-500 text-xs font-mono truncate max-w-[180px]">{page.slug}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-gray-300 text-xs">{preset?.emoji} {preset?.name || page.style_preset}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={page.status} />
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{page.views || 0}</td>
                    <td className="py-3 pr-4">
                      {score != null
                        ? <span className={`font-bold text-sm ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-gray-400'}`}>{score}</span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{created}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {page.status === 'published' && (
                          <a
                            href={`${import.meta.env.VITE_API_URL}/p/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            View
                          </a>
                        )}
                        {page.status === 'ready' && (
                          <button
                            onClick={() => handlePublish(page.id)}
                            className="px-2.5 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800/60 text-red-300 rounded text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 min-h-full">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🏗️ Landing Page Builder
            <span className="text-xs bg-purple-700 text-purple-200 px-2 py-1 rounded-full font-medium">AI-Powered</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            4 specialized AI agents · market research · copywriting · design · CRO scoring
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 mb-6 w-fit">
          {[
            { id: 'builder', label: '🏗️ Build New' },
            { id: 'pages',   label: `📋 My Pages${pages.length > 0 ? ` (${pages.length})` : ''}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pages tab */}
        {activeTab === 'pages' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            {renderPages()}
          </div>
        )}

        {/* Builder tab */}
        {activeTab === 'builder' && (
          <div>
            {/* Step indicator — only show before generation completes */}
            {!generating && !generatedPage && <StepIndicator current={step} />}

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">

              {/* Generating overlay */}
              {generating && renderGenerating()}

              {/* Generated result */}
              {!generating && generatedPage && renderGenerated()}

              {/* Wizard steps */}
              {!generating && !generatedPage && (
                <>
                  {step === 1 && renderStep1()}
                  {step === 2 && renderStep2()}
                  {step === 3 && renderStep3()}
                  {step === 4 && renderStep4()}
                  {step === 5 && renderStep5PreGen()}

                  {/* Error */}
                  {error && step !== 5 && (
                    <div className="mt-4 p-3 bg-red-950/40 border border-red-700/40 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Navigation */}
                  {step < 5 && (
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
                      <button
                        onClick={() => { setStep(s => s - 1); setError(null) }}
                        disabled={step === 1}
                        className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        ← Back
                      </button>
                      <span className="text-gray-600 text-xs">Step {step} of {STEPS.length}</span>
                      <button
                        onClick={() => {
                          if (!canProceed()) { setError('Product name is required'); return }
                          setError(null)
                          setStep(s => s + 1)
                        }}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        Next →
                      </button>
                    </div>
                  )}

                  {step === 5 && !generating && !generatedPage && (
                    <div className="flex justify-start mt-6 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => { setStep(4); setError(null) }}
                        className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        ← Back to Style
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
