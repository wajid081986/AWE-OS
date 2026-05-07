import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import api from '../../../services/api.service'

const CONTENT_TYPES = ['Blog Post', 'Product Description', 'Social Media Post', 'Email Newsletter', 'Ad Copy', 'Press Release', 'Landing Page Copy']
const TONES = ['Professional', 'Casual', 'Persuasive', 'Informative', 'Friendly', 'Humorous', 'Authoritative']
const LENGTHS = [
  { label: 'Short (~150 words)',  value: 'short'  },
  { label: 'Medium (~400 words)', value: 'medium' },
  { label: 'Long (~800 words)',   value: 'long'   },
]

export default function ContentWriter() {
  const [form, setForm] = useState({
    type: 'Blog Post', topic: '', tone: 'Professional', length: 'medium', keywords: '', audience: '',
  })
  const [result, setResult]   = useState('')
  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const generate = async () => {
    if (!form.topic.trim()) { setError('Please enter a topic.'); return }
    setStatus('generating'); setError(''); setResult('')
    try {
      const res = await api.post('/api/tools/generate', { tool: 'content-writer', data: form })
      setResult(res.data.content || res.data.result || '')
      setStatus('done')
    } catch {
      setError('Content generation failed. Please try again.')
      setStatus('idle')
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([result], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${form.type.toLowerCase().replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const wordCount = result.trim() ? result.trim().split(/\s+/).length : 0

  return (
    <>
      <Helmet>
        <title>AI Content Writer — AWE-OS Free Tools</title>
        <meta name="description" content="Generate professional blog posts, ad copy, product descriptions and more with AI. Free, no sign-up." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-3 block">✍️</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Content Writer</h1>
          <p className="text-gray-500 text-sm">Generate professional content for any purpose — free, powered by AI.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {['Free', 'No sign-up', 'AI-powered'].map(b => (
              <span key={b} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-100">{b}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Configure Content</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Topic / Title *</label>
                <textarea value={form.topic} onChange={e => set('topic', e.target.value)} rows={3}
                  placeholder="e.g. Benefits of remote work for startups"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Audience</label>
                <input value={form.audience} onChange={e => set('audience', e.target.value)}
                  placeholder="e.g. Small business owners, students…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Keywords (optional)</label>
                <input value={form.keywords} onChange={e => set('keywords', e.target.value)}
                  placeholder="remote work, productivity, team…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tone</label>
                  <select value={form.tone} onChange={e => set('tone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Length</label>
                  <select value={form.length} onChange={e => set('length', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {LENGTHS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={generate}
                disabled={status === 'generating' || !form.topic.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {status === 'generating'
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                  : '✨ Generate Content'}
              </button>

              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
          </div>

          {/* Output */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900">Generated Content</h2>
                {result && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{wordCount} words</span>
                    <button onClick={copy} className="px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors">
                      {copied ? '✅ Copied' : 'Copy'}
                    </button>
                    <button onClick={download} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
                      Download
                    </button>
                  </div>
                )}
              </div>

              {status === 'generating' ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
                    <p className="text-gray-500 text-sm">AI is writing your {form.type.toLowerCase()}…</p>
                    <p className="text-gray-300 text-xs mt-1">This may take 10–20 seconds</p>
                  </div>
                </div>
              ) : result ? (
                <textarea
                  value={result}
                  onChange={e => setResult(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[400px]"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
                  <div className="text-center">
                    <p className="text-3xl mb-2">✍️</p>
                    <p className="text-gray-400 text-sm">Your generated content will appear here</p>
                    <p className="text-gray-300 text-xs mt-1">Fill in the form and click Generate</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
