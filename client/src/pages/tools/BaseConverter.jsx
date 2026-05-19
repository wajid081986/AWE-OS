import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

const BASES = [
  { label: 'Decimal', short: 'DEC', base: 10, prefix: '' },
  { label: 'Binary',  short: 'BIN', base: 2,  prefix: '0b' },
  { label: 'Octal',   short: 'OCT', base: 8,  prefix: '0o' },
  { label: 'Hex',     short: 'HEX', base: 16, prefix: '0x' },
]

function isValidForBase(str, base) {
  if (!str) return false
  const patterns = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-fA-F]+$/ }
  return patterns[base].test(str)
}

const STEPS = [
  "Click the tab for the number base you are starting from: Decimal (base-10, everyday numbers), Binary (base-2, used in computing and digital systems), Octal (base-8, used in Unix file permissions and some legacy systems), or Hexadecimal (base-16, used in memory addresses, HTML colour codes, and machine code). Each tab opens an input field that accepts only valid digits for that base.",
  "Type or paste your number into the input field. The tool only accepts characters valid for the selected base: decimal allows 0–9; binary allows only 0 and 1; octal allows 0–7; hexadecimal allows 0–9 and A–F (both upper and lowercase are accepted). An error message appears for invalid characters — this prevents silent conversion errors that could happen with malformed input.",
  "The converted values for all four bases appear instantly in the output panel without clicking any button. For example, entering decimal 255 immediately shows binary 11111111, octal 377, and hexadecimal FF. All four representations are always displayed together so you can cross-reference without switching between views or recalculating.",
  "Click the 'Copy' button next to any output value to place that specific representation on your clipboard. Use this when working with HTML colour codes (copy the hex value), when writing Unix file permission scripts (copy the octal value), when configuring binary flags or bitmasks in code (copy the binary value), or when working with any system that requires a specific representation of the same number.",
  "For hexadecimal output specifically, the result is displayed in uppercase (A–F) without a prefix. If your target system requires a prefix — '0x' for C/C++/Python/JavaScript, '#' for HTML colour codes (for 6-digit hex colour values only), or '&H' for Visual Basic — add the prefix manually after copying. The conversion itself is the same regardless of what prefix convention your environment expects.",
]

const FAQS = [
  {
    q: 'What is a number base and why are binary, octal, and hex used in computing?',
    a: "A number base (or radix) defines how many unique digits a positional numeral system uses. Decimal (base-10) uses 0–9 because humans evolved counting on ten fingers. Binary (base-2) uses only 0 and 1 because transistors in computers have two states: off and on. Octal (base-8) and hexadecimal (base-16) are shorthand for binary: every octal digit represents exactly 3 binary digits, and every hex digit represents exactly 4 binary digits. This makes hex especially compact — the 8-bit byte value 11111111 in binary is simply 'FF' in hex. Computer science uses these bases constantly for memory addresses, colour values, bitmasks, and machine code.",
  },
  {
    q: 'How do I convert a number manually to verify the tool?',
    a: "To convert decimal 42 to binary: repeatedly divide by 2 and record remainders from bottom to top — 42÷2=21r0, 21÷2=10r1, 10÷2=5r0, 5÷2=2r1, 2÷2=1r0, 1÷2=0r1 → read remainders upward: 101010. To convert binary to decimal: each bit position from right represents a power of 2 — 101010 = (1×32)+(0×16)+(1×8)+(0×4)+(1×2)+(0×1) = 32+8+2 = 42. For hex, each digit represents 4 bits: 'A' = 10, 'B' = 11, up to 'F' = 15. Hex 'FF' = (15×16) + 15 = 240 + 15 = 255 decimal.",
  },
  {
    q: 'Why is hexadecimal used for HTML and CSS colour codes?',
    a: "HTML/CSS colour codes like #3B82F6 (Tailwind CSS blue-500) are 6-digit hexadecimal values representing three 2-digit hex pairs: one each for red (3B), green (82), and blue (F6). Each pair covers 0–255 — the full range of an 8-bit colour channel. Hex is used because it compactly represents 24 bits of colour information in just 6 characters. The same value in decimal would be rgb(59, 130, 246) — slightly longer. Designers and front-end developers encounter hex colour codes constantly in CSS, SVG, HTML, Figma exports, and design token files. Pasting a hex value into a colour picker requires knowing exactly what the digits represent.",
  },
  {
    q: 'What are Unix file permissions and why do they use octal?',
    a: "Unix and Linux file permissions are expressed as three groups of three bits: read (r=4), write (w=2), execute (x=1) for owner, group, and others. Adding these within each group gives a single digit 0–7 — an octal digit. The permission 'rwxr-xr-x' translates to 7 (rwx), 5 (r-x), 5 (r-x), represented as octal 755. The chmod 755 command on a shell sets these permissions. Octal is a natural fit because each octal digit maps exactly to one 3-bit permission group. Understanding binary-to-octal conversion (or using this calculator) helps when reading or writing chmod commands in scripts and server configuration.",
  },
  {
    q: 'Is there a maximum input size the converter handles?',
    a: "The converter uses JavaScript's native parseInt() and toString() functions, which handle integers accurately up to 2^53 − 1 (Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991 in decimal). For inputs within this range, all four base conversions are exact. For very large binary strings — more than 53 bits — JavaScript's floating-point representation loses precision and results may be incorrect. Most practical computing tasks (byte values, port numbers, IP octets, HTML colours, Unix permissions, small memory addresses) fall well within safe integer range and convert accurately. For cryptographic keys, large memory addresses, or 64-bit values, use a language-native bigint implementation instead.",
  },
  {
    q: 'How does this convert hexadecimal letters — are A–F case sensitive?',
    a: "The input field for hexadecimal accepts both uppercase and lowercase letters — 'a' through 'f' and 'A' through 'F' are treated as equivalent and convert to the same value. For example, 'ff', 'FF', and 'fF' all parse as decimal 255. The output is always displayed in uppercase (FF) for readability and consistency with conventions in most technical documentation, memory dump utilities, and processor specifications. If you paste a lowercase hex string from a CSS colour value or a Python hex literal, the converter accepts it without modification and outputs the uppercase equivalent.",
  },
]

