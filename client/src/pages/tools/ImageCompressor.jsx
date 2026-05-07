import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  { title: 'Upload image', description: 'Select a JPG, PNG, or WebP image file.' },
  { title: 'Set quality', description: 'Choose target size or quality percentage.' },
  { title: 'Download', description: 'Download the compressed image instantly.' },
]
const FAQS = [
  { q: 'Which image formats are supported?', a: 'JPG, JPEG, PNG, and WebP are supported. GIF and SVG are not.' },
  { q: 'Will my image quality be affected?', a: 'Some quality loss occurs during compression. Adjust the quality slider to balance size and quality.' },
  { q: 'Is my image uploaded to a server?', a: 'No. Compression runs entirely in your browser. Your image never leaves your device.' },
]

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function ImageCompressor() {
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState('')
  const [compressed, setCompressed] = useState(null)
  const [compressedUrl, setCompressedUrl] = useState('')
  const [maxSizeMB, setMaxSizeMB] = useState(0.5)
  const [quality, setQuality]   = useState(0.8)
  const [status, setStatus]     = useState('idle')
  const [error, setError]       = useState('')
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    const valid = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    if (!valid) { setError('Please upload a JPG, PNG, or WebP image.'); return }
    setError(''); setFile(f); setCompressed(null); setCompressedUrl(''); setStatus('ready')
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const compress = async () => {
    if (!file) return
    setStatus('processing'); setError('')
    try {
      const result = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight: 4096,
        useWebWorker: true,
        initialQuality: quality,
        fileType: file.type,
      })
      setCompressed(result)
      if (compressedUrl) URL.revokeObjectURL(compressedUrl)
      setCompressedUrl(URL.createObjectURL(result))
      setStatus('done')
    } catch {
      setError('Compression failed. Try a different quality setting.')
      setStatus('ready')
    }
  }

  const download = () => {
    if (!compressed) return
    const a = document.createElement('a')
    a.href = compressedUrl
    const ext = file.name.split('.').pop()
    a.download = file.name.replace(`.${ext}`, `_compressed.${ext}`)
    a.click()
  }

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview)
    if (compressedUrl) URL.revokeObjectURL(compressedUrl)
    setFile(null); setPreview(''); setCompressed(null); setCompressedUrl(''); setStatus('idle'); setError('')
  }

  const savings = compressed ? Math.round((1 - compressed.size / file.size) * 100) : 0

  return (
    <ToolPageShell
      slug="image-compressor"
      name="Image Compressor"
      description="Compress JPG, PNG and WebP images online — reduce file size without losing quality."
      icon="🖼️"
      steps={STEPS}
      faqs={FAQS}
      about="Image Compressor uses browser-image-compression to reduce image file sizes directly in your browser. No upload required — fast, private, and free."
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {status === 'idle' ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
          >
            <p className="text-4xl mb-3">🖼️</p>
            <p className="text-gray-700 font-semibold mb-1">Drop your image here</p>
            <p className="text-gray-400 text-sm">or click to browse · JPG, PNG, WebP</p>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Before/After size */}
            {(status === 'done' || compressed) && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Original</p>
                  <p className="font-bold text-gray-800">{formatBytes(file?.size || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-center">
                  <p className="text-green-600 font-bold text-lg">−{savings}%</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Compressed</p>
                  <p className="font-bold text-green-700">{formatBytes(compressed?.size || 0)}</p>
                </div>
              </div>
            )}

            {/* Image preview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 text-center">Original</p>
                <img src={preview} alt="original" className="w-full h-36 object-cover rounded-lg border border-gray-200" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400 text-center">Compressed</p>
                {compressedUrl
                  ? <img src={compressedUrl} alt="compressed" className="w-full h-36 object-cover rounded-lg border border-green-200" />
                  : <div className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">preview</div>
                }
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Max File Size</label>
                <select value={maxSizeMB} onChange={e => setMaxSizeMB(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value={0.1}>100 KB</option>
                  <option value={0.3}>300 KB</option>
                  <option value={0.5}>500 KB</option>
                  <option value={1}>1 MB</option>
                  <option value={2}>2 MB</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quality: {Math.round(quality * 100)}%</label>
                <input type="range" min={0.1} max={1} step={0.05} value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  className="w-full accent-purple-600" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
                ✕ Reset
              </button>
              <button
                onClick={compress}
                disabled={status === 'processing'}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {status === 'processing'
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Compressing…</>
                  : 'Compress Image'}
              </button>
              {compressed && (
                <button onClick={download} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors">
                  Download
                </button>
              )}
            </div>
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
