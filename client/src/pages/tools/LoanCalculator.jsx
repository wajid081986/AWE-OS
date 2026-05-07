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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Loan Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500000"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual Interest Rate (%)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="8.5" step="0.1"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Loan Tenure
            <span className="ml-2">
              <button onClick={() => setTenureType('years')} className={`text-xs px-2 py-0.5 rounded ${tenureType === 'years' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Years</button>
              <button onClick={() => setTenureType('months')} className={`ml-1 text-xs px-2 py-0.5 rounded ${tenureType === 'months' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Months</button>
            </span>
          </label>
          <input type="number" value={tenure} onChange={e => setTenure(e.target.value)} placeholder={tenureType === 'years' ? '20' : '240'}
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
  'Enter the total loan amount you wish to borrow.',
  'Input the annual interest rate offered by your bank or lender.',
  'Enter the loan tenure in years or months using the toggle.',
  'Click "Calculate EMI" to see your monthly payment, total interest, and amortisation schedule.',
]

const FAQS = [
  { q: 'What is EMI?', a: 'EMI (Equated Monthly Instalment) is the fixed monthly payment you make to repay a loan. It includes both the principal amount and the interest charged.' },
  { q: 'How is EMI calculated?', a: 'EMI = P × r × (1+r)^n / ((1+r)^n - 1), where P is the principal, r is the monthly interest rate, and n is the number of months.' },
  { q: 'Does paying extra EMI reduce the loan faster?', a: 'Yes! Making prepayments or paying extra EMIs reduces your outstanding principal, which lowers the total interest you pay over the loan tenure.' },
  { q: 'What is an amortisation schedule?', a: 'It is a table showing the breakdown of each EMI payment into principal and interest components month by month throughout the loan tenure.' },
  { q: 'Can I use this for home, car, or personal loans?', a: 'Yes, this calculator works for any type of fixed-rate loan including home loans, car loans, personal loans, and education loans.' },
]

const ABOUT = [
  'The Loan EMI Calculator helps you plan your finances by showing exactly how much you will pay each month. Simply enter your loan amount, interest rate, and tenure to get instant results.',
  'The calculator uses the standard compound interest EMI formula used by all major banks. You can see the full breakdown: principal vs interest, total cost of the loan, and a month-by-month amortisation schedule for the first year.',
  'Whether you are planning a home loan, car loan, or personal loan, this tool gives you the clarity you need to make informed financial decisions. All calculations happen instantly in your browser with no data stored.',
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
    >
      <LoanTool />
    </ToolPageShell>
  )
}
