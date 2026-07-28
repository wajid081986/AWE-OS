import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

function LoanTool() {
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [tenure, setTenure] = useState('')
  const [tenureType, setTenureType] = useState('years')
  const [result, setResult] = useState(null)

  const calc = () => {
    const P = parseFloat(amount)
    const r = parseFloat(rate) / 12 / 100
    const n = tenureType === 'years' ? parseFloat(tenure) * 12 : parseFloat(tenure)
    if (!P || !r || !n || P <= 0 || n <= 0) return

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const total = emi * n
    const interest = total - P

    const schedule = []
    let balance = P
    for (let i = 1; i <= Math.min(n, 12); i++) {
      const intPart = balance * r
      const prinPart = emi - intPart
      balance -= prinPart
      schedule.push({ month: i, emi: emi.toFixed(0), principal: prinPart.toFixed(0), interest: intPart.toFixed(0), balance: Math.max(0, balance).toFixed(0) })
    }

    setResult({ emi: emi.toFixed(2), total: total.toFixed(2), interest: interest.toFixed(2), schedule })
  }

  const reset = () => { setAmount(''); setRate(''); setTenure(''); setResult(null) }

  const fmt = n => parseFloat(n).toLocaleString('en-IN')

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="loan-amount" className="block text-sm font-medium text-gray-700 mb-1.5">Loan Amount (₹)</label>
          <input id="loan-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500000"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="loan-rate" className="block text-sm font-medium text-gray-700 mb-1.5">Annual Interest Rate (%)</label>
          <input id="loan-rate" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="8.5" step="0.1"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="loan-tenure" className="block text-sm font-medium text-gray-700 mb-1.5">
            Loan Tenure
            <span className="ml-2">
              <button onClick={() => setTenureType('years')} className={`text-xs px-2 py-0.5 rounded ${tenureType === 'years' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Years</button>
              <button onClick={() => setTenureType('months')} className={`ml-1 text-xs px-2 py-0.5 rounded ${tenureType === 'months' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Months</button>
            </span>
          </label>
          <input id="loan-tenure" type="number" value={tenure} onChange={e => setTenure(e.target.value)} placeholder={tenureType === 'years' ? '20' : '240'}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={calc}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
          Calculate EMI
        </button>
        <button onClick={reset}
          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">
          Reset
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Monthly EMI', value: `₹${fmt(result.emi)}`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
              { label: 'Total Payment', value: `₹${fmt(result.total)}`, color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Total Interest', value: `₹${fmt(result.interest)}`, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Interest vs Principal bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Payment Breakdown</p>
            <div className="h-4 rounded-full overflow-hidden flex mb-2">
              <div className="bg-blue-500" style={{ width: `${(parseFloat(amount) / parseFloat(result.total)) * 100}%` }} />
              <div className="bg-orange-400 flex-1" />
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Principal: ₹{fmt(amount)}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Interest: ₹{fmt(result.interest)}</span>
            </div>
          </div>

          {/* Schedule table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Amortisation Schedule (Year 1)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{['Month', 'EMI', 'Principal', 'Interest', 'Balance'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {result.schedule.map(row => (
                    <tr key={row.month} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600">{row.month}</td>
                      <td className="px-3 py-2 text-gray-900 font-medium">₹{fmt(row.emi)}</td>
                      <td className="px-3 py-2 text-blue-700">₹{fmt(row.principal)}</td>
                      <td className="px-3 py-2 text-orange-600">₹{fmt(row.interest)}</td>
                      <td className="px-3 py-2 text-gray-600">₹{fmt(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Enter the total loan amount you wish to borrow — this is the principal, the figure your bank will disburse to you before any interest is applied.',
  'Enter the annual interest rate quoted by your lender. Use the exact figure from your loan offer letter or bank website for an accurate result.',
  'Enter your loan tenure and select whether you have entered years or months using the toggle. Home loans are typically 10–30 years; personal loans 1–5 years.',
  'Click "Calculate EMI" to see your monthly instalment, total repayment amount, total interest paid, a principal-vs-interest breakdown bar, and a month-by-month amortisation table for the first year.',
]

const FAQS = [
  { q: 'What is EMI?', a: 'EMI stands for Equated Monthly Instalment — the fixed amount you pay to your lender every month for the full duration of the loan. Each payment covers a portion of the outstanding principal plus the interest accrued on that balance. Early instalments are interest-heavy; later instalments shift toward principal repayment as the balance reduces.' },
  { q: 'How is EMI calculated?', a: 'The standard EMI formula is: EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), where P is the principal loan amount, r is the monthly interest rate (annual rate ÷ 12 ÷ 100), and n is the total number of monthly instalments. This is the same formula used by all banks and financial institutions.' },
  { q: 'Does making extra payments reduce the loan faster?', a: 'Yes, significantly. Prepayments directly reduce the outstanding principal, which in turn reduces the interest calculated on the remaining balance. Even one extra EMI per year can shorten the loan tenure by several months and save a meaningful amount in total interest — especially effective in the early years of a long-tenure home loan.' },
  { q: 'What is an amortisation schedule?', a: 'An amortisation schedule is a month-by-month table showing how each EMI payment is split between principal and interest, and how the outstanding balance decreases over time. The schedule shown here covers the first 12 months. It illustrates why early payments contain more interest than principal — a pattern that reverses progressively as the balance falls.' },
  { q: 'Can I use this for home, car, education, or personal loans?', a: 'Yes. The EMI formula applies to any fixed-rate reducing-balance loan regardless of its purpose. Enter the exact principal, annual interest rate, and tenure for any loan type and the calculation will be accurate. For floating-rate loans, use the current rate as an approximation and recalculate whenever the rate changes.' },
  { q: 'Why does total interest sometimes exceed the principal?', a: 'On long-tenure loans at moderate interest rates, the total interest paid over the full repayment period can easily match or exceed the original borrowed amount. A ₹50 lakh home loan at 8.5% over 20 years results in roughly ₹57 lakh in total interest — meaning the total repayment is more than twice the amount borrowed. This is why tenure reduction strategies have such a large impact on total cost.' },
]

const ABOUT = [
  'Understanding what a loan will truly cost you before you sign is one of the most important financial decisions you will make. The AWE-OS Loan EMI Calculator gives you the complete picture instantly — monthly instalment, total repayment, total interest, a principal-versus-interest breakdown, and a month-by-month amortisation schedule for the first year of the loan.',
  'The tool uses the standard compound-interest EMI formula used by every bank and financial institution globally. It applies equally to home loans, car loans, personal loans, education loans, and any other fixed-rate reducing-balance credit product. Enter your loan amount, the annual interest rate from your lender, and your chosen tenure in years or months — results appear the moment you click Calculate.',
  'The amortisation schedule deserves careful attention. It reveals a pattern that surprises many first-time borrowers: in the early months of a loan, the vast majority of each EMI payment goes to interest rather than reducing the principal. This is because interest is calculated on the full outstanding balance. As the balance falls month by month, the interest component shrinks and the principal component grows. Visualising this helps explain why prepayments made in the first few years of a loan have a disproportionately large impact on total interest paid.',
  'The payment breakdown chart shows the ratio of principal to total interest at a glance. For long-tenure home loans at typical rates, the interest paid over the life of the loan can exceed the original borrowed amount — making this comparison one of the most sobering and useful outputs the calculator provides. All calculations run entirely in your browser with no data transmitted or stored, so you can model different scenarios privately before approaching any lender.',
]

export default function LoanCalculator() {
  return (
    <ToolPageShell
      slug="loan-calculator"
      name="Loan EMI Calculator"
      description="Calculate monthly EMI, total interest and amortisation schedule for any loan."
      icon="🏦"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Assumes a fixed interest rate for the full tenure — floating-rate loans will differ as rates change."}
    >
      <LoanTool />
    </ToolPageShell>
  )
}
