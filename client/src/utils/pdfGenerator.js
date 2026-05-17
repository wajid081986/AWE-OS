import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

const PW = 210   // A4 width mm
const PH = 297   // A4 height mm
const ML = 20    // margin left
const MR = 20    // margin right
const MT = 20    // margin top
const MB = 18    // margin bottom
const CW = PW - ML - MR  // content width
const LH = 5.5  // line height

export async function generateContractPDF(contractData, formData) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  let y = MT

  // ── helpers ──────────────────────────────────────────────────────────────────

  const pageBreak = (needed = LH * 3) => {
    if (y + needed > PH - MB) {
      doc.addPage()
      y = MT + 5
      drawPageBorder()
    }
  }

  const drawPageBorder = () => {
    doc.setDrawColor(200, 210, 230)
    doc.setLineWidth(0.3)
    doc.rect(ML - 5, MT - 5, CW + 10, PH - MT - MB + 5)
  }

  const txt = (text, x, fontSize = 10, bold = false, color = [40, 40, 40]) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text || ''), CW)
    pageBreak(lines.length * LH + 3)
    doc.text(lines, x, y)
    y += lines.length * LH + (bold ? 2 : 1)
    return lines.length
  }

  // ── Cover header ─────────────────────────────────────────────────────────────

  // Dark header band
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, PW, 48, 'F')

  // Accent stripe
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 44, PW, 4, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(contractData.title, PW / 2, 18, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 230)
  doc.text(contractData.subtitle, PW / 2, 27, { align: 'center' })

  const contractDateStr = formData.contractDate
    ? format(new Date(formData.contractDate), 'dd MMMM yyyy')
    : format(new Date(), 'dd MMMM yyyy')

  doc.setFontSize(9)
  doc.setTextColor(140, 170, 210)
  doc.text(`Dated: ${contractDateStr}   |   Generated via AWE-OS Contract Generator`, PW / 2, 36, { align: 'center' })

  drawPageBorder()
  y = 58

  // ── Sections ─────────────────────────────────────────────────────────────────

  for (const section of contractData.sections) {
    pageBreak(24)

    // Section heading background
    doc.setFillColor(237, 242, 255)
    doc.rect(ML - 3, y - 4, CW + 6, 9, 'F')
    doc.setDrawColor(99, 130, 246)
    doc.setLineWidth(0.5)
    doc.line(ML - 3, y - 4, ML - 3, y + 5)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 175)
    doc.text(section.sectionTitle, ML, y)
    y += 8

    // Content
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(45, 45, 45)
    const contentLines = doc.splitTextToSize(section.content, CW)
    for (const line of contentLines) {
      pageBreak()
      doc.text(line, ML, y)
      y += LH
    }
    y += 4
  }

  // ── Signature block ───────────────────────────────────────────────────────────

  pageBreak(65)
  y += 6

  doc.setDrawColor(180, 190, 210)
  doc.setLineWidth(0.4)
  doc.line(ML, y, PW - MR, y)
  y += 8

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('SIGNATURES', ML, y)
  y += 10

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)

  const leftX  = ML
  const rightX = PW / 2 + 8
  const sigY   = y

  // Left party
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICE PROVIDER / PARTY A', leftX, sigY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${formData.freelancerSignatureName || formData.freelancerName || '________________________________'}`, leftX, sigY + 9)
  doc.text('Signature: ________________________________', leftX, sigY + 18)
  doc.text(`Date: ${contractDateStr}`, leftX, sigY + 27)

  // Right party
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT / PARTY B', rightX, sigY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${formData.clientSignatureName || formData.clientName || '________________________________'}`, rightX, sigY + 9)
  doc.text('Signature: ________________________________', rightX, sigY + 18)
  doc.text(`Date: ${contractDateStr}`, rightX, sigY + 27)

  // Witness block
  y = sigY + 42
  pageBreak(30)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(ML, y, PW - MR, y)
  y += 6
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('WITNESS 1: ______________________________  Name: ______________________________', leftX, y)
  y += 7
  doc.text('WITNESS 2: ______________________________  Name: ______________________________', leftX, y)

  // ── Page numbers & footer ─────────────────────────────────────────────────────

  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Page ${i} of ${total}  |  ${contractData.title}  |  Generated by AWE-OS (awe-os.com)`,
      PW / 2,
      PH - 7,
      { align: 'center' },
    )
  }

  return doc
}

export function downloadPDF(doc, contractTitle, contractDate) {
  const datePart = contractDate
    ? format(new Date(contractDate), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd')
  const name = `${contractTitle.replace(/[^a-z0-9]/gi, '_')}_${datePart}.pdf`
  doc.save(name)
}
