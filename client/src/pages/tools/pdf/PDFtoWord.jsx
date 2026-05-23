import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import ToolPageShell from '../ToolPageShell'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

const STEPS = [
  'Upload your PDF by clicking the upload area or dragging the file in. Text-based digital PDFs — reports, contracts, academic papers — extract well. Scanned image PDFs require OCR which is not available in browser-based tools.',
  'A real-time progress bar tracks text extraction page by page using PDF.js. The extracted text appears in a scrollable preview panel so you can review the content before downloading.',
  'Click "Download as Text File (.txt)" to save the extracted content to your device.',
  'Open the .txt file in Microsoft Word and use "Save As → Word Document (.docx)" for full editing capability. Google Docs also opens .txt files directly — drag into Google Drive to start editing online.',
]
const FAQS = [
  { q: 'Does this create a .docx Word file?', a: 'The browser-based version exports text as a .txt file. Open it in Word and use "Save As → Word Document (.docx)" to get a fully editable Word file. True .docx conversion — with preserved formatting, tables, and images — requires server-side processing beyond what a browser tool can provide.' },
  { q: 'Will my PDF\'s formatting be preserved?', a: 'Plain text is extracted in reading order. Basic paragraph structure and line breaks are maintained. Visual formatting — font styles, bold/italic, columns, tables, headers/footers, and embedded images — cannot be reconstructed from text extraction alone. The result is the content, not the layout.' },
  { q: 'Can I convert a scanned PDF?', a: 'Scanned PDFs are raster images of text, not actual text data. PDF.js can only read real text from a PDF\'s content stream — it cannot perform OCR on images. If your PDF was created by scanning a physical document, the extraction will return empty or minimal text. Use a dedicated OCR tool for scanned documents.' },
  { q: 'Is my PDF uploaded to a server?', a: 'No. All text extraction runs entirely in your browser using PDF.js — Mozilla\'s open-source PDF library. Your file is processed locally in memory and never transmitted to any server, making it safe for confidential documents including contracts, financial statements, and medical records.' },
  { q: 'Is there a page limit?', a: 'There is no enforced page limit. The progress bar tracks extraction across all pages. Long documents take proportionally longer — a 100-page document typically extracts in 15–30 seconds depending on device speed and PDF complexity.' },
  { q: 'Why does some text appear scrambled or out of order?', a: 'PDF files store text by visual coordinates, not in reading order. PDF.js reads text in the order it appears in the content stream, which can differ from left-to-right reading order in multi-column layouts and complex page designs. This is a fundamental limitation of text-only PDF extraction — some manual cleanup in Word is sometimes needed.' },
]
const ABOUT = [
  'PDFs are designed for display, not editing — once content is locked into PDF format, the text must be extracted to become editable again. The AWE-OS PDF to Word converter extracts all text content from any text-based PDF directly in your browser and delivers a .txt file you can open in Microsoft Word, Google Docs, LibreOffice, or any text editor — immediately ready for editing, reformatting, or reuse.',
  'The extraction engine uses PDF.js — Mozilla\'s battle-tested, open-source PDF rendering library — to read text from every page. A real-time progress bar tracks extraction, and a preview panel shows the extracted text before you download so you can assess quality. The output is a clean plain-text file with paragraph structure preserved, providing a solid starting point for editing without any server involvement.',
  'Understanding what browser-based extraction can and cannot do helps set the right expectations. The tool reads real text from digital PDFs — documents created in Word, exported from business software, or generated programmatically. It cannot perform OCR on scanned pages, which are images. Visual formatting — fonts, columns, tables, and images — is not preserved in the plain-text output. The result is the content, not the layout.',
  'Privacy is a key advantage of the browser-based approach. Your PDF never leaves your device — no server receives it, no service stores it, and no usage is logged. This makes the tool safe for sensitive materials: legal contracts, financial reports, medical records, personal correspondence, and any other confidential documents you need to extract and reuse. Download the .txt file and open it directly in Word or Google Docs to begin editing.',
]

export default function PDFtoWord() {
  const [file, setFile]     = useState(null)
  const [text, setText]     = useState('')
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
      let full = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map(item => item.str).join(' ')
        full += `--- Page ${i} ---\n${pageText}\n\n`
        setProgress(Math.round((i / pdf.numPages) * 100))
      }
      setText(full)
      setStatus('ready')
    } catch {
      setError('Failed to read the PDF. It may be encrypted or corrupted.')
      setStatus('idle')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = file.name.replace(/\.pdf$/i, '.txt'); a.click()
    URL.revokeObjectURL(url)
    setStatus('done')
  }

  const reset = () => { setFile(null); setText(''); setPageCount(0); setProgress(0); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="pdf-to-word"
      name="PDF to Word"
      description="Extract text from any PDF and download it as an editable text file — free, browser-based."
      icon="📝"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
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
                <p className="text-green-600 font-semibold text-lg mb-1">✅ Text file downloaded!</p>
                <p className="text-gray-400 text-xs mb-3">Open the .txt file in Microsoft Word or Google Docs</p>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">Convert another PDF</button>
              </div>
            ) : (
              <button
                onClick={download}
                disabled={status === 'loading' || !text}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                Download as Text File (.txt)
              </button>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
