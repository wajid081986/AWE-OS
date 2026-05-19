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
  "Upload your PDF by dragging it onto the drop zone or clicking to browse. The tool reads the complete page list immediately — each page appears as a numbered row in the order it currently exists in the document, giving you an accurate picture of the existing sequence before you make any changes.",
  "Reorder pages using the ↑ and ↓ arrow buttons next to each row. Clicking ↑ moves a page one position earlier; ↓ moves it one position later. Position numbers update in real time as you rearrange, so you always see the exact current sequence. For pages that need to move a long distance, work from one end toward the target position.",
  "Mark pages for deletion by clicking the 🗑️ button. Marked pages highlight in red with strikethrough text and a 'Deleted' label — they are not removed yet. Deletion happens only when you download. Un-mark any page by clicking the ↺ restore button that appears in place of 🗑️ on marked rows.",
  "Check the status line above the page list — it shows the total page count and exactly how many pages will appear in the final output. Confirm the number matches what you expect before clicking Save. The tool prevents saving if zero pages would remain.",
  "Click 'Save Organized PDF' when the sequence is correct. A new PDF with pages in exactly the displayed order (excluding deleted pages) downloads to your device. The original file on your device is never changed — the output is always a brand-new copy.",
]
const FAQS = [
  { q: 'Can I reorder and delete pages in the same session?', a: "Yes — reordering and deletion are fully independent operations you can combine freely in a single pass. Use the arrows to rearrange pages into the correct sequence, and mark unwanted pages for deletion simultaneously using the 🗑️ button. Both sets of changes are applied together when you click 'Save Organized PDF'. There is no need to make separate passes for each type of change. The page counter above the list updates in real time to always show how many pages will appear in the final output." },
  { q: 'Is there a faster way to move a page a long distance in a large document?', a: "Currently the interface uses step-by-step arrow controls, so moving a page a long distance requires multiple clicks. The most efficient approach for large repositioning is to work backwards: instead of moving page 50 upward 45 times, try moving the page currently in position 5 downward toward position 50, which repositions fewer pages relative to each other. Drag-and-drop reordering — which would make large moves instant — is a planned feature upgrade. For now, the arrow approach works well for documents under 30 pages where positions don't need to change drastically." },
  { q: 'What happens to my original PDF when I use this tool?', a: "Your original PDF is never modified. The tool creates an entirely new PDF containing the pages in the order you specified, with deleted pages excluded, and downloads that new file. Your original remains exactly as it was. This non-destructive approach means if you make a mistake — delete the wrong page or put pages in the wrong sequence — you can simply re-upload the original and try again without any data loss. There is no undo feature needed because the source is always intact on your device." },
  { q: 'Does reordering pages change their content or quality in any way?', a: 'No. AWE-OS Organize PDF uses pdf-lib to copy pages into a new document in the sequence you specify. The copy operation preserves all page content exactly: text remains selectable and searchable, images retain their original resolution and compression, embedded fonts are carried over, hyperlinks remain functional, and annotations are preserved. Page content is never re-rendered, recompressed, or modified in any way. The sequence changes but everything visible on each individual page stays identical to the original.' },
  { q: 'Can I use this tool to fix page order after using Merge PDF?', a: 'Yes — this is one of the most common workflows on AWE-OS. Merge PDF combines multiple files in the order you upload them, which is often close to correct but may have a few pages needing fine-tuning. Upload the merged PDF to Organize PDF, adjust any pages that are out of sequence, mark any blank separator pages or duplicate covers for deletion, then download the final result. The two tools complement each other: Merge handles document-level combining and Organize handles page-level fine-tuning of the result.' },
  { q: 'Is there a page limit for documents I can organize?', a: "No. The tool runs entirely in your browser and processes documents of any length — a 5-page handout and a 500-page report use the same process. Performance for very large PDFs depends on your device RAM, as the entire document is held in browser memory during the session. Modern laptops handle large PDFs without difficulty. On mobile devices with limited RAM, very large files may load slowly or approach memory limits. For best performance with long documents, use Chrome or Edge on a desktop computer rather than a mobile browser." },
]
const ABOUT = [
  'A PDF\'s page order is not always correct when it arrives. Scanned documents come out in the wrong sequence. Reports assembled from multiple sources have sections out of order. Merged PDFs need reshuffling before final delivery. The AWE-OS Organize PDF tool gives you complete control over page sequence — reorder any pages into exactly the arrangement you need, remove unwanted ones, and download the result as a clean, properly ordered PDF.',
  'The interface lists every page of your PDF with arrow controls and a delete button. Move any page up or down one position at a time; position numbers update in real time so you always see the exact final sequence before downloading. Reordering and deletion can be combined in a single session — there is no need to make separate passes for each type of change.',
  'This tool is especially useful when working with scanned documents. A multi-page contract scanned page by page often comes out with pages in the wrong order, particularly with double-sided scanning. Organize PDF lets you fix the sequence in one pass. Similarly, when assembling a document from separately-exported sections, merge them with the Merge PDF tool and then fine-tune the page order here.',
  'All processing uses pdf-lib running entirely in your browser. Page content is never re-rendered or re-compressed — only the sequence changes. This means zero quality loss regardless of what the PDF contains. Your document never leaves your device, no server is involved, and there is no file size limit.',
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
