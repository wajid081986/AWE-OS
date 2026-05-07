import { useState } from 'react'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

function hexToRgb01(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { r, g, b }
}

function WatermarkTool() {
  const [files, setFiles] = useState([])
  const [text, setText] = useState('CONFIDENTIAL')
  const [position, setPosition] = useState('center')
  const [opacity, setOpacity] = useState(30)
  const [fontSize, setFontSize] = useState(60)
  const [color, setColor] = useState('#ff0000')
  const [diagonal, setDiagonal] = useState(true)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const apply = async () => {
    if (!files[0]) return
    if (!text.trim()) { setError('Please enter watermark text.'); return }
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)
      const { r, g, b } = hexToRgb01(color)
      const pages = pdf.getPages()

      for (const page of pages) {
        const { width, height } = page.getSize()
        const textWidth = font.widthOfTextAtSize(text, fontSize)

        let x, y
        switch (position) {
          case 'top-left':    x = 40;                    y = height - 60; break
          case 'top-center':  x = (width - textWidth) / 2; y = height - 60; break
          case 'top-right':   x = width - textWidth - 40;  y = height - 60; break
          case 'center':      x = (width - textWidth) / 2; y = height / 2;  break
          case 'bottom-left': x = 40;                    y = 40;          break
          case 'bottom-center': x = (width - textWidth) / 2; y = 40;     break
          case 'bottom-right': x = width - textWidth - 40; y = 40;       break
          default:            x = (width - textWidth) / 2; y = height / 2
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: opacity / 100,
          rotate: diagonal ? degrees(45) : degrees(0),
        })
      }

      downloadFile(await pdf.save(), files[0].name.replace('.pdf', '_watermarked.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to add watermark.')
      setPhase('idle')
    }
  }

  const POSITIONS = [
    ['top-left', 'Top Left'], ['top-center', 'Top Center'], ['top-right', 'Top Right'],
    ['center', 'Center'], ['bottom-left', 'Bottom Left'], ['bottom-center', 'Bottom Center'], ['bottom-right', 'Bottom Right'],
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PDFDropZone onFiles={setFiles} files={files} onRemove={() => setFiles([])}
        label="Drop your PDF here" hint="or click to browse" />

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Watermark Text</label>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                <span className="text-sm text-gray-600 font-mono">{color.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Font Size: {fontSize}px</label>
              <input type="range" min={20} max={120} value={fontSize} onChange={e => setFontSize(+e.target.value)}
                className="w-full accent-blue-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Opacity: {opacity}%</label>
            <input type="range" min={5} max={100} value={opacity} onChange={e => setOpacity(+e.target.value)}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Subtle (5%)</span><span>Solid (100%)</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Position</label>
              <select value={position} onChange={e => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Rotation</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => setDiagonal(true)} className={`flex-1 py-2 text-sm font-medium transition-colors ${diagonal ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>↗ Diagonal</button>
                <button onClick={() => setDiagonal(false)} className={`flex-1 py-2 text-sm font-medium transition-colors ${!diagonal ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>→ Straight</button>
              </div>
            </div>
          </div>

          {/* Preview badge */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[60px]">
            <span style={{ color, opacity: opacity / 100, fontSize: Math.min(fontSize * 0.35, 32), fontWeight: 'bold', transform: diagonal ? 'rotate(20deg)' : 'none' }}
              className="select-none font-sans">
              {text || 'Watermark Preview'}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">💧</p>
          <p className="text-green-800 font-semibold">Watermark added and PDF downloaded!</p>
          <button onClick={() => { setPhase('idle'); setFiles([]) }} className="mt-3 text-sm text-green-700 hover:underline">Watermark another PDF</button>
        </div>
      ) : (
        <button onClick={apply} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding Watermark…</> : '💧 Add Watermark'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your PDF file.',
  'Type your watermark text (e.g. CONFIDENTIAL, DRAFT, COPY).',
  'Customise color, opacity, font size, position, and rotation.',
  'Click "Add Watermark" — every page gets the watermark and the PDF downloads.',
]
const FAQS = [
  { q: 'Will the watermark appear on every page?', a: 'Yes. The watermark is applied to all pages of the PDF.' },
  { q: 'Can I use a low opacity for a subtle watermark?', a: 'Yes. The opacity slider lets you set values as low as 5% for a barely visible watermark, or up to 100% for a fully opaque one.' },
  { q: 'Can I add an image watermark?', a: 'Currently only text watermarks are supported. Image watermarks may be added in a future update.' },
  { q: 'Can the watermark be removed later?', a: 'Text watermarks drawn with pdf-lib are embedded as content in the PDF and are difficult but not impossible to remove with dedicated PDF editors.' },
  { q: 'Is my file uploaded to a server?', a: 'No. All processing is done locally in your browser.' },
]
const ABOUT = [
  'Add Watermark embeds a custom text watermark on every page of your PDF. Control the text content, colour, size, transparency, position, and rotation angle to create exactly the watermark you need.',
  'Common uses include marking documents as CONFIDENTIAL, DRAFT, or COPY before sharing. The live preview shows how your watermark settings will look. Processing is entirely client-side.',
]

export default function WatermarkPDF() {
  return (
    <ToolPageShell slug="watermark-pdf" name="Add Watermark to PDF" icon="💧"
      description="Add a customisable text watermark to every page of your PDF document."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <WatermarkTool />
    </ToolPageShell>
  )
}
