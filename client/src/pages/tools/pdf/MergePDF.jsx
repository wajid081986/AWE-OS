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
  'Click the upload area or drag and drop multiple PDF files.',
  'Use the ↑ ↓ arrows to reorder files into your desired merge order.',
  'Click "Merge PDFs" to combine all files into one PDF.',
  'Your merged PDF will download automatically to your device.',
]
const FAQS = [
  { q: 'How many PDFs can I merge at once?', a: 'There is no hard limit. You can merge as many PDFs as you like, but very large files may take longer to process.' },
  { q: 'Does merging change my PDF quality?', a: 'No. pdf-lib copies pages exactly as they are, preserving all content, fonts, and formatting without re-encoding anything.' },
  { q: 'Are my files sent to a server?', a: 'No. All merging happens in your browser using pdf-lib. Your files never leave your device.' },
  { q: 'Can I merge password-protected PDFs?', a: 'Protected PDFs may fail to load. Remove the password first using the Unlock PDF tool, then merge.' },
  { q: 'Can I reorder pages after merging?', a: 'Yes — use the Organize PDF tool after merging to reorder individual pages.' },
]
const ABOUT = [
  'Merge PDF lets you combine multiple PDF documents into a single file instantly in your browser. Simply upload your PDFs, set the order using the arrow controls, and download the merged result.',
  'The merge process preserves all original content — text, images, fonts, hyperlinks, and formatting — without any quality loss. Processing happens entirely client-side using pdf-lib, so your files are never uploaded to any server.',
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
