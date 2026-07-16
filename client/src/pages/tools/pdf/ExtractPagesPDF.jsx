import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile, parsePageRanges } from './pdfUtils'

function ExtractTool() {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [inputMode, setInputMode] = useState('select')
  const [selected, setSelected] = useState(new Set())
  const [rangeInput, setRangeInput] = useState('')
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

  const extract = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing')

    let pageIndices
    if (inputMode === 'select') {
      if (selected.size === 0) { setError('Select at least one page.'); setPhase('idle'); return }
      pageIndices = [...selected].sort((a, b) => a - b)
    } else {
      const pages = parsePageRanges(rangeInput, pageCount)
      if (!pages.length) { setError('Enter valid page numbers or ranges.'); setPhase('idle'); return }
      pageIndices = pages.map(p => p - 1)
    }

    try {
      const buf = await files[0].arrayBuffer()
      const srcPdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const newPdf = await PDFDocument.create()
      const copied = await newPdf.copyPages(srcPdf, pageIndices)
      copied.forEach(p => newPdf.addPage(p))
      downloadFile(await newPdf.save(), files[0].name.replace('.pdf', '_extracted.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to extract pages.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageCount(0); setSelected(new Set()) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageCount > 0 && (
        <>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[['select', '☑️ Select pages'], ['range', '🔢 Enter range']].map(([val, lbl]) => (
              <button key={val} onClick={() => setInputMode(val)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${inputMode === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {lbl}
              </button>
            ))}
          </div>

          {inputMode === 'select' ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                {selected.size} of {pageCount} pages selected
              </div>
              <div className="divide-y divide-gray-100">
                {Array.from({ length: pageCount }, (_, i) => (
                  <label key={i} className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${selected.has(i) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="w-4 h-4 accent-blue-600" />
                    <div className="w-8 h-10 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400">{i + 1}</div>
                    <span className={`text-sm ${selected.has(i) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>Page {i + 1}</span>
                    {selected.has(i) && <span className="text-xs text-blue-500 ml-auto">✓ Extract</span>}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Pages to extract (e.g. 1, 3-5, 8)
              </label>
              <input value={rangeInput} onChange={e => setRangeInput(e.target.value)}
                placeholder="e.g. 1, 3-5, 8, 10"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1.5">Use commas to separate pages and hyphens for ranges.</p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">Pages extracted and downloaded!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageCount(0); setSelected(new Set()) }}
            className="mt-3 text-sm text-green-700 hover:underline">Extract from another PDF</button>
        </div>
      ) : (
        <button onClick={extract} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Extracting…</> : 'Extract Pages'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  "Upload your PDF by dragging it onto the drop zone or clicking to select it. The tool reads the page count and immediately presents two selection methods — a visual checklist for picking pages individually by number, or a text range input for quickly describing contiguous or scattered selections using standard notation.",
  "If your PDF has a manageable number of pages, use the 'Select pages' checkbox mode. Each page appears as a numbered row — click any rows you want to extract and they highlight in blue with a checkmark. You can select any combination of non-consecutive pages scattered throughout a long document without any restrictions on which pages can be chosen.",
  "For larger documents where you already know the page numbers, switch to 'Enter range' mode and type your selection: individual page numbers separated by commas (e.g. 3, 7, 12), contiguous ranges using a hyphen (e.g. 5–10), or a combination of both (e.g. 1, 3–5, 8, 15–20). All ranges are inclusive on both ends.",
  "Review the total shown above the list to confirm your selection does not exceed the page count. Then click 'Extract Pages' to process. A new PDF containing only your selected pages downloads automatically — page content, fonts, images, links, and annotations are all preserved exactly as they were in the source.",
  "Open the downloaded file to verify it contains the correct pages in the right order. The extracted pages appear in the same sequence they had in the original document, regardless of the order you ticked checkboxes. Your original PDF remains unchanged on your device at all times.",
]
const FAQS = [
  { q: 'What is the difference between Extract Pages and Remove Pages?', a: "Both tools reduce a PDF to fewer pages, but from opposite directions. Extract Pages creates a new PDF containing only the pages you specifically select — everything else is left out. Remove Pages creates a new PDF containing everything except the pages you flag for deletion — everything else is kept. Use Extract when you know exactly which pages you need (isolating a specific section). Use Remove when you know which pages you don't need (trimming unwanted content). Either approach can achieve the same result depending on which is more convenient for your task." },
  { q: 'Can I extract non-consecutive pages from throughout the document?', a: 'Yes. Both selection modes support non-consecutive pages with no restrictions. In checkbox mode, tick any pages regardless of their position — page 2, page 7, and page 45 can all be selected together. In range mode, separate individual numbers with commas: "2, 5, 8, 14" extracts exactly those four pages. You can also mix ranges and individual numbers in the same expression: "1, 3–5, 8, 15–20" extracts page 1, pages 3 through 5, page 8, and pages 15 through 20 — nine pages from different locations in the document.' },
  { q: 'Does extracting pages preserve the quality of the content?', a: 'Yes, completely. AWE-OS Extract Pages uses pdf-lib to copy selected pages into a new PDF document. The copy process preserves all page content exactly: text layers remain selectable and searchable, images retain their original resolution, embedded fonts are carried over, hyperlinks and annotations remain functional, and vector graphics are not re-rasterised. The extracted pages are exact copies of the originals — the only difference is that the output file contains fewer pages than the source. No re-rendering or recompression occurs at any stage.' },
  { q: 'Will the extracted pages keep their original page numbers?', a: "Visible page numbers printed as content within each page — if any exist — are preserved as-is since they are part of the page content itself. What changes is the PDF's internal page numbering structure: if you extract pages 10–20 from a 50-page document, the output PDF has pages numbered 1–11 internally (what PDF viewer navigation shows), even though the visible headers might still say 'Page 10' through 'Page 20'. To add fresh sequential numbers matching the extract's new sequence, use the AWE-OS Add Page Numbers tool afterward." },
  { q: 'Is there a maximum number of pages I can extract at once?', a: 'No. You can extract a single page, dozens of pages, or hundreds of pages from a very large document — there is no imposed limit. Performance scales with your device hardware and the source PDF size. On modern devices, extracting 50 pages from a 200-page document typically completes in under five seconds. For very large PDFs (500+ pages with heavy images), the initial file loading may take a moment, but the extraction itself is fast once the file is loaded into browser memory.' },
  { q: 'Is my PDF uploaded to any server when I use this tool?', a: 'No. Every step happens locally in your browser. The PDF is read from your device into browser memory, pdf-lib processes the page extraction entirely within that memory, and the resulting file is downloaded from memory directly to your device. The file never leaves your device at any point. This makes AWE-OS Extract Pages safe for confidential legal filings, financial reports, medical documents, and any other sensitive materials where uploading to a third-party server is not acceptable.' },
]
const ABOUT = [
  'A large PDF often contains just a few pages that are actually needed — the signature page from a 40-page contract, the financial summary from a 100-page annual report, the relevant diagram from a technical manual. Extracting those specific pages into a separate, shareable PDF without touching the rest of the document is exactly what the AWE-OS Extract Pages tool does. Select the pages you need, extract them, and download the result in seconds.',
  'Two selection methods give you flexibility. The visual checkbox list lets you check individual pages by number — useful for scattered pages throughout a long document. The page range input accepts standard notation (1-5, 8, 12-15) for quickly selecting contiguous blocks. Use either method or combine both depending on what your task requires.',
  'The extracted pages are saved as a new PDF containing only the pages you selected, in the same order they appeared in the original. The original PDF on your device is never modified — extraction creates a separate copy. Page content, formatting, fonts, images, annotations, and form fields are all preserved exactly as they were in the source.',
  'All processing runs in your browser using pdf-lib. No pages are uploaded to any server, no account is required, and there is no size limit on PDFs you can extract from. Common uses: sending only the relevant exhibit from a legal filing, distributing a specific chapter from a technical guide, sharing an individual invoice from a batch-generated PDF, and archiving a particular page set from a larger document.',
]

export default function ExtractPagesPDF() {
  return (
    <ToolPageShell slug="extract-pages-pdf" name="Extract PDF Pages" icon="📄"
      description="Extract specific pages from a PDF and save them as a new document."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Extracts pages as they are — it cannot edit or reflow the extracted content."}>
      <ExtractTool />
    </ToolPageShell>
  )
}
