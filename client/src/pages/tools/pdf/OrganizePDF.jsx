import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

function OrganizeTool() {
  const [files, setFiles] = useState([])
  const [pageOrder, setPageOrder] = useState([])
  const [deleted, setDeleted] = useState(new Set())
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const handleFiles = async (f) => {
    setFiles(f); setError(''); setDeleted(new Set()); setPhase('idle')
    try {
      const buf = await f[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      setPageOrder(Array.from({ length: pdf.getPageCount() }, (_, i) => i))
    } catch { setError('Could not read this PDF.') }
  }

  const moveUp = (pos) => {
    if (pos === 0) return
    setPageOrder(o => { const a = [...o]; [a[pos - 1], a[pos]] = [a[pos], a[pos - 1]]; return a })
  }
  const moveDown = (pos) => {
    if (pos === pageOrder.length - 1) return
    setPageOrder(o => { const a = [...o]; [a[pos], a[pos + 1]] = [a[pos + 1], a[pos]]; return a })
  }
  const toggleDelete = (origIdx) =>
    setDeleted(d => { const n = new Set(d); n.has(origIdx) ? n.delete(origIdx) : n.add(origIdx); return n })

  const save = async () => {
    const remaining = pageOrder.filter(i => !deleted.has(i))
    if (remaining.length === 0) { setError('At least one page must remain.'); return }
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const srcPdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const newPdf = await PDFDocument.create()
      const copied = await newPdf.copyPages(srcPdf, remaining)
      copied.forEach(p => newPdf.addPage(p))
      downloadFile(await newPdf.save(), files[0].name.replace('.pdf', '_organized.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to organize PDF.')
      setPhase('idle')
    }
  }

  const remaining = pageOrder.filter(i => !deleted.has(i)).length

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageOrder([]); setDeleted(new Set()) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageOrder.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-gray-600">{pageOrder.length} pages · {remaining} will be saved</span>
            <button onClick={() => setDeleted(new Set())} className="text-xs text-blue-600 hover:underline">Restore all</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
              Use ↑ ↓ to reorder · 🗑️ to mark for deletion
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {pageOrder.map((origIdx, pos) => {
                const isDeleted = deleted.has(origIdx)
                return (
                  <div key={origIdx} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDeleted ? 'bg-red-50 opacity-60' : 'hover:bg-gray-50'}`}>
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {pos + 1}
                    </span>
                    <div className="w-10 h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500 shrink-0">
                      p{origIdx + 1}
                    </div>
                    <span className={`flex-1 text-sm ${isDeleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      Original Page {origIdx + 1}
                    </span>
                    {isDeleted && <span className="text-xs text-red-500 font-medium shrink-0">Deleted</span>}
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => moveUp(pos)} disabled={pos === 0 || isDeleted}
                        className="w-7 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-25 text-xs">↑</button>
                      <button onClick={() => moveDown(pos)} disabled={pos === pageOrder.length - 1 || isDeleted}
                        className="w-7 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-25 text-xs">↓</button>
                      <button onClick={() => toggleDelete(origIdx)}
                        className={`w-7 h-7 rounded border text-xs transition-colors ${isDeleted ? 'border-blue-300 text-blue-500 hover:bg-blue-50' : 'border-gray-200 text-red-400 hover:bg-red-50'}`}>
                        {isDeleted ? '↺' : '🗑️'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">PDF organized and downloaded!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageOrder([]); setDeleted(new Set()) }}
            className="mt-3 text-sm text-green-700 hover:underline">Organize another PDF</button>
        </div>
      ) : (
        <button onClick={save} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : `Save Organized PDF (${remaining} pages)`}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF file.',
  'Use the ↑ ↓ buttons to reorder pages into your desired sequence.',
  'Click 🗑️ next to any page to mark it for deletion (click ↺ to undo).',
  'Click "Save Organized PDF" to download the reordered result.',
]
const FAQS = [
  { q: 'Can I reorder and delete pages in one operation?', a: 'Yes. Reorder pages with the arrows and mark pages for deletion simultaneously, then save everything at once.' },
  { q: 'Is my original PDF modified?', a: 'No. A new file is created and downloaded. Your original remains untouched.' },
  { q: 'Can I move a page from position 10 to position 2 directly?', a: 'The current interface uses step-by-step arrow buttons. For large PDFs, multiple clicks move pages to the desired position. A future drag-and-drop upgrade is planned.' },
  { q: 'What happens to deleted pages?', a: 'They are excluded from the output. They are not permanently removed from your original file.' },
  { q: 'Is there a page limit?', a: 'No limit. All processing is local in your browser.' },
]
const ABOUT = [
  'Organize PDF gives you full control over your document structure. Reorder pages into any sequence using the arrow controls and delete unwanted pages — all in one workflow before saving.',
  'The numbered position indicators update in real time as you move pages, making it easy to track where each page will end up in the final document.',
]

export default function OrganizePDF() {
  return (
    <ToolPageShell slug="organize-pdf" name="Organize PDF" icon="📋"
      description="Reorder and delete PDF pages to reorganize your document structure."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <OrganizeTool />
    </ToolPageShell>
  )
}
