import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

function Tab1() {
  const [x, setX] = useState(''); const [y, setY] = useState(''); const [r, setR] = useState(null)
  const calc = () => { const v = (parseFloat(x) / 100) * parseFloat(y); if (!isNaN(v)) setR(v) }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={x} onChange={e => setX(e.target.value)} placeholder="X"
          aria-label="Percentage"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">% of</span>
        <input type="number" value={y} onChange={e => setY(e.target.value)} placeholder="Y"
          aria-label="Base value"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">= ?</span>
      </div>
      <button onClick={calc} className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Calculate</button>
      {r !== null && <p className="text-lg font-bold text-blue-700">{x}% of {y} = <span className="text-2xl">{r.toFixed(4).replace(/\.?0+$/, '')}</span></p>}
    </div>
  )
}

function Tab2() {
  const [x, setX] = useState(''); const [y, setY] = useState(''); const [r, setR] = useState(null)
  const calc = () => { const v = (parseFloat(x) / parseFloat(y)) * 100; if (!isNaN(v) && isFinite(v)) setR(v) }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={x} onChange={e => setX(e.target.value)} placeholder="X"
          aria-label="Value"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">is what % of</span>
        <input type="number" value={y} onChange={e => setY(e.target.value)} placeholder="Y"
          aria-label="Total value"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">?</span>
      </div>
      <button onClick={calc} className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Calculate</button>
      {r !== null && <p className="text-lg font-bold text-blue-700">{x} is <span className="text-2xl">{r.toFixed(2)}%</span> of {y}</p>}
    </div>
  )
}

