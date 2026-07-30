// PDF -> Word/Excel client-side best-effort export. Reuses already-installed
// deps (docx, xlsx) — no new npm packages — matching the exact API shapes
// already used elsewhere in this codebase (textEditorUtils.js for docx,
// pdf/PDFtoExcel.jsx for xlsx). Text-only reflow: no tables/images/original
// layout preserved. See docs/batches/batch-36-plan.md's Phase 5.
import { Document, Packer, Paragraph } from 'docx'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../pdfUtils'

// Groups a page's pdf.js text items into lines by comparing y position —
// items with (roughly) the same y are treated as one flowing line/paragraph.
// pdf.js gives no explicit line/paragraph boundary, so this is a heuristic,
// not a guarantee; good enough for a best-effort export.
function groupItemsIntoLines(items) {
  const lines = []
  let current = null
  for (const item of items) {
    const threshold = (item.height || 10) * 0.6
    if (current && Math.abs(item.y - current.y) < threshold) {
      current.strs.push(item.str)
    } else {
      current = { y: item.y, strs: [item.str] }
      lines.push(current)
    }
  }
  return lines.map((l) => l.strs.join(' ').trim()).filter(Boolean)
}

export async function exportPdfToDocx(pdfDoc, baseName) {
  const children = []
  for (let page = 1; page <= pdfDoc.pageCount; page++) {
    // eslint-disable-next-line no-await-in-loop -- pages must join in order
    const items = await pdfDoc.getTextItems(page)
    const lines = groupItemsIntoLines(items)
    lines.forEach((line, i) => {
      children.push(new Paragraph({ text: line, pageBreakBefore: page > 1 && i === 0 }))
    })
  }
  if (!children.length) children.push(new Paragraph(''))

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${baseName}.docx`)
}

// Formats the AI Extract Tables endpoint's `{ tables: [{ headers, rows }] }`
// result into a real .xlsx — one worksheet per table. Reuses the same
// table-detection call Extract Tables (CSV) already makes rather than
// inventing a second detection path for a generic "any PDF to Excel" that
// has no well-defined output without a table source.
export function exportTablesToXlsx(tables, baseName) {
  const wb = XLSX.utils.book_new()
  tables.forEach((table, i) => {
    const aoa = [table.headers || [], ...(table.rows || [])]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, `Table ${i + 1}`.slice(0, 31))
  })
  XLSX.writeFile(wb, `${baseName}-tables.xlsx`)
}
