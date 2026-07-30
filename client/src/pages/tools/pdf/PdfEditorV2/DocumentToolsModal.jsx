import { useEffect, useRef, useState } from 'react'

const POSITIONS = [
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
]

const WATERMARK_POSITIONS = [
  ['top-left', 'Top Left'], ['top-center', 'Top Center'], ['top-right', 'Top Right'],
  ['center', 'Center'], ['bottom-left', 'Bottom Left'], ['bottom-center', 'Bottom Center'], ['bottom-right', 'Bottom Right'],
]

const FORMATS = [
  { value: 'n', label: '1, 2, 3 …' },
  { value: 'page-n', label: 'Page 1, Page 2 …' },
  { value: 'n-of-t', label: '1 of 10, 2 of 10 …' },
]

const TITLES = {
  'page-numbers': 'Add Page Numbers',
  bates: 'Bates Numbering',
  'header-footer': 'Add Header / Footer',
  watermark: 'Add Watermark',
}

/** One modal for all 4 whole-document tools (Toolbar.jsx's "Document" menu)
 * — `mode` picks which fields render. Settings mirror the standalone
 * PageNumbersPDF.jsx / WatermarkPDF.jsx tools' own controls so a returning
 * user sees the same options in the same shape. */
export default function DocumentToolsModal({ mode, onApply, onClose, loading }) {
  const [position, setPosition] = useState('bottom-center')
  const [format, setFormat] = useState('n')
  const [startNum, setStartNum] = useState(1)
  const [fontSize, setFontSize] = useState(11)
  const [prefix, setPrefix] = useState('DOC-')
  const [digits, setDigits] = useState(4)
  const [headerText, setHeaderText] = useState('')
  const [footerText, setFooterText] = useState('')
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [watermarkPosition, setWatermarkPosition] = useState('center')
  const [opacity, setOpacity] = useState(30)
  const [watermarkFontSize, setWatermarkFontSize] = useState(60)
  const [color, setColor] = useState('#ff0000')
  const [diagonal, setDiagonal] = useState(true)

  const closeRef = useRef(null)
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleApply() {
    if (mode === 'page-numbers') onApply({ position, format, startNum, fontSize })
    else if (mode === 'bates') onApply({ prefix, digits, position, startNum, fontSize })
    else if (mode === 'header-footer') onApply({ headerText, footerText, fontSize })
    else if (mode === 'watermark') onApply({ text: watermarkText, position: watermarkPosition, opacity, fontSize: watermarkFontSize, color, diagonal })
  }

  const applyDisabled = loading
    || (mode === 'header-footer' && !headerText.trim() && !footerText.trim())
    || (mode === 'watermark' && !watermarkText.trim())
    || (mode === 'bates' && !prefix.trim())

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label={TITLES[mode]} className="w-full max-w-sm bg-card border border-line rounded-m shadow-card">
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <h2 className="text-sm font-semibold text-ink">{TITLES[mode]}</h2>

          {(mode === 'page-numbers' || mode === 'bates') && (
            <>
              {mode === 'bates' && (
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Prefix</label>
                  <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="DOC-" className="w-full px-2.5 py-1.5 border border-line rounded-s text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Position</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-2 py-1.5 border border-line rounded-s text-sm bg-card">
                    {POSITIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                {mode === 'page-numbers' ? (
                  <div>
                    <label className="block text-xs font-medium text-ink-soft mb-1">Format</label>
                    <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-2 py-1.5 border border-line rounded-s text-sm bg-card">
                      {FORMATS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-ink-soft mb-1">Digits</label>
                    <input type="number" min={1} max={8} value={digits} onChange={(e) => setDigits(Math.max(1, Math.min(8, Number(e.target.value))))} className="w-full px-2.5 py-1.5 border border-line rounded-s text-sm" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Start number</label>
                  <input type="number" min={0} value={startNum} onChange={(e) => setStartNum(Math.max(0, Number(e.target.value)))} className="w-full px-2.5 py-1.5 border border-line rounded-s text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Font size</label>
                  <input type="range" min={8} max={18} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-cobalt mt-2" />
                </div>
              </div>
            </>
          )}

          {mode === 'header-footer' && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Header text (top of every page)</label>
                <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Optional" className="w-full px-2.5 py-1.5 border border-line rounded-s text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Footer text (bottom of every page)</label>
                <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Optional" className="w-full px-2.5 py-1.5 border border-line rounded-s text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Font size: {fontSize}pt</label>
                <input type="range" min={8} max={18} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-cobalt" />
              </div>
            </>
          )}

          {mode === 'watermark' && (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Watermark text</label>
                <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="CONFIDENTIAL" className="w-full px-2.5 py-1.5 border border-line rounded-s text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Color</label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 rounded-s border border-line cursor-pointer p-0.5 bg-card" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Font size: {watermarkFontSize}px</label>
                  <input type="range" min={20} max={120} value={watermarkFontSize} onChange={(e) => setWatermarkFontSize(Number(e.target.value))} className="w-full accent-cobalt mt-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Opacity: {opacity}%</label>
                <input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-cobalt" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Position</label>
                  <select value={watermarkPosition} onChange={(e) => setWatermarkPosition(e.target.value)} className="w-full px-2 py-1.5 border border-line rounded-s text-sm bg-card">
                    {WATERMARK_POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Rotation</label>
                  <div className="flex rounded-s border border-line overflow-hidden">
                    <button type="button" onClick={() => setDiagonal(true)} className={`flex-1 py-1.5 text-xs font-medium ${diagonal ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}>Diagonal</button>
                    <button type="button" onClick={() => setDiagonal(false)} className={`flex-1 py-1.5 text-xs font-medium ${!diagonal ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}>Straight</button>
                  </div>
                </div>
              </div>
            </>
          )}

          <p className="text-[11px] text-ink-soft">Applies to every page and can't be undone with Ctrl+Z — re-upload the original if you want to start over.</p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-line">
          <button ref={closeRef} type="button" onClick={onClose} className="flex-1 px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint">Cancel</button>
          <button type="button" onClick={handleApply} disabled={applyDisabled} className="flex-1 px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium disabled:opacity-40">
            {loading ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
