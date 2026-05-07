import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

function RemovePagesTool() {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const handleFiles = async (f) => {
    setFiles(f); setError(''); setSelected(new Set()); setPhase('idle')
    try {
      const buf = await f[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      setPageCount(pdf.getPageCount())
    } catch { setError('Could not read this PDF.') }
  }

  const toggle = (i) => setSelected(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const selectAll = () => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)))
  const clearAll = () => setSelected(new Set())

  const remove = async () => {
    if (!files[0] || selected.size === 0) return
    if (selected.size >= pageCount) { setError('Cannot remove all pages. At least one page must remain.'); return }
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const toRemove = [...selected].sort((a, b) => b - a)
      toRemove.forEach(i => pdf.removePage(i))
      downloadFile(await pdf.save(), files[0].name.replace('.pdf', '_removed.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to remove pages.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageCount(0); setSelected(new Set()) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageCount > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-gray-600">{pageCount} pages · <span className="font-semibold text-red-600">{selected.size} selected to remove</span></span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select all</button>
              <button onClick={clearAll} className="text-xs text-gray-500 hover:underline">Clear</button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {Array.from({ length: pageCount }, (_, i) => (
                <label key={i}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected.has(i) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)}
                    className="w-4 h-4 accent-red-600 shrink-0" />
                  <div className="w-8 h-10 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 shrink-0">
                    {i + 1}
                  </div>
                  <span className={`text-sm flex-1 ${selected.has(i) ? 'text-red-600 line-through' : 'text-gray-700'}`}>
                    Page {i + 1}
                  </span>
                  {selected.has(i) && <span className="text-xs text-red-500 font-medium shrink-0">Will be removed</span>}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">Pages removed! New PDF downloaded.</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageCount(0); setSelected(new Set()) }}
            className="mt-3 text-sm text-green-700 hover:underline">Remove more pages</button>
        </div>
      ) : (
        <button onClick={remove} disabled={!files[0] || selected.size === 0 || phase === 'processing'}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing'
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Removing…</>
            : `Remove ${selected.size > 0 ? selected.size : ''} Selected Page${selected.size !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF file by dragging or clicking.',
  'Tick the checkboxes next to pages you want to delete.',
  'Use "Select all" / "Clear" for bulk selection.',
  'Click "Remove Selected Pages" — the remaining pages download as a new PDF.',
]
const FAQS = [
  { q: 'Can I remove multiple pages at once?', a: 'Yes. Check any number of pages and click Remove. All checked pages will be deleted from the output PDF.' },
  { q: 'Can I undo a removal?', a: 'Once downloaded, the original file is untouched. The tool creates a new file — your original PDF on disk is never modified.' },
  { q: 'What if I select all pages?', a: 'You cannot remove all pages — at least one must remain. An error will show if you try.' },
  { q: 'Are there any limits?', a: 'No limits. Process any size or page count PDF entirely for free in your browser.' },
  { q: 'Is my PDF safe?', a: 'Yes. All processing is local — your files never leave your device.' },
]
const ABOUT = [
  'Remove Pages PDF lets you delete unwanted pages from any PDF document instantly. Select individual pages with checkboxes, preview which pages will be removed, and download the cleaned result.',
  'The tool removes pages from a copy of your PDF — your original file is never modified. All processing is done client-side using pdf-lib.',
]

export default function RemovePagesPDF() {
  return (
    <ToolPageShell slug="remove-pages-pdf" name="Remove PDF Pages" icon="🗑️"
      description="Delete unwanted pages from your PDF. Select pages to remove and download the result."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <RemovePagesTool />
    </ToolPageShell>
  )
}
