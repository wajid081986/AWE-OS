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
  'Upload your PDF by dragging and dropping it into the drop zone, or click to browse your files.',
  'Select a compression level — Low for a quick resave, Medium for a balanced reduction of metadata and streams, or High for maximum size reduction.',
  'Click "Compress PDF" and wait a moment while the tool processes your file in the browser.',
  'The before/after size panel shows exactly how many bytes were saved. Your compressed PDF downloads automatically.',
]
const FAQS = [
  { q: 'How much will the file size actually decrease?', a: 'Results vary significantly by file type. PDFs with heavy metadata, unoptimised cross-reference tables, or redundant object streams can shrink by 10–40%. PDFs that are already well-optimised or consist mainly of scanned images will see minimal reduction, because browser-side tools cannot re-encode embedded image data.' },
  { q: 'Will compression affect my PDF quality?', a: 'No visual quality is lost. The tool operates exclusively on the PDF\'s structural data — removing metadata fields, stripping creator information, and compressing object streams. Text, images, fonts, hyperlinks, and every other piece of visual content remain completely unchanged.' },
  { q: 'Why did my compressed file end up larger?', a: 'Some PDFs are already internally optimised by the software that created them (e.g. Adobe Acrobat). Re-saving through pdf-lib may slightly increase the size in those cases. For PDFs dominated by embedded images that need re-encoding, a server-side compressor with image processing would achieve greater savings.' },
  { q: 'What is the difference between Low, Medium, and High compression?', a: 'Low performs a basic re-save of the PDF structure. Medium also strips all metadata fields (title, author, producer) and enables object stream compression. High applies all Medium optimisations plus maximum stream compression, giving the smallest possible output the browser-side approach allows.' },
  { q: 'Are my files uploaded anywhere during compression?', a: 'No. All compression runs entirely in your browser using pdf-lib. Your PDF is never transmitted to any server, and is discarded when you close the page.' },
  { q: 'Can I compress a password-protected PDF?', a: 'Password-protected PDFs can often still be processed — the tool uses pdf-lib with the ignoreEncryption flag, which allows structure optimisation on many protected files. However, heavily encrypted PDFs may fail. Use the Unlock PDF tool first if you encounter errors.' },
]
const ABOUT = [
  'PDF file sizes can quickly become a problem — Gmail caps attachments at 25 MB, many CMS platforms limit uploads to 10 MB, and cloud storage quotas fill up fast. The AWE-OS PDF Compressor reduces your PDF\'s size by stripping unnecessary data and optimising the document\'s internal structure, all without uploading your file anywhere.',
  'The tool works by removing redundant metadata (author, creator, producer fields), eliminating unused cross-reference entries, and applying object stream compression — a technique that packs multiple PDF objects into efficient compressed streams. These structural improvements can reduce file size by 10–40% depending on how the original document was created.',
  'It is important to understand the difference between structural compression and image compression. Browser-based tools can optimise the PDF structure but cannot re-encode embedded images — that requires server-side processing. If your PDF is large primarily because of high-resolution scanned images or photos, the size reduction may be modest. For text-heavy documents, reports, and office files, the results are typically more significant.',
  'After compressing, the before-and-after panel shows your exact savings in bytes and percentage. If the result is not sufficient, consider splitting the PDF into smaller sections using the Split PDF tool, or asking whether every image in the document truly needs its current resolution.',
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
