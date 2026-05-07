import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import * as XLSX from 'xlsx'
import ToolPageShell from '../ToolPageShell'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const STEPS = [
  { title: 'Upload PDF', description: 'Select the PDF containing the data you want.' },
  { title: 'Extract data', description: 'Text is extracted and structured into rows.' },
  { title: 'Download CSV / Excel', description: 'Save the extracted data as a spreadsheet.' },
]
const FAQS = [
  { q: 'What data can be extracted?', a: 'Text-based tables and data from the PDF are extracted. Scanned PDFs (images) cannot be extracted without OCR.' },
  { q: 'Does it detect table structure?', a: 'Lines of text are placed into rows. Complex multi-column table detection requires server-side AI processing.' },
  { q: 'Is my PDF uploaded?', a: 'No. Everything runs in your browser using PDF.js and SheetJS.' },
]

export default function PDFtoExcel() {
  const [file, setFile]         = useState(null)
  const [tableData, setTableData] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [progress, setProgress]   = useState(0)
  const [status, setStatus]     = useState('idle')
  const [error, setError]       = useState('')
  const inputRef = useRef()

  const handleFile = async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.pdf')) { setError('Please upload a PDF file.'); return }
    setError(''); setFile(f); setStatus('loading'); setProgress(0); setTableData([])
    try {
      const buf = await f.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise
      setPageCount(pdf.numPages)
      const allRows = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        allRows.push([`--- Page ${i} ---`])
        const lineMap = {}
        for (const item of content.items) {
          const y = Math.round(item.transform[5])
          if (!lineMap[y]) lineMap[y] = []
          lineMap[y].push(item.str)
        }
        const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a)
        for (const y of sortedYs) {
          allRows.push(lineMap[y])
        }
        setProgress(Math.round((i / pdf.numPages) * 100))
      }

      setTableData(allRows)
      setStatus('ready')
    } catch {
      setError('Failed to read the PDF. It may be encrypted or corrupted.')
      setStatus('idle')
    }
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const downloadCSV = () => {
    const csv = tableData.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = file.name.replace(/\.pdf$/i, '.csv'); a.click()
    URL.revokeObjectURL(url)
    setStatus('done')
  }

  const downloadXLSX = () => {
    const ws = XLSX.utils.aoa_to_sheet(tableData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'PDF Data')
    XLSX.writeFile(wb, file.name.replace(/\.pdf$/i, '.xlsx'))
    setStatus('done')
  }

  const reset = () => { setFile(null); setTableData([]); setPageCount(0); setProgress(0); setStatus('idle'); setError('') }

  return (
    <ToolPageShell
      slug="pdf-to-excel"
      name="PDF to Excel"
      description="Extract data from PDF files and download as CSV or Excel — entirely in your browser."
      icon="📈"
      steps={STEPS}
      faqs={FAQS}
      about="PDF to Excel uses PDF.js to read text content from your PDF and SheetJS to package the extracted data into a spreadsheet. All processing is browser-side — your file is never uploaded."
    >
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {status === 'idle' ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
          >
            <p className="text-4xl mb-3">📈</p>
            <p className="text-gray-700 font-semibold mb-1">Drop your PDF file here</p>
            <p className="text-gray-400 text-sm">or click to browse</p>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{file?.name}</p>
                  <p className="text-xs text-gray-400">{pageCount} page{pageCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Remove</button>
            </div>

            {status === 'loading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Extracting data…</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {(status === 'ready' || status === 'done') && tableData.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-64 bg-gray-50">
                <table className="text-xs w-full">
                  <tbody>
                    {tableData.slice(0, 40).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1 text-gray-700 whitespace-nowrap border-r border-gray-100 last:border-0">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tableData.length > 40 && <p className="text-xs text-gray-400 text-center py-2">Showing 40 of {tableData.length} rows</p>}
              </div>
            )}

            {status === 'done' ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold text-lg mb-1">✅ Downloaded!</p>
                <button onClick={reset} className="text-sm text-blue-600 hover:underline">Convert another PDF</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadCSV}
                  disabled={status === 'loading' || !tableData.length}
                  className="py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  Download CSV
                </button>
                <button
                  onClick={downloadXLSX}
                  disabled={status === 'loading' || !tableData.length}
                  className="py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  Download Excel
                </button>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </ToolPageShell>
  )
}
