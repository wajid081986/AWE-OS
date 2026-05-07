import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadBlob } from './pdfUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const QUALITY_MAP = { low: { scale: 1.0, jpeg: 0.6 }, medium: { scale: 1.5, jpeg: 0.85 }, high: { scale: 2.0, jpeg: 0.95 } }

async function renderPageToBlob(pdfPage, scale, jpegQuality) {
  const viewport = pdfPage.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', jpegQuality))
}

function PDFtoJPGTool() {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [quality, setQuality] = useState('medium')
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFiles = async (f) => {
    setFiles(f); setError(''); setPageCount(0); setPhase('idle')
    try {
      const buf = await f[0].arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise
      setPageCount(pdf.numPages)
    } catch { setError('Could not read this PDF.') }
  }

  const convert = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing'); setProgress(0)
    try {
      const buf = await files[0].arrayBuffer()
      const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise
      const total = pdfDoc.numPages
      const { scale, jpeg } = QUALITY_MAP[quality]
      const zip = new JSZip()

      for (let i = 1; i <= total; i++) {
        const page = await pdfDoc.getPage(i)
        const blob = await renderPageToBlob(page, scale, jpeg)
        zip.file(`page_${String(i).padStart(3, '0')}.jpg`, blob)
        setProgress(Math.round((i / total) * 100))
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `${files[0].name.replace('.pdf', '')}_pages.zip`)
      setPhase('done')
    } catch (e) {
      setError('Conversion failed. Please check the PDF is not encrypted.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageCount(0) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          📄 {pageCount} pages detected — each page will become a JPG image
        </div>
      )}

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Output Quality</label>
          <div className="grid grid-cols-3 gap-3">
            {[['low', '🟢 Low', '~72 DPI · Small files'], ['medium', '🟡 Medium', '~108 DPI · Balanced'], ['high', '🔴 High', '~144 DPI · Best quality']].map(([val, label, desc]) => (
              <button key={val} onClick={() => setQuality(val)}
                className={`p-3 rounded-xl border text-left transition-colors ${quality === val ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'processing' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Converting pages…</span>
            <span className="font-semibold text-blue-700">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">{pageCount} JPG images saved as ZIP!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageCount(0) }} className="mt-3 text-sm text-green-700 hover:underline">Convert another PDF</button>
        </div>
      ) : (
        <button onClick={convert} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Converting {progress}%…</> : 'Convert to JPG'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF file by dragging or clicking.',
  'Choose output quality: Low (small files), Medium (balanced), or High (best quality).',
  'Click "Convert to JPG" — each page is rendered to a JPEG image.',
  'All images are bundled in a ZIP file and downloaded automatically.',
]
const FAQS = [
  { q: 'Will every page become a separate image?', a: 'Yes. Each page in the PDF is rendered as its own JPEG file, numbered in sequence (page_001.jpg, page_002.jpg, etc.).' },
  { q: 'Why is the output a ZIP file?', a: 'When converting multiple pages, we bundle all the images into a ZIP for a single download.' },
  { q: 'What affects the image quality?', a: 'The quality setting controls both the render scale (DPI) and JPEG compression. High quality produces larger, sharper images. Low quality is faster and produces smaller files.' },
  { q: 'Can I convert a password-protected PDF?', a: 'Password-protected PDFs will fail. Remove the password first using the Unlock PDF tool.' },
  { q: 'Is there a page limit?', a: 'No limit, but large PDFs with many pages take longer to render. The progress bar shows conversion status.' },
]
const ABOUT = [
  'PDF to JPG converts every page of your PDF into a high-quality JPEG image. The tool uses PDF.js for browser-side rendering, producing sharp, accurate images from your PDF content.',
  'Choose from three quality levels to balance file size and image clarity. All images are downloaded as a ZIP file. No server upload required — everything runs in your browser.',
]

export default function PDFtoJPG() {
  return (
    <ToolPageShell slug="pdf-to-jpg" name="PDF to JPG" icon="📸"
      description="Convert every PDF page to a JPG image. Choose quality and download as ZIP."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <PDFtoJPGTool />
    </ToolPageShell>
  )
}
