import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

const GST_RATES = [0, 5, 12, 18, 28]

const STEPS = [
  "Select whether you want to Add GST or Extract GST. 'Add GST' is used when you have the base (pre-tax) price and want to calculate the final price the customer pays. 'Extract GST' is used when you have the final price already inclusive of GST and need to find the original base price and how much tax was embedded in it.",
  "Enter the amount in the input field. For 'Add GST' mode, this is the base price before tax — for example, ₹10,000 for a laptop. For 'Extract GST' mode, this is the total price already inclusive of GST — for example, ₹11,800 if the customer paid that amount and you need to separate the base value from the GST component.",
  "Select the applicable GST rate: 0%, 5%, 12%, 18%, or 28%. The rate depends on the goods or service category as defined under the GST Council notifications. Essential food items attract 0–5%; electronics, banking services, and most manufactured goods attract 18%; luxury goods, tobacco, and aerated drinks attract 28%. If unsure, consult your CA or the CBIC HSN code search.",
  "Choose the transaction type: Intra-state (within the same state) or Inter-state (between states). Intra-state transactions split the GST equally between CGST (Central GST) and SGST (State GST). Inter-state transactions apply IGST (Integrated GST) as a single amount. Both scenarios produce the same total tax amount — the split only changes how the tax is collected and distributed.",
  "Review all four output fields: Base Amount, GST Amount (with CGST+SGST or IGST breakdown), Total Amount, and a note on effective tax rate. All amounts display in Indian Rupee format with paise. Click 'Copy Summary' to copy the complete breakdown as text for use in invoices, client quotes, or accounting records.",
]

const FAQS = [
  {
    q: 'What is the difference between CGST, SGST, and IGST?',
    a: "All three are components of India's Goods and Services Tax. CGST (Central GST) is collected by the Central Government, and SGST (State GST) is collected by the State Government — both apply when a transaction happens within a single state (intra-state). For example, an 18% GST rate on an intra-state transaction splits into 9% CGST and 9% SGST. IGST (Integrated GST) applies when goods or services cross state lines — in this case, the full 18% is collected as a single IGST amount and later distributed between the Centre and the destination state. The tax burden to the buyer is identical in both cases.",
  },
  {
    q: 'When should I use Add GST vs Extract GST?',
    a: "Use Add GST when you know the pre-tax base price and need to compute what to charge the customer — common when setting up price lists or generating quotes where your cost is ex-GST. Use Extract GST when you have already received or paid the GST-inclusive amount and need to reverse-engineer the base and tax components — this applies when reconciling invoices, calculating Input Tax Credit (ITC), or determining the actual sale value for accounting entries. The formula for extraction is: Base = Inclusive Amount ÷ (1 + GST Rate). This is not the same as simply subtracting the rate percentage from the total.",
  },
  {
    q: 'What GST rate applies to my product or service?',
    a: "GST rates in India are categorised by the GST Council into five slabs: 0% (essential goods like rice, wheat, vegetables, and healthcare services), 5% (packaged food items, small restaurants), 12% (processed food, business-class air travel), 18% (most manufactured goods, electronics, banking services, IT services, restaurant meals in AC establishments), and 28% (luxury goods, tobacco products, aerated beverages, casinos). The correct rate is determined by the HSN (Harmonised System of Nomenclature) code for goods or the SAC (Services Accounting Code) for services. Check the CBIC website or consult a Chartered Accountant to confirm the applicable rate for your specific item.",
  },
  {
    q: 'Does this calculator cover composition scheme businesses?',
    a: "No — this calculator computes GST under the regular (non-composition) scheme, which is the standard mechanism for most registered taxpayers. The Composition Scheme is an optional simplified scheme available to small businesses with annual turnover below ₹1.5 crore (manufacturers and traders) or ₹50 lakh (service providers). Under the Composition Scheme, tax is charged at lower flat rates (1% for traders, 5% for restaurants, 6% for service providers) on turnover without input tax credit eligibility. Composition scheme taxpayers cannot collect GST separately from customers on invoices. If you operate under the Composition Scheme, use your scheme-specific rate directly in your billing.",
  },
  {
    q: 'Is this GST calculator useful for filing GSTR-1 or GSTR-3B?',
    a: "The calculator helps you accurately compute taxable values, GST amounts, and CGST/SGST/IGST splits — all figures required when filling in GSTR-1 (outward supply details) and GSTR-3B (monthly summary return). However, it is a computation aid, not a filing tool. For actual GST return filing, use the GST portal (gst.gov.in) or accounting software like Tally, Zoho Books, or ClearTax. Always cross-check computed amounts against your actual invoices before filing, as even minor discrepancies between GSTR-1 and GSTR-3B can trigger notices from the GST department.",
  },
  {
    q: 'Can I use this to calculate GST on imported goods?',
    a: "GST on imports is governed by IGST, which is levied on the assessable value of goods plus basic customs duty plus any other applicable duties. The base for IGST calculation on imports is therefore not just the invoice price — it includes landing charges (1% of CIF value), basic customs duty, and any applicable anti-dumping or safeguard duty. This calculator computes IGST correctly once you supply the correct base amount, but it does not calculate customs duty or assessable value — those require the import invoice, exchange rate on the bill of entry date, and knowledge of the applicable customs tariff heading under the Customs Tariff Act, 1975.",
  },
]

