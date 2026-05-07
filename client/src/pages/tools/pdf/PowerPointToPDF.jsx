import { useState, useRef } from 'react'
import { jsPDF } from 'jspdf'
import ToolPageShell from '../ToolPageShell'

const STEPS = [
  { title: 'Upload PowerPoint file', description: 'Select a .pptx file from your computer.' },
  { title: 'Set slide options', description: 'Choose orientation and slide notes.' },
  { title: 'Download PDF', description: 'Get a PDF placeholder with slide information.' },
]
const FAQS = [
  { q: 'Does it preserve slide visuals?', a: 'Full rendering of slide visuals requires a server-side tool. This browser version creates a text-based PDF with your file and slide metadata. For full fidelity, use Microsoft Office or Google Slides.' },
  { q: 'Is my file uploaded?', a: 'No. Your file stays in the browser. Only metadata is read.' },
  { q: 'What is included in the PDF?', a: 'File name, estimated slide count, and a structured placeholder page per slide.' },
]

function countSlides(buf) {
  try {
    const decoder = new TextDecoder()
    const text = decoder.decode(buf.slice(0, 50000))
    const matches = (text.match(/ppt\/slides\/slide\d+\.xml/g) || [])
    const nums = matches.map(m => parseInt(m.match(/slide(\d+)/)?.[1] || '0'))
    return nums.length ? Math.max(...nums) : 1
  } catch { return 1 }
}

export default function PowerPointToPDF() {
  const [file, setFile]       = useState(null)
  const [slideCount, setSlideCount] = useState(0)
  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState('')
  const inputRef = useRef()

  const handleFile = async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.pptx')) { setError('Please upload a .pptx file.'); return }
    setError(''); setFile(f); setStatus('loading')
    try {
      const buf = await f.arrayBuffer()
      const count = countSlides(new Uint8Array(buf))
      setSlideCount(count)
      setStatus('ready')
    } catch {
      setError('Failed to read the file.')
      setStatus('idle')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const convert = () => {
    setStatus('processing')
    try {
      const doc = new jsPDF({ unit: 'mm', format: [254, 190], orientation: 'landscape' })
      const w = doc.internal.pageSize.getWidth()
      const h = doc.internal.pageSize.getHeight()

      for (let i = 0; i < slideCount; i++) {
        if (i > 0) doc.addPage()
        doc.setFillColor(30, 41, 59)
        doc.rect(0, 0, w, h, 'F')
        doc.setFillColor(51, 65, 85)
        doc.roundedRect(20, 20, w - 40, h - 40, 4, 4, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(148, 163, 184)
        doc.text(`SLIDE ${i + 1} of ${slideCount}`, w / 2, 38, { align: 'center' })
        doc.setFontSize(22)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(241, 245, 249)
        doc.text(file.name.replace(/\.pptx$/i, ''), w / 2, h / 2, { align: 'center', maxWidth: w - 60 })
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text('For full visual fidelity, export from PowerPoint or Google Slides.', w / 2, h - 25, { align: 'center' })
      }

      doc.save(file.name.replace(/\.pptx$/i, '.pdf'))
      setStatus('done')
    } catch {
      setError('PDF generation failed.')
      setStatus('ready')
    }
  }

  const reset = () => { setFile(null); setSlideCount(0); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="powerpoint-to-pdf"
      name="PowerPoint to PDF"
      description="Convert .pptx presentations to PDF. Works in your browser — no upload required."
      icon="📊"
      steps={STEPS}
      faqs={FAQS}
      about="PowerPoint (.pptx) files have complex rendering that requires full Office libraries. This browser tool creates a PDF with slide placeholders from your presentation metadata. For pixel-perfect slides, export directly from Microsoft PowerPoint or Google Slides."
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {status === 'idle' || status === 'loading' ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
          >
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-700 font-semibold mb-1">Drop your .pptx file here</p>
            <p className="text-gray-400 text-sm">or click to browse</p>
            <input ref={inputRef} type="file" accept=".pptx" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{file?.name}</p>
                  <p className="text-xs text-gray-400">{slideCount} slide{slideCount !== 1 ? 's' : ''} detected</p>
                </div>
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Remove</button>
            </div>

            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Analysing presentation…</p>
              </div>
            )}

            {(status === 'ready' || status === 'processing' || status === 'done') && slideCount > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 text-center">
                <p className="text-slate-300 text-sm mb-1">Presentation</p>
                <p className="text-white font-bold text-xl mb-2">{file?.name}</p>
                <p className="text-slate-400 text-sm">{slideCount} slide{slideCount !== 1 ? 's' : ''} · Landscape PDF · One page per slide</p>
              </div>
            )}

            {status === 'done' ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold text-lg mb-1">✅ PDF Downloaded!</p>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">Convert another file</button>
              </div>
            ) : (
              <button
                onClick={convert}
                disabled={status === 'processing' || status === 'loading' || !slideCount}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating PDF…</>
                ) : `Convert ${slideCount} Slide${slideCount !== 1 ? 's' : ''} to PDF`}
              </button>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
