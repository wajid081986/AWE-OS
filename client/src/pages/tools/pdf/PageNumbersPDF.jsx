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
  'Upload your PDF file.',
  'Choose the position for page numbers (bottom center is most common).',
  'Select the number format: plain numbers, "Page X", or "X of Y".',
  'Set the starting number and font size, then click "Add Page Numbers".',
]
const FAQS = [
  { q: 'Can I start numbering from a number other than 1?', a: 'Yes. The "Start Number" field lets you begin from any number. Useful when a PDF is part of a larger document and you need continued page numbering.' },
  { q: 'What positions are available?', a: 'Bottom Center, Bottom Left, Bottom Right, Top Center, Top Left, and Top Right.' },
  { q: 'What number formats are available?', a: '"1, 2, 3" for plain numbers, "Page 1, Page 2" for labeled numbers, and "1 of 10, 2 of 10" for relative numbering.' },
  { q: 'Will existing page numbers in the PDF conflict?', a: 'Page numbers added by this tool are drawn over the page. If the PDF already has printed numbers as part of the content, both will appear. Remove old numbers in a PDF editor first if needed.' },
  { q: 'Is my file uploaded anywhere?', a: 'No. All processing is local in your browser using pdf-lib.' },
]
const ABOUT = [
  'Add Page Numbers inserts numbered labels on every page of your PDF at your chosen position. Three number formats and six position options give you full control over the result.',
  'The preview shows exactly what the first and last page labels will look like before you commit. All processing runs locally in your browser — no server upload, no sign-up required.',
]

export default function PageNumbersPDF() {
  return (
    <ToolPageShell slug="page-numbers-pdf" name="Add Page Numbers to PDF" icon="🔢"
      description="Add page numbers to every page of your PDF at any position and in any format."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <PageNumbersTool />
    </ToolPageShell>
  )
}
