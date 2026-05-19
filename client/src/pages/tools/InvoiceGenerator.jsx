import { useState } from 'react'
import jsPDF from 'jspdf'
import ToolPageShell from './ToolPageShell'

const GST_RATES = [0, 5, 12, 18, 28]

const STEPS = [
  "Fill in your business details in the Seller section: your company or individual name, GSTIN (15-character alphanumeric GST Identification Number issued by GSTIN authorities), address, and contact information. The GSTIN appears on every GST-compliant invoice and is used by your customers to claim Input Tax Credit. If you are not registered for GST, leave the GSTIN field blank — invoices below the mandatory registration threshold (₹20 lakh annual turnover) do not require a GSTIN.",
  "Fill in your client's details in the Bill To section. Enter the client company name, their GSTIN if they are GST-registered (required for B2B transactions where the client will claim ITC), and their billing address. The invoice number and date are auto-filled but can be changed — invoice numbers should follow a sequential series as required by GST rules, and the date must match when the supply was made or agreed.",
  "Add line items using the '+ Add Item' button. For each item, enter a description, quantity, and unit price in rupees. The line total (quantity × unit price) calculates automatically. Add as many items as needed — there is no limit. To remove an item, click the × button on that row. Make sure descriptions are clear enough to match the goods or service category for GST purposes.",
  "Select the GST rate that applies to your goods or services: 0%, 5%, 12%, 18%, or 28%. A single rate applies to the entire invoice — if your invoice includes items with different GST rates, generate separate invoices for each rate slab. The tool calculates CGST + SGST for intra-state supplies or IGST for inter-state, showing the complete tax breakdown in the invoice totals section.",
  "Click 'Download PDF' to generate and save the invoice as a PDF file. The file is named with your invoice number for easy filing. The generated PDF includes all invoice details in a standard format compatible with Indian GST requirements: seller and buyer details, GSTIN, line items with HSN/SAC (you can add these manually after download if needed), GST breakdown, and total in words. Share this PDF directly with clients or print it for physical records.",
]

const FAQS = [
  {
    q: 'Is this invoice format GST-compliant for Indian businesses?',
    a: "The generated invoice includes the core fields required under Rule 46 of the CGST Rules, 2017: supplier name and GSTIN, recipient name and GSTIN (for B2B), place of supply, invoice number and date, description of goods or services, taxable value, and applicable GST (CGST+SGST or IGST). For a fully compliant tax invoice, you should also add the HSN (Harmonised System of Nomenclature) code for goods or SAC (Services Accounting Code) for services — these are mandatory for turnover above ₹5 crore (2 digits), above ₹1.5 crore (4 digits), and for all (6 digits). Add these codes to the item description before downloading.",
  },
  {
    q: 'When should I use CGST+SGST vs IGST on an invoice?',
    a: "CGST + SGST applies to intra-state supplies — when the supplier and the place of supply are in the same state. For example, a Mumbai-based business billing a Pune client applies CGST + SGST at equal halves of the applicable rate. IGST applies to inter-state supplies — when the supplier and the place of supply are in different states, or for imports and exports. A Mumbai business billing a Delhi client applies IGST. The place of supply rules under the IGST Act determine which scenario applies — for services, the default is the registered business address of the recipient. The total tax outflow is identical; the distribution between governments differs.",
  },
  {
    q: 'What is the mandatory sequential invoice numbering requirement?',
    a: "Under Rule 46 of the CGST Rules, every registered taxpayer must issue tax invoices with a consecutive serial number containing alphabets, numerals, or special characters like hyphens and slashes, unique for a financial year. Common formats include INV/2025-26/001, AWE/001/25-26, or simply 2025-001. The sequence must not skip numbers and must restart at the beginning of each financial year (1 April). Tax authorities review invoice number sequences during audits — gaps in numbering can raise compliance questions. This tool pre-fills a sample number that you should replace with your actual running sequence.",
  },
  {
    q: 'Do I need to register for GST to issue an invoice?',
    a: "GST registration is mandatory for businesses with annual taxable turnover above ₹20 lakh (₹10 lakh for special category states and North-East India). Below this threshold, you are exempt from GST registration and issue a 'bill of supply' instead of a tax invoice — it looks identical but does not include a GSTIN or GST amounts. E-commerce sellers (even small ones selling on Amazon, Flipkart, or Meesho) must register regardless of turnover because the marketplace collects TCS under Section 52 of the CGST Act. Professionals and freelancers above the threshold must also register if their services are taxable.",
  },
  {
    q: 'Can I add my logo or company branding to the invoice?',
    a: "The generated PDF is a standard plain-format invoice without a logo or custom branding. After downloading the PDF, you can add branding using Adobe Acrobat, LibreOffice Draw, or a PDF editor — insert your logo image and move it to the header. Alternatively, you can use the downloaded invoice as a reference and recreate it in a branded Word or Google Docs template that includes your letterhead. For ongoing invoicing with consistent branding, accounting software like Zoho Books, Tally Prime, or FreshBooks generates tax-compliant branded invoices with your logo, signature image, and custom colour schemes.",
  },
  {
    q: 'How should I file and store invoices for GST compliance?',
    a: "GST rules require businesses to retain all invoices, debit notes, credit notes, and related records for at least 72 months (6 years) from the due date of filing the annual return for that financial year. Electronic copies are fully acceptable — PDF invoices stored in organised folders or cloud storage (Google Drive, OneDrive, or a dedicated accounting system) satisfy this requirement. Organise by financial year and month for easy retrieval during audits. GSTR-1 requires outward supply details to be uploaded to the GST portal monthly or quarterly — your invoice data populates the fields in GSTR-1. Accounting software automates this data entry; manual invoicers must enter each invoice individually.",
  },
]

