import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import ToolPageShell from '../ToolPageShell'

const STEPS = [
  'Upload your spreadsheet by clicking the drop zone or dragging a file in. The tool accepts .xlsx (Excel 2007+), .xls (Excel 97-2003), and .csv files.',
  'Your spreadsheet data is parsed and displayed as a table preview in the browser. You can verify that rows, columns, and headers were read correctly before converting.',
  'Click "Convert & Download PDF" to render the table data into a clean, formatted PDF with a bold header row and alternating row shading.',
  'The PDF downloads automatically — a readable table document suitable for printing, sharing, or archiving without requiring Excel on the recipient\'s device.',
]
const FAQS = [
  { q: 'Which spreadsheet formats are supported?', a: '.xlsx (Excel 2007 and later), .xls (Excel 97-2003), and .csv files are all accepted. The tool uses SheetJS for parsing, which handles the full range of Excel format versions. Password-protected workbooks cannot be opened — remove the password in Excel first.' },
  { q: 'Can it handle multiple worksheets?', a: 'Currently only the first worksheet is converted. If your workbook has multiple tabs, move the sheet you want to the first position before uploading. For multi-sheet workbooks, convert each sheet separately and use the Merge PDF tool to combine the outputs.' },
  { q: 'Is my file uploaded to a server?', a: 'No. All parsing and PDF generation runs entirely in your browser using SheetJS and jsPDF. Your spreadsheet data is never transmitted to any server and is discarded when you close the tab — safe for financial data, client records, and other sensitive content.' },
  { q: 'How many rows and columns can it handle?', a: 'The preview shows up to 50 rows for performance, but the PDF output includes all rows in the file. Very wide spreadsheets may have columns scale down to fit the page width. For best results, aim for spreadsheets with up to 15–20 columns; wider data may require landscape formatting.' },
  { q: 'Will formulas be preserved?', a: 'No. The tool reads the calculated values in each cell, not the underlying formulas. This is standard behaviour for spreadsheet export — recipients see the final numbers without the calculation logic, which is usually the desired outcome for sharing and reporting.' },
  { q: 'What does the output PDF look like?', a: 'The PDF uses A4 portrait format with a blue bold header row for column names and alternating grey/white data rows. Text is rendered in a clean sans-serif font sized to fit the column count. The layout is clean and professional — suitable for printing or attaching to emails as a formal report.' },
]
const ABOUT = [
  'Spreadsheets hold some of the most important operational data in any business — budgets, sales figures, inventory counts, project timelines, and financial reports. Sharing this data as a PDF is often necessary: PDFs open on any device without Excel installed, cannot be accidentally edited, render consistently across all viewers, and are the standard format for formal reporting and document submission. The AWE-OS Excel to PDF converter handles this instantly, in your browser, with no upload required.',
  'The tool uses SheetJS — the most widely deployed open-source spreadsheet parsing library — to read .xlsx, .xls, and .csv files and extract their row and column data. A table preview appears in the browser before conversion so you can confirm the data was parsed correctly. jsPDF then renders the data as a clean, formatted PDF table with a blue header row and alternating row shading, producing a document suitable for printing or professional sharing.',
  'Browser-based conversion works best for straightforward tabular data: rows and columns of numbers, text, and dates. Complex Excel features — charts, pivot tables, conditional formatting, multiple worksheets, cell colours, and embedded images — are not reproduced in the PDF output. The result is a clean tabular representation of the data. For presentations where the spreadsheet\'s visual layout must be replicated exactly, Excel\'s own "Save as PDF" function is the most accurate option.',
  'A significant advantage of this approach is data privacy. Spreadsheets frequently contain sensitive business information — financial projections, employee records, pricing structures, and client data. With this tool, your data never leaves your device: no upload, no server processing, no data retention. Everything happens in your browser\'s memory and the PDF saves directly to your local storage. No account is required, there is no file size quota, and there is no watermark on the output.',
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
      about={ABOUT}
      limitation={"Very wide spreadsheets may be scaled down or split across pages to fit."}
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
