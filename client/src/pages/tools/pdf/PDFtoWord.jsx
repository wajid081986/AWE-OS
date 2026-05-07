import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import ToolPageShell from '../ToolPageShell'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const STEPS = [
  { title: 'Upload PDF', description: 'Select a PDF file to extract text from.' },
  { title: 'Extract text', description: 'All text content is pulled from every page.' },
  { title: 'Download .txt', description: 'Save the extracted text to edit in Word.' },
]
const FAQS = [
  { q: 'Does this create a .docx file?', a: 'The free browser version exports extracted text as a .txt file you can open and edit in Word. True .docx conversion with formatting requires a server-side tool.' },
  { q: 'Will formatting be preserved?', a: 'Plain text is extracted. Complex layouts, tables, and images cannot be fully reconstructed in the browser.' },
  { q: 'Is my PDF uploaded?', a: 'No. Text extraction runs entirely in your browser using PDF.js.' },
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
      about="PDF to Word uses PDF.js to extract text content from every page of your PDF. The result is a structured .txt file you can open directly in Microsoft Word or Google Docs for editing."
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
