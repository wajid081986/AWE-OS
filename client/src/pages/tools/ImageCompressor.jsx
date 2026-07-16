import { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  'Upload your image by clicking the drop zone or dragging a JPG, PNG, or WebP file in. GIF and SVG files are not accepted.',
  'Set your target file size using the Max File Size dropdown (100 KB to 2 MB) and fine-tune output quality with the slider. Lower quality produces smaller files; higher quality preserves more detail.',
  'Click "Compress Image". The tool processes your image in the browser and shows a before-and-after size comparison alongside a side-by-side visual preview.',
  'Review the preview to confirm quality is acceptable, then click "Download" to save the compressed image to your device.',
]
const FAQS = [
  { q: 'Which image formats are supported?', a: 'JPG, JPEG, PNG, and WebP images are all supported. GIF files are not supported because re-compression destroys animation frames. SVG is a vector format requiring a different optimisation approach. The output format matches the input — a JPG stays a JPG, a PNG stays a PNG.' },
  { q: 'How much will my image be compressed?', a: 'Results depend on the original file and quality setting. JPEG photos typically reduce by 40–70% with minimal visible quality loss at 80%+ quality. PNG images compress less dramatically because PNG uses lossless encoding by design. The before-and-after panel shows exact byte savings immediately after compression.' },
  { q: 'Will compression affect image quality?', a: 'Some quality reduction occurs during lossy compression (JPG/WebP). The quality slider lets you control the trade-off precisely. At 85%+ quality, differences are usually imperceptible. At 60–70% quality, files are much smaller but compression artefacts may appear in detailed areas. The side-by-side preview lets you judge visual quality before downloading.' },
  { q: 'Is my image uploaded to a server?', a: 'No. All compression runs entirely in your browser using the browser-image-compression library. Your image is never transmitted anywhere — it is processed in memory locally and saved directly to your device. Safe for personal photos, confidential screenshots, and business images.' },
  { q: 'What is the difference between Max File Size and Quality settings?', a: '"Max File Size" sets an upper ceiling — the tool reduces quality automatically until the output falls under that size. "Quality" sets a compression level directly as a percentage. When both are set, quality runs first, then further reduces if needed to hit the size target. Relying primarily on the quality slider gives more predictable visual results.' },
  { q: 'Can I compress multiple images at once?', a: 'The current version processes one image per session. After downloading the compressed result, click "Reset" to upload and compress the next image. Each compression completes in under a second for typical photos, so batching through multiple images manually is quick.' },
]
const ABOUT = [
  'Unoptimised images are the single most common cause of slow web pages and oversized email attachments. A photo from a modern smartphone can easily reach 5–8 MB — far too large for web upload limits (most platforms cap at 1–5 MB), email size restrictions, and page-load performance budgets. The AWE-OS Image Compressor reduces JPG, PNG, and WebP files to your target size in seconds, entirely in your browser, with a side-by-side visual preview so you can verify quality before downloading.',
  'The tool uses browser-image-compression — a well-maintained open-source library that applies intelligent compression algorithms to reduce file size while maximising retained visual quality. Two controls let you dial in the result: the Max File Size dropdown (100 KB to 2 MB) sets a ceiling for the output, while the quality slider (10%–100%) controls how aggressively the image is compressed. The before-and-after panel shows exact byte counts and percentage savings the moment compression finishes.',
  'Different image types respond differently to compression. JPEG photos typically reduce by 40–70% at high quality settings with minimal visible degradation, because JPEG is already a lossy format designed for photographs. PNG files with transparency compress less dramatically because PNG uses lossless encoding by design; converting such files to WebP often achieves better results. WebP is a modern format with better compression than JPEG at equivalent visual quality and is fully supported by all current browsers.',
  'Browser-based compression is especially valuable when privacy matters. Unlike cloud-based services that upload your images to remote servers — where files may be stored, processed, or retained — this tool never transmits your images anywhere. Everything happens in your browser\'s memory, and the compressed file saves directly to your local storage. No account is needed, there are no usage quotas, and you can compress as many images as you need completely free — safe for personal photos, client work, and confidential screenshots alike.',
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
      about={ABOUT}
      limitation={"Compression is lossy at lower quality settings — keep your original if you may need full quality later."}
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
