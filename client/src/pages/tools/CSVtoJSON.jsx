import { useState, useRef, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  'Upload a .csv file by dropping it onto the upload area or clicking to browse, or paste CSV text directly into the input field.',
  'The JSON output appears instantly in the right panel as you type or after the file loads.',
  'Toggle "Pretty print" to format the JSON with indentation, or disable it for compact output.',
  'Click "Copy JSON" to copy to clipboard, or "Download JSON" to save the file to your device.',
]
const FAQS = [
  { q: 'What delimiters are supported?', a: 'Comma (,), semicolon (;), and tab are detected automatically from the first row of your CSV. You do not need to specify the delimiter manually.' },
  { q: 'Are headers required?', a: 'Yes. The first row is treated as field names and becomes the property keys in each JSON object. Without a header row the output will be technically valid but the keys will be the first-row values.' },
  { q: 'Is there a file size limit?', a: 'Files up to 10 MB are supported for browser-side conversion. For larger files, consider splitting the CSV first or running the conversion server-side.' },
  { q: 'What happens to empty cells?', a: 'Empty cells are preserved in the output as empty strings (""). No data is dropped or skipped, ensuring the JSON array length matches the CSV row count exactly.' },
  { q: 'Can I convert CSV with quoted fields?', a: 'Yes. The parser handles RFC 4180-compliant quoting: fields wrapped in double quotes are parsed correctly, including fields that contain commas or line breaks inside quotes.' },
  { q: 'Is my CSV data sent to a server?', a: 'No. All parsing happens locally in your browser using JavaScript. Your CSV content never leaves your device, making the tool safe for sensitive or confidential data.' },
]
const ABOUT = [
  'CSV to JSON is a data format conversion tool for developers, analysts, and anyone who regularly moves data between spreadsheet tools and web applications. CSV is the universal interchange format for tabular data, but modern APIs, front-end applications, and data pipelines almost universally consume JSON. Converting between the two by hand or with a script adds friction to every workflow — this tool eliminates that step entirely.',
  'The converter reads CSV input either from a file upload or from text pasted directly into the input area. The first row is treated as column headers and becomes the property names in each JSON object. Subsequent rows map to individual objects in a JSON array, with each value placed under the corresponding header key. The entire conversion runs live as you type or immediately after a file loads — there is no button to press.',
  'The parser handles all standard CSV formatting: comma, semicolon, and tab delimiters are detected automatically from the first row; quoted fields containing commas or embedded line breaks are parsed correctly; escaped double quotes within quoted strings are resolved. Empty cells are preserved as empty strings rather than dropped, ensuring the output structure is consistent and predictable regardless of sparse data.',
  'Results can be copied to clipboard in a single click or downloaded as a .json file named data.json. A "Pretty print" toggle switches between indented, human-readable JSON and compact single-line output. The record count and field count display at the bottom of the output panel let you confirm the conversion covered all your data. No server receives your file — all processing is local in your browser.',
]

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const delimiters = [',', ';', '\t']
  const delimiter = delimiters.find(d => (lines[0].match(new RegExp(`\\${d}`, 'g')) || []).length > 0) || ','
  const parseLine = (line) => {
    const result = []; let cur = ''; let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && !inQuote) { inQuote = true; continue }
      if (ch === '"' && inQuote && line[i + 1] === '"') { cur += '"'; i++; continue }
      if (ch === '"' && inQuote) { inQuote = false; continue }
      if (ch === delimiter && !inQuote) { result.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    result.push(cur.trim())
    return result
  }
  const headers = parseLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

export default function CSVtoJSON() {
  const [csvText, setCSVText] = useState('')
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState('')
  const [indented, setIndented] = useState(true)
  const fileRef = useRef()

  const json = useMemo(() => {
    if (!csvText.trim()) return null
    try {
      const data = parseCSV(csvText)
      setError('')
      return data
    } catch {
      setError('Failed to parse CSV. Check your file format.')
      return null
    }
  }, [csvText])

  const jsonString = useMemo(() => json ? JSON.stringify(json, null, indented ? 2 : 0) : '', [json, indented])

  const handleFile = (f) => {
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('File too large. Max 10 MB.'); return }
    const reader = new FileReader()
    reader.onload = (e) => setCSVText(e.target.result)
    reader.readAsText(f)
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const copy = async () => {
    if (!jsonString) return
    await navigator.clipboard.writeText(jsonString)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    if (!jsonString) return
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'data.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolPageShell
      slug="csv-to-json"
      name="CSV to JSON"
      description="Convert CSV files or text to JSON instantly — paste, upload, preview, and download."
      icon="📊"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Upload area */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-colors"
        >
          <p className="text-gray-500 text-sm">Drop a .csv file or <span className="text-blue-600 font-medium">click to browse</span></p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        {/* Input / Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">CSV Input</label>
              {csvText && <button onClick={() => setCSVText('')} className="text-xs text-gray-400 hover:text-red-500">Clear</button>}
            </div>
            <textarea
              value={csvText}
              onChange={e => setCSVText(e.target.value)}
              rows={12}
              placeholder={'name,age,city\nAlice,30,London\nBob,25,Paris'}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">JSON Output</label>
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={indented} onChange={e => setIndented(e.target.checked)} className="accent-blue-600" />
                Pretty print
              </label>
            </div>
            <textarea
              value={jsonString}
              readOnly
              rows={12}
              placeholder="JSON output appears here…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50 text-gray-700 resize-none"
            />
          </div>
        </div>

        {json && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{json.length} record{json.length !== 1 ? 's' : ''} · {Object.keys(json[0] || {}).length} fields</span>
            <span>{(jsonString.length / 1024).toFixed(1)} KB</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={copy}
            disabled={!jsonString}
            className="flex-1 py-3 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 font-semibold rounded-xl transition-colors text-sm"
          >
            {copied ? '✅ Copied!' : 'Copy JSON'}
          </button>
          <button
            onClick={download}
            disabled={!jsonString}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Download JSON
          </button>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