const ABOUT = [
  'The Base Converter translates numbers between the four numeral systems that appear most frequently in computing and electronics: decimal (base-10), binary (base-2), octal (base-8), and hexadecimal (base-16). Select the base of your input, type a value, and all four representations appear simultaneously — no back-and-forth, no recalculating, no memorising conversion formulas.',
  'Binary, octal, and hexadecimal each serve specific purposes in computing. Binary is the native language of digital hardware — every piece of data stored or transmitted by a computer is ultimately a sequence of binary digits. Octal provides compact notation for Unix file permissions: each octal digit represents one group of three binary bits. Hexadecimal is the preferred notation for memory addresses, machine code, and HTML colour values because one hex digit represents exactly four binary bits, keeping long binary values legible.',
  'All four representations are displayed simultaneously in the output panel rather than one at a time. This lets you verify that the same number expressed differently is indeed the same value — a useful sanity check when working with colour codes, bitmask flags, or permission settings where a misread digit has significant consequences. The per-format copy buttons place only the specific representation you need on the clipboard, ready to paste directly into a stylesheet, shell command, or code editor.',
  'All conversions run entirely in the browser using standard JavaScript integer arithmetic. No data is transmitted to any server. The tool works offline once the page is loaded and has no usage limits. Input validation prevents invalid characters for each base from being entered, which avoids the conversion errors that arise when characters outside the valid digit set are silently ignored by some parsers.',
]

function BaseConverterTool() {
  const [activeBase, setActiveBase] = useState(10)
  const [input, setInput]           = useState('')
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(null)

  const handleInput = (val) => {
    setInput(val)
    setError('')
    if (val && !isValidForBase(val, activeBase)) {
      setError(`Invalid digit for base-${activeBase}`)
    }
  }

  const decimal = (input && isValidForBase(input, activeBase))
    ? parseInt(input, activeBase)
    : null

  const results = BASES.map(({ label, short, base, prefix }) => {
    const val = decimal !== null && isFinite(decimal) ? decimal.toString(base).toUpperCase() : ''
    return { label, short, base, value: val, prefixed: val ? prefix + val : '' }
  })

  const copy = async (val, base) => {
    await navigator.clipboard.writeText(val)
    setCopied(base); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Base selector tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {BASES.map(({ label, base }) => (
          <button key={base} onClick={() => { setActiveBase(base); setInput(''); setError('') }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${activeBase === base ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Enter {BASES.find(b => b.base === activeBase)?.label} number
        </label>
        <input
          type="text" value={input} onChange={e => handleInput(e.target.value)}
          placeholder={activeBase === 16 ? 'e.g. 3B82F6' : activeBase === 2 ? 'e.g. 11111111' : activeBase === 8 ? 'e.g. 377' : 'e.g. 255'}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-500'}`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      {/* Output */}
      <div className="space-y-2">
        {results.map(({ label, short, base, value }) => (
          <div key={base} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${base === activeBase ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs font-bold text-gray-400 w-10">{short}</span>
            <code className={`flex-1 text-sm font-mono ${value ? 'text-gray-800' : 'text-gray-300'}`}>
              {value || '—'}
            </code>
            {value && (
              <button onClick={() => copy(value, base)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copied === base ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}>
                {copied === base ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BaseConverter() {
  return (
    <ToolPageShell
      slug="base-converter"
      name="Number Base Converter"
      description="Convert numbers between decimal, binary, octal, and hexadecimal instantly."
      icon="🔢"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <BaseConverterTool />
    </ToolPageShell>
  )
}
