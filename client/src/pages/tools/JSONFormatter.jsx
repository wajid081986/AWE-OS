import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  "Paste your JSON text into the input area on the left. JSON (JavaScript Object Notation) is valid when it follows strict syntax rules: string keys and values must be double-quoted, arrays use square brackets, objects use curly braces, and numbers and booleans are unquoted. Common sources of JSON to paste here include API responses copied from browser DevTools, configuration files, database query results, or raw webhook payloads.",
  "The validator checks your JSON immediately as you type or paste. A green 'Valid JSON' indicator confirms the structure is syntactically correct. A red error message with the specific location of the syntax error — for example 'Unexpected token at position 142' or 'Unterminated string at line 7' — helps you identify and fix the issue without manually scanning the entire document.",
  "Choose your output format using the toggle at the top of the right panel. 'Pretty' (default) adds indentation with 2-space tabs and line breaks for human-readable formatting — suitable for reviewing structure, debugging, and documentation. 'Minify' removes all whitespace and produces a single-line compact JSON string — smaller in byte size and suitable for API payloads, localStorage values, and network transmission.",
  "Click 'Copy' to place the formatted output on your clipboard. Click 'Download' to save the result as a .json file named formatted.json (in pretty mode) or minified.json (in minified mode). Both actions work as soon as valid JSON is present — the buttons are disabled while the input is empty or contains invalid JSON.",
  "Use the 'Clear' button to reset both panels for a new formatting task. If you want to format a different JSON document without losing the current one, select all text in the input and replace it — the formatter updates the output immediately. For very large JSON files (tens of thousands of lines), pasting may take a moment; the formatting itself is near-instant once the paste completes.",
]

const FAQS = [
  {
    q: 'What is the difference between pretty-printing and minifying JSON?',
    a: "Pretty-printing adds indentation (typically 2 or 4 spaces per nesting level) and line breaks so each key-value pair and array element occupies its own line — making the structure readable to humans at the expense of additional whitespace characters. Minifying removes all unnecessary whitespace: no line breaks, no indentation, no trailing spaces — reducing file size while retaining the exact same data. Minified JSON is preferred for production API responses and network payloads where byte size affects performance. Pretty JSON is preferred for configuration files checked into version control, documentation, and debugging, where readability matters more than size.",
  },
  {
    q: 'Why does JSON require double quotes but JavaScript objects do not?',
    a: "JSON is a strict data interchange format defined by RFC 8259, which requires double quotes for all string values and all keys — single quotes are not valid JSON. JavaScript objects (which inspired JSON) allow single quotes and unquoted keys as part of the more flexible JS syntax. When you copy an object literal from JavaScript code and paste it into this formatter, it will likely fail validation because of single-quoted strings or unquoted keys. The fix is to convert all quotes to double quotes and ensure all keys are quoted. Online JS-to-JSON converters or a quick find-and-replace in a code editor handle this transformation.",
  },
  {
    q: 'What common mistakes cause JSON validation to fail?',
    a: "The most frequent JSON errors are: trailing commas after the last item in an object or array (valid in JavaScript but invalid in JSON); single-quoted strings instead of double-quoted; unquoted property keys; undefined or NaN values (not valid JSON — use null instead); missing commas between key-value pairs; and mismatched brackets or braces. Another common source is copying JSON from an API response that was already embedded in HTML or a log file and picked up surrounding characters. If the error is hard to locate, paste into a structured editor like VS Code and enable JSON syntax highlighting to spot the invalid character visually.",
  },
  {
    q: 'Can this formatter handle very large JSON files?',
    a: "The formatter works well for JSON up to several megabytes when pasted directly. Browser memory and paste buffer performance impose practical limits — very large JSON files (50 MB or more) may cause the paste to be slow or the page to become temporarily unresponsive while the string is parsed. For large datasets, a command-line tool like Python's json.tool (python -m json.tool large.json) or the jq command (jq '.' large.json) formats files of any size without browser memory constraints. This browser-based formatter is best suited for API responses, configuration snippets, and data samples typically encountered in development and testing workflows.",
  },
  {
    q: 'Does the formatter preserve the original key order?',
    a: "Modern JavaScript engines (V8, SpiderMonkey) preserve insertion order for object keys in most cases: string keys are maintained in the order they were inserted, though integer-like keys may be sorted first. JSON specification does not guarantee key order — objects are defined as unordered collections of name-value pairs. In practice, this formatter uses JSON.parse() followed by JSON.stringify(), which preserves key order as parsed in all current major browsers. If your JSON uses integer-string keys like '1', '2', '10', these may be reordered numerically. For strict key-order preservation in critical workflows, use a JSON processing tool with explicit sort or preserve-order options.",
  },
  {
    q: 'Is my JSON data safe — is it sent to a server?',
    a: "No data is transmitted to any server. JSON parsing and formatting run entirely within your browser using the built-in JSON.parse() and JSON.stringify() functions from the JavaScript runtime. Your JSON content never leaves your device — it is processed in-memory in the browser tab and the result is rendered directly. This makes the formatter safe for use with sensitive data such as API credentials (though best practice is to redact those before formatting), personal information from database exports, internal configuration settings, or proprietary data structures. The absence of server communication also means the tool works offline once the page has loaded.",
  },
]

