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
  "Drag your PDF onto the upload zone or click to browse for it on your device. There is no file size limit and no requirement to log in — the tool works on desktop and mobile browsers, and your document is never sent to any server at any point during the process.",
  "Type your watermark text in the Watermark Text field. This can be a single word like CONFIDENTIAL or DRAFT, your company name, a document reference number, a date, or any short phrase you want stamped across every page. Keep the text concise — long phrases wrap awkwardly at 45 degrees on most page sizes.",
  "Choose your watermark colour using the colour picker. Red is traditional for CONFIDENTIAL and DRAFT stamps; black or grey suits copyright notices and ownership marks; company brand colours work well for branded distribution copies. Drag the opacity slider to set visibility — 20–40% creates a subtle background stamp while 70–100% creates a prominent, deliberate marking.",
  "Set the font size appropriate for your page size (60–80pt suits standard A4 and Letter pages), choose from seven position options, and toggle between Diagonal and Straight rotation. The live preview panel at the bottom updates instantly as you adjust each setting so you can see the exact appearance before committing.",
  "Click 'Add Watermark' when the preview looks correct. The tool applies the watermark identically to every single page of the document and the watermarked PDF downloads automatically. Open the file to verify several pages — including the first and last — look exactly as intended.",
]
const FAQS = [
  { q: 'Will the watermark appear on every page?', a: 'Yes — the watermark is applied consistently to every page without exception. This is intentional: partial watermarking defeats the purpose of marking a document CONFIDENTIAL or DRAFT, since a recipient could simply look at the unmarked pages. The tool iterates through every page in the PDF and applies identical settings — same text, position, opacity, and colour — to each one. If you only need a watermark on specific pages, use AWE-OS Split PDF to isolate that section, watermark it, then reassemble with AWE-OS Merge PDF.' },
  { q: 'What opacity should I use for a professional watermark?', a: 'The right opacity depends on purpose. For a background DRAFT or CONFIDENTIAL stamp that sits behind text without obscuring readability, 15–30% works well — the marking is clearly visible without making the document hard to read. For a prominent ownership or copyright stamp, 50–70% is standard. For a bold security marking that deliberately impedes content copying — such as on a shared tender document — 80–100% creates a fully opaque stamp. The live preview lets you see the exact visual result at each level before you download.' },
  { q: 'Can I remove the watermark later?', a: "Text watermarks created with pdf-lib are embedded directly into the PDF's content stream as rendered text elements. While skilled users with professional tools like Adobe Acrobat can attempt to remove watermark text by editing content streams, it is not a simple or quick process. Light-coloured watermarks at low opacity are easier to remove; darker diagonal stamps at higher opacity are significantly harder. If you need a reversible watermark you can cleanly remove later, keep the original un-watermarked file and apply watermarks only to the distribution copies you send to others." },
  { q: 'Can I add a logo or image as a watermark instead of text?', a: 'The current AWE-OS Watermark PDF tool supports text watermarks only. Image watermarks — embedding a company logo, signature graphic, or seal — require more complex PDF manipulation and are planned for a future update. For text-based branding, the current tool handles it fully: you can type your company name, website URL, or any identifier as watermark text with your brand colour applied. For image watermarks right now, tools like Adobe Acrobat Pro or PDF-XChange Editor support this feature.' },
  { q: 'What is the difference between diagonal and straight rotation?', a: "The Diagonal option tilts the watermark text at approximately 45 degrees across the page — the classic style associated with official stamps like CONFIDENTIAL, VOID, or SAMPLE. This orientation is visually prominent across the full page and harder to edit out. Straight (horizontal) watermarks suit copyright footers, document version labels, or branded headers where the text needs to be read naturally without tilting the head. The choice depends on whether the watermark is a security marker (diagonal) or an informational label (straight)." },
  { q: 'Is my document uploaded to a server when I add a watermark?', a: 'No. Watermarking runs completely in your browser using pdf-lib, a pure JavaScript PDF library. Your PDF is loaded from your local device into browser memory, modified in-memory, and the watermarked copy is downloaded directly to your device — no part of your file is ever transmitted over the internet. This is particularly important for CONFIDENTIAL or sensitive documents, where uploading to a third-party server would directly undermine the confidentiality marking you are applying. The tool also works offline once the page has loaded.' },
]
const ABOUT = [
  'Watermarks serve several practical purposes in document workflows: marking a document CONFIDENTIAL or DRAFT before internal review, stamping COPY on distributed versions to distinguish them from originals, branding shared documents with a company name, or deterring unauthorised redistribution. The AWE-OS Watermark PDF tool embeds a fully customisable text watermark on every page of your PDF in seconds, with no server upload required.',
  'Six parameters give you precise control over appearance. Text sets the content — any word, phrase, or identifier. Colour and opacity control visibility, from a subtle 15% grey that sits behind content to a bold 80% overlay. Size adjusts font size relative to the page. Position controls placement (centre, corners, or edges). Rotation lets you tilt the text diagonally — the classic 45-degree stamp most associated with professional watermarks, or any custom angle.',
  'A live preview updates in real time as you adjust settings, showing exactly how the watermark will appear on the first page before committing to the download. This lets you iterate on the visual result without repeatedly downloading test versions. The watermark is applied to every page of the PDF — not just the first — ensuring consistent marking throughout the entire document.',
  'All watermarking runs entirely in your browser using pdf-lib. The watermark text is embedded as a PDF content element visible in every viewer, and your original document is never uploaded to any server. The watermarked PDF downloads directly to your device the moment processing completes. No account is required, there are no file size limits, and the tool adds no secondary watermarks or branding of its own to your output.',
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
