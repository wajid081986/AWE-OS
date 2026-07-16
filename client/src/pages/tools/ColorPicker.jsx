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
  "Click the colour input widget in the bottom right of the preview panel to open your browser's native colour picker. The exact appearance depends on your OS and browser — on Windows it opens the system colour picker, on macOS the colour wheel, and on mobile devices a touch-optimised selector. All versions let you select any colour from the full visible spectrum.",
  "Select your colour using the picker. Move through the spectrum, adjust brightness and saturation, or type a hex value directly if your system's colour picker supports text input. The large preview area at the top updates in real time, showing the selected colour at full width as you move through the picker.",
  "Read the three colour format values displayed in the panel below the preview: HEX (e.g. #3B82F6), RGB (e.g. rgb(59, 130, 246)), and HSL (e.g. hsl(217, 91%, 60%)). All three update simultaneously whenever you choose a new colour — no manual conversion needed.",
  "Click the 'Copy' button next to any format to copy that exact value to your clipboard. The button flashes 'Copied!' to confirm success. Paste the value directly into your CSS file, Figma design, code editor, or any other application. HEX is most common in HTML/CSS; RGB and HSL are used in CSS color functions and design tokens.",
  "Review the RGB Breakdown bars to understand the colour's channel composition. Check the Recent Colors swatches at the bottom to revisit any colour from this session — click any swatch to instantly reload that colour with all its format values updated.",
]

const FAQS = [
  { q: 'What colour formats does this tool support?', a: 'The tool displays three colour formats simultaneously: HEX (a six-character hexadecimal code like #3B82F6 — the most common format in CSS and HTML), RGB (red, green, blue channels as integers from 0 to 255, used in CSS rgb() functions and digital image processing), and HSL (hue in degrees from 0–360, saturation as a percentage, lightness as a percentage — preferred by designers for its intuitive relationship to how humans perceive colour). All three update in real time and each has an independent one-click copy button.' },
  { q: 'How do I input a specific hex code I already know?', a: "Click the colour input widget to open your browser's system colour picker. Most modern browsers include a hex input field within the advanced or custom colour section of the picker: in Chrome and Edge on Windows, look for the hex field in the 'Custom' view; in Safari on macOS, use the colour wheel's hex input. Type or paste your hex code starting with # and press Enter. The tool then displays all three format equivalents — HEX, RGB, and HSL — for the colour you entered." },
  { q: 'What is the difference between HEX, RGB, and HSL?', a: 'HEX is a compact six-character string encoding each colour channel as two hexadecimal digits — widely used in HTML, CSS, and design tools for its brevity. RGB specifies red, green, and blue light intensities independently on a 0–255 scale — useful for programmatic colour manipulation in JavaScript and digital image processing. HSL separates hue (the colour angle on a 360-degree wheel), saturation (the intensity or purity), and lightness (how dark or bright it is) — preferred by designers because predictably changing just the lightness value produces tints and shades of the same colour.' },
  { q: 'How many recent colours are saved and do they persist?', a: "The tool keeps a rolling history of the last 10 colours you have selected during your current browser session, displayed as clickable swatches in the Recent Colors section. These are stored in component memory, not in browser local storage or cookies, so they are cleared when you close the tab or refresh the page. The session history is useful for comparing a few candidate colours side by side during a design decision, or returning to a colour you explored earlier without recreating it. Click any swatch to instantly reload that colour with all format values." },
  { q: 'Why does the preview text switch between black and white?', a: 'The preview overlay text uses an automatic contrast calculation based on the perceived luminance of the selected colour. The formula weights each channel by how strongly human eyes respond to it: red at 29.9%, green at 58.7%, and blue at 11.4% — reflecting that the eye is most sensitive to green light. When the resulting luminance exceeds 128 (out of 255), the background is considered light and the text switches to dark grey for readability. Below 128, the text switches to white. This ensures the hex label always remains legible across the full colour spectrum without manual adjustment.' },
  { q: 'Is this tool useful for web development and UI design?', a: 'Yes — it is built specifically for the design-to-development workflow. CSS accepts all three formats natively: hex is the most compact; rgb() is used for dynamic colour manipulation in JavaScript and CSS variables; hsl() is preferred for creating colour scales because adjusting only the lightness value reliably produces tints and shades. Design systems and frameworks like Tailwind CSS, Material UI, and Chakra UI reference colours in these formats in their configuration files. One-click copy eliminates manual transcription errors that cause subtle colour mismatches between design files and code implementations.' },
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
      limitation={"Colors may look different across screens — always test on your target device before finalizing brand colors."}
    >
      <ColorPickerTool />
    </ToolPageShell>
  )
}
