import { useState } from 'react'
import ToolPageShell from './ToolPageShell'
import { TOOL_ABOUT } from '../../data/toolPageContent'

const STEPS = [
  "Enter your monthly Basic Salary — the fixed component of your salary before any allowances, exactly as shown on your payslip. HRA exemption under Section 10(13A) is calculated as a percentage of Basic Salary, not your gross or CTC figure.",
  "Enter the HRA (House Rent Allowance) you actually receive from your employer each month, and the actual Rent Paid each month for your accommodation. If you don't pay rent or don't receive HRA, the exemption will correctly show as zero.",
  "Select your city type: Metro (Delhi, Mumbai, Chennai, Kolkata) or Non-Metro. This changes the 50%/40%-of-Basic condition used in the exemption formula — metro cities get the higher 50% limit because of higher average rents.",
  "Review the three conditions computed side by side — Actual HRA Received, 50%/40% of Basic Salary, and Rent Paid minus 10% of Basic Salary. The smallest of the three (marked with a ✓) is your exempt HRA amount under the Income Tax Act; the rest of your HRA is added to taxable income.",
  "Check the monthly and annual summary cards for your exact exemption and taxable HRA figures — use the annual figure when filling in HRA exemption details for ITR filing or submitting rent receipts to your employer for TDS purposes.",
]

const FAQS = [
  {
    q: 'What is the HRA exemption formula under Section 10(13A)?',
    a: 'Section 10(13A) of the Income Tax Act exempts the lowest of three amounts from tax: (1) the actual HRA received from your employer, (2) 50% of Basic Salary for metro cities (Delhi, Mumbai, Chennai, Kolkata) or 40% of Basic Salary for non-metro cities, and (3) actual rent paid minus 10% of Basic Salary. Whichever of these three figures is smallest becomes your tax-exempt HRA; the remaining HRA received (if any) is added to your taxable salary income.',
  },
  {
    q: 'Which cities count as "metro" for the 50% HRA limit?',
    a: 'For HRA exemption purposes, only four cities are classified as metro: Delhi, Mumbai, Chennai, and Kolkata. Employees in these cities use 50% of Basic Salary in condition (2) of the formula. Every other city in India — including Bengaluru, Hyderabad, Pune, and Ahmedabad — is treated as non-metro and uses the lower 40% limit, regardless of local cost of living.',
  },
  {
    q: 'Can I claim HRA exemption if I don’t pay any rent?',
    a: 'No. If you do not pay rent (for example, you live in your own house or with family without paying rent), your HRA exemption is zero — condition (3) of the formula, rent paid minus 10% of Basic, becomes zero or negative when there is no rent, and the minimum of the three conditions is then zero. The full HRA received from your employer becomes taxable in this case.',
  },
  {
    q: 'Do I need rent receipts or a rent agreement to claim HRA exemption?',
    a: 'Yes. Employers typically require rent receipts (and a rent agreement plus the landlord’s PAN if annual rent exceeds ₹1,00,000) before processing HRA exemption in monthly TDS. Even if your employer doesn’t collect these, you must retain them to support your claim if the Income Tax Department raises a query on your return, since HRA exemption claimed without supporting rent proof is a common scrutiny trigger.',
  },
  {
    q: 'Is HRA exemption available under the New Tax Regime?',
    a: 'No. HRA exemption under Section 10(13A) is available only under the Old Tax Regime. The New Tax Regime (the default regime from FY 2023-24 onward) does not allow HRA exemption, along with most other exemptions and deductions. If your HRA exemption is large relative to your income, compare your total tax liability under both regimes — using AWE-OS’s Tax Calculator — before choosing which regime to file under.',
  },
]

// about.howToUse/about.faqs dropped — STEPS/FAQS above are the single rendered source for those sections
const { howToUse: _aboutHowToUse, faqs: _aboutFaqs, ...ABOUT } = TOOL_ABOUT['hra-calculator']

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))
}

