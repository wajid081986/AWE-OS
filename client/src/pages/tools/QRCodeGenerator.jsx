import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  'Type or paste your content into the text field — a URL, email address, phone number, plain text, Wi-Fi network credentials, or any other data you want to encode. The QR code preview updates live as you type.',
  'Choose your output size (128 px for small embeds up to 1024 px for print-ready images) and select an error correction level — M is recommended for most uses; H is best when the QR code will be printed on textured surfaces or include a logo overlay.',
  'Optionally customise the foreground and background colours using the colour pickers. Ensure strong contrast between the two colours so scanners can reliably detect the code.',
  'Click "Download QR Code (PNG)" to save a high-resolution PNG image to your device, ready for use in print, digital, presentations, or online materials.',
]
const FAQS = [
  { q: 'What can I encode in a QR code?', a: 'Any text can be encoded — website URLs, email addresses (use the mailto: prefix), phone numbers (tel: prefix), plain text messages, Wi-Fi credentials (in WIFI:S:NetworkName;T:WPA;P:password;; format), calendar events, and vCard contact details. The most common use is a simple https:// URL.' },
  { q: 'What is error correction and which level should I use?', a: 'Error correction lets a QR code be scanned even if part of it is damaged, obscured, or covered. L tolerates 7% damage, M tolerates 15%, Q tolerates 25%, and H tolerates 30%. Use M for most digital uses. Use H if the code will be printed on rough surfaces, worn on clothing, or have a logo placed over the centre.' },
  { q: 'What size QR code should I use?', a: '256 px is fine for digital use — websites, emails, and presentations. For print materials, choose 512 px or 1024 px to ensure the image remains sharp when scaled to business card or poster size. A blurry or pixelated QR code will fail to scan reliably.' },
  { q: 'What colours work best for QR codes?', a: 'High contrast between the foreground (dark) and background (light) is essential. Black on white works universally. Coloured QR codes are fine as long as the foreground is significantly darker than the background. Avoid light-coloured foregrounds, reversed colours, or very similar tones — many scanners will fail.' },
  { q: 'Is there a character limit?', a: 'QR codes can technically hold up to around 3,000 alphanumeric characters, but practical limits are lower — longer content requires a denser, harder-to-scan code. For website links, use a URL shortener if the URL is very long. For contact information, consider a short link to a digital business card instead of encoding a full vCard.' },
  { q: 'Are my QR codes stored on your servers?', a: 'No. All QR code generation runs entirely in your browser using the qrcode JavaScript library. Your input text and generated images are never transmitted to any server. Everything happens locally in memory and is discarded when you close the page.' },
]
const ABOUT = [
  'QR codes have become a universal bridge between the physical and digital world — on business cards, restaurant menus, event tickets, product packaging, conference badges, and payment terminals. The AWE-OS QR Code Generator creates high-quality, scannable QR codes instantly in your browser, with full control over content, size, error tolerance, and colour — no account or software installation required.',
  'Enter any content and a live preview updates in real time. URLs are the most common use case: a business owner can encode a website link, a product page, a booking form, or a Google Maps location and print the resulting QR code on physical materials. Beyond URLs, the tool supports any text format — Wi-Fi credentials so guests can join a network without typing a password, email addresses with the mailto: prefix, phone numbers with tel:, and plain text messages.',
  'Error correction is a critical setting that is often overlooked. Higher correction levels (Q and H) increase the density of the QR code but allow the scanner to reconstruct the data even if the printed code is worn, scratched, printed on a textured surface, or has a logo placed over the centre. For purely digital uses like websites and slide decks, level M provides a clean, easily scannable code. For physical print in demanding environments, level H is worth the increased complexity.',
  'Color customisation lets you match QR codes to a brand identity. The tool generates any foreground and background colour combination — the only hard requirement is sufficient contrast between the two. Dark foreground on a light background is universally reliable. All generated images are saved as PNG at the resolution you choose: 256 px is adequate for screen, while 512 px or 1024 px ensures sharpness when printed on business cards, posters, or merchandise. No data ever leaves your browser.',
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
      about={ABOUT}
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
