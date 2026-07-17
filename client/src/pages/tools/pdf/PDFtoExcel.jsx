import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import * as XLSX from 'xlsx'
import ToolPageShell from '../ToolPageShell'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

const STEPS = [
  'Upload the PDF containing the data you want to extract by clicking the drop zone or dragging your file in. Text-based digital PDFs extract well; scanned PDFs (images) cannot be processed without OCR.',
  'A progress bar tracks text extraction page by page. Extracted data appears in a table preview in the browser — review the row structure before downloading.',
  'Click "Download CSV" for a universal format compatible with any spreadsheet software, or "Download Excel" to save directly as a .xlsx file for Microsoft Excel or Google Sheets.',
  'Open the downloaded file in Excel or Google Sheets to clean up, format, and analyse the extracted data. For PDFs with clear table alignment, the data typically needs minimal adjustment.',
]
const FAQS = [
  { q: 'What type of PDF data can be extracted?', a: 'Text-based digital PDFs work best — bank statements, financial reports, price lists, and data exports typically extract well. Scanned PDFs are images of text rather than actual text, so PDF.js cannot extract content from them. OCR (optical character recognition) is required for scanned documents.' },
  { q: 'Does it detect table structure automatically?', a: 'The tool reads lines of text from the PDF and organises them into rows. Simple tables with consistent column alignment extract cleanly. Complex multi-column layouts, merged cells, and rotated headers may not align correctly. For complex structures, some manual cleanup in Excel after downloading is usually needed.' },
  { q: 'Is my PDF uploaded to a server?', a: 'No. All text extraction and spreadsheet generation runs in your browser using PDF.js and SheetJS. Your file is never transmitted to any server — especially important for financial statements, bank records, payroll data, and other sensitive documents you need to process.' },
  { q: 'Can I get both CSV and Excel output?', a: 'Yes. Two buttons let you choose: CSV (.csv) for universal compatibility with any software, or Excel (.xlsx) for direct use in Microsoft Excel or Google Sheets. Both files contain the same extracted data — choose based on what you plan to do with it next.' },
  { q: 'What if the extracted data looks garbled?', a: 'PDF text extraction reads characters by position on the page, not by semantic structure. Multi-column layouts and complex page designs can produce scrambled output. Try opening the raw .csv in a text editor to assess the raw extraction. For PDFs with clearly defined table structures, results are typically clean.' },
  { q: 'Is there a page limit?', a: 'No enforced limit. Large PDFs with many pages take longer to process as each page is extracted sequentially. The progress bar shows status. A 50-page document typically extracts in 20–40 seconds on a modern device — longer documents may take a minute or more.' },
]
const ABOUT = [
  'Data locked inside PDF reports, bank statements, invoices, and financial documents often needs to be analysed or incorporated into spreadsheets — tasks that PDFs were never designed for. Getting that data into Excel or Google Sheets previously required manual retyping or expensive server-side tools. The AWE-OS PDF to Excel converter extracts text data from any text-based PDF entirely in your browser and delivers it as CSV or XLSX, ready for immediate use.',
  'The extraction engine uses PDF.js to read text content from every page of your document, organising each line of text into a spreadsheet row. A live progress bar tracks extraction, and a preview table shows the data before you download, so you can assess quality and choose between CSV for maximum compatibility or XLSX for native Excel use. Both are generated locally without any server involvement.',
  'The key limitation to understand is that PDF text extraction reads what is visually present, not what is semantically structured. PDFs store text by x/y coordinates rather than in rows and columns. The tool organises these text fragments into rows, but column alignment depends on how consistently the original PDF was formatted. Clearly structured data from business reporting tools extracts cleanly; complex or hand-formatted PDFs may need cleanup after extraction.',
  'Browser-based processing ensures your financial and business data stays private. No file is uploaded, no data is stored externally, and no processing happens outside your own browser. This zero-upload approach is particularly valuable for the sensitive financial and business data that commonly appears in PDF reports: bank statements, payroll records, client invoices, and quarterly financial summaries. Extract, download, and start analysing — no account or subscription required.',
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
      about={ABOUT}
      limitation={"Works best on clearly structured tables; merged cells and irregular layouts may need manual cleanup."}
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
