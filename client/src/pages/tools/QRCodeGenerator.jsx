import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  { title: 'Enter your text or URL', description: 'Type any text, URL, email, or phone number.' },
  { title: 'Customize', description: 'Choose size, colors, and error correction level.' },
  { title: 'Download', description: 'Download your QR code as a PNG image.' },
]
const FAQS = [
  { q: 'What can I encode in a QR code?', a: 'Any text — URLs, emails, phone numbers, plain text, Wi-Fi credentials, vCards, and more.' },
  { q: 'What is error correction?', a: 'Higher error correction lets the QR code be scanned even if partially damaged. L=7%, M=15%, Q=25%, H=30% damage tolerance.' },
  { q: 'Is there a size limit?', a: 'QR codes can hold up to about 3000 characters. For long content, use a URL shortener first.' },
]

const EC_LEVELS = ['L', 'M', 'Q', 'H']

export default function QRCodeGenerator() {
  const [text, setText]           = useState('https://awe-os.com')
  const [size, setSize]           = useState(256)
  const [fg, setFg]               = useState('#000000')
  const [bg, setBg]               = useState('#ffffff')
  const [ecLevel, setEcLevel]     = useState('M')
  const [dataUrl, setDataUrl]     = useState('')
  const [error, setError]         = useState('')
  const canvasRef = useRef()

  useEffect(() => {
    if (!text.trim()) { setDataUrl(''); return }
    QRCode.toDataURL(text, {
      width: size, margin: 2,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: ecLevel,
    })
      .then(url => { setDataUrl(url); setError('') })
      .catch(() => setError('Could not generate QR code. Try shorter text.'))
  }, [text, size, fg, bg, ecLevel])

  const download = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'qrcode.png'
    a.click()
  }

  return (
    <ToolPageShell
      slug="qr-code-generator"
      name="QR Code Generator"
      description="Generate custom QR codes for URLs, text, emails and more — free, instant, no sign-up."
      icon="⬛"
      steps={STEPS}
      faqs={FAQS}
      about="Our QR Code Generator uses the qrcode library to create high-quality, scannable QR codes directly in your browser. Customize colors, size, and error correction levels for your use case."
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Text or URL</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-400 mt-1">{text.length} characters</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Size</label>
                <select value={size} onChange={e => setSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={128}>128×128</option>
                  <option value={256}>256×256</option>
                  <option value={512}>512×512</option>
                  <option value={1024}>1024×1024</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Error Correction</label>
                <select value={ecLevel} onChange={e => setEcLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {EC_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">QR Color</label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2">
                  <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-8 h-6 rounded cursor-pointer border-0" />
                  <span className="text-sm text-gray-600 font-mono">{fg}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Background</label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2">
                  <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-8 h-6 rounded cursor-pointer border-0" />
                  <span className="text-sm text-gray-600 font-mono">{bg}</span>
                </div>
              </div>
            </div>

            <button
              onClick={download}
              disabled={!dataUrl || !text.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              Download QR Code (PNG)
            </button>

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-6 min-h-[280px]">
            {dataUrl && text.trim() ? (
              <>
                <img src={dataUrl} alt="QR Code" className="rounded-lg shadow-sm max-w-full" style={{ width: Math.min(size, 240) }} />
                <p className="text-xs text-gray-400 mt-3">Scan with any camera app</p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-4xl mb-2">⬛</p>
                <p className="text-gray-400 text-sm">QR code preview appears here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  )
}
