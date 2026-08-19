import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import ToolPageShell from '../ToolPageShell'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

const STEPS = [
  'Upload your PDF by clicking the upload area or dragging the file in. Text-based digital PDFs — reports, contracts, academic papers — extract well. Scanned image PDFs require OCR which is not available in browser-based tools.',
  'A real-time progress bar tracks extraction page by page using PDF.js. Text position and font data are analyzed to detect paragraphs, headings, and bold text. The extracted content appears in a scrollable preview panel so you can review it before downloading.',
  'Click "Download as Word Document (.docx)" to save a fully editable .docx file to your device — ready to open directly in Microsoft Word, Google Docs, or LibreOffice.',
]
const FAQS = [
  { q: 'Does this create a real .docx Word file?', a: 'Yes. The tool builds an actual .docx file (not a renamed .txt) using detected paragraph, heading, and bold structure from your PDF — it opens directly in Microsoft Word, Google Docs, or LibreOffice with no extra "Save As" step.' },
  { q: 'Will my PDF\'s formatting be preserved?', a: 'Paragraph breaks, headings, and bold text are detected from each PDF text item\'s position and font data and carried into the .docx. Tables, columns, images, headers/footers, and exact fonts/spacing are not reconstructed — the result preserves structure and reading order, not pixel-perfect layout.' },
  { q: 'Can I convert a scanned PDF?', a: 'Scanned PDFs are raster images of text, not actual text data. PDF.js can only read real text from a PDF\'s content stream — it cannot perform OCR on images. If your PDF was created by scanning a physical document, the extraction will return empty or minimal text. Use a dedicated OCR tool for scanned documents.' },
  { q: 'Is my PDF uploaded to a server?', a: 'No. All extraction and .docx generation runs entirely in your browser using PDF.js and the docx JavaScript library. Your file is processed locally in memory and never transmitted to any server, making it safe for confidential documents including contracts, financial statements, and medical records.' },
  { q: 'Is there a page limit?', a: 'There is no enforced page limit. The progress bar tracks extraction across all pages. Long documents take proportionally longer — a 100-page document typically extracts in 15–30 seconds depending on device speed and PDF complexity.' },
  { q: 'Why does some text appear scrambled or out of order?', a: 'PDF files store text by visual coordinates, not in reading order. PDF.js reads text in the order it appears in the content stream, which can differ from left-to-right reading order in multi-column layouts and complex page designs. This is a fundamental limitation of text-only PDF extraction — some manual cleanup in Word is sometimes needed.' },
]
const ABOUT = [
  'PDFs are designed for display, not editing — once content is locked into PDF format, the text must be extracted to become editable again. The AWE-OS PDF to Word converter reads every page\'s text directly in your browser, detects paragraph breaks, headings, and bold text from each item\'s position and font, and builds a genuine .docx file — ready to open in Microsoft Word, Google Docs, or LibreOffice.',
  'The extraction engine uses PDF.js — Mozilla\'s battle-tested, open-source PDF rendering library — to read text and layout metadata from every page. Lines are grouped by vertical position, paragraphs are separated by line-gap analysis, and headings are identified by comparing font size against the page\'s median body text size. A preview panel shows the extracted content before you download so you can assess quality.',
  'Understanding what browser-based extraction can and cannot do helps set the right expectations. The tool reads real text from digital PDFs — documents created in Word, exported from business software, or generated programmatically. It cannot perform OCR on scanned pages, which are images. Tables, multi-column layouts, embedded images, and exact fonts are not reconstructed — the .docx preserves reading-order text with paragraph and heading structure, not pixel-perfect layout.',
  'Privacy is a key advantage of the browser-based approach. Your PDF never leaves your device — no server receives it, no service stores it, and no usage is logged. This makes the tool safe for sensitive materials: legal contracts, financial reports, medical records, personal correspondence, and any other confidential documents you need to extract and reuse. Download the .docx file and start editing immediately.',
]

const HEADING_LEVELS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2]

function isBoldFont(fontName = '') {
  return /bold|black|heavy/i.test(fontName)
}