function Tab3() {
  const [x, setX] = useState(''); const [y, setY] = useState(''); const [r, setR] = useState(null)
  const calc = () => { const v = ((parseFloat(y) - parseFloat(x)) / Math.abs(parseFloat(x))) * 100; if (!isNaN(v) && isFinite(v)) setR(v) }
  const isIncrease = r !== null && r >= 0
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">From</span>
        <input type="number" value={x} onChange={e => setX(e.target.value)} placeholder="X"
          aria-label="Original value"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">to</span>
        <input type="number" value={y} onChange={e => setY(e.target.value)} placeholder="Y"
          aria-label="New value"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button onClick={calc} className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Calculate</button>
      {r !== null && (
        <p className={`text-lg font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
          {isIncrease ? '▲ Increase' : '▼ Decrease'} of <span className="text-2xl">{Math.abs(r).toFixed(2)}%</span>
          {!isIncrease && ' decrease'}
        </p>
      )}
    </div>
  )
}

function PercentageTool() {
  const [tab, setTab] = useState(0)
  const tabs = [
    { label: 'X% of Y', component: <Tab1 /> },
    { label: 'X is ?% of Y', component: <Tab2 /> },
    { label: '% Change', component: <Tab3 /> },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {tabs.map(({ label }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${tab === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        {tabs[tab].component}
      </div>
    </div>
  )
}

const STEPS = [
  "Choose the type of percentage calculation from the three tabs at the top. Tab 1 ('X% of Y') finds a portion of a number — useful for calculating GST amounts, tips, and discounts. Tab 2 ('X is ?% of Y') finds what percentage one number is of another — useful for exam scores, ratios, and profit margins. Tab 3 ('% Change') calculates increase or decrease between two values over time.",
  "For Tab 1 — enter the percentage in the first X field (e.g. 18 for 18% GST) and the base value in the Y field (e.g. 10000 for ₹10,000). Click Calculate. The result shows the amount, not the total — so 18% of 10,000 = 1,800 (the tax amount). Add that to the original to get ₹11,800 as the GST-inclusive price.",
  "For Tab 2 — enter the part value in the first field and the whole value in the second, then click Calculate. For example, to find what percentage a student scored, enter 378 (marks obtained) and 500 (maximum marks) to get 75.6%. This tab is also useful for profit percentage, discount verification, and composition ratios.",
  "For Tab 3 — enter the original (earlier) value in the 'From' field and the new (later) value in the 'To' field. A positive result with a green upward arrow shows a percentage increase; a negative result in red shows a percentage decrease. This is used for year-on-year comparisons, salary hike calculations, price tracking, and investment return analysis.",
  "Switch between tabs freely at any time — each tab remembers its own inputs independently so you can run multiple percentage calculations in a single session. Results are shown to four decimal places with trailing zeros removed for clean display. All calculations are instant and run entirely in your browser.",
]

const FAQS = [
  { q: 'How do I calculate GST in India using this tool?', a: "Use Tab 1 (X% of Y). Enter the applicable GST rate (5, 12, 18, or 28 depending on the goods or service category) as X and the pre-tax price as Y — the result is the GST amount. For example, 18% of ₹10,000 = ₹1,800 GST, making the GST-inclusive total ₹11,800. To reverse-calculate and find the pre-tax price from a GST-inclusive amount, divide the total by 1.18 (for 18% GST). The four standard Indian GST slabs are: 5% for essential and food items, 12% for processed foods and some services, 18% for most electronics, restaurants, and professional services, and 28% for luxury and sin goods." },
  { q: 'How do I calculate a discount on a product price?', a: "Use Tab 1. Enter the discount percentage as X and the original price as Y to get the discount amount. Subtract that from the original price to find the sale price. For example, a 25% discount on ₹1,200: enter 25 and 1200 → result is ₹300 → final price is ₹900. To verify whether an advertised discount is accurate, use Tab 2 instead: enter the discounted price as X and the original price as Y. For example, enter 900 and 1200 to confirm the actual discount is 25% — useful when comparing e-commerce deals during sale events." },
  { q: 'How do I calculate percentage increase or decrease?', a: "Use Tab 3 (% Change). Enter the original earlier value in the 'From' field and the new later value in the 'To' field, then click Calculate. The formula applied is: ((New − Old) ÷ |Old|) × 100. A positive result in green with an upward arrow indicates an increase; a negative result in red indicates a decrease. Common uses include: year-on-year revenue growth, monthly expense changes, salary hike percentages, stock price movements, and comparing exam marks across two tests to track improvement or decline." },
  { q: 'How do I calculate my exam percentage or board result?', a: "Use Tab 2 (X is ?% of Y). Enter your total marks obtained as X and the maximum marks as Y, then click Calculate. For example, 432 out of 500 = 86.4%. This works for Class 10 and Class 12 board results, university semester exams, competitive entrance tests, and any scoring system with a defined maximum. For converting CGPA to percentage under the UGC and CBSE formula widely used in India, multiply your CGPA by 9.5 — a CGPA of 8.2 × 9.5 = 77.9%. You can then use Tab 1 to explore further derived calculations from that percentage." },
  { q: 'What is the difference between percentage and percentage points?', a: "These are frequently confused in financial and news reporting. A percentage is a ratio expressed out of 100. A percentage point is the simple arithmetic difference between two percentages. If the RBI raises the repo rate from 6.5% to 6.75%, that is a 0.25 percentage point increase (or 25 basis points), but it is a 3.85% increase in the rate itself (as calculated by Tab 3 using 6.5 and 6.75). Indian financial media typically describes RBI rate changes in basis points or percentage points, while performance comparisons use the percentage change calculation." },
  { q: 'Why do I sometimes get a very long decimal result?', a: "Long decimals appear when the division does not resolve to a clean number — for example, 1 is 33.3333% of 3 because 1÷3 is a repeating decimal. The calculator shows up to four decimal places, with trailing zeros removed for a clean display. For practical everyday use, read the first two decimal places: currency amounts round to two decimal places (paise), and most business metrics like GST amounts and exam percentages are conventionally reported to two decimals. The extra precision beyond two decimal places is retained to prevent rounding errors if you use the result in further calculations." },
]

const ABOUT = [
  'The Percentage Calculator handles the three most common percentage problems in a single, tabbed interface. Tab 1 finds X% of a number — useful for calculating tips, taxes, and discounts. Tab 2 determines what percentage one number is of another — useful for grades, ratios, and proportions. Tab 3 computes the percentage change between two values — essential for tracking price movements, growth rates, and statistical differences.',
  'Percentages appear constantly in everyday life: sale discounts, VAT and sales tax, interest rates, investment returns, exam scores, nutritional information, and statistical comparisons all rely on percentage arithmetic. Having a dedicated calculator for each type of calculation means you always get the right formula applied without having to remember it yourself.',
  'All three calculators support decimal inputs and return results to up to four decimal places, with trailing zeros removed for a clean display. The tab-based layout keeps each calculation mode uncluttered so you can focus on the numbers without visual noise from other modes you are not currently using.',
  'Every calculation runs instantly in your browser without sending data to any server. The tool works on all devices — desktop, tablet, and mobile — with no sign-up required and no usage limits. Switching between modes is instant, so you can run multiple types of percentage calculation in one session without any friction.',
]

export default function PercentageCalculator() {
  return (
    <ToolPageShell
      slug="percentage-calculator"
      name="Percentage Calculator"
      description="Calculate percentages, percentage change, and what percent one number is of another."
      icon="📊"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Results are mathematically exact, but rounding displayed to 2 decimals may differ slightly from financial statements."}
    >
      <PercentageTool />
    </ToolPageShell>
  )
}
