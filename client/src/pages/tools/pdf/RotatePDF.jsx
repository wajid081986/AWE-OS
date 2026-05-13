import { useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

function RotateTool() {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [rotations, setRotations] = useState([])
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const handleFiles = async (f) => {
    setFiles(f); setError(''); setPhase('idle')
    try {
      const buf = await f[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const count = pdf.getPageCount()
      setPageCount(count)
      setRotations(Array(count).fill(0))
    } catch { setError('Could not read this PDF.') }
  }

  const rotateOne = (i, delta) =>
    setRotations(r => r.map((v, idx) => idx === i ? (v + delta + 360) % 360 : v))

  const rotateAll = (delta) =>
    setRotations(r => r.map(v => (v + delta + 360) % 360))

  const apply = async () => {
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const pages = pdf.getPages()
      pages.forEach((page, i) => {
        const cur = page.getRotation().angle
        page.setRotation(degrees((cur + rotations[i]) % 360))
      })
      downloadFile(await pdf.save(), files[0].name.replace('.pdf', '_rotated.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to rotate PDF.')
      setPhase('idle')
    }
  }

  const ANGLES = [90, 180, 270]
  const ICONS = { 0: '↑', 90: '→', 180: '↓', 270: '←' }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageCount(0); setRotations([]) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageCount > 0 && (
        <>
          {/* Rotate all */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Rotate All Pages</p>
            <div className="flex gap-2">
              {ANGLES.map(a => (
                <button key={a} onClick={() => rotateAll(a)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded-lg text-xs font-semibold transition-colors">
                  ↻ {a}°
                </button>
              ))}
              <button onClick={() => setRotations(Array(pageCount).fill(0))}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 transition-colors">
                Reset All
              </button>
            </div>
          </div>

          {/* Per-page controls */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">{pageCount} Pages — individual rotation</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {rotations.map((rot, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2">
                  <div className={`w-10 h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500 font-mono shrink-0 transition-transform`}
                    style={{ transform: `rotate(${rot}deg)` }}>
                    P{i + 1}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">Page {i + 1}
                    {rot !== 0 && <span className="ml-1 text-blue-600 text-xs font-medium">({rot}° {ICONS[rot]})</span>}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    {ANGLES.map(a => (
                      <button key={a} onClick={() => rotateOne(i, a)}
                        className="w-9 h-7 text-xs border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        {a}°
                      </button>
                    ))}
                    {rot !== 0 && (
                      <button onClick={() => rotateOne(i, -rot)}
                        className="w-9 h-7 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-400 transition-colors">
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">PDF rotated and downloaded!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageCount(0); setRotations([]) }}
            className="mt-3 text-sm text-green-700 hover:underline">Rotate another PDF</button>
        </div>
      ) : (
        <button onClick={apply} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Rotating…</> : 'Apply Rotation & Download'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF file.',
  'Use "Rotate All Pages" to rotate every page, or adjust individual pages below.',
  'Click the rotation angles (90°, 180°, 270°) for each page you want to rotate.',
  'Click "Apply Rotation & Download" to save your rotated PDF.',
]
const FAQS = [
  { q: 'Can I rotate different pages by different angles?', a: 'Yes. Each page has its own rotation controls. You can set page 1 to 90°, page 2 to 270°, and leave other pages unchanged.' },
  { q: 'What does rotating 180° do?', a: 'It flips the page upside down. Useful when a scanned page was captured upside-down.' },
  { q: 'Does rotation affect PDF quality?', a: 'No. Rotation is a metadata change in the PDF — no re-rendering or re-encoding occurs, so quality is preserved perfectly.' },
  { q: 'Can I undo a rotation?', a: 'Yes. Click the ↺ (reset) button next to any rotated page to restore it to its original orientation.' },
  { q: 'Is my PDF uploaded to any server?', a: 'No. All processing happens locally in your browser using pdf-lib.' },
]
const ABOUT = [
  'Scanned documents and camera-photographed pages often end up rotated incorrectly — a page captured in landscape ends up sideways, or a double-sided scan has every other page upside-down. Fixing orientation one page at a time in a full PDF editor is tedious. The AWE-OS Rotate PDF tool lets you correct individual pages or an entire document in seconds, with precise control over which pages rotate and by how much.',
  'The tool uses pdf-lib to apply rotation settings to selected pages. Three rotation angles are available per page: 90° clockwise, 180° (upside-down flip), and 270° clockwise. A "Rotate All Pages" button applies a single angle to every page at once — ideal for correcting a document that was entirely scanned in the wrong orientation. Individual page controls let you mix angles across a document.',
  'An important technical detail: rotation is stored as metadata in the PDF rather than re-rendering the page content. The actual text, images, and vector graphics are never touched — there is zero quality loss regardless of how many times you rotate. The PDF simply records a rotation instruction that viewers apply when displaying each page.',
  'All processing runs locally in your browser using pdf-lib. Your document is never uploaded to any server, and the rotated PDF downloads directly to your device. No account is required and there are no file size limits — rotate PDFs of any length instantly and privately, whether fixing a single sideways scan or correcting an entire batch of misorientated pages.',
]

export default function RotatePDF() {
  return (
    <ToolPageShell slug="rotate-pdf" name="Rotate PDF" icon="🔄"
      description="Rotate individual PDF pages or all pages at once — 90°, 180°, or 270°."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <RotateTool />
    </ToolPageShell>
  )
}