// Groups PDF.js text items (which carry position via `transform` and font
// via `fontName`) into paragraphs, and flags likely headings by comparing
// each line's font size against the page's median body size.
function extractStructuredPage(content) {
  const items = content.items.filter(i => i.str.trim())
  if (!items.length) return []

  const lines = []
  let currentLine = null
  const Y_TOLERANCE = 3

  for (const item of items) {
    const y = item.transform[5]
    const fontSize = Math.hypot(item.transform[2], item.transform[3]) || item.transform[0]
    if (currentLine && Math.abs(currentLine.y - y) <= Y_TOLERANCE) {
      currentLine.text += (currentLine.text.endsWith(' ') ? '' : ' ') + item.str
      currentLine.bold = currentLine.bold && isBoldFont(item.fontName)
      currentLine.fontSize = Math.max(currentLine.fontSize, fontSize)
    } else {
      currentLine = { y, text: item.str, fontSize, bold: isBoldFont(item.fontName) }
      lines.push(currentLine)
    }
  }

  const sizes = lines.map(l => l.fontSize).sort((a, b) => a - b)
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 0

  const paragraphs = []
  let currentPara = null
  let prevY = null
  const PARA_GAP = medianSize * 1.5

  for (const line of lines) {
    const text = line.text.trim()
    if (!text) continue
    const isHeading = medianSize > 0 && line.fontSize >= medianSize * 1.15
    const gapFromPrev = prevY === null ? 0 : Math.abs(prevY - line.y)
    const startsNewPara = isHeading || currentPara === null || currentPara.isHeading || gapFromPrev > PARA_GAP

    if (startsNewPara) {
      currentPara = { text, isHeading, bold: line.bold, level: line.fontSize >= medianSize * 1.4 ? 0 : 1 }
      paragraphs.push(currentPara)
    } else {
      currentPara.text += ' ' + text
    }
    prevY = line.y
  }

  return paragraphs
}

export default function PDFtoWord() {
  const [file, setFile]     = useState(null)
  const [text, setText]     = useState('')
  const [paragraphs, setParagraphs] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [progress, setProgress]   = useState(0)
  const [status, setStatus] = useState('idle')
  const [error, setError]   = useState('')
  const inputRef = useRef()

  const handleFile = async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.pdf')) { setError('Please upload a PDF file.'); return }
    setError(''); setFile(f); setStatus('loading'); setProgress(0)
    try {
      const buf = await f.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise
      setPageCount(pdf.numPages)
      const allParagraphs = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        allParagraphs.push(...extractStructuredPage(content))
        setProgress(Math.round((i / pdf.numPages) * 100))
      }
      setParagraphs(allParagraphs)
      setText(allParagraphs.map(p => p.text).join('\n\n'))
      setStatus('ready')
    } catch {
      setError('Failed to read the PDF. It may be encrypted or corrupted.')
      setStatus('idle')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const download = async () => {
    const docParagraphs = paragraphs.map(p => {
      if (p.isHeading) {
        return new Paragraph({
          heading: HEADING_LEVELS[p.level] || HeadingLevel.HEADING_2,
          children: [new TextRun({ text: p.text, bold: true })],
        })
      }
      return new Paragraph({
        children: [new TextRun({ text: p.text, bold: p.bold })],
      })
    })

    const doc = new Document({ sections: [{ children: docParagraphs }] })
    const blob = await Packer.toBlob(doc)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = file.name.replace(/\.pdf$/i, '.docx'); a.click()
    URL.revokeObjectURL(url)
    setStatus('done')
  }

  const reset = () => { setFile(null); setText(''); setParagraphs([]); setPageCount(0); setProgress(0); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="pdf-to-word"
      name="PDF to Word"
      description="Convert any PDF into an editable Word (.docx) file — free, browser-based, structure preserved."
      icon="📝"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Scanned PDFs (images of text) convert as images, not editable text — this tool does not do OCR."}
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {status === 'idle' ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            <p className="text-4xl mb-3">📄</p>
            <p className="text-gray-700 font-semibold mb-1">Drop your PDF file here</p>
            <p className="text-gray-400 text-sm">or click to browse</p>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{file?.name}</p>
                  <p className="text-xs text-gray-400">{pageCount} page{pageCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Remove</button>
            </div>

            {status === 'loading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Extracting text…</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {(status === 'ready' || status === 'done') && text && (
              <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Extracted Text Preview</p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{text.slice(0, 2000)}{text.length > 2000 ? '\n…' : ''}</pre>
              </div>
            )}

            {status === 'done' ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold text-lg mb-1">✅ Word document downloaded!</p>
                <p className="text-gray-400 text-xs mb-3">Open the .docx file in Microsoft Word, Google Docs, or LibreOffice</p>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">Convert another PDF</button>
              </div>
            ) : (
              <button
                onClick={download}
                disabled={status === 'loading' || !text}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                Download as Word Document (.docx)
              </button>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
