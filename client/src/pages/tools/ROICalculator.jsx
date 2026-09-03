import { useState } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import ToolPageShell from './ToolPageShell'

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  if (!isFinite(n)) return '—'
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtPct(n) {
  if (!isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${fmt(n)}%`
}

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const BTN_PRIMARY = 'flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors'
const BTN_GHOST = 'px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors'

// ── Simple ROI Tab ────────────────────────────────────────────────────────────

function SimpleROITab() {
  const [initial, setInitial]   = useState('')
  const [finalVal, setFinalVal] = useState('')
  const [years, setYears]       = useState('')
  const [result, setResult]     = useState(null)

  const calc = () => {
    const i = parseFloat(initial)
    const f = parseFloat(finalVal)
    if (!i || !f || i <= 0) return
    const netProfit = f - i
    const roi = (netProfit / i) * 100
    const y = parseFloat(years)
    const annualized = (y > 0 && isFinite(y)) ? (Math.pow(f / i, 1 / y) - 1) * 100 : null
    setResult({ initial: i, finalVal: f, netProfit, roi, annualized })
  }

  const reset = () => { setInitial(''); setFinalVal(''); setYears(''); setResult(null) }

  const isGain = result?.netProfit >= 0
  const PIE_COLORS = isGain ? ['#3b82f6', '#10b981'] : ['#3b82f6', '#ef4444']
  const pieData = result
    ? [
        { name: 'Initial Investment', value: result.initial },
        { name: isGain ? 'Net Profit' : 'Net Loss', value: Math.abs(result.netProfit) },
      ]
    : []

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="roi-initial" className="block text-sm font-medium text-gray-700 mb-1.5">Initial Investment ($)</label>
          <input id="roi-initial" type="number" value={initial} onChange={e => setInitial(e.target.value)}
            placeholder="10,000" min="0" className={INPUT_CLS} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="roi-final" className="block text-sm font-medium text-gray-700 mb-1.5">Final Value / Return ($)</label>
          <input id="roi-final" type="number" value={finalVal} onChange={e => setFinalVal(e.target.value)}
            placeholder="15,000" min="0" className={INPUT_CLS} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="roi-years" className="block text-sm font-medium text-gray-700 mb-1.5">
            Investment Period (years)
            <span className="ml-2 text-gray-400 font-normal text-xs">optional — unlocks annualized ROI</span>
          </label>
          <input id="roi-years" type="number" value={years} onChange={e => setYears(e.target.value)}
            placeholder="3" min="0" step="0.5" className={INPUT_CLS} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={calc} className={BTN_PRIMARY}>Calculate ROI</button>
        <button onClick={reset} className={BTN_GHOST}>Reset</button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'ROI',
                value: fmtPct(result.roi),
                color: isGain ? 'text-emerald-700' : 'text-red-700',
                bg: isGain ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
              },
              {
                label: 'Net Profit',
                value: `$${fmt(result.netProfit)}`,
                color: isGain ? 'text-emerald-700' : 'text-red-700',
                bg: isGain ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
              },
              {
                label: 'Total Return',
                value: `$${fmt(result.finalVal)}`,
                color: 'text-blue-700',
                bg: 'bg-blue-50 border-blue-200',
              },
              {
                label: 'Annualized ROI',
                value: result.annualized !== null ? fmtPct(result.annualized) : '—',
                color: 'text-purple-700',
                bg: 'bg-purple-50 border-purple-200',
              },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Pie chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Investment Breakdown</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-48 shrink-0">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => [`$${fmt(v)}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex sm:flex-col gap-4 sm:gap-3">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: PIE_COLORS[idx] }}
                    />
                    <div>
                      <p className="text-xs text-gray-500">{entry.name}</p>
                      <p className="text-sm font-semibold text-gray-800">${fmt(entry.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>ROI Progress</span>
              <span>{fmtPct(result.roi)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isGain ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(result.roi), 200) / 2}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Every $100 invested returned ${fmt(100 + result.roi)} (capped bar at 100% ROI)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Annualized Growth Tab ─────────────────────────────────────────────────────

function AnnualizedTab() {
  const [initial, setInitial]   = useState('')
  const [finalVal, setFinalVal] = useState('')
  const [years, setYears]       = useState('')
  const [result, setResult]     = useState(null)

  const calc = () => {
    const i = parseFloat(initial)
    const f = parseFloat(finalVal)
    const y = parseFloat(years)
    if (!i || !f || !y || i <= 0 || y <= 0) return
    const annualizedRate = (Math.pow(f / i, 1 / y) - 1) * 100
    const totalROI = ((f - i) / i) * 100
    const schedule = Array.from({ length: Math.ceil(y) + 1 }, (_, yr) => ({
      year: yr === 0 ? 'Start' : `Yr ${yr}`,
      value: parseFloat((i * Math.pow(1 + annualizedRate / 100, yr)).toFixed(2)),
    }))
    setResult({ initial: i, finalVal: f, years: y, annualizedRate, totalROI, schedule })
  }

  const reset = () => { setInitial(''); setFinalVal(''); setYears(''); setResult(null) }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="cagr-initial" className="block text-sm font-medium text-gray-700 mb-1.5">Initial ($)</label>
          <input id="cagr-initial" type="number" value={initial} onChange={e => setInitial(e.target.value)}
            placeholder="10,000" className={INPUT_CLS} />
        </div>
        <div>
          <label htmlFor="cagr-final" className="block text-sm font-medium text-gray-700 mb-1.5">Final Value ($)</label>
          <input id="cagr-final" type="number" value={finalVal} onChange={e => setFinalVal(e.target.value)}
            placeholder="20,000" className={INPUT_CLS} />
        </div>
        <div>
          <label htmlFor="cagr-years" className="block text-sm font-medium text-gray-700 mb-1.5">Years</label>
          <input id="cagr-years" type="number" value={years} onChange={e => setYears(e.target.value)}
            placeholder="5" min="1" step="1" className={INPUT_CLS} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={calc} className={BTN_PRIMARY}>Calculate Growth</button>
        <button onClick={reset} className={BTN_GHOST}>Reset</button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'CAGR / Ann. ROI', value: fmtPct(result.annualizedRate), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
              { label: 'Total ROI', value: fmtPct(result.totalROI), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Net Gain', value: `$${fmt(result.finalVal - result.initial)}`, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Portfolio Growth Over Time</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.schedule} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                  tick={{ fontSize: 11 }}
                  width={55}
                />
                <Tooltip formatter={v => [`$${fmt(v)}`, 'Portfolio Value']} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Year-by-Year Schedule</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {['Period', 'Portfolio Value', 'Annual Gain', 'Total Gain', 'Total ROI'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row, i) => {
                    const prev = result.schedule[i - 1]
                    const annualGain = i === 0 ? 0 : row.value - prev.value
                    const totalGain = row.value - result.initial
                    const totalRoi = i === 0 ? 0 : (totalGain / result.initial) * 100
                    return (
                      <tr key={row.year} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600 font-medium">{row.year}</td>
                        <td className="px-3 py-2 text-blue-700 font-semibold">${fmt(row.value)}</td>
                        <td className="px-3 py-2 text-emerald-600">{i === 0 ? '—' : `$${fmt(annualGain)}`}</td>
                        <td className="px-3 py-2 text-purple-600">{i === 0 ? '—' : `$${fmt(totalGain)}`}</td>
                        <td className="px-3 py-2 text-gray-700">{i === 0 ? '—' : fmtPct(totalRoi)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scenario Comparison Tab ───────────────────────────────────────────────────

const BLANK_SCENARIOS = [
  { name: 'Scenario A', initial: '', finalVal: '', years: '' },
  { name: 'Scenario B', initial: '', finalVal: '', years: '' },
  { name: 'Scenario C', initial: '', finalVal: '', years: '' },
]

const SCENARIO_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

function ScenarioTab() {
  const [scenarios, setScenarios] = useState(BLANK_SCENARIOS)
  const [results, setResults]     = useState(null)

  const update = (idx, field, value) =>
    setScenarios(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))

  const calc = () => {
    const computed = scenarios
      .map(s => {
        const i = parseFloat(s.initial)
        const f = parseFloat(s.finalVal)
        const y = parseFloat(s.years)
        if (!i || !f || i <= 0) return null
        const netProfit = f - i
        const roi = (netProfit / i) * 100
        const annualized = y > 0 && isFinite(y) ? (Math.pow(f / i, 1 / y) - 1) * 100 : null
        return { name: s.name || 'Unnamed', initial: i, finalVal: f, netProfit, roi, annualized }
      })
      .filter(Boolean)
    setResults(computed.length ? computed : null)
  }

  const reset = () => { setScenarios(BLANK_SCENARIOS); setResults(null) }

  const barData = (results || []).map(r => ({
    name: r.name,
    ROI: parseFloat(r.roi.toFixed(2)),
  }))

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="space-y-3">
        {scenarios.map((s, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: SCENARIO_COLORS[i] }}
              />
              <input
                value={s.name}
                onChange={e => update(i, 'name', e.target.value)}
                aria-label={`Scenario ${String.fromCharCode(65 + i)} name`}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Scenario ${String.fromCharCode(65 + i)}`}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor={`roi-scenario-${i}-initial`} className="block text-xs text-gray-500 mb-1">Initial ($)</label>
                <input id={`roi-scenario-${i}-initial`} type="number" value={s.initial} onChange={e => update(i, 'initial', e.target.value)}
                  placeholder="10000"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor={`roi-scenario-${i}-final`} className="block text-xs text-gray-500 mb-1">Final ($)</label>
                <input id={`roi-scenario-${i}-final`} type="number" value={s.finalVal} onChange={e => update(i, 'finalVal', e.target.value)}
                  placeholder="15000"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor={`roi-scenario-${i}-years`} className="block text-xs text-gray-500 mb-1">Years</label>
                <input id={`roi-scenario-${i}-years`} type="number" value={s.years} onChange={e => update(i, 'years', e.target.value)}
                  placeholder="3"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={calc} className={BTN_PRIMARY}>Compare Scenarios</button>
        <button onClick={reset} className={BTN_GHOST}>Reset</button>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">ROI Comparison</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={v => [`${fmt(v)}%`, 'ROI']} />
                <Bar dataKey="ROI" radius={[4, 4, 0, 0]}>
                  {barData.map((_, idx) => (
                    <Cell key={idx} fill={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Side-by-Side Comparison</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {['Scenario', 'Initial', 'Return', 'Net Profit', 'ROI %', 'Ann. ROI'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold" style={{ color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}>
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-gray-700">${fmt(r.initial)}</td>
                      <td className="px-3 py-2 text-gray-700">${fmt(r.finalVal)}</td>
                      <td className={`px-3 py-2 font-medium ${r.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.netProfit >= 0 ? '+' : ''}${fmt(r.netProfit)}
                      </td>
                      <td className={`px-3 py-2 font-bold ${r.roi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {fmtPct(r.roi)}
                      </td>
                      <td className="px-3 py-2 text-purple-600">
                        {r.annualized !== null ? fmtPct(r.annualized) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Winner badge */}
          {results.length > 1 && (() => {
            const best = results.reduce((a, b) => (a.roi > b.roi ? a : b))
            const bestIdx = results.indexOf(best)
            return (
              <div
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ background: `${SCENARIO_COLORS[bestIdx]}18`, borderColor: `${SCENARIO_COLORS[bestIdx]}40` }}
              >
                <span className="text-lg">🏆</span>
                <p className="text-sm text-gray-700">
                  <strong style={{ color: SCENARIO_COLORS[bestIdx] }}>{best.name}</strong> has the highest ROI at{' '}
                  <strong>{fmtPct(best.roi)}</strong>
                  {best.annualized !== null && ` (${fmtPct(best.annualized)} annualized)`}.
                </p>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── Main tool wrapper ─────────────────────────────────────────────────────────

function ROITool() {
  const [tab, setTab] = useState(0)
  const TABS = [
    { label: 'Simple ROI',        component: <SimpleROITab /> },
    { label: 'Annualized Growth', component: <AnnualizedTab /> },
    { label: 'Compare Scenarios', component: <ScenarioTab /> },
  ]
  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === i
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{TABS[tab].component}</div>
    </div>
  )
}

// ── Static content ────────────────────────────────────────────────────────────

const STEPS = [
  'Choose a tab: "Simple ROI" for a one-shot calculation, "Annualized Growth" to factor in how many years the investment ran, or "Compare Scenarios" to evaluate up to three options side-by-side.',
  'Enter your Initial Investment — the total amount of capital you put in before any gains or fees (cost basis).',
  'Enter the Final Value or total return — the current worth or the amount the investment produced in total including the original capital.',
  'Optionally enter the investment period in years to unlock the Annualized ROI (CAGR), which normalizes returns across different holding periods for a fair comparison.',
  'Click Calculate to see ROI %, net profit or loss, total return, annualized rate, a visual pie chart breakdown, and — in the Annualized tab — a full year-by-year growth schedule.',
]

const FAQS = [
  {
    q: 'What is ROI?',
    a: 'ROI stands for Return on Investment — a ratio that expresses how much profit or loss an investment generated relative to its cost. It is calculated as (Final Value − Initial Investment) ÷ Initial Investment × 100. An ROI of 50% means you earned $50 for every $100 invested. A negative ROI means the investment lost value.',
  },
  {
    q: 'What is Annualized ROI (CAGR)?',
    a: 'Annualized ROI, also called the Compound Annual Growth Rate (CAGR), adjusts the total return for the number of years the investment was held. It answers: "If this investment grew at a steady rate every year, what would that annual rate be?" The formula is: (Final Value ÷ Initial Investment)^(1 ÷ Years) − 1. This makes it possible to compare investments held for different time periods on equal footing.',
  },
  {
    q: 'What is the difference between ROI and annualized ROI?',
    a: 'Total ROI measures the overall percentage gain or loss over the full holding period, regardless of how long that was. Annualized ROI converts that into an equivalent yearly rate. For example, a 100% total ROI over 10 years is only a 7.18% annualized rate — much less impressive than a 100% ROI achieved in 2 years (41.4% annualized). Always compare annualized figures when evaluating investments held for different durations.',
  },
  {
    q: 'Can ROI be negative?',
    a: 'Yes. If your final value is less than your initial investment — whether due to a market downturn, business loss, or any other factor — the ROI will be negative. A negative ROI indicates a net loss. For example, investing $10,000 and receiving $7,000 back yields an ROI of −30%. The calculator displays losses in red to distinguish them clearly from gains.',
  },
  {
    q: 'How do I use the Scenario Comparison tab?',
    a: 'Fill in the initial investment, final value, and holding period for each of the three scenarios. You can rename them to match your real investments (e.g., "Stock Portfolio", "Real Estate", "Fixed Deposit"). Click Compare to see the ROI % for each in a bar chart and a side-by-side table. The tool automatically highlights the best-performing scenario. Years are optional — leave blank if you only want to compare total ROI.',
  },
  {
    q: 'Does this calculator account for inflation, taxes, or fees?',
    a: 'No — this tool calculates nominal ROI based on the raw initial and final values you enter. To calculate real (inflation-adjusted) ROI, first adjust your final value downward for inflation before entering it. Similarly, if you want after-tax ROI, reduce the net profit by your applicable tax rate before calculating. Subtracting brokerage fees or management costs from the final value gives you a more realistic net ROI.',
  },
  {
    q: 'Is the calculator suitable for business investments and marketing campaigns?',
    a: 'Absolutely. ROI applies to any context where you spend money expecting a financial return: marketing spend, equipment purchases, real estate, stocks, project budgets, or product launches. Enter total campaign cost as the Initial Investment and total revenue (or net revenue) generated as the Final Value. The formula is universal — only the inputs change.',
  },
]

const ABOUT = [
  'The AWE-OS ROI Calculator gives you a complete picture of any investment\'s performance across three modes. Simple ROI delivers the headline percentage in one click. Annualized Growth (CAGR) normalizes returns across time so you can compare a 2-year trade against a 10-year fund on equal terms. Scenario Comparison lets you evaluate up to three investment options side-by-side in a bar chart and table, automatically flagging the winner.',
  'All three modes use industry-standard formulas. Simple ROI is (Final − Initial) ÷ Initial × 100. Annualized ROI uses the compound growth formula (Final ÷ Initial)^(1 ÷ Years) − 1 — the same calculation behind CAGR figures published by every major fund. The year-by-year schedule in the Annualized tab applies this constant rate forward from your start value, giving you a model of how the portfolio compounds if growth is steady.',
  'Charts are rendered using Recharts directly in your browser. No data leaves your device — all calculations happen locally in JavaScript. This means you can model sensitive financial scenarios privately, without any server logs or account creation. The tool is designed for investors, business analysts, marketers, and students who need fast, honest ROI numbers without spreadsheet setup.',
  'Keep in mind that ROI as calculated here is nominal — it does not automatically adjust for inflation, taxes, or transaction fees. For a more conservative estimate, reduce your final value by the applicable tax amount and any management fees before entering it. To adjust for inflation, deflate the final value using the CPI index for the holding period. These adjustments give you a real, after-cost ROI — the number that actually matters for comparing investment vehicles.',
]

// ── Export ────────────────────────────────────────────────────────────────────

export default function ROICalculator() {
  return (
    <ToolPageShell
      slug="roi-calculator"
      ymyl
      name="ROI Calculator"
      description="Calculate return on investment with detailed analysis, charts, and scenario comparisons."
      icon="📈"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Does not account for taxes, inflation, or transaction costs unless you include them in your inputs."}
    >
      <ROITool />
    </ToolPageShell>
  )
}
