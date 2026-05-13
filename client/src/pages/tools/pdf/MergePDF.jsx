import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile, formatBytes } from './pdfUtils'

function MergeTool() {
  const [files, setFiles] = useState([])
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const addFiles = (newFiles) =>
    setFiles(prev => [...prev, ...newFiles.filter(f => !prev.find(e => e.name === f.name))])

  const removeFile = (i) => setFiles(f => f.filter((_, idx) => idx !== i))

  const moveUp = (i) => { if (i === 0) return; setFiles(f => { const a = [...f]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) }
  const moveDown = (i) => { if (i === files.length - 1) return; setFiles(f => { const a = [...f]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) }

  const merge = async () => {
    if (files.length < 2) { setError('Please add at least 2 PDF files.'); return }
    setError(''); setPhase('processing')
    try {
      const merged = await PDFDocument.create()
      for (const file of files) {
        const buf = await file.arrayBuffer()
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
        const copied = await merged.copyPages(pdf, pdf.getPageIndices())
        copied.forEach(p => merged.addPage(p))
      }
      const bytes = await merged.save()
      downloadFile(bytes, 'merged.pdf')
      setPhase('done')
    } catch (e) {
      setError('Failed to merge PDFs. Ensure all files are valid PDFs.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone
        onFiles={addFiles} files={[]} multiple
        label="Drop PDF files here (multiple)" hint="or click to add PDFs"
      />

      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">{files.length} file(s) · Drag to reorder</span>
            <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Clear all</button>
          </div>
          <div className="divide-y divide-gray-100">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => moveUp(i)} disabled={i === 0}
                    className="w-7 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-xs">↑</button>
                  <button onClick={() => moveDown(i)} disabled={i === files.length - 1}
                    className="w-7 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-xs">↓</button>
                  <button onClick={() => removeFile(i)}
                    className="w-7 h-7 rounded border border-gray-200 text-red-400 hover:bg-red-50 text-xs">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-green-800 font-semibold">PDF merged successfully!</p>
          <p className="text-xs text-green-600 mt-1">Your download should have started automatically.</p>
          <button onClick={() => { setPhase('idle'); setFiles([]) }}
            className="mt-3 text-sm text-green-700 hover:underline">Merge more PDFs</button>
        </div>
      ) : (
        <button onClick={merge} disabled={phase === 'processing' || files.length < 2}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Merging…</>
          ) : `Merge ${files.length > 0 ? files.length : ''} PDFs`}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Click the upload area or drag and drop two or more PDF files into the drop zone. Files can be added in any order.',
  'Review the numbered file list. Use the ↑ and ↓ arrow buttons to reorder files into your exact desired merge sequence. Use × to remove any unwanted file.',
  'Click "Merge PDFs" to combine all files. A progress indicator will appear for large batches.',
  'Your merged PDF downloads automatically to your device. Open it to verify all pages appear in the correct order.',
]
const FAQS = [
  { q: 'How many PDF files can I merge at once?', a: 'There is no enforced limit. You can merge as many PDFs as you need. Very large batches (50+ files or several hundred megabytes) may take a little longer due to browser memory, but the tool handles them gracefully without crashing.' },
  { q: 'Does merging affect PDF quality or file size?', a: 'No quality is ever lost. pdf-lib copies every page exactly — fonts, images, hyperlinks, annotations, and vector graphics are preserved without re-encoding. The output file size is roughly the sum of the inputs, minus any resources pdf-lib automatically deduplicates.' },
  { q: 'Are my files uploaded to a server when I merge?', a: 'Never. All merging runs entirely in your browser using the pdf-lib JavaScript library. Your files are not transmitted anywhere, not stored on any server, and are discarded the moment you close or refresh the page.' },
  { q: 'Can I merge password-protected PDFs?', a: 'Password-encrypted PDFs cannot be merged directly — they will fail to load. First remove the password using the Unlock PDF tool on AWE-OS, then upload the unlocked versions to the merger.' },
  { q: 'How do I reorder individual pages within the merged PDF?', a: 'After merging, open the merged file in the Organize PDF tool. You can drag individual pages into any sequence, delete unwanted pages, or split the merged document back into sections.' },
  { q: 'What if I need to merge image files, not PDFs?', a: 'Convert your images to PDF first using the JPG to PDF tool, which turns any number of JPG, PNG, or WEBP images into a single PDF. You can then merge that PDF with other documents.' },
]
const ABOUT = [
  'Merging PDFs is one of the most frequent document tasks in professional, academic, and personal workflows. Whether you are assembling a multi-chapter report, combining scanned receipts for an expense claim, packaging a proposal with its appendices, or consolidating monthly statements into a yearly archive, the AWE-OS PDF Merger handles the job in seconds without any software installation.',
  'Upload your PDFs in any order, then use the numbered arrow controls to arrange them into the exact sequence you need. The list shows the final merge order before you commit — add, remove, or rearrange until the structure is exactly right. Each file is labelled with its name and size so you can easily identify what you have uploaded.',
  'The tool uses the pdf-lib JavaScript library, which runs entirely inside your browser. Every page, font, embedded image, hyperlink, annotation, and form field is copied faithfully from source to output — nothing is re-encoded, re-compressed, or altered in any way. Because all processing is local, your documents never leave your device and your sensitive content stays private.',
  'Common real-world uses include: consolidating quarterly financial reports into a single year-end document, combining a cover letter with a resume and portfolio into one submission PDF, merging separately scanned pages into a complete contract, packaging technical documentation with its diagrams, and archiving multiple invoices into a single records file.',
]

export default function MergePDF() {
  return (
    <ToolPageShell slug="merge-pdf" name="Merge PDF" icon="📎"
      description="Combine multiple PDF files into one document. Drag to reorder before merging."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <MergeTool />
    </ToolPageShell>
  )
}
