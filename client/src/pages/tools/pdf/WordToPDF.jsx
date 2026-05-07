import { useState, useRef } from 'react'
import { jsPDF } from 'jspdf'
import mammoth from 'mammoth'
import ToolPageShell from '../ToolPageShell'

const STEPS = [
  { title: 'Upload Word file', description: 'Select a .docx file from your device.' },
  { title: 'Preview content', description: 'Your document text is extracted and shown.' },
  { title: 'Download PDF', description: 'Click Convert & Download to get your PDF.' },
]
const FAQS = [
  { q: 'What file types are supported?', a: '.docx (Word 2007+) files are supported. Older .doc format is not supported.' },
  { q: 'Is formatting preserved?', a: 'Basic text, headings and paragraphs are preserved. Complex layouts like tables and images may be simplified.' },
  { q: 'Is my document sent to a server?', a: 'No. Everything runs in your browser. Your file never leaves your device.' },
]

export default function WordToPDF() {
  const [file, setFile] = useState(null)
  const [html, setHtml]   = useState('')
  const [text, setText]   = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError]  = useState('')
  const inputRef = useRef()

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.docx')) { setError('Please upload a .docx file.'); return }
    setError(''); setFile(f); setStatus('loading')
    try {
      const buf = await f.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer: buf })
      setHtml(result.value)
      const textResult = await mammoth.extractRawText({ arrayBuffer: buf })
      setText(textResult.value)
      setStatus('ready')
    } catch {
      setError('Failed to read the Word file. Make sure it is a valid .docx.')
      setStatus('idle')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }

  const convert = () => {
    if (!text) return
    setStatus('processing')
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const margin = 15
      const pageW = doc.internal.pageSize.getWidth()
      const maxW  = pageW - margin * 2
      const lines  = text.split('\n').filter(l => l.trim())

      let y = margin
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)

      for (const line of lines) {
        const wrapped = doc.splitTextToSize(line.trim(), maxW)
        for (const wl of wrapped) {
          if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin }
          doc.text(wl, margin, y)
          y += 6
        }
        y += 2
      }

      doc.save(file.name.replace(/\.docx$/i, '.pdf'))
      setStatus('done')
    } catch {
      setError('PDF generation failed.')
      setStatus('ready')
    }
  }

  const reset = () => { setFile(null); setHtml(''); setText(''); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="word-to-pdf"
      name="Word to PDF"
      description="Convert Word documents (.docx) to PDF instantly in your browser — no upload, 100% private."
      icon="📝"
      steps={STEPS}
      faqs={FAQS}
      about="Our Word to PDF converter uses mammoth.js to extract text and formatting from .docx files, then generates a clean PDF using jsPDF. Everything runs in your browser — your document never touches a server."
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {status === 'idle' || status === 'loading' ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-700 font-semibold mb-1">Drop your .docx file here</p>
            <p className="text-gray-400 text-sm">or click to browse</p>
            <input ref={inputRef} type="file" accept=".docx" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{file?.name}</p>
                  <p className="text-xs text-gray-400">{(file?.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Remove</button>
            </div>

            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Extracting content…</p>
              </div>
            )}

            {(status === 'ready' || status === 'processing' || status === 'done') && html && (
              <div className="border border-gray-200 rounded-xl p-4 max-h-72 overflow-y-auto bg-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Document Preview</p>
                <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            )}

            {status === 'done' ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold text-lg mb-1">✅ PDF Downloaded!</p>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">Convert another file</button>
              </div>
            ) : (
              <button
                onClick={convert}
                disabled={status === 'processing' || status === 'loading'}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Converting…</>
                ) : 'Convert & Download PDF'}
              </button>
            )}
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