const ABOUT = [
  'The GST Calculator handles two common tax scenarios for Indian businesses: adding GST to a base price to arrive at the customer-payable amount, and extracting GST from an inclusive price to recover the underlying taxable value. Both modes cover all five GST rate slabs — 0%, 5%, 12%, 18%, and 28% — and automatically split the output between CGST+SGST for intra-state transactions and IGST for inter-state transactions.',
  'India\'s GST framework replaced over a dozen central and state taxes in July 2017 with a unified value-added tax system. Every registered business with annual turnover above ₹20 lakh (₹10 lakh for special category states) must collect GST, issue GST-compliant invoices, and file returns monthly or quarterly. Getting the base amount, GST amount, and tax distribution right on every transaction is essential for correct GSTR-1 filing, accurate Input Tax Credit claims, and clean reconciliation in GSTR-3B.',
  'Intra-state transactions — where supplier and buyer are in the same state — attract CGST (central tax) and SGST (state tax) in equal halves. A purchase attracting 18% GST in the same state generates 9% CGST and 9% SGST, each remitted to a different government. Inter-state transactions attract only IGST, which is subsequently apportioned between the Centre and destination state through the IGST settlement mechanism. From the buyer\'s perspective, the total tax outflow is identical — the split affects only the tax authorities\' accounting.',
  'All calculations run locally in your browser. No transaction data is transmitted to any server, making this tool safe for computing actual invoice values, client quotations, and financial projections. The summary copy feature outputs a formatted text block suitable for pasting into invoices, email quotations, or accounting worksheets. For formal tax advice and return preparation, consult a registered GST practitioner or Chartered Accountant.',
]

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function GSTTool() {
  const [mode, setMode]       = useState('add')
  const [amount, setAmount]   = useState('')
  const [rate, setRate]       = useState(18)
  const [txType, setTxType]   = useState('intra')
  const [result, setResult]   = useState(null)
  const [copied, setCopied]   = useState(false)

  const calculate = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    const gstRate = rate / 100
    let base, gst, total
    if (mode === 'add') {
      base  = amt
      gst   = amt * gstRate
      total = amt + gst
    } else {
      total = amt
      base  = amt / (1 + gstRate)
      gst   = total - base
    }
    const half = gst / 2
    setResult({ base, gst, total, half, rate })
  }

  const summary = result
    ? `GST Calculation Summary\n` +
      `Mode: ${mode === 'add' ? 'Add GST' : 'Extract GST'}\n` +
      `Rate: ${result.rate}%  |  Type: ${txType === 'intra' ? 'Intra-state' : 'Inter-state'}\n` +
      `Base Amount : ₹${fmt(result.base)}\n` +
      (txType === 'intra'
        ? `CGST (${result.rate / 2}%): ₹${fmt(result.half)}\nSGST (${result.rate / 2}%): ₹${fmt(result.half)}\n`
        : `IGST (${result.rate}%): ₹${fmt(result.gst)}\n`) +
      `Total Amount: ₹${fmt(result.total)}`
    : ''

  const copy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {['add', 'extract'].map(m => (
          <button key={m} onClick={() => { setMode(m); setResult(null) }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {m === 'add' ? 'Add GST' : 'Extract GST'}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="gst-amount" className="block text-sm font-medium text-gray-700 mb-1">
            {mode === 'add' ? 'Base Amount (₹)' : 'GST-Inclusive Amount (₹)'}
          </label>
          <input
            id="gst-amount"
            type="number" min="0" step="0.01"
            value={amount} onChange={e => { setAmount(e.target.value); setResult(null) }}
            placeholder="e.g. 10000"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gst-rate" className="block text-sm font-medium text-gray-700 mb-1">GST Rate</label>
            <select id="gst-rate" value={rate} onChange={e => { setRate(Number(e.target.value)); setResult(null) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gst-tx-type" className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select id="gst-tx-type" value={txType} onChange={e => { setTxType(e.target.value); setResult(null) }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="intra">Intra-state (CGST+SGST)</option>
              <option value="inter">Inter-state (IGST)</option>
            </select>
          </div>
        </div>

        <button onClick={calculate}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
          Calculate GST
        </button>
      </div>

      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          {[
            { label: 'Base Amount', value: `₹${fmt(result.base)}`, accent: false },
            ...(txType === 'intra'
              ? [
                  { label: `CGST @ ${result.rate / 2}%`, value: `₹${fmt(result.half)}`, accent: false },
                  { label: `SGST @ ${result.rate / 2}%`, value: `₹${fmt(result.half)}`, accent: false },
                ]
              : [{ label: `IGST @ ${result.rate}%`, value: `₹${fmt(result.gst)}`, accent: false }]),
            { label: 'Total Amount', value: `₹${fmt(result.total)}`, accent: true },
          ].map(({ label, value, accent }) => (
            <div key={label} className={`flex justify-between items-center py-2 ${accent ? 'border-t border-gray-200 mt-1 pt-3' : ''}`}>
              <span className={`text-sm ${accent ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{label}</span>
              <span className={`font-mono text-sm ${accent ? 'font-bold text-blue-700 text-base' : 'text-gray-800'}`}>{value}</span>
            </div>
          ))}
          <button onClick={copy}
            className={`w-full mt-2 py-2.5 border rounded-lg text-sm font-semibold transition-colors ${copied ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {copied ? '✅ Copied!' : 'Copy Summary'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function GSTCalculator() {
  return (
    <ToolPageShell
      slug="gst-calculator"
      name="GST Calculator"
      description="Calculate GST for any rate — add or extract tax with CGST, SGST, and IGST breakdown."
      icon="🧾"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"You must choose the correct GST rate for your item — the tool cannot determine which rate legally applies to your product or service."}
    >
      <GSTTool />
    </ToolPageShell>
  )
}
