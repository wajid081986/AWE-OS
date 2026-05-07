import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import ToolPageShell from '../ToolPageShell'

const STEPS = [
  { title: 'Upload Excel file', description: 'Select a .xlsx, .xls or .csv file.' },
  { title: 'Preview the table', description: 'See your spreadsheet data in the browser.' },
  { title: 'Download PDF', description: 'Click Convert to get a formatted PDF table.' },
]
const FAQS = [
  { q: 'Which formats are supported?', a: '.xlsx, .xls and .csv files are supported.' },
  { q: 'Can it handle multiple sheets?', a: 'The first sheet is converted. Multi-sheet support coming soon.' },
  { q: 'Is my file private?', a: 'Yes. Conversion happens entirely in your browser. Nothing is uploaded.' },
]

export default function ExcelToPDF() {
  const [file, setFile]     = useState(null)
  const [rows, setRows]     = useState([])
  const [headers, setHeaders] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError]   = useState('')
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    const valid = ['.xlsx', '.xls', '.csv'].some(ext => f.name.toLowerCase().endsWith(ext))
    if (!valid) { setError('Please upload an Excel (.xlsx, .xls) or CSV file.'); return }
    setError(''); setFile(f); setStatus('loading')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (!data.length) { setError('The spreadsheet appears to be empty.'); setStatus('idle'); return }
        const hdrs = data[0].map(String)
        setHeaders(hdrs)
        setRows(data.slice(1))
        setStatus('ready')
      } catch {
        setError('Failed to read the file. Make sure it is a valid Excel or CSV file.')
        setStatus('idle')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const convert = () => {
    setStatus('processing')
    try {
      const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
      const margin = 10
      const pgW = doc.internal.pageSize.getWidth()
      const pgH = doc.internal.pageSize.getHeight()
      const colW = Math.min(40, (pgW - margin * 2) / Math.max(headers.length, 1))
      const rowH = 8
      let y = margin + 5

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(file.name.replace(/\.(xlsx|xls|csv)$/i, ''), margin, y)
      y += 8

      const drawRow = (cells, isHeader) => {
        if (isHeader) {
          doc.setFillColor(59, 130, 246)
          doc.rect(margin, y - 5, pgW - margin * 2, rowH, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setTextColor(40, 40, 40)
          doc.setFont('helvetica', 'normal')
        }
        doc.setFontSize(8)
        cells.forEach((cell, i) => {
          const text = String(cell ?? '').slice(0, 20)
          doc.text(text, margin + i * colW + 1, y)
        })
        y += rowH
      }

      drawRow(headers, true)
      doc.setDrawColor(200, 200, 200)

      rows.slice(0, 200).forEach((row, ri) => {
        if (y > pgH - margin) { doc.addPage(); y = margin + 5 }
        if (ri % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, y - 5, pgW - margin * 2, rowH, 'F')
        }
        drawRow(row.slice(0, headers.length), false)
      })

      doc.save(file.name.replace(/\.(xlsx|xls|csv)$/i, '.pdf'))
      setStatus('done')
    } catch {
      setError('PDF generation failed.')
      setStatus('ready')
    }
  }

  const reset = () => { setFile(null); setRows([]); setHeaders([]); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="excel-to-pdf"
      name="Excel to PDF"
      description="Convert Excel spreadsheets (.xlsx, .csv) to a clean PDF table — 100% in your browser."
      icon="📊"
      steps={STEPS}
      faqs={FAQS}
      about="ExcelToPDF uses SheetJS (xlsx) to parse your spreadsheet data and jsPDF to render it as a formatted PDF table. No server needed — all processing is local."
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {status === 'idle' || status === 'loading' ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
          >
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-700 font-semibold mb-1">Drop your Excel / CSV file here</p>
            <p className="text-gray-400 text-sm">or click to browse · .xlsx .xls .csv</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{file?.name}</p>
                  <p className="text-xs text-gray-400">{rows.length} rows · {headers.length} columns</p>
                </div>
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Remove</button>
            </div>

            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Reading spreadsheet…</p>
              </div>
            )}

            {(status === 'ready' || status === 'processing' || status === 'done') && rows.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-64">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      {headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {headers.map((_, ci) => <td key={ci} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{String(row[ci] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && <p className="text-xs text-gray-400 text-center py-2">Showing 50 of {rows.length} rows</p>}
              </div>
            )}

            {status === 'done' ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold text-lg mb-1">✅ PDF Downloaded!</p>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">Convert another file</button>
              </div>
            ) : (
              <button
                onClick={convert}
                disabled={status === 'processing' || status === 'loading' || !rows.length}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating PDF…</>
                ) : 'Convert & Download PDF'}
              </button>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