const ABOUT = [
  'The Invoice Generator creates professional tax invoices in PDF format suitable for Indian GST-registered businesses and freelancers. Enter seller and buyer details, add line items with quantities and prices, select the applicable GST rate, and download a complete invoice as a PDF — all in under two minutes, without creating an account or installing software.',
  'The invoice includes all fields required for a standard GST tax invoice: seller name, GSTIN, billing address, invoice number and date, itemised line items with descriptions and amounts, GST rate, tax breakdown by component (CGST+SGST for intra-state, IGST for inter-state), and the grand total. This covers the mandatory fields under Rule 46 of the CGST Rules, 2017 for supplies above ₹200. For B2B transactions, the buyer\'s GSTIN enables them to claim Input Tax Credit on the invoice.',
  'For freelancers and small businesses handling occasional billing, this tool eliminates the need for a monthly subscription to accounting software. The downloaded PDF can be shared directly with clients by email, WhatsApp, or any document platform. For businesses with regular invoicing requirements — monthly retainers, recurring service billing, or product-based businesses — dedicated accounting software like Zoho Books, Tally Prime, or ClearBooks automates GST return preparation alongside invoice generation.',
  'All invoice generation runs locally in your browser using jsPDF. No invoice data, client details, GSTIN numbers, or billing amounts are sent to any server. This protects the confidentiality of your business relationships and financial information. Downloaded PDFs are saved directly to your device\'s file system. There is no usage limit and no account required.',
]

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function numToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'
  const crore = Math.floor(n / 10000000)
  const lakh  = Math.floor((n % 10000000) / 100000)
  const thou  = Math.floor((n % 100000) / 1000)
  const hund  = Math.floor((n % 1000) / 100)
  const rem   = n % 100

  const twoDigit = x => x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '')
  let result = ''
  if (crore) result += twoDigit(crore) + ' Crore '
  if (lakh)  result += twoDigit(lakh)  + ' Lakh '
  if (thou)  result += twoDigit(thou)  + ' Thousand '
  if (hund)  result += ones[hund]      + ' Hundred '
  if (rem)   result += twoDigit(rem)
  return result.trim()
}

const today = new Date().toISOString().split('T')[0]

