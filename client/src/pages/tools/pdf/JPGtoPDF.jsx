import { useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import ToolPageShell from '../ToolPageShell'
import { formatBytes } from './pdfUtils'

const PAGE_SIZES = { A4: [210, 297], Letter: [215.9, 279.4] }

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = e => resolve(e.target.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function getImageDimensions(dataUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = dataUrl
  })
}

function JPGtoPDFTool() {
  const [images, setImages] = useState([])
  const [pageSize, setPageSize] = useState('A4')
  const [fit, setFit] = useState('fit')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const addImages = (newFiles) => {
    const allowed = newFiles.filter(f => f.type.startsWith('image/'))
    if (!allowed.length) { setError('Only image files (JPG, PNG, WEBP, GIF) are accepted.'); return }
    setError('')
    Promise.all(allowed.map(async f => ({
      file: f,
      preview: await readAsDataURL(f),
    }))).then(items => setImages(prev => [...prev, ...items]))
  }

  const removeImage = (i) => setImages(imgs => imgs.filter((_, idx) => idx !== i))
  const moveUp = (i) => { if (i === 0) return; setImages(imgs => { const a = [...imgs]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) }
  const moveDown = (i) => { if (i === images.length - 1) return; setImages(imgs => { const a = [...imgs]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    addImages(Array.from(e.dataTransfer.files))
  }, [])

  const convert = async () => {
    if (!images.length) return
    setError(''); setPhase('processing')
    try {
      const [pw, ph] = PAGE_SIZES[pageSize]
      const doc = new jsPDF({ unit: 'mm', format: pageSize.toLowerCase(), orientation: 'portrait' })

      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage()
        const { w: iw, h: ih } = await getImageDimensions(images[i].preview)
        const imgType = images[i].file.type.includes('png') ? 'PNG' : 'JPEG'

        let x = 0, y = 0, dw = pw, dh = ph
        if (fit === 'fit') {
          const scale = Math.min(pw / iw, ph / ih)
          dw = iw * scale; dh = ih * scale
          x = (pw - dw) / 2; y = (ph - dh) / 2
        } else if (fit === 'stretch') {
          // fill full page
          dw = pw; dh = ph; x = 0; y = 0
        } else {
          // actual size in mm (assuming 96 dpi)
          dw = (iw / 96) * 25.4; dh = (ih / 96) * 25.4
          if (dw > pw) { const s = pw / dw; dw = pw; dh = dh * s }
          if (dh > ph) { const s = ph / dh; dh = ph; dw = dw * s }
          x = (pw - dw) / 2; y = (ph - dh) / 2
        }

        doc.addImage(images[i].preview, imgType, x, y, dw, dh)
      }

      doc.save('images.pdf')
      setPhase('done')
    } catch (e) {
      setError('Conversion failed. Please try again.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        onClick={() => document.getElementById('img-input').click()}
        className="border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40 rounded-2xl p-10 text-center cursor-pointer transition-all">
        <input id="img-input" type="file" accept="image/*" multiple className="hidden"
          onChange={e => addImages(Array.from(e.target.files))} />
        <p className="text-4xl mb-3">🖼️</p>
        <p className="text-sm font-semibold text-gray-700">Drop images here or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, GIF supported · Multiple files allowed</p>
      </div>

      {/* Image list */}
      {images.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">{images.length} image(s)</span>
            <button onClick={() => setImages([])} className="text-xs text-red-500 hover:underline">Clear all</button>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {images.map(({ file, preview }, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-2">
                <img src={preview} alt={file.name} className="w-10 h-12 object-cover rounded border border-gray-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="w-7 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-xs">↑</button>
                  <button onClick={() => moveDown(i)} disabled={i === images.length - 1} className="w-7 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-xs">↓</button>
                  <button onClick={() => removeImage(i)} className="w-7 h-7 rounded border border-gray-200 text-red-400 hover:bg-red-50 text-xs">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      {images.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.keys(PAGE_SIZES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Image Fit</label>
              <select value={fit} onChange={e => setFit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="fit">Fit to page (keep ratio)</option>
                <option value="stretch">Stretch to fill page</option>
                <option value="actual">Actual size</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">{images.length} image(s) converted to PDF!</p>
          <button onClick={() => { setPhase('idle'); setImages([]) }} className="mt-3 text-sm text-green-700 hover:underline">Convert more images</button>
        </div>
      ) : (
        <button onClick={convert} disabled={!images.length || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Converting…</> : `Convert ${images.length > 0 ? images.length + ' image(s)' : ''} to PDF`}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your JPG, PNG, or WEBP images by dragging or clicking to browse.',
  'Reorder images using the ↑ ↓ arrows — the order determines page order in the PDF.',
  'Choose your page size (A4 or Letter) and image fit option.',
  'Click "Convert to PDF" — a single PDF with one image per page downloads instantly.',
]
const FAQS = [
  { q: 'What image formats are supported?', a: 'JPG, PNG, WEBP, and GIF images are all supported. Each image becomes one page in the PDF.' },
  { q: 'Does image quality change during conversion?', a: 'The images are embedded at their original quality. The "Fit to page" option scales the image to fill the page without distortion.' },
  { q: 'Can I mix portrait and landscape images?', a: 'Yes. All images are placed on the same page size (A4 or Letter). The fit option controls how each image fills its page.' },
  { q: 'Is there a limit on number of images?', a: 'No hard limit, but very many large images may take longer to process. For best performance, use under 50 images per conversion.' },
  { q: 'Are my images uploaded to a server?', a: 'No. All conversion happens in your browser using jsPDF. Your images never leave your device.' },
]
const ABOUT = [
  'JPG to PDF converts any number of images into a single PDF document. Upload multiple images, arrange them in your desired order, and choose a page size to create a professional-looking PDF in seconds.',
  'The tool uses jsPDF for browser-side PDF generation — fast, private, and free. Each image gets its own page with your chosen fit setting.',
]

export default function JPGtoPDF() {
  return (
    <ToolPageShell slug="jpg-to-pdf" name="JPG to PDF" icon="🖼️"
      description="Convert JPG, PNG and WEBP images into a single PDF document."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <JPGtoPDFTool />
    </ToolPageShell>
  )
}
