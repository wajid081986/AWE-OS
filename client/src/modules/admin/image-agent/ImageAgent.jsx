import { useState, useEffect } from 'react'
import api from '../../../services/api.service'

const STYLES = [
  'photographic', 'digital-art', 'anime', 'cinematic',
  'comic-book', 'fantasy-art', 'line-art', 'neon-punk',
  '3d-model', 'pixel-art', 'low-poly', 'origami',
]

const SIZES = [
  { value: 'square',    label: 'Square (1024×1024)' },
  { value: 'portrait',  label: 'Portrait (768×1344)' },
  { value: 'landscape', label: 'Landscape (1344×768)' },
  { value: 'wide',      label: 'Wide (1536×640)' },
]

function styleLabel(s) {
  return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function ImageAgent() {
  const [prompt,         setPrompt]         = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style,          setStyle]          = useState('photographic')
  const [size,           setSize]           = useState('square')
  const [generating,     setGenerating]     = useState(false)
  const [result,         setResult]         = useState(null)
  const [error,          setError]          = useState(null)
  const [history,        setHistory]        = useState([])
  const [historyErr,     setHistoryErr]     = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  function loadHistory() {
    api.get('/api/admin/image-agent/history')
      .then(r => setHistory(r.data?.data || []))
      .catch(e => setHistoryErr(e.response?.data?.error || e.message))
  }

  async function generate() {
    if (!prompt.trim()) return
    setError(null)
    setGenerating(true)
    try {
      const res = await api.post('/api/admin/image-agent/generate', {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        style,
        size,
      })
      setResult(res.data.data)
      loadHistory()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function downloadPNG() {
    if (!result?.base64) return
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${result.base64}`
    link.download = `awe-os-image-${Date.now()}.png`
    link.click()
  }

  async function deleteFromHistory(id) {
    try {
      await api.delete(`/api/admin/image-agent/history/${id}`)
      setHistory(h => h.filter(item => item.id !== id))
    } catch (err) {
      setHistoryErr(err.response?.data?.error || err.message)
    }
  }

  function loadFromHistory(item) {
    setResult({
      base64:         item.image_base64,
      seed:           item.seed,
      prompt:         item.prompt,
      negativePrompt: item.negative_prompt,
      style:          item.style,
      size:           item.size,
      generatedAt:    item.generated_at,
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Image Agent</h1>
      <p className="text-gray-400 text-sm mb-6">
        Generate AI images for your content
      </p>

      {/* ── Prompt card ────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
        <div className="space-y-3">
          <textarea
            value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the image you want…" disabled={generating} rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5
              text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          <textarea
            value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
            placeholder="Negative prompt — what to avoid (optional)" disabled={generating} rows={2}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5
              text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          <div className="flex gap-3 items-center flex-wrap">
            <select value={style} onChange={e => setStyle(e.target.value)} disabled={generating}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
              {STYLES.map(s => <option key={s} value={s}>{styleLabel(s)}</option>)}
            </select>
            <select value={size} onChange={e => setSize(e.target.value)} disabled={generating}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
              {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={generate} disabled={generating || !prompt.trim()}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              {generating && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {generating ? 'Generating…' : 'Generate Image'}
            </button>
          </div>
          {generating && (
            <p className="text-gray-500 text-xs animate-pulse">
              Generating image, please wait… (can take 15-30 seconds)
            </p>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4 text-red-300 text-sm">{error}</div>
      )}

      {/* ── Result card ────────────────────────────────────────────────────── */}
      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <img
                src={`data:image/png;base64,${result.base64}`}
                alt={result.prompt}
                className="w-full rounded-lg border border-gray-700"
              />
            </div>
            <div className="flex flex-col">
              <p className="text-gray-400 text-xs mb-1">Prompt</p>
              <p className="text-white text-sm mb-4">{result.prompt}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Style</p>
                  <p className="text-gray-300 text-sm">{styleLabel(result.style || '')}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Size</p>
                  <p className="text-gray-300 text-sm">{result.size}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Seed</p>
                  <p className="text-gray-300 text-sm font-mono">{result.seed ?? '—'}</p>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <button onClick={downloadPNG}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Download PNG
                </button>
                <button onClick={generate} disabled={generating}
                  className="border border-gray-600 text-gray-300 hover:text-white hover:border-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── History grid ──────────────────────────────────────────────────── */}
      <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Recent Generations</h2>
        </div>
        {historyErr ? (
          <p className="p-4 text-xs text-red-400">Could not load history: {historyErr}</p>
        ) : history.length === 0 ? (
          <p className="p-4 text-xs text-gray-500">No generations yet — create your first image above.</p>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {history.map(item => (
              <div key={item.id} className="relative group rounded-lg overflow-hidden border border-gray-700">
                <img
                  src={`data:image/png;base64,${item.image_base64}`}
                  alt={item.prompt}
                  className="w-full aspect-square object-cover cursor-pointer"
                  onClick={() => loadFromHistory(item)}
                />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity
                  flex flex-col justify-between p-2">
                  <p className="text-white text-xs line-clamp-3">{item.prompt}</p>
                  <button
                    onClick={() => deleteFromHistory(item.id)}
                    className="self-end text-xs text-red-400 hover:text-red-300 border border-red-700/50 hover:border-red-500 rounded px-2 py-1 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
