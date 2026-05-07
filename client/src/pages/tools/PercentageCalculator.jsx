import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

function Tab1() {
  const [x, setX] = useState(''); const [y, setY] = useState(''); const [r, setR] = useState(null)
  const calc = () => { const v = (parseFloat(x) / 100) * parseFloat(y); if (!isNaN(v)) setR(v) }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={x} onChange={e => setX(e.target.value)} placeholder="X"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">% of</span>
        <input type="number" value={y} onChange={e => setY(e.target.value)} placeholder="Y"
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
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">is what % of</span>
        <input type="number" value={y} onChange={e => setY(e.target.value)} placeholder="Y"
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
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-sm text-gray-600 font-medium">to</span>
        <input type="number" value={y} onChange={e => setY(e.target.value)} placeholder="Y"
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
  'Choose the type of percentage calculation from the three tabs at the top.',
  'Enter the required numbers in the input fields.',
  'Click "Calculate" to see your result instantly.',
  'Switch between tabs to perform different types of percentage calculations.',
]

const FAQS = [
  { q: 'How do I calculate X% of a number?', a: 'Use Tab 1 "X% of Y". Enter the percentage as X and the number as Y. For example, 15% of 200 = 30.' },
  { q: 'How do I find what percentage one number is of another?', a: 'Use Tab 2 "X is ?% of Y". Enter both numbers to find the percentage relationship. For example, 30 is 15% of 200.' },
  { q: 'How do I calculate percentage increase or decrease?', a: 'Use Tab 3 "% Change". Enter the original value as X and the new value as Y. A positive result means increase; negative means decrease.' },
  { q: 'Can I use decimals in calculations?', a: 'Yes, all three calculators support decimal numbers. You can enter values like 12.5% or 1500.75 without any issues.' },
  { q: 'What is the formula for percentage change?', a: '% Change = ((New Value - Old Value) / |Old Value|) × 100. A positive result indicates an increase, while negative indicates a decrease.' },
]

const ABOUT = [
  'The Percentage Calculator provides three essential calculation modes in one tool: finding X% of a number, determining what percentage one number is of another, and calculating percentage change between two values.',
  'Whether you are calculating discounts, tax amounts, grade percentages, profit margins, or price changes, this tool handles it all instantly with no sign-up required.',
  'The tab-based interface makes it easy to switch between different percentage problems. All calculations happen in real-time in your browser.',
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
    >
      <PercentageTool />
    </ToolPageShell>
  )
}
