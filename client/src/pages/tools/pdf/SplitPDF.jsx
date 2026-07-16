import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadBlob, parsePageRanges } from './pdfUtils'

function SplitTool() {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState('all')
  const [rangeInput, setRangeInput] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [resultCount, setResultCount] = useState(0)

  const handleFiles = async (f) => {
    setFiles(f); setError('')
    try {
      const buf = await f[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      setPageCount(pdf.getPageCount())
    } catch { setPageCount(0) }
  }

  const split = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const srcPdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const total = srcPdf.getPageCount()
      const zip = new JSZip()

      if (mode === 'all') {
        for (let i = 0; i < total; i++) {
          const newPdf = await PDFDocument.create()
          const [pg] = await newPdf.copyPages(srcPdf, [i])
          newPdf.addPage(pg)
          zip.file(`page_${i + 1}.pdf`, await newPdf.save())
        }
        setResultCount(total)
      } else if (mode === 'range') {
        const ranges = rangeInput.split(';').map(s => s.trim()).filter(Boolean)
        if (!ranges.length) { setError('Enter at least one range.'); setPhase('idle'); return }
        for (const range of ranges) {
          const pages = parsePageRanges(range, total)
          if (!pages.length) continue
          const newPdf = await PDFDocument.create()
          const copied = await newPdf.copyPages(srcPdf, pages.map(p => p - 1))
          copied.forEach(p => newPdf.addPage(p))
          zip.file(`pages_${range.replace(/\s/g, '')}.pdf`, await newPdf.save())
        }
        setResultCount(ranges.length)
      } else {
        const pages = parsePageRanges(rangeInput, total)
        if (!pages.length) { setError('Enter valid page numbers.'); setPhase('idle'); return }
        const newPdf = await PDFDocument.create()
        const copied = await newPdf.copyPages(srcPdf, pages.map(p => p - 1))
        copied.forEach(p => newPdf.addPage(p))
        zip.file('extracted_pages.pdf', await newPdf.save())
        setResultCount(1)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `split_${files[0].name.replace('.pdf', '')}.zip`)
      setPhase('done')
    } catch (e) {
      setError('Failed to split PDF. Please try again.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageCount(0) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          📄 <strong>{files[0]?.name}</strong> — {pageCount} pages
        </div>
      )}

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Split Options</p>
          <div className="space-y-2">
            {[['all', '✂️ Split into individual pages (one PDF per page)'],
              ['range', '📑 Split by ranges (e.g. 1-3; 4-6; 7-10)'],
              ['pages', '🔢 Extract specific pages (e.g. 1, 3, 5)']
            ].map(([val, lbl]) => (
              <label key={val} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${mode === val ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                <input type="radio" value={val} checked={mode === val} onChange={() => { setMode(val); setRangeInput('') }} className="accent-blue-600" />
                <span className="text-sm text-gray-700">{lbl}</span>
              </label>
            ))}
          </div>

          {(mode === 'range' || mode === 'pages') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {mode === 'range' ? 'Ranges (separated by semicolons, e.g. 1-3; 4-6)' : 'Page numbers (e.g. 1, 3, 5-7)'}
              </label>
              <input value={rangeInput} onChange={e => setRangeInput(e.target.value)}
                placeholder={mode === 'range' ? '1-3; 4-6; 7-10' : '1, 3, 5-7'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">{resultCount} PDF file(s) saved as ZIP!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageCount(0) }}
            className="mt-3 text-sm text-green-700 hover:underline">Split another PDF</button>
        </div>
      ) : (
        <button onClick={split} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Splitting…</> : 'Split PDF'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF by dragging it into the drop zone or clicking to browse. The tool detects the total page count automatically.',
  'Select a split mode: "All pages" creates one PDF per page; "Page ranges" lets you define groups (e.g. 1-3; 4-6); "Specific pages" extracts individual pages you name.',
  'For range or page mode, type your selections into the input field — ranges use a hyphen, multiple selections use semicolons or commas.',
  'Click "Split PDF". The tool processes each section and packages all output files into a single ZIP download.',
]
const FAQS = [
  { q: 'What does "split by custom ranges" mean exactly?', a: 'You define page groups separated by semicolons — each group becomes its own PDF. For example, "1-5; 6-10; 11-20" creates three PDFs: pages 1 to 5, pages 6 to 10, and pages 11 to 20. Pages do not have to be sequential and can overlap.' },
  { q: 'Can I extract just a few specific pages?', a: 'Yes — use the "Specific pages" mode and list the page numbers you want, separated by commas. For example "1, 3, 7-9" extracts pages 1, 3, 7, 8, and 9 into a single output PDF.' },
  { q: 'Why is the output packaged as a ZIP file?', a: 'When splitting produces multiple PDFs, bundling them in a ZIP makes downloading practical — one click delivers all files. Most operating systems (Windows, macOS, iOS, Android) open ZIP files natively without additional software.' },
  { q: 'Can I split a 200-page PDF into 200 individual files?', a: 'Yes. The "All pages" mode creates one PDF per page regardless of document length. Processing time scales with page count — a 200-page PDF may take 20–30 seconds in the browser.' },
  { q: 'Are my PDF files sent to a server during splitting?', a: 'No. All processing runs locally in your browser using pdf-lib and JSZip. Your file never leaves your device and is not stored anywhere.' },
  { q: 'Can I merge the resulting split files back together?', a: 'Yes — use the Merge PDF tool to recombine split sections in any order you choose. This workflow is useful for reordering major document sections or assembling a new document from parts of several PDFs.' },
]
const ABOUT = [
  'Splitting a PDF is often the first step in sharing, editing, or reorganising a large document. The AWE-OS PDF Splitter gives you three precise modes of control: extract every page as its own file, define custom page ranges, or pick individual pages — all processed instantly in your browser.',
  'The custom range mode is especially powerful. A "1-10; 11-20; 21-50" instruction splits a 50-page report into three sections in one click. Legal professionals use this to separate contract clauses. Publishers use it to distribute individual chapters. Teachers use it to share specific lesson pages without the full course PDF.',
  'The specific pages mode lets you cherry-pick non-sequential pages — useful for extracting signature pages from a contract, pulling key data tables from a financial report, or isolating pages that need revision before reassembly.',
  'All split results are packaged in a ZIP file because most browsers only support a single automatic download at a time. Once downloaded, unzip to access each individual PDF. The files are named sequentially with their page numbers so you always know exactly which section each file contains. No server, no upload, no account required — just upload, split, and download.',
]

export default function SplitPDF() {
  return (
    <ToolPageShell slug="split-pdf" name="Split PDF" icon="✂️"
      description="Split a PDF into separate pages, custom ranges, or extract specific pages."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Very large PDFs (500+ pages) may be slow on low-memory devices, since all processing happens on your device."}>
      <SplitTool />
    </ToolPageShell>
  )
}
