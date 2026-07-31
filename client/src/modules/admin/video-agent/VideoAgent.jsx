import { useState, useEffect, useRef } from 'react'
import api from '../../../services/api.service'

const STYLES = [
  'cinematic', 'photographic', 'anime',
  'digital-art', 'fantasy', 'documentary',
]

const DURATIONS = [
  { value: 5,  label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
]

const LOADING_MESSAGES = [
  'Initializing Wan 2.7…',
  'AI is rendering frames… (2-5 min)',
  'Processing video…',
  'Almost ready…',
]

function styleLabel(s) {
  return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function VideoAgent() {
  const [mode,           setMode]           = useState('text-to-video')
  const [prompt,         setPrompt]         = useState('')
  const [imageUrl,       setImageUrl]       = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style,          setStyle]          = useState('cinematic')
  const [duration,       setDuration]       = useState(5)
  const [generating,     setGenerating]     = useState(false)
  const [loadingMsgIdx,  setLoadingMsgIdx]  = useState(0)
  const [result,         setResult]         = useState(null)
  const [error,          setError]          = useState(null)
  const [history,        setHistory]        = useState([])
  const [historyErr,     setHistoryErr]     = useState(null)

  const loadingTimerRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (!generating) {
      clearInterval(loadingTimerRef.current)
      setLoadingMsgIdx(0)
      return
    }
    loadingTimerRef.current = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length)
    }, 15_000)
    return () => clearInterval(loadingTimerRef.current)
  }, [generating])

  function loadHistory() {
    api.get('/api/admin/video-agent/history')
      .then(r => setHistory(r.data?.data || []))
      .catch(e => setHistoryErr(e.response?.data?.error || e.message))
  }

  async function generate() {
    if (!prompt.trim()) return
    setError(null)
    setGenerating(true)
    try {
      const res = await api.post('/api/admin/video-agent/generate', {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        style,
        duration,
        mode,
        imageUrl: mode === 'image-to-video' ? imageUrl.trim() || undefined : undefined,
      }, { timeout: 360_000 })
      setResult(res.data.data)
      loadHistory()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function downloadMP4() {
    if (!result?.videoUrl) return
    const link = document.createElement('a')
    link.href = result.videoUrl
    link.download = `awe-os-video-${Date.now()}.mp4`
    link.click()
  }

  async function deleteFromHistory(id) {
    try {
      await api.delete(`/api/admin/video-agent/history/${id}`)
      setHistory(h => h.filter(item => item.id !== id))
    } catch (err) {
      setHistoryErr(err.response?.data?.error || err.message)
    }
  }

  function loadFromHistory(item) {
    setResult({
      videoUrl:       item.video_url,
      prompt:         item.prompt,
      negativePrompt: item.negative_prompt,
      style:          item.style,
      duration:       item.duration,
      mode:           item.mode,
      generatedAt:    item.generated_at,
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">🎬 Video Agent</h1>
      <p className="text-gray-400 text-sm mb-6">
        Generate AI videos — powered by Wan 2.7
      </p>

      {/* ── Mode toggle ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('text-to-video')}
          disabled={generating}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'text-to-video'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white'
          }`}
        >
          📝 Text to Video
        </button>
        <button
          onClick={() => setMode('image-to-video')}
          disabled={generating}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'image-to-video'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white'
          }`}
        >
          🖼️ Image to Video
        </button>
      </div>

      {/* ── Prompt card ────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
        <div className="space-y-3">
          <textarea
            value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the video you want…" disabled={generating} rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5
              text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          {mode === 'image-to-video' && (
            <input
              type="text"
              value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="Image URL" disabled={generating}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5
                text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          )}
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
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={generating}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500">
              {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <button onClick={generate} disabled={generating || !prompt.trim()}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              {generating && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {generating ? 'Generating…' : '🎬 Generate Video'}
            </button>
          </div>
          {generating && (
            <p className="text-gray-500 text-xs animate-pulse">
              {LOADING_MESSAGES[loadingMsgIdx]}
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
              <video
                src={result.videoUrl}
                controls autoPlay loop
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
                  <p className="text-gray-400 text-xs mb-1">Duration</p>
                  <p className="text-gray-300 text-sm">{result.duration}s</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Mode</p>
                  <p className="text-gray-300 text-sm">{result.mode === 'image-to-video' ? 'Image to Video' : 'Text to Video'}</p>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <button onClick={downloadMP4}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  ⬇ Download MP4
                </button>
                <button onClick={generate} disabled={generating}
                  className="border border-gray-600 text-gray-300 hover:text-white hover:border-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  🔄 Regenerate
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
          <p className="p-4 text-xs text-gray-500">No generations yet — create your first video above.</p>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {history.map(item => (
              <div key={item.id} className="relative group rounded-lg overflow-hidden border border-gray-700">
                <video
                  src={item.video_url}
                  className="w-full aspect-square object-cover cursor-pointer"
                  muted loop
                  onMouseEnter={e => e.currentTarget.play()}
                  onMouseLeave={e => e.currentTarget.pause()}
                  onClick={() => loadFromHistory(item)}
                />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity
                  flex flex-col justify-between p-2 pointer-events-none">
                  <p className="text-white text-xs line-clamp-3">{item.prompt}</p>
                  <button
                    onClick={() => deleteFromHistory(item.id)}
                    className="self-end text-xs text-red-400 hover:text-red-300 border border-red-700/50 hover:border-red-500 rounded px-2 py-1 transition-colors pointer-events-auto">
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
