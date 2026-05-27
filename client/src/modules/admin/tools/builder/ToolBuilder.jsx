import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../../../services/api.service'

const slugify = (s) =>
  s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

const FIELD_TYPES = ['text', 'textarea', 'number', 'select']
const CATEGORIES  = ['General', 'Writing', 'Marketing', 'Development', 'Finance', 'HR', 'Legal', 'SEO', 'Sales', 'Support']
const BLANK_FIELD = { name: '', label: '', type: 'text', required: false, options: '' }

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  )
}

function Toast({ message, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

export default function ToolBuilder() {
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  // Internal state uses camelCase for clean React code
  const [basic, setBasic] = useState({
    name: '', slug: '', description: '', category: 'General',
    price: 0, isFree: false, isPublished: false, approved: false,
  })
  const [fields, setFields]         = useState([{ ...BLANK_FIELD }])
  const [aiPrompt, setAiPrompt]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [slugLocked, setSlugLocked] = useState(false)

  useEffect(() => {
    if (!editId) return
    api.get(`/api/tools/${editId}`)
      .then(res => {
        const t = res.data.tool
        // Supabase returns snake_case — read both to be safe
        setBasic({
          name:        t.name,
          slug:        t.slug,
          description: t.description,
          category:    t.category    ?? 'General',
          price:       t.price       ?? 0,
          isFree:      t.is_free     ?? t.isFree     ?? false,
          isPublished: t.is_published ?? t.isPublished ?? false,
          approved:    t.approved    || false,
        })
        const rawFields = t.input_fields ?? t.inputFields ?? []
        setFields(
          rawFields.length
            ? rawFields.map(f => ({ ...f, options: Array.isArray(f.options) ? f.options.join(', ') : '' }))
            : [{ ...BLANK_FIELD }]
        )
        setAiPrompt(t.ai_prompt ?? t.aiPrompt ?? '')
        setSlugLocked(true)
      })
      .catch(() => showToast('Failed to load tool', 'error'))
  }, [editId])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const setName = (name) =>
    setBasic(b => ({ ...b, name, ...(!slugLocked ? { slug: slugify(name) } : {}) }))

  const setSlug = (raw) => {
    setSlugLocked(true)
    setBasic(b => ({ ...b, slug: slugify(raw) }))
  }

  const updateField = (i, key, value) => {
    setFields(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [key]: value }
      if (key === 'label') {
        next[i].name = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      }
      return next
    })
  }

  const addField    = () => setFields(p => [...p, { ...BLANK_FIELD }])
  const removeField = (i) => setFields(p => p.filter((_, idx) => idx !== i))

  const variableChips = fields.filter(f => f.name?.trim()).map(f => `{{${f.name}}}`)
  const insertVar     = (chip) => setAiPrompt(p => p + chip)

  // Build snake_case payload for Supabase via the backend
  const buildPayload = (publish) => ({
    name:         basic.name,
    slug:         basic.slug,
    description:  basic.description,
    category:     basic.category,
    price:        basic.price,
    is_free:      basic.isFree,
    is_published: publish,
    isPublished:  publish,
    approved:     basic.approved || publish,
    input_fields: fields
      .filter(f => f.name?.trim() && f.label?.trim() && f.type)
      .map(f => ({
        name:     f.name.trim(),
        label:    f.label.trim(),
        type:     f.type,
        required: Boolean(f.required),
        options:  f.type === 'select'
          ? f.options.split(',').map(o => o.trim()).filter(Boolean)
          : [],
      })),
    ai_prompt: aiPrompt,
  })

  const save = async (publish) => {
    if (!basic.name.trim() || !basic.slug.trim() || !aiPrompt.trim()) {
      showToast('Name, slug and AI prompt are required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload(publish)
      if (editId) {
        await api.put(`/api/tools/${editId}`, payload)
      } else {
        await api.post('/api/tools', payload)
      }
      showToast(publish ? 'Tool published!' : 'Draft saved')
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestTool = () => {
    const currentSlug = basic.slug
    if (!currentSlug) return
    window.open(`/tools/${currentSlug}`, '_blank')
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">{editId ? 'Edit Tool' : 'Build New Tool'}</h1>

        {/* ── Section 1: Basic Info ── */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Tool Name <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={basic.name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Blog Post Generator"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Slug <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={basic.slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="blog-post-generator"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Description <span className="text-red-400">*</span></label>
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                value={basic.description}
                onChange={e => setBasic(b => ({ ...b, description: e.target.value }))}
                placeholder="What does this tool do?"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Category</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={basic.category}
                onChange={e => setBasic(b => ({ ...b, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Price (₹)</label>
              <input
                type="number" min="0"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={basic.price}
                onChange={e => setBasic(b => ({ ...b, price: Number(e.target.value) }))}
              />
            </div>
            <div className="flex gap-8 items-center pt-1 flex-wrap">
              <Toggle checked={basic.isFree} onChange={v => setBasic(b => ({ ...b, isFree: v }))} label="Free" />
              <Toggle checked={basic.isPublished} onChange={v => setBasic(b => ({ ...b, isPublished: v }))} label="Published" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Approved</span>
                <button
                  type="button"
                  onClick={() => setBasic(b => ({ ...b, approved: !b.approved }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${basic.approved ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${basic.approved ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className="text-xs text-gray-500">
                  {basic.approved ? 'Live' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Input Fields ── */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Input Fields</h2>
            <button
              type="button"
              onClick={addField}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Field
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={i} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Label</label>
                    <input
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.label}
                      onChange={e => updateField(i, 'label', e.target.value)}
                      placeholder="e.g. Topic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Variable name</label>
                    <input
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.name}
                      onChange={e => updateField(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      placeholder="topic"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <select
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.type}
                      onChange={e => updateField(i, 'type', e.target.value)}
                    >
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end justify-between gap-2 pb-0.5">
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(i, 'required', e.target.checked)}
                        className="accent-indigo-500"
                      />
                      Required
                    </label>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(i)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {field.type === 'select' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Options (comma-separated)</label>
                    <input
                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={field.options}
                      onChange={e => updateField(i, 'options', e.target.value)}
                      placeholder="Option A, Option B, Option C"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: AI Prompt ── */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">AI Prompt <span className="text-red-400">*</span></h2>
          <p className="text-xs text-gray-400 mb-3">
            Use <code className="bg-gray-700 text-indigo-300 px-1 py-0.5 rounded font-mono">{`{{fieldName}}`}</code> to inject user input.
          </p>
          {variableChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs text-gray-500 self-center">Insert:</span>
              {variableChips.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => insertVar(chip)}
                  className="text-xs bg-indigo-900 hover:bg-indigo-800 text-indigo-300 px-2 py-1 rounded font-mono transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          <textarea
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono text-sm leading-relaxed"
            rows={10}
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder={"Write a detailed blog post about {{topic}} for {{audience}}.\nTone: {{tone}}\nWord count: {{word_count}}\n\nFormat with clear headings and paragraphs."}
          />
        </section>

        {/* ── Save Buttons ── */}
        <div className="flex gap-3 justify-end pb-8">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleTestTool}
            disabled={!editId}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            🧪 Test Tool
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