function HRATool() {
  const [basic, setBasic] = useState('')
  const [hra, setHra]     = useState('')
  const [rent, setRent]   = useState('')
  const [metro, setMetro] = useState(true)

  const basicN = parseFloat(basic) || 0
  const hraN   = parseFloat(hra) || 0
  const rentN  = parseFloat(rent) || 0
  const valid  = basicN > 0

  const condA = hraN
  const condB = basicN * (metro ? 0.5 : 0.4)
  const condC = Math.max(0, rentN - basicN * 0.1)
  const exemptionMonthly = valid ? Math.min(condA, condB, condC) : 0
  const taxableMonthly   = valid ? Math.max(0, hraN - exemptionMonthly) : 0

  const conditions = [
    { key: 'a', label: 'Actual HRA Received', value: condA },
    { key: 'b', label: `${metro ? '50%' : '40%'} of Basic Salary (${metro ? 'Metro' : 'Non-Metro'})`, value: condB },
    { key: 'c', label: 'Rent Paid − 10% of Basic Salary', value: condC },
  ]
  const minValue = valid ? Math.min(condA, condB, condC) : null

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="hra-basic" className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (monthly, ₹)</label>
          <input id="hra-basic" type="number" min="0" step="1" value={basic}
            onChange={e => setBasic(e.target.value)} placeholder="e.g. 40000"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="hra-received" className="block text-sm font-medium text-gray-700 mb-1">HRA Received (monthly, ₹)</label>
            <input id="hra-received" type="number" min="0" step="1" value={hra}
              onChange={e => setHra(e.target.value)} placeholder="e.g. 16000"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="hra-rent" className="block text-sm font-medium text-gray-700 mb-1">Rent Paid (monthly, ₹)</label>
            <input id="hra-rent" type="number" min="0" step="1" value={rent}
              onChange={e => setRent(e.target.value)} placeholder="e.g. 18000"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">City Type</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[{ v: true, l: 'Metro' }, { v: false, l: 'Non-Metro' }].map(opt => (
              <button key={String(opt.v)} type="button" onClick={() => setMetro(opt.v)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${metro === opt.v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {opt.l}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Metro cities: Delhi, Mumbai, Chennai, Kolkata</p>
        </div>
      </div>

      {valid && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 mb-1">Comparing the 3 conditions (lowest wins)</p>
            {conditions.map(c => {
              const isMin = c.value === minValue
              return (
                <div key={c.key}
                  className={`flex justify-between items-center gap-3 rounded-lg px-3 py-2.5 border ${isMin ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`text-sm ${isMin ? 'font-semibold text-green-800' : 'text-gray-600'}`}>
                    {isMin && <span className="mr-1.5">✓</span>}
                    {c.label}
                  </span>
                  <span className={`font-mono text-sm font-semibold ${isMin ? 'text-green-800' : 'text-gray-700'}`}>
                    ₹{fmt(c.value)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-xs text-green-700 font-medium mb-1">HRA Exemption</p>
              <p className="text-lg font-bold text-green-800">₹{fmt(exemptionMonthly)}<span className="text-xs font-normal">/mo</span></p>
              <p className="text-xs text-green-600 mt-0.5">₹{fmt(exemptionMonthly * 12)}/year</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-xs text-amber-700 font-medium mb-1">Taxable HRA</p>
              <p className="text-lg font-bold text-amber-800">₹{fmt(taxableMonthly)}<span className="text-xs font-normal">/mo</span></p>
              <p className="text-xs text-amber-600 mt-0.5">₹{fmt(taxableMonthly * 12)}/year</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function HRACalculator() {
  return (
    <ToolPageShell
      slug="hra-calculator"
      name="HRA Calculator"
      description="Calculate your House Rent Allowance tax exemption under Section 10(13A) — compare all 3 conditions and see exactly how much of your HRA is tax-free."
      icon="🏠"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"This calculator applies the Old Tax Regime Section 10(13A) formula only — HRA exemption does not apply under the New Tax Regime, and it does not verify your rent receipts or landlord PAN documentation."}
    >
      <HRATool />
    </ToolPageShell>
  )
}
