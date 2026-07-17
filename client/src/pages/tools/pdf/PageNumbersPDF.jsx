import { useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

const POSITIONS = [
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-left',   label: 'Bottom Left'   },
  { value: 'bottom-right',  label: 'Bottom Right'  },
  { value: 'top-center',    label: 'Top Center'    },
  { value: 'top-left',      label: 'Top Left'      },
  { value: 'top-right',     label: 'Top Right'     },
]

const FORMATS = [
  { value: 'n',        label: '1, 2, 3 …'          },
  { value: 'page-n',   label: 'Page 1, Page 2 …'   },
  { value: 'n-of-t',   label: '1 of 10, 2 of 10 …' },
]

function PageNumbersTool() {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [position, setPosition] = useState('bottom-center')
  const [format, setFormat] = useState('n')
  const [startNum, setStartNum] = useState(1)
  const [fontSize, setFontSize] = useState(11)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const handleFiles = async (f) => {
    setFiles(f); setError(''); setPhase('idle')
    try {
      const buf = await f[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      setPageCount(pdf.getPageCount())
    } catch { setError('Could not read this PDF.') }
  }

  const getLabel = (i, total) => {
    const n = startNum + i
    switch (format) {
      case 'page-n':  return `Page ${n}`
      case 'n-of-t':  return `${n} of ${startNum - 1 + total}`
      default:        return `${n}`
    }
  }

  const apply = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const pages = pdf.getPages()
      const total = pages.length
      const MARGIN = 20

      for (let i = 0; i < total; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()
        const label = getLabel(i, total)
        const textWidth = font.widthOfTextAtSize(label, fontSize)

        let x, y
        const isBottom = position.startsWith('bottom')
        const align = position.endsWith('left') ? 'left' : position.endsWith('right') ? 'right' : 'center'
        y = isBottom ? MARGIN : height - MARGIN - fontSize
        x = align === 'left' ? MARGIN : align === 'right' ? width - textWidth - MARGIN : (width - textWidth) / 2

        page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.3, 0.3, 0.3) })
      }

      downloadFile(await pdf.save(), files[0].name.replace('.pdf', '_numbered.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to add page numbers.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <PDFDropZone onFiles={handleFiles} files={files} onRemove={() => { setFiles([]); setPageCount(0) }}
        label="Drop your PDF here" hint="or click to browse" />

      {pageCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          📄 {pageCount} pages detected
        </div>
      )}

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Position</label>
              <select value={position} onChange={e => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {POSITIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Number Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {FORMATS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Number</label>
              <input type="number" value={startNum} min={0} onChange={e => setStartNum(Math.max(0, +e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Font Size: {fontSize}pt</label>
              <input type="range" min={8} max={18} value={fontSize} onChange={e => setFontSize(+e.target.value)}
                className="w-full mt-2 accent-blue-600" />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500">
            Preview: First page → <strong>{getLabel(0, pageCount || 1)}</strong>
            {pageCount > 1 && <> · Last page → <strong>{getLabel(pageCount - 1, pageCount)}</strong></>}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">Page numbers added and PDF downloaded!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPageCount(0) }}
            className="mt-3 text-sm text-green-700 hover:underline">Add numbers to another PDF</button>
        </div>
      ) : (
        <button onClick={apply} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding Numbers…</> : '🔢 Add Page Numbers'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  "Upload your PDF using the drop zone or file browser. The tool reads the page count and displays it immediately — this total is used in the 'X of Y' format option to show the correct denominator on every page (for example, '3 of 12' on the third page of a 12-page document).",
  "Select where page numbers should appear from the Position dropdown. Bottom Center is the most common placement for professional reports and handouts, Bottom Right is standard for legal filings, Top Center suits books and manuals, and the corner options work well for corporate documents with specific margin and header requirements.",
  "Choose the number format that matches your document style: plain digits (1, 2, 3) for standard documents, 'Page X' for standalone handouts where extra context helps readers, or 'X of Y' for documents distributed as part of a larger set. The preview box shows the exact label that will appear on the first and last page.",
  "Set the starting number if this PDF is part of a multi-part series. For example, if this PDF is Section 2 beginning at page 45 of a larger document, enter 45 — numbering will run from 45 onward. Adjust font size using the slider (11–14pt is standard for most business and academic page layouts).",
  "Click 'Add Page Numbers'. Every page receives the label at exactly the position and in the format you configured. The numbered PDF downloads automatically with '_numbered' added to the filename. Open it to verify the first and last pages display the numbers correctly before sharing.",
]
const FAQS = [
  { q: 'Can I start numbering from a number other than 1?', a: "Yes. The Start Number field accepts any positive integer, which makes it essential when a PDF is one chapter or section of a larger document. If Chapter 1 has 40 pages, Chapter 2 should start at page 41, not page 1 — enter 41 in the Start Number field and the numbering runs correctly from there. The 'X of Y' format also adjusts: '41 of 55' appears on page 1 of a 15-page chapter starting at 41, correctly reflecting the chapter's position within the broader document." },
  { q: 'Will new page numbers conflict with existing ones already in the PDF?', a: 'If the PDF already has page numbers printed as content (as text or image elements on the pages), the new numbers added by this tool will appear alongside them — both sets of numbers will be visible. There is no automatic detection or removal of existing numbers. To replace existing page numbers, first remove them using a PDF editor capable of editing content streams, then use AWE-OS Add Page Numbers to add fresh ones. This situation is common with PDFs exported from design software where numbers were part of the template layout.' },
  { q: 'What font and colour are used for the page numbers?', a: 'The tool uses Helvetica, a clean sans-serif font that is one of the 14 standard fonts embedded in every PDF specification and available in all PDF viewers without requiring a separate font file. This ensures page numbers display correctly on every device and application without font substitution. The colour is medium grey (approximately 30% black), which creates a professional appearance where the page numbers are clearly readable without competing visually with the main content of the document.' },
  { q: 'Can I add page numbers to only some pages, not the entire document?', a: 'The current tool adds page numbers to every page without exception. To number only a subset of pages — for example, skipping a cover page, a blank page, or an appendix — use AWE-OS Extract Pages or AWE-OS Split PDF to isolate the section you want numbered, add numbers to that section, then use AWE-OS Merge PDF to reassemble the document. This multi-step workflow gives you full control over which sections receive page numbers and which are intentionally left unnumbered.' },
  { q: 'Are the page numbers searchable text or image overlays?', a: 'Page numbers are added as real PDF text elements, not image overlays. This means they are searchable, selectable, scalable, and sharp at all zoom levels and print resolutions. They print clearly at any resolution and can be selected by the cursor in any PDF viewer. This is the technically correct approach that meets professional document standards expected in legal filings, academic submissions, and corporate reports where page numbers must be genuine text elements for accessibility and search compliance.' },
  { q: 'Is there a page limit for documents I can add numbers to?', a: 'No. The tool processes documents of any page count — a 5-page handout and a 500-page report use the same process. Processing time scales with page count since the tool adds a text element to every page individually, but even large documents typically complete in under 10 seconds on a modern browser. The entire operation runs locally in your browser — no file is uploaded to any server, no account is needed, and the numbered PDF downloads directly to your device when processing completes.' },
]
const ABOUT = [
  'Page numbers are one of the most basic requirements for professional documents, yet PDFs created from multiple sources, merged from separate files, or exported from design tools often arrive without them. Adding page numbers by hand is impractical for anything longer than a few pages. The AWE-OS Add Page Numbers tool stamps every page of your PDF with sequential numbers automatically, positioned and formatted exactly how you need.',
  'Three number formats give you control over style: plain Arabic numerals (1, 2, 3) for standard documents; labelled format (Page 1, Page 2) for documents where context is helpful; and relative format (1 of 10, 2 of 10) for multi-part documents. Six position options cover all standard placements — top or bottom, and left, centre, or right alignment. A preview shows the first and last page labels before you commit.',
  'Page numbers are rendered as real PDF text elements — not image overlays — which means they are selectable, searchable, and sharp at all zoom levels and print resolutions. Font size and colour are applied consistently across every page for a uniform, professional appearance throughout the document.',
  'All processing runs locally in your browser. Your PDF is never uploaded to any server and the numbered result downloads directly to your device. The tool handles documents of any length — numbering a 500-page report takes the same process as a 10-page handout. No account, no subscription, and no watermarks on the output.',
]

export default function PageNumbersPDF() {
  return (
    <ToolPageShell slug="page-numbers-pdf" name="Add Page Numbers to PDF" icon="🔢"
      description="Add page numbers to every page of your PDF at any position and in any format."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Adds numbers in fixed positions — it cannot detect and avoid existing page content."}>
      <PageNumbersTool />
    </ToolPageShell>
  )
}
