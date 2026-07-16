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
  "Upload your PDF by dragging it onto the drop zone or clicking to browse. The tool displays each page as a numbered checkbox row in a scrollable list. For a large PDF, scroll the list to navigate to specific pages — every page in the document is shown, not just the first few.",
  "Select the pages you want to remove by clicking their checkboxes. Selected pages highlight in red with strikethrough text and a 'Will be removed' label — this makes it visually clear which pages are marked before you commit. You can check and uncheck pages freely any number of times until you click the remove button.",
  "Use the 'Select all' button at the top right to check every page simultaneously, then uncheck the ones you want to keep. This reverse-selection approach is faster when most pages should be removed and only a few need to stay. The 'Clear' button deselects everything if you want to start your selection from scratch.",
  "Check the counter at the top of the list — it shows the total page count and how many pages are currently selected for removal. Confirm the number is what you intended. The tool prevents you from removing all pages; at least one must remain in the output file.",
  "Click 'Remove Selected Pages'. The remaining pages are assembled into a new PDF and downloaded automatically with '_removed' in the filename. Open the result to confirm only the pages you intended to remove are gone. Your original file on your device is always untouched — re-upload it if any correction is needed.",
]
const FAQS = [
  { q: "What is the difference between Remove Pages and Extract Pages?", a: "Both tools reduce a PDF to fewer pages but from opposite directions. Remove Pages keeps everything except the pages you flag for deletion. Extract Pages keeps only the pages you specifically select. Use Remove Pages when you know what should go — trimming a template cover, a blank separator, or an internal approval stamp. Use Extract Pages when you know what should stay — isolating a specific contract clause or financial summary. Either approach can achieve the same result depending on which is more convenient given how you think about the task." },
  { q: 'Can I remove pages from the middle of a document without affecting page order?', a: 'Yes. Removing pages from the middle simply closes the gap — pages before and after the removed section join seamlessly in the output. Page order is preserved exactly, with only the removed pages absent. For example, removing pages 5 and 6 from a 10-page PDF produces a file with the original pages 1–4 followed by the original pages 7–10. The content of every retained page is completely unchanged — no re-rendering, no recompression, and no alteration of text, images, or formatting.' },
  { q: 'Can I undo a page removal after the file has downloaded?', a: 'Once the PDF has been downloaded and the session has ended, the operation cannot be reversed through this tool. However, since AWE-OS Remove Pages always creates a new file and never modifies your original, you still have the full original PDF on your device with all pages intact. Simply re-upload the original and make a fresh selection. This is why keeping your source files until you have verified the output is strongly recommended — nothing is permanently lost as long as you retain the original document.' },
  { q: 'Will removing pages affect the remaining pages content or quality?', a: 'No. The remaining pages are copied into the new PDF exactly as they were — text, images, fonts, hyperlinks, annotations, and form fields are all preserved without any modification. The removal operation does not re-render, recompress, or alter content on retained pages in any way. The output file is proportionally smaller than the input (roughly reflecting the proportion of removed pages), but each individual remaining page is byte-for-byte identical to what it was in the source document.' },
  { q: 'Is there a maximum number of pages I can remove at once?', a: "You can remove any number of pages in a single operation — from one page to all-but-one pages of the document. The only restriction is that at least one page must remain in the output; you cannot remove every page. For very large PDFs, the removal operation may take a few extra seconds as the library processes the file in browser memory, but there is no practical page or size limit. All processing runs locally using pdf-lib, so there are no server-side quotas or file size restrictions to work around." },
  { q: 'Is my PDF safe when I use this tool?', a: 'Yes. AWE-OS Remove Pages runs entirely within your browser using pdf-lib — your PDF is never uploaded to any server at any point. The file is read from your device into browser memory, the selected pages are excluded during the copy operation, and the resulting PDF is downloaded directly to your device. No part of your file is transmitted over the internet. This makes the tool safe to use with confidential documents — financial statements, legal filings, medical records — without exposing them to any third-party service.' },
]
const ABOUT = [
  'PDFs often contain pages that should not be shared: template cover pages, blank separators, internal approval stamps, redundant appendices, or sections not relevant to the intended recipient. Removing those pages before sharing used to require a full desktop PDF editor. The AWE-OS Remove PDF Pages tool lets you delete any combination of pages from a PDF instantly, entirely in your browser, with no upload required.',
  'The interface shows each page as a numbered entry with a checkbox. Select any pages you want to remove — individual pages, ranges, or random selections scattered throughout the document — then click "Remove Selected Pages". The tool creates a new PDF from the remaining pages and downloads it immediately. Your original file on disk is never modified.',
  'The checkbox system makes bulk operations efficient. "Select all" checks every page, which you can then deselect the pages you want to keep — an effective approach when only a few pages from a long document are needed. An error prevents removing all pages, ensuring the output always contains at least one page.',
  'All processing is done client-side using pdf-lib — no upload, no server, no account required. The tool creates a copy of your document with the unwanted pages excluded; the original PDF remains exactly as it was. This non-destructive approach means you can always return to the original if you remove the wrong pages accidentally.',
]

export default function RemovePagesPDF() {
  return (
    <ToolPageShell slug="remove-pages-pdf" name="Remove PDF Pages" icon="🗑️"
      description="Delete unwanted pages from your PDF. Select pages to remove and download the result."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Removed pages cannot be recovered from the output file — keep your original."}>
      <RemovePagesTool />
    </ToolPageShell>
  )
}