const ABOUT = [
  'The JSON Formatter validates, formats, and minifies JSON text with instant feedback. Paste any JSON string into the input panel — the tool checks it for syntax errors immediately and displays the formatted result in the right panel. A clear indicator shows whether the JSON is valid or identifies the exact position of the first syntax error, saving the time normally spent scanning raw text for a missing comma or mismatched bracket.',
  'Two output modes cover the primary use cases for processed JSON. Pretty mode adds 2-space indentation and line breaks, transforming a compact or malformed string into a structured, readable document. Minified mode strips all whitespace to produce the smallest possible valid JSON string, which reduces payload size for API responses, localStorage entries, and any context where JSON is transmitted over a network or stored in a size-constrained medium.',
  'JSON has become the dominant data exchange format in web development, APIs, and configuration management. REST APIs, GraphQL responses, webhook payloads, configuration files for tools like ESLint, Prettier, and package managers all use JSON. Even when working with formats that extend JSON — like JSONC (JSON with comments) or JSON5 — the underlying object structure follows JSON conventions. Understanding and being able to quickly validate and format JSON is a foundational skill in modern software development.',
  'All processing runs locally in your browser using native JSON.parse() and JSON.stringify() functions — no data is sent to any server, and the tool works offline. The copy and download functions make it straightforward to take the formatted output directly into a code editor, API testing tool, documentation, or configuration file. There are no usage limits and no sign-up required.',
]

function JSONFormatterTool() {
  const [input, setInput]     = useState('')
  const [pretty, setPretty]   = useState(true)
  const [copied, setCopied]   = useState(false)

  const { parsed, error } = useMemo(() => {
    if (!input.trim()) return { parsed: null, error: null }
    try { return { parsed: JSON.parse(input), error: null } }
    catch (e) { return { parsed: null, error: e.message } }
  }, [input])

  const output = useMemo(() => {
    if (parsed === null) return ''
    return pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed)
  }, [parsed, pretty])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = pretty ? 'formatted.json' : 'minified.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {[true, false].map(p => (
            <button key={p} onClick={() => setPretty(p)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${pretty === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {p ? 'Pretty' : 'Minify'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={copy} disabled={!output}
            className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${copied ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {copied ? '✅ Copied!' : 'Copy'}
          </button>
          <button onClick={download} disabled={!output}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors">
            Download
          </button>
          {input && <button onClick={() => setInput('')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:text-red-500 transition-colors">
            Clear
          </button>}
        </div>
      </div>

      {/* Status bar */}
      {input.trim() && (
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          <span>{error ? '✗' : '✓'}</span>
          <span>{error ? `Invalid JSON: ${error}` : 'Valid JSON'}</span>
        </div>
      )}

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Input</label>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            rows={18} placeholder={'{\n  "name": "AWE-OS",\n  "version": 1\n}'}
            className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 resize-none ${error && input ? 'border-red-300 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-500'}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Output</label>
          <textarea
            value={output} readOnly rows={18}
            placeholder="Formatted JSON will appear here…"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50 text-gray-700 resize-none"
          />
        </div>
      </div>

      {parsed !== null && (
        <p className="text-xs text-gray-400 text-right">
          {output.length.toLocaleString()} characters · {(output.length / 1024).toFixed(1)} KB
        </p>
      )}
    </div>
  )
}

export default function JSONFormatter() {
  return (
    <ToolPageShell
      slug="json-formatter"
      name="JSON Formatter"
      description="Validate, pretty-print, and minify JSON instantly — with syntax error detection."
      icon="{ }"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Validates JSON syntax only — it cannot check whether your data matches a specific schema or API contract."}
    >
      <JSONFormatterTool />
    </ToolPageShell>
  )
}
