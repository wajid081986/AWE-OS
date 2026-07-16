import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile, formatBytes } from './pdfUtils'
import { TOOL_ABOUT } from '../../../data/toolPageContent'

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
  "Click 'Add Files' or drag and drop two or more PDF files into the upload area. You can add files from your computer, phone, or tablet — no account or login required.",
  "Reorder your files by dragging the file cards up or down. The final PDF will follow this exact order. Use the ↑↓ arrows or drag handles to arrange pages correctly before merging.",
  "Click the 'Merge PDF' button. AWE-OS processes all files locally in your browser using the pdf-lib library — your documents are never uploaded to any server.",
  "Your merged PDF downloads automatically to your device. Open it to verify the page order. If you need to reorder pages after merging, use the Organize PDF tool.",
]
const FAQS = [
  {
    q: "How many PDF files can I merge at once?",
    a: "There is no hard limit on the number of files you can merge. You can combine 2, 10, or even 50+ PDF files in one go. Very large batches (100+ files or files totalling several hundred MB) may take longer to process because everything runs locally in your browser memory. For best results with very large merges, use Chrome or Edge on a desktop computer.",
  },
  {
    q: "Does merging PDFs affect the quality or file size?",
    a: "No quality is ever lost when merging. AWE-OS copies every page exactly as-is — all text, images, hyperlinks, annotations, and vector graphics are preserved without re-encoding. The output file size is roughly the sum of the input file sizes, minus any resources pdf-lib automatically deduplicates such as embedded fonts shared across documents.",
  },
  {
    q: "Are my files uploaded to a server when I merge?",
    a: "Never. All merging runs entirely in your browser using the pdf-lib JavaScript library. Your files are never transmitted anywhere, never stored on any server, and are permanently discarded the moment you close or refresh the page. This makes AWE-OS Merge PDF one of the most private PDF tools available online.",
  },
  {
    q: "Can I merge password-protected PDFs?",
    a: "Password-protected PDFs cannot be merged directly — they will fail to load into the tool. You need to first remove the password using the Unlock PDF tool on AWE-OS, then upload the unlocked versions to merge. This is a browser security restriction, not a limitation of our tool.",
  },
  {
    q: "How do I reorder individual pages within the merged PDF?",
    a: "After merging, open the merged file in the Organize PDF tool on AWE-OS. You can drag individual pages into any sequence, delete unwanted pages, or split the merged document back into sections. This two-step workflow — Merge then Organize — gives you full control over the final document structure.",
  },
  {
    q: "What if I need to merge image files, not PDFs?",
    a: "Convert your images to PDF first using the JPG to PDF tool on AWE-OS, which turns any number of JPG, PNG, or WEBP images into a single PDF. You can then merge that PDF with other documents using this tool. This is useful for combining scanned receipts, photos, or screenshots with existing PDF reports.",
  },
]
const ABOUT = TOOL_ABOUT['merge-pdf']

export default function MergePDF() {
  return (
    <ToolPageShell slug="merge-pdf" name="Merge PDF" icon="📎"
      description="Combine multiple PDF files into one document. Drag to reorder before merging."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Password-protected PDFs must be unlocked first — this tool cannot bypass PDF passwords."}>
      <MergeTool />
    </ToolPageShell>
  )
}
