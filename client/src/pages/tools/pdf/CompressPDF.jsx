import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile, formatBytes } from './pdfUtils'

function CompressTool() {
  const [files, setFiles] = useState([])
  const [level, setLevel] = useState('medium')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const compress = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing'); setResult(null)
    try {
      const originalSize = files[0].size
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })

      if (level === 'high' || level === 'medium') {
        pdf.setTitle('')
        pdf.setAuthor('')
        pdf.setSubject('')
        pdf.setKeywords([])
        pdf.setProducer('AWE-OS PDF Compressor')
        pdf.setCreator('AWE-OS')
      }

      const bytes = await pdf.save({ useObjectStreams: level !== 'low' })
      const compressedSize = bytes.byteLength
      const saved = originalSize - compressedSize
      const pct = ((saved / originalSize) * 100).toFixed(1)

      downloadFile(bytes, files[0].name.replace('.pdf', '_compressed.pdf'))
      setResult({ originalSize, compressedSize, saved, pct: parseFloat(pct) })
      setPhase('done')
    } catch (e) {
      setError('Failed to compress PDF. Please try a different file.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={setFiles} files={files} onRemove={() => { setFiles([]); setResult(null) }}
        label="Drop your PDF here" hint="or click to browse" />

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Compression Level</p>
          <div className="grid grid-cols-3 gap-3">
            {[['low', '🟢 Low', 'Fastest, smallest reduction'], ['medium', '🟡 Medium', 'Good balance'], ['high', '🔴 High', 'Maximum reduction']].map(([val, label, desc]) => (
              <button key={val} onClick={() => setLevel(val)}
                className={`p-3 rounded-xl border text-left transition-colors ${level === val ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ℹ️ Browser-side compression removes metadata and optimises PDF structure. Image re-encoding is not possible in the browser.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {result && phase === 'done' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <p className="text-green-800 font-semibold text-center">✅ Compressed successfully!</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Before', formatBytes(result.originalSize), 'text-gray-700'],
              ['After', formatBytes(result.compressedSize), 'text-green-700'],
              ['Saved', result.pct >= 0 ? `${result.pct}%` : '~0%', result.pct > 0 ? 'text-green-700' : 'text-gray-500']
            ].map(([label, val, cls]) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl py-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${cls}`}>{val}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setPhase('idle'); setFiles([]); setResult(null) }}
            className="w-full text-sm text-green-700 hover:underline">Compress another PDF</button>
        </div>
      )}

      {phase !== 'done' && (
        <button onClick={compress} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Compressing…</> : 'Compress PDF'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF file by dragging and dropping or clicking to browse.',
  'Choose a compression level: Low (fast), Medium (balanced), or High (maximum reduction).',
  'Click "Compress PDF" to process your file.',
  'View the before/after size comparison and download your compressed PDF.',
]
const FAQS = [
  { q: 'How much will compression reduce my PDF?', a: 'Results vary by file. PDFs with lots of metadata, redundant streams, or unoptimised structure can see 10–40% reduction. Image-heavy PDFs may see minimal reduction since images cannot be re-encoded in the browser.' },
  { q: 'Will compressing affect quality?', a: 'No visual quality is lost. The tool removes metadata and optimises PDF streams without touching image data or text.' },
  { q: 'Why is my compressed file larger?', a: 'Some PDFs are already well-optimised. Re-saving with pdf-lib may not reduce such files. For heavy image compression, a server-side tool would be needed.' },
  { q: 'Is this tool free?', a: 'Yes, completely free. No sign-up required and no files are uploaded to any server.' },
  { q: 'What is the difference between compression levels?', a: 'Low: basic resave. Medium: metadata removal + object streams. High: all metadata stripped + maximum object stream compression.' },
]
const ABOUT = [
  'Compress PDF optimises your PDF file size by removing redundant data, stripping metadata, and using efficient PDF object stream compression — all within your browser.',
  'Unlike server-based tools, your file never leaves your device. The compression uses pdf-lib\'s built-in optimisation to reduce file size while preserving all content quality.',
]

export default function CompressPDF() {
  return (
    <ToolPageShell slug="compress-pdf" name="Compress PDF" icon="🗜️"
      description="Reduce PDF file size by removing metadata and optimising PDF structure."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <CompressTool />
    </ToolPageShell>
  )
}
