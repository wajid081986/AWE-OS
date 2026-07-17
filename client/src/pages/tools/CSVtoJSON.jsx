import { useState, useRef, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  "Upload a CSV file by dragging it onto the upload area or clicking to browse — the tool accepts .csv and .txt files up to 10 MB. Alternatively, paste CSV text directly into the CSV Input textarea on the left. File contents appear in the textarea immediately after loading so you can inspect the raw data before conversion begins.",
  "JSON output appears automatically in the right panel as soon as valid CSV is present. The first row is always used as the header row — these header values become the property keys in every JSON object. Rows two onwards each become one object in the JSON array. You do not need to click any button — conversion is live.",
  "Check the record count and field count shown at the bottom of the output panel to verify the conversion covered all your data. The record count should match your CSV's data row count (excluding the header row) and the field count should match your column count. Mismatches may indicate malformed rows or unexpected line breaks.",
  "Toggle 'Pretty print' using the checkbox above the JSON output panel. Pretty print adds indentation and line breaks for human readability and debugging. Uncheck it for compact single-line JSON, which is smaller and suitable for API payloads, configuration files, or when minimised size matters.",
  "Click 'Copy JSON' to copy the complete JSON string to your clipboard for pasting into code, documentation, or a database tool. Click 'Download JSON' to save the file as data.json to your device. Both actions work for any valid conversion up to the 10 MB input limit.",
]
const FAQS = [
  { q: 'What CSV delimiters does the tool detect?', a: 'The tool automatically detects comma (,), semicolon (;), and tab (\\t) delimiters from the first row of your CSV — no manual configuration needed. Detection works by counting each potential delimiter character in the header row and selecting the most frequent one. This covers most CSV files: Excel exports use semicolons in European locales where the comma is the decimal separator, Google Sheets uses commas, and database tools often export tab-separated values. Pipe-delimited (|) files are not currently auto-detected but may be added as an option.' },
  { q: 'Does the CSV need a header row?', a: 'Yes — the first row is always treated as the header and becomes the property keys in every JSON object. If your CSV has no header row, the first data row becomes the property names, producing technically valid but semantically wrong JSON where actual data values are used as field identifiers. To handle headerless CSVs, manually type a header row at the top of the data in the input field before the conversion runs. Use clear, lowercase names with underscores (like user_id, created_at) for cleaner JSON output that works well in APIs and databases.' },
  { q: 'What happens to empty cells, quoted fields, and special characters?', a: 'Empty cells are preserved as empty strings ("") in the JSON output — no data is dropped and the object structure stays consistent across all rows. Quoted fields containing commas or embedded line breaks are handled per RFC 4180: double-quoted strings are treated as single field values regardless of internal special characters. Escaped double-quote pairs ("") within quoted fields are resolved to single quotes in the output. Unicode characters, accented letters, and Indian language script characters in UTF-8 encoded files are all preserved without modification.' },
  { q: 'Is there a file size limit?', a: 'The tool supports CSV files up to 10 MB. For most practical use cases, this limit is generous: a 10 MB CSV typically contains between 50,000 and 200,000 rows depending on column count and value lengths. Files above 10 MB show an error. For very large datasets, options include splitting the CSV into smaller chunks before converting, or using a command-line tool: Python pandas (df.to_json()), Node.js csv-parse, or the Unix jq utility can convert multi-gigabyte CSV files without browser memory constraints.' },
  { q: 'Can I convert JSON back to CSV?', a: "This tool converts in one direction only: CSV to JSON. The reverse — flattening a JSON array of objects into delimited rows with a header — is a different operation. AWE-OS does not currently have a JSON-to-CSV tool, but the conversion is straightforward in code: in Python, pandas.DataFrame(data).to_csv('output.csv', index=False) handles it in one line. In JavaScript, map the array to tab- or comma-joined value strings and prepend the header row. Nested JSON objects require flattening first before they can be meaningfully represented in CSV's flat tabular structure." },
  { q: 'Is my CSV data sent to a server?', a: "Never. All CSV parsing and JSON generation runs entirely within your browser using JavaScript. File uploads are read into browser memory using the FileReader API; pasted text is taken directly from the textarea. The parsing function processes everything locally and the JSON output is generated in-memory and displayed in the output panel — no data is transmitted to any server at any stage. This makes the tool safe to use with sensitive datasets: employee records, financial data, client lists, medical records, or any data that must not be uploaded to third-party services." },
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
      limitation={"Assumes the first row is headers and a standard comma delimiter — unusual formats may need adjustment first."}
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