function InvoiceTool() {
  const [seller, setSeller] = useState({ name: '', gstin: '', address: '', email: '', phone: '' })
  const [buyer,  setBuyer]  = useState({ name: '', gstin: '', address: '' })
  const [meta,   setMeta]   = useState({ invoiceNo: 'INV/2025-26/001', date: today })
  const [items,  setItems]  = useState([{ desc: '', qty: '1', price: '' }])
  const [gstRate, setGstRate] = useState(18)
  const [txType,  setTxType]  = useState('intra')

  const setS = (k, v) => setSeller(p => ({ ...p, [k]: v }))
  const setB = (k, v) => setBuyer(p => ({ ...p, [k]: v }))
  const setM = (k, v) => setMeta(p => ({ ...p, [k]: v }))

  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))
  const addItem    = () => setItems(p => [...p, { desc: '', qty: '1', price: '' }])
  const removeItem = i  => items.length > 1 && setItems(p => p.filter((_, idx) => idx !== i))

  const lineTotal = it => {
    const q = parseFloat(it.qty) || 0
    const p = parseFloat(it.price) || 0
    return q * p
  }
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0)
  const gstAmt   = subtotal * (gstRate / 100)
  const total    = subtotal + gstAmt
  const half     = gstAmt / 2

  const generate = () => {
    if (!seller.name || !buyer.name) { alert('Please fill in seller and buyer names.'); return }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const W = 595, margin = 40
    let y = margin

    const line = (y1) => { doc.setDrawColor(220); doc.line(margin, y1, W - margin, y1) }
    const text = (t, x, y, opts = {}) => {
      doc.setFontSize(opts.size || 10)
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
      doc.setTextColor(opts.color || '#1f2937')
      doc.text(String(t), x, y, { align: opts.align || 'left', maxWidth: opts.maxWidth })
    }

    // Header
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, W, 60, 'F')
    text('TAX INVOICE', margin, 38, { size: 18, bold: true, color: '#ffffff' })
    text(`Invoice No: ${meta.invoiceNo}`, W - margin, 30, { align: 'right', color: '#bfdbfe', size: 9 })
    text(`Date: ${meta.date}`, W - margin, 45, { align: 'right', color: '#bfdbfe', size: 9 })
    y = 80

    // Seller + Buyer
    text('FROM', margin, y, { bold: true, size: 8, color: '#6b7280' }); y += 14
    text(seller.name, margin, y, { bold: true, size: 11 }); y += 14
    if (seller.gstin) { text(`GSTIN: ${seller.gstin}`, margin, y, { size: 9, color: '#374151' }); y += 12 }
    if (seller.address) { text(seller.address, margin, y, { size: 9, maxWidth: 220 }); y += 12 }
    if (seller.email)   { text(seller.email, margin, y, { size: 9 }); y += 12 }
    if (seller.phone)   { text(seller.phone, margin, y, { size: 9 }); y += 12 }

    const byY = 80
    text('BILL TO', W / 2 + 10, byY, { bold: true, size: 8, color: '#6b7280' })
    text(buyer.name, W / 2 + 10, byY + 14, { bold: true, size: 11 })
    let bY = byY + 28
    if (buyer.gstin)   { text(`GSTIN: ${buyer.gstin}`, W / 2 + 10, bY, { size: 9, color: '#374151' }); bY += 12 }
    if (buyer.address) { text(buyer.address, W / 2 + 10, bY, { size: 9, maxWidth: 210 }); bY += 12 }

    y = Math.max(y, bY) + 16
    line(y); y += 14

    // Table header
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, y - 10, W - 2 * margin, 20, 'F')
    text('#',           margin + 4,   y + 4, { bold: true, size: 9 })
    text('Description', margin + 22,  y + 4, { bold: true, size: 9 })
    text('Qty',         W - 220,      y + 4, { bold: true, size: 9 })
    text('Unit Price',  W - 170,      y + 4, { bold: true, size: 9 })
    text('Amount',      W - margin,   y + 4, { bold: true, size: 9, align: 'right' })
    y += 18

    // Items
    items.forEach((it, i) => {
      const lt = lineTotal(it)
      y += 4
      text(String(i + 1),   margin + 4,  y, { size: 9 })
      text(it.desc || '—',  margin + 22, y, { size: 9, maxWidth: 230 })
      text(String(it.qty || ''), W - 220, y, { size: 9 })
      text(it.price ? `₹${fmt(parseFloat(it.price))}` : '—', W - 170, y, { size: 9 })
      text(`₹${fmt(lt)}`, W - margin, y, { size: 9, align: 'right' })
      y += 18
    })

    y += 6; line(y); y += 14

    // Totals
    const totRow = (label, value, bold = false) => {
      text(label, W - 200, y, { bold, size: 10 })
      text(value, W - margin, y, { bold, size: 10, align: 'right' })
      y += 16
    }
    totRow('Subtotal', `₹${fmt(subtotal)}`)
    if (txType === 'intra') {
      totRow(`CGST (${gstRate / 2}%)`, `₹${fmt(half)}`)
      totRow(`SGST (${gstRate / 2}%)`, `₹${fmt(half)}`)
    } else {
      totRow(`IGST (${gstRate}%)`, `₹${fmt(gstAmt)}`)
    }
    y += 4; line(y); y += 14
    totRow('TOTAL', `₹${fmt(total)}`, true)

    y += 12
    text(`Amount in words: Rupees ${numToWords(Math.round(total))} Only`, margin, y, { size: 9, color: '#374151' })
    y += 24; line(y); y += 16

    text('Thank you for your business.', margin, y, { size: 9, color: '#6b7280' })
    y += 12
    text('This is a computer-generated invoice.', margin, y, { size: 8, color: '#9ca3af' })

    doc.save(`${meta.invoiceNo.replace(/\//g, '-')}.pdf`)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-4">Invoice Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Invoice Number</label>
            <input className={inputCls} value={meta.invoiceNo} onChange={e => setM('invoiceNo', e.target.value)} /></div>
          <div><label className={labelCls}>Invoice Date</label>
            <input type="date" className={inputCls} value={meta.date} onChange={e => setM('date', e.target.value)} /></div>
        </div>
      </div>

      {/* Seller / Buyer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Seller (Your Details)</h3>
          {[['name','Business / Your Name *'],['gstin','GSTIN'],['address','Address'],['email','Email'],['phone','Phone']].map(([k, lbl]) => (
            <div key={k}><label className={labelCls}>{lbl}</label>
              <input className={inputCls} value={seller[k]} onChange={e => setS(k, e.target.value)}
                placeholder={k === 'gstin' ? '22AAAAA0000A1Z5' : ''} /></div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Bill To (Client Details)</h3>
          {[['name','Client Name *'],['gstin','Client GSTIN (B2B)'],['address','Client Address']].map(([k, lbl]) => (
            <div key={k}><label className={labelCls}>{lbl}</label>
              <input className={inputCls} value={buyer[k]} onChange={e => setB(k, e.target.value)} /></div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-4">Line Items</h3>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input className="col-span-6 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Description" value={it.desc} onChange={e => updateItem(i, 'desc', e.target.value)} />
              <input type="number" min="0" step="0.5"
                className="col-span-2 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Qty" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
              <input type="number" min="0" step="0.01"
                className="col-span-3 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Unit ₹" value={it.price} onChange={e => updateItem(i, 'price', e.target.value)} />
              <button onClick={() => removeItem(i)} className="col-span-1 text-gray-400 hover:text-red-500 text-lg text-center">×</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg text-sm transition-colors">
          + Add Item
        </button>
      </div>

      {/* GST settings + totals */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>GST Rate</label>
            <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Transaction Type</label>
            <select value={txType} onChange={e => setTxType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="intra">Intra-state (CGST + SGST)</option>
              <option value="inter">Inter-state (IGST)</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-mono">₹{fmt(subtotal)}</span></div>
          {txType === 'intra'
            ? <>
                <div className="flex justify-between"><span className="text-gray-600">CGST ({gstRate / 2}%)</span><span className="font-mono">₹{fmt(half)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">SGST ({gstRate / 2}%)</span><span className="font-mono">₹{fmt(half)}</span></div>
              </>
            : <div className="flex justify-between"><span className="text-gray-600">IGST ({gstRate}%)</span><span className="font-mono">₹{fmt(gstAmt)}</span></div>
          }
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-1 font-bold text-base">
            <span>Total</span><span className="text-blue-700 font-mono">₹{fmt(total)}</span>
          </div>
        </div>

        <button onClick={generate}
          className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors">
          📄 Download PDF Invoice
        </button>
      </div>
    </div>
  )
}

export default function InvoiceGenerator() {
  return (
    <ToolPageShell
      slug="invoice-generator"
      name="Invoice Generator"
      description="Create GST-compliant invoices with CGST, SGST, and IGST breakdown — download as PDF instantly."
      icon="🧾"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <InvoiceTool />
    </ToolPageShell>
  )
}
