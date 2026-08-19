import { useState, useRef } from 'react'
import { jsPDF } from 'jspdf'
import mammoth from 'mammoth'
import ToolPageShell from '../ToolPageShell'

const STEPS = [
  'Click the upload area or drag your .docx file into the drop zone. Only Word 2007+ files (.docx) are supported — the older binary .doc format is not compatible with browser-based conversion.',
  'The tool uses mammoth.js to extract text and structure from your document. A live preview of the extracted content appears in the panel so you can verify the document was read correctly before converting.',
  'Click "Convert & Download PDF". Headings, paragraphs, bold/italic text, and bulleted or numbered lists are rendered into a clean, real-text (selectable and searchable) PDF using jsPDF.',
  'Your PDF downloads automatically. For complex documents with tables, images, or advanced layouts, consider Word\'s own "Export to PDF" function for pixel-perfect fidelity.',
]
const FAQS = [
  { q: 'What file types are supported?', a: 'Only .docx files (Word 2007 and later) are supported. The older binary .doc format used by Word 2003 and earlier is not compatible with the mammoth.js library used for parsing. If you have a .doc file, open it in Word or LibreOffice and save it as .docx first.' },
  { q: 'Is formatting preserved in the PDF?', a: 'Headings (with size hierarchy), bold, italic, paragraph breaks, and bulleted/numbered lists are detected from your document\'s structure and reproduced in the PDF as real, selectable text. Tables, embedded images, multi-column layouts, text boxes, and exact fonts/spacing are not reconstructed. For complex documents, Word\'s own "Export to PDF" feature produces the closest result to the original.' },
  { q: 'Is my Word document sent to a server?', a: 'No. All processing runs entirely in your browser using the mammoth.js and jsPDF JavaScript libraries. Your .docx file is read locally, converted in memory, and the resulting PDF is saved directly to your device. Nothing is transmitted to any server.' },
  { q: 'Is the text in the PDF selectable and searchable?', a: 'Yes. The PDF is built from real text runs — not a rasterized image of the page — so you can select, copy, and search the text, and it works correctly with screen readers and PDF text search.' },
  { q: 'Why does my PDF look different from the Word document?', a: 'Browser-based conversion extracts text content and structure using mammoth.js, which interprets Word\'s XML format. Advanced formatting — custom fonts, embedded objects, charts, tables, headers/footers with page numbers — is not fully reconstructable in the browser. Word\'s built-in "Export to PDF" is the most accurate option for layout-sensitive documents.' },
  { q: 'Can I convert multiple Word files at once?', a: 'The current version converts one file per session. To convert multiple documents, repeat the process for each file — upload, preview, convert, download. The tool resets automatically when you click "Convert another file."' },
  { q: 'Is there a maximum file size?', a: 'There is no enforced size limit. Very large .docx files with extensive embedded content may take longer to process. For typical documents up to 50 MB, conversion is fast. Extremely large files with many embedded images may encounter browser memory limits on older devices.' },
]
const ABOUT = [
  'Word documents are the default format for business communications, academic papers, legal contracts, and countless other text-based documents. Being able to convert a .docx to PDF instantly — without installing software, creating an account, or waiting for a server — solves one of the most common file format problems people encounter daily. The AWE-OS Word to PDF converter handles this entirely in your browser using two open-source JavaScript libraries.',
  'The conversion process uses mammoth.js to parse the .docx file format — which is a ZIP archive containing XML files — and extract the document\'s structure as HTML. That structure is walked directly (not rasterized) to detect headings, paragraphs, bold/italic runs, and list items, which jsPDF then lays out into a real-text PDF with appropriate heading sizes, paragraph spacing, and text formatting — the output text stays selectable, searchable, and small in file size.',
  'It is important to understand what browser-based conversion means for formatting fidelity. A .docx file can contain hundreds of formatting properties — custom fonts, text boxes, embedded images, charts, complex tables, headers and footers, and watermarks. A browser-based tool reconstructs document structure (headings, paragraphs, emphasis, lists) faithfully but cannot reconstruct tables, images, or advanced layout elements without server-side processing. For straightforward text documents, the output is clean and professional.',
  'All conversion happens locally — your document never leaves your device. This is especially important for confidential documents: contracts, financial statements, personal correspondence, HR documents, and any other sensitive content. There is no file size restriction imposed by server upload limits, no registration required, and no watermark added to the output. Upload your .docx, preview the content, and download your PDF in seconds.',
]

