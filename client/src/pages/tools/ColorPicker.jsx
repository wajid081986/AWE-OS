import { useState, useCallback } from 'react'
import ToolPageShell from './ToolPageShell'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      default: h = ((r - g) / d + 4) / 6
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function ColorPickerTool() {
  const [color, setColor] = useState('#3B82F6')
  const [history, setHistory] = useState(['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'])
  const [copied, setCopied] = useState(null)

  const pick = useCallback((hex) => {
    setColor(hex)
    setHistory(h => [hex, ...h.filter(c => c !== hex)].slice(0, 10))
  }, [])

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const rgb = hexToRgb(color)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`

  const isLight = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114 > 128
  const textColor = isLight ? '#1f2937' : '#ffffff'

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Color preview + picker */}
      <div className="rounded-2xl overflow-hidden border border-gray-200">
        <div className="h-32 flex items-center justify-center transition-colors"
          style={{ backgroundColor: color }}>
          <p className="text-lg font-bold font-mono" style={{ color: textColor }}>{color.toUpperCase()}</p>
        </div>
        <div className="bg-white p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Pick a color</span>
          <input type="color" value={color} onChange={e => pick(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white" />
        </div>
      </div>

      {/* Color values */}
      <div className="space-y-2">
        {[
          { key: 'hex', label: 'HEX', value: color.toUpperCase() },
          { key: 'rgb', label: 'RGB', value: rgbStr },
          { key: 'hsl', label: 'HSL', value: hslStr },
        ].map(({ key, label, value }) => (
          <div key={key} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-gray-400 w-8">{label}</span>
            <code className="flex-1 text-sm font-mono text-gray-800">{value}</code>
            <button onClick={() => copy(value, key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copied === key ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}>
              {copied === key ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      {/* RGB breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">RGB Breakdown</p>
        <div className="space-y-2">
          {[['R', rgb.r, 'bg-red-500'], ['G', rgb.g, 'bg-green-500'], ['B', rgb.b, 'bg-blue-500']].map(([label, val, cls]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-4">{label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cls}`} style={{ width: `${(val / 255) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-8 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent colors */}
      {history.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Recent Colors</p>
          <div className="flex flex-wrap gap-2">
            {history.map(c => (
              <button key={c} onClick={() => pick(c)} title={c}
                className={`w-9 h-9 rounded-lg border-2 transition-all ${c === color ? 'border-blue-500 scale-110' : 'border-transparent hover:border-gray-400'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Click the color swatch in the bottom right of the preview area to open the color picker.',
  'Select any color using the native browser color picker.',
  'View the color values in HEX, RGB, and HSL formats automatically.',
  'Click "Copy" next to any format to copy it to your clipboard. Recent colors are saved below.',
]

const FAQS = [
  { q: 'What color formats does this tool support?', a: 'The tool displays HEX, RGB, and HSL color values. All three update simultaneously whenever you pick a new color, and each has its own copy button.' },
  { q: 'How many recent colors are saved?', a: 'The tool saves your last 10 selected colors in the Recent Colors section. These persist during your session but are cleared when you close or refresh the page.' },
  { q: 'Can I type a HEX code directly?', a: 'Currently the tool uses a native color picker. To input a specific HEX code, use your operating system\'s color picker which accepts hex input in most browsers.' },
  { q: 'What is the difference between HEX, RGB and HSL?', a: 'HEX is a 6-digit hexadecimal code used in web design. RGB specifies red, green, blue components (0-255). HSL specifies hue (0-360°), saturation and lightness as percentages.' },
  { q: 'Is this tool useful for web developers?', a: 'Yes! Web developers frequently need color values in specific formats for CSS. This tool lets you instantly get the right format for your stylesheet with a single click.' },
  { q: 'Why does the preview text change between black and white?', a: 'The preview text colour automatically switches between dark and light based on the luminance of the selected colour, ensuring the hex code label always remains readable regardless of background brightness.' },
]

const ABOUT = [
  'The Color Picker lets you visually select any colour and instantly see its equivalent values in three formats: HEX, RGB, and HSL. All three update simultaneously as you move through the colour picker, and each format has a dedicated Copy button that places the value directly on your clipboard — ready to paste into a stylesheet, design file, or code editor.',
  'The RGB breakdown panel below the colour values shows a proportional bar for each channel — red, green, and blue — making it easy to understand the composition of a colour at a glance. The preview area at the top renders the selected colour at full size and automatically adjusts the overlaid hex label between dark and light text so it remains readable across the entire colour spectrum.',
  'The Recent Colors section keeps a rolling history of the last 10 colours you have selected during your session. Clicking any swatch instantly loads that colour back, making it effortless to compare options or return to a colour you explored earlier. This is particularly useful when working through a palette — picking several candidate colours, comparing their codes, and narrowing down to a final choice.',
  'Colour values in the correct format are a constant requirement in web development and UI design. CSS accepts hex and rgb() natively; HSL is preferred by many designers for its intuitive hue-saturation-lightness model. Having all three ready with one click eliminates the manual conversion step that slows down design-to-code workflows. The tool runs entirely in your browser with no uploads, no account, and no internet connection required beyond initial page load.',
]

export default function ColorPicker() {
  return (
    <ToolPageShell
      slug="color-picker"
      name="Color Picker"
      description="Pick any color and instantly get HEX, RGB and HSL codes with one-click copy."
      icon="🎨"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <ColorPickerTool />
    </ToolPageShell>
  )
}
