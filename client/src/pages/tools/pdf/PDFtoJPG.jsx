import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import JSZip from 'jszip'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadBlob } from './pdfUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

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
  'Upload your PDF by dragging it into the drop zone or clicking to browse. The tool reads the file locally and detects the total page count automatically — no upload to any server.',
  'Select an output quality level: Low (72 DPI, smallest file size) for quick sharing, Medium (108 DPI, balanced) for screen use, or High (144 DPI, sharpest) for print, presentations, or zoom-heavy viewing.',
  'Click "Convert to JPG". A real-time progress bar tracks rendering page by page using PDF.js directly in your browser.',
  'When complete, a ZIP file containing all JPEG images named sequentially (page_001.jpg, page_002.jpg, etc.) downloads automatically. Unzip to access individual pages.',
]
const FAQS = [
  { q: 'Will every page become a separate image?', a: 'Yes. Every page in the PDF is rendered as its own numbered JPEG file (page_001.jpg, page_002.jpg, and so on). This ensures you can work with individual pages in any image editor, presentation tool, or content management system.' },
  { q: 'Why is the output a ZIP file?', a: 'Browsers support only a single automatic download at a time. Packaging all images into a ZIP file allows you to download an entire multi-page PDF as one click. Most operating systems — Windows, macOS, iOS, and Android — open ZIP files natively.' },
  { q: 'What is the difference between Low, Medium, and High quality?', a: 'Each setting controls two things: the render scale (how many pixels per page) and the JPEG compression rate. Low renders at roughly 72 DPI with higher compression — ideal for thumbnails and quick previews. Medium produces balanced 108 DPI images suitable for screen reading. High renders at 144 DPI with minimal compression for sharp print or detailed review.' },
  { q: 'Can I convert a password-protected PDF?', a: 'Password-protected PDFs will fail to load during conversion. Use the Unlock PDF tool on AWE-OS to remove the password first, then return here to convert the unlocked file to JPG.' },
  { q: 'Is there a page limit?', a: 'There is no enforced page limit. PDFs with many pages take longer to process because each page is individually rendered in the browser. The progress bar shows exactly where conversion stands. A 100-page PDF at Medium quality typically takes 30–60 seconds.' },
  { q: 'Are my PDF files sent to a server during conversion?', a: 'No. All rendering runs entirely in your browser using PDF.js — the same open-source library used by Firefox\'s built-in PDF viewer. Your file never leaves your device and is not stored anywhere.' },
]
const ABOUT = [
  'Converting a PDF to JPG images unlocks a document for uses that PDFs cannot serve: embedding pages into presentations, uploading to image-based platforms, editing in photo tools, sharing individual pages on social media, or generating thumbnails for document management systems. The AWE-OS PDF to JPG converter handles all of this without requiring any account, installation, or server upload.',
  'The tool uses PDF.js — Mozilla\'s battle-tested, open-source PDF rendering engine — to draw each page onto an HTML canvas and export it as a JPEG. This approach gives you pixel-accurate rendering of text, vector graphics, images, and embedded fonts at whatever resolution you choose. Three quality presets let you balance between fast, compact files and sharp, high-resolution output for different audiences.',
  'Quality matters differently depending on your goal. Low quality (72 DPI) is ideal for thumbnails, web previews, and situations where bandwidth or storage is a concern. Medium (108 DPI) suits email attachments and screen presentations. High quality (144 DPI) is appropriate when the image needs to be printed, projected, or examined closely — it captures fine text and detail that lower settings may blur.',
  'All images are packaged into a ZIP archive because browsers allow only one automatic download at a time; a ZIP solves this cleanly. Files are named page_001.jpg, page_002.jpg, and so on in document order, so every image is instantly identifiable. Common use cases include converting scanned PDF forms to editable images, extracting slides from PDF presentations, pulling product specification pages from technical manuals, and archiving signed documents as accessible images.',
]

export default function PDFtoJPG() {
  return (
    <ToolPageShell slug="pdf-to-jpg" name="PDF to JPG" icon="📸"
      description="Convert every PDF page to a JPG image. Choose quality and download as ZIP."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Output quality depends on the PDF's own resolution — it cannot add detail that isn't there."}>
      <PDFtoJPGTool />
    </ToolPageShell>
  )
}