const HEADING_SIZES = { H1: 20, H2: 17, H3: 15, H4: 13, H5: 12, H6: 11 }

// Recursively flattens an element's descendants into inline text runs,
// tracking bold/italic state and inserting explicit line-break markers for <br>.
function getInlineRuns(node, style = { bold: false, italic: false }) {
  const runs = []
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = child.textContent.replace(/\s+/g, ' ')
      if (text) runs.push({ text, ...style })
    } else if (child.nodeType === 1) {
      const tag = child.tagName
      if (tag === 'BR') { runs.push({ break: true }); continue }
      const nextStyle = {
        bold: style.bold || tag === 'STRONG' || tag === 'B',
        italic: style.italic || tag === 'EM' || tag === 'I',
      }
      runs.push(...getInlineRuns(child, nextStyle))
    }
  }
  return runs
}

// Draws a sequence of inline runs word-by-word, switching jsPDF font style
// per run and wrapping/paginating as needed. Returns the new y cursor.
function renderRuns(doc, runs, { x0, y, maxW, marginTop, pageBottom, lineHeight, fontSize }) {
  let x = x0
  doc.setFontSize(fontSize)

  const ensureRoom = () => {
    if (y > pageBottom) { doc.addPage(); y = marginTop; x = x0 }
  }

  for (const run of runs) {
    if (run.break) { y += lineHeight; x = x0; ensureRoom(); continue }
    const style = run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal'
    doc.setFont('helvetica', style)
    const words = run.text.split(' ').filter(Boolean)
    for (const word of words) {
      const wordWidth = doc.getTextWidth(word + ' ')
      if (x + wordWidth > x0 + maxW) { y += lineHeight; x = x0; ensureRoom() }
      ensureRoom()
      doc.text(word, x, y)
      x += wordWidth
    }
  }
  return y + lineHeight
}

export default function WordToPDF() {
  const [file, setFile] = useState(null)
  const [html, setHtml]   = useState('')
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
      setStatus('ready')
    } catch {
      setError('Failed to read the Word file. Make sure it is a valid .docx.')
      setStatus('idle')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }

  const convert = () => {
    if (!html) return
    setStatus('processing')
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const margin = 15
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const maxW  = pageW - margin * 2
      const pageBottom = pageH - margin
      let y = margin

      const body = new DOMParser().parseFromString(html, 'text/html').body

      const renderBlock = (runs, { fontSize, lineHeight, indent = 0, bold = false }) => {
        if (!runs.length) return
        if (bold) runs = runs.map(r => (r.break ? r : { ...r, bold: true }))
        y = renderRuns(doc, runs, {
          x0: margin + indent, y, maxW: maxW - indent, marginTop: margin,
          pageBottom, lineHeight, fontSize,
        })
        y += lineHeight * 0.4
      }

      const renderList = (listEl, ordered) => {
        let index = 1
        for (const li of listEl.children) {
          if (li.tagName !== 'LI') continue
          const prefix = ordered ? `${index++}. ` : '• '
          const runs = [{ text: prefix, bold: false, italic: false }, ...getInlineRuns(li)]
          renderBlock(runs, { fontSize: 11, lineHeight: 6, indent: 6 })
        }
      }

      for (const el of body.children) {
        const tag = el.tagName
        if (tag === 'TABLE' || tag === 'IMG' || tag === 'FIGURE') continue // not reconstructed — documented limitation
        if (tag === 'UL') { renderList(el, false); continue }
        if (tag === 'OL') { renderList(el, true); continue }
        if (HEADING_SIZES[tag]) {
          renderBlock(getInlineRuns(el), { fontSize: HEADING_SIZES[tag], lineHeight: HEADING_SIZES[tag] * 0.42 + 3, bold: true })
          continue
        }
        // Paragraphs and any other block-level element fall back to normal body text.
        renderBlock(getInlineRuns(el), { fontSize: 11, lineHeight: 6 })
      }

      doc.save(file.name.replace(/\.docx$/i, '.pdf'))
      setStatus('done')
    } catch {
      setError('PDF generation failed.')
      setStatus('ready')
    }
  }

  const reset = () => { setFile(null); setHtml(''); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="word-to-pdf"
      name="Word to PDF"
      description="Convert Word documents (.docx) to PDF instantly in your browser — no upload, 100% private."
      icon="📝"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Complex Word layouts (text boxes, unusual fonts) may shift slightly; always review the output."}
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
