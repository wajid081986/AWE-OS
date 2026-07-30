import { useCallback } from 'react'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

// Returns a plain {r,g,b} (0-1 range) — NOT pdf-lib's rgb() color object,
// whose fields are named red/green/blue. applyWatermark destructures r/g/b
// itself and passes them into rgb(r, g, b) below.
function hexToRgb01(hex) {
  const h = (hex || '#000000').replace('#', '').padEnd(6, '0')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

// Same position/margin math as PageNumbersPDF.jsx — kept identical so a
// returning user sees the same placement they already know from that tool.
function positionXY(position, width, height, textWidth, fontSize, margin) {
  const isBottom = position.startsWith('bottom')
  const align = position.endsWith('left') ? 'left' : position.endsWith('right') ? 'right' : 'center'
  const y = isBottom ? margin : height - margin - fontSize
  const x = align === 'left' ? margin : align === 'right' ? width - textWidth - margin : (width - textWidth) / 2
  return { x, y }
}

/**
 * Whole-document operations (page numbers, header, footer, Bates
 * numbering, watermark) — unlike TOOLS annotations, these bake straight
 * into the base document (no overlay, not undoable), so page count/order
 * never changes and none of usePageManager's remap machinery applies.
 * Every apply function ends the same way: save -> replace
 * originalBytesRef.current -> reload pdf.js -> re-detect form fields
 * (defensive; drawing text doesn't move AcroForm widgets, but a rebuilt
 * document is cheap to re-scan and this matches Phase 7's same safety net).
 */
export function useDocumentTools({ originalBytesRef, pdfDoc, formFieldsApi }) {
  const commit = useCallback(async (pdf) => {
    const bytes = await pdf.save()
    originalBytesRef.current = bytes
    await pdfDoc.loadFromBytes(bytes, pdfDoc.fileName)
    const prevValues = formFieldsApi.values
    await formFieldsApi.detect(bytes)
    formFieldsApi.setValuesBulk(prevValues)
  }, [originalBytesRef, pdfDoc, formFieldsApi])

  // Shared by page numbers, header/footer, and Bates numbering — only the
  // per-page label and position differ between them.
  const drawRunningText = useCallback(async ({ position, fontSize, getLabel, color = rgb(0.3, 0.3, 0.3) }) => {
    const pdf = await PDFDocument.load(originalBytesRef.current)
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const pages = pdf.getPages()
    const MARGIN = 20
    pages.forEach((page, i) => {
      const label = getLabel(i, pages.length)
      if (!label) return
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(label, fontSize)
      const { x, y } = positionXY(position, width, height, textWidth, fontSize, MARGIN)
      page.drawText(label, { x, y, size: fontSize, font, color })
    })
    await commit(pdf)
  }, [originalBytesRef, commit])

  const applyPageNumbers = useCallback(async ({ position, format, startNum, fontSize }) => {
    await drawRunningText({
      position,
      fontSize,
      getLabel: (i, total) => {
        const n = startNum + i
        if (format === 'page-n') return `Page ${n}`
        if (format === 'n-of-t') return `${n} of ${startNum - 1 + total}`
        return `${n}`
      },
    })
  }, [drawRunningText])

  const applyBatesNumbering = useCallback(async ({ prefix, digits, position, startNum, fontSize }) => {
    await drawRunningText({
      position,
      fontSize,
      getLabel: (i) => `${prefix}${String(startNum + i).padStart(digits, '0')}`,
    })
  }, [drawRunningText])

  // Header/footer text is identical on every page, by design — same
  // "applies to every page, no exceptions" reasoning WatermarkPDF.jsx
  // already documents (partial marking defeats the purpose).
  const applyHeaderFooter = useCallback(async ({ headerText, footerText, fontSize }) => {
    const pdf = await PDFDocument.load(originalBytesRef.current)
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const MARGIN = 20
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      if (headerText?.trim()) {
        const tw = font.widthOfTextAtSize(headerText, fontSize)
        page.drawText(headerText, { x: (width - tw) / 2, y: height - MARGIN - fontSize, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
      }
      if (footerText?.trim()) {
        const tw = font.widthOfTextAtSize(footerText, fontSize)
        page.drawText(footerText, { x: (width - tw) / 2, y: MARGIN, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
      }
    }
    await commit(pdf)
  }, [originalBytesRef, commit])

  // Ported directly from WatermarkPDF.jsx's apply() — same 7-position
  // layout, diagonal/straight rotation, and opacity handling.
  const applyWatermark = useCallback(async ({ text, position, opacity, fontSize, color, diagonal }) => {
    const pdf = await PDFDocument.load(originalBytesRef.current)
    const font = await pdf.embedFont(StandardFonts.HelveticaBold)
    const { r, g, b } = hexToRgb01(color)
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      let x, y
      switch (position) {
        case 'top-left': x = 40; y = height - 60; break
        case 'top-center': x = (width - textWidth) / 2; y = height - 60; break
        case 'top-right': x = width - textWidth - 40; y = height - 60; break
        case 'bottom-left': x = 40; y = 40; break
        case 'bottom-center': x = (width - textWidth) / 2; y = 40; break
        case 'bottom-right': x = width - textWidth - 40; y = 40; break
        default: x = (width - textWidth) / 2; y = height / 2
      }
      page.drawText(text, { x, y, size: fontSize, font, color: rgb(r, g, b), opacity: opacity / 100, rotate: diagonal ? degrees(45) : degrees(0) })
    }
    await commit(pdf)
  }, [originalBytesRef, commit])

  return { applyPageNumbers, applyBatesNumbering, applyHeaderFooter, applyWatermark }
}
