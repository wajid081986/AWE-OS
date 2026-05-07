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
  'Upload your PDF file.',
  'Choose "Select pages" to tick pages individually, or "Enter range" to type page numbers.',
  'Select or type the pages you want to keep in the new PDF.',
  'Click "Extract Pages" — a new PDF with only those pages will download.',
]
const FAQS = [
  { q: 'What is the difference between Extract and Remove pages?', a: 'Extract keeps the pages you select and creates a new PDF from them. Remove deletes the pages you select and keeps everything else.' },
  { q: 'Can I extract non-consecutive pages?', a: 'Yes. In range mode, use commas: "1, 5, 10-12" will extract pages 1, 5, 10, 11, and 12 into a single PDF.' },
  { q: 'Does extracting affect the original?', a: 'No. The tool creates a new PDF. Your original file is unchanged.' },
  { q: 'Can I extract a single page?', a: 'Yes. Select just one page — the output will be a single-page PDF.' },
  { q: 'Is there a page limit?', a: 'No limit. Works on any size PDF entirely in your browser.' },
]
const ABOUT = [
  'Extract Pages PDF lets you pull specific pages out of a PDF and save them as a new document. Choose pages visually with checkboxes or type page ranges — perfect for isolating chapters, invoices, or specific content.',
  'All extraction happens locally in your browser using pdf-lib. No server upload, no sign-up required.',
]

export default function ExtractPagesPDF() {
  return (
    <ToolPageShell slug="extract-pages-pdf" name="Extract PDF Pages" icon="📄"
      description="Extract specific pages from a PDF and save them as a new document."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <ExtractTool />
    </ToolPageShell>
  )
}
