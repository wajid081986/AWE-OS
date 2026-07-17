import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtINR(n) {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function fmtAxis(n) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(Math.round(n))
}

// ── Calculation core ──────────────────────────────────────────────────────────

function calcFDCompound(principal, annualRate, years, freq) {
  const r = annualRate / 100
  const maturity = principal * Math.pow(1 + r / freq, freq * years)
  return { maturity: Math.round(maturity), interest: Math.round(maturity - principal) }
}

function calcFDSimple(principal, annualRate, years) {
  const interest = principal * annualRate * years / 100
  return { maturity: Math.round(principal + interest), interest: Math.round(interest) }
}

function calcRD(monthly, annualRate, years) {
  const months = years * 12
  const r = annualRate / 100 / 12
  const maturity = r === 0
    ? monthly * months
    : monthly * (1 + r) * (Math.pow(1 + r, months) - 1) / r
  const invested = monthly * months
  return { maturity: Math.round(maturity), interest: Math.round(maturity - invested), invested: Math.round(invested) }
}

function calcTDS(totalInterest, years, panProvided, isSenior) {
  const annualInterest = totalInterest / Math.max(years, 1)
  const threshold = isSenior ? 50000 : 40000
  if (annualInterest <= threshold) return { applicable: false, amount: 0, rate: 0 }
  const rate = panProvided ? 10 : 20
  return { applicable: true, amount: Math.round(totalInterest * rate / 100), rate }
}

// ── Static data ───────────────────────────────────────────────────────────────

const BANKS = [
  { name: 'SBI',         logo: '🏛️', rates: { 1: 6.80, 2: 7.00, 3: 6.75, 5: 6.50 }, senior: '+0.50' },
  { name: 'HDFC Bank',   logo: '🔵', rates: { 1: 7.10, 2: 7.00, 3: 7.00, 5: 7.00 }, senior: '+0.25' },
  { name: 'ICICI Bank',  logo: '🟠', rates: { 1: 7.10, 2: 7.00, 3: 7.00, 5: 7.00 }, senior: '+0.25' },
  { name: 'Axis Bank',   logo: '🔴', rates: { 1: 7.10, 2: 7.10, 3: 7.10, 5: 7.00 }, senior: '+0.25' },
  { name: 'Kotak Bank',  logo: '🟡', rates: { 1: 7.25, 2: 7.25, 3: 7.10, 5: 6.90 }, senior: '+0.40' },
  { name: 'Post Office', logo: '📮', rates: { 1: 6.90, 2: 7.00, 3: 7.10, 5: 7.50 }, senior: 'N/A'   },
]

function getBankRate(bank, years) {
  if (years <= 1) return bank.rates[1]
  if (years <= 2) return bank.rates[2]
  if (years <= 3) return bank.rates[3]
  return bank.rates[5]
}

const DONUT_COLORS = ['#6366f1', '#22d3ee']
const MODES        = [
  { id: 'fd', label: 'Fixed Deposit', icon: '🏦' },
  { id: 'rd', label: 'Recurring Deposit', icon: '📅' },
]
const FREQ_OPTS = [
  { value: 4,  label: 'Quarterly'   },
  { value: 2,  label: 'Half-Yearly' },
  { value: 12, label: 'Monthly'     },
  { value: 1,  label: 'Annually'    },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function RangeSlider({ label, value, min, max, step, onChange, display }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">{label}</label>
        <span className="text-sm font-bold text-white">{display(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer appearance-none accent-blue-500"
        style={{ background: `linear-gradient(to right,#3b82f6 ${pct}%,rgba(255,255,255,0.1) ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{display(min)}</span>
        <span>{display(max)}</span>
      </div>
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + p.value, 0)
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.dataKey}: {fmtINR(p.value)}
        </p>
      ))}
      <p className="text-xs text-white font-bold mt-1 pt-1 border-t border-white/10">
        Total: {fmtINR(total)}
      </p>
    </div>
  )
}

function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold" style={{ color: payload[0].payload.fill }}>
        {payload[0].name}: {fmtINR(payload[0].value)}
      </p>
    </div>
  )
}

// ── FD tool UI ────────────────────────────────────────────────────────────────

function FDTool() {
  const [mode,         setMode]         = useState('fd')
  const [interestType, setInterestType] = useState('compound')
  const [principal,    setPrincipal]    = useState(100000)
  const [monthly,      setMonthly]      = useState(5000)
  const [rate,         setRate]         = useState(7.0)
  const [years,        setYears]        = useState(3)
  const [freq,         setFreq]         = useState(4)
  const [panProvided,  setPanProvided]  = useState(true)
  const [isSenior,     setIsSenior]     = useState(false)

  const result = useMemo(() => {
    if (mode === 'rd') return calcRD(monthly, rate, years)
    if (interestType === 'simple') return calcFDSimple(principal, rate, years)
    return calcFDCompound(principal, rate, years, freq)
  }, [mode, interestType, principal, monthly, rate, years, freq])

  const tds = useMemo(
    () => calcTDS(result.interest, years, panProvided, isSenior),
    [result.interest, years, panProvided, isSenior]
  )

  const barData = useMemo(() => Array.from({ length: Math.min(years, 20) }, (_, i) => {
    const y = i + 1
    if (mode === 'rd') {
      const r = calcRD(monthly, rate, y)
      return { year: `Y${y}`, Invested: r.invested, Interest: r.interest }
    }
    const r = interestType === 'simple'
      ? calcFDSimple(principal, rate, y)
      : calcFDCompound(principal, rate, y, freq)
    return { year: `Y${y}`, Principal: principal, Interest: r.interest }
  }), [mode, interestType, principal, monthly, rate, years, freq])

  const principalForDonut = mode === 'rd' ? result.invested : principal
  const donutData = [
    { name: 'Principal', value: principalForDonut, fill: DONUT_COLORS[0] },
    { name: 'Interest',  value: Math.max(0, result.interest), fill: DONUT_COLORS[1] },
  ]

  const bankRows = useMemo(() => {
    const p = mode === 'rd' ? monthly : principal
    return BANKS.map(bank => {
      const bankRate = getBankRate(bank, years)
      const res = mode === 'rd'
        ? calcRD(p, bankRate, years)
        : calcFDCompound(p, bankRate, years, 4)
      return { ...bank, appliedRate: bankRate, maturity: res.maturity, interest: res.interest }
    }).sort((a, b) => b.maturity - a.maturity)
  }, [mode, principal, monthly, years])

  const bestMaturity = bankRows[0]?.maturity ?? 0

  const gainLabel = mode === 'rd' ? 'Total Invested' : 'Principal'
  const gainValue = mode === 'rd' ? result.invested  : principal
  const barPrincipalKey = mode === 'rd' ? 'Invested' : 'Principal'

  const fdPresets = [
    ['1L · 1yr',  () => { setPrincipal(100000);  setYears(1) }],
    ['5L · 3yr',  () => { setPrincipal(500000);  setYears(3) }],
    ['25L · 5yr', () => { setPrincipal(2500000); setYears(5) }],
  ]
  const rdPresets = [
    ['2K · 1yr',  () => { setMonthly(2000);  setYears(1) }],
    ['5K · 3yr',  () => { setMonthly(5000);  setYears(3) }],
    ['10K · 5yr', () => { setMonthly(10000); setYears(5) }],
  ]
  const presets = mode === 'fd' ? fdPresets : rdPresets

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['🏦 6 Banks Compared', '📊 TDS Calculator', '🔢 Lakhs & Crores', '📈 Simple & Compound'].map(f => (
            <span key={f} className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full">{f}</span>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-1.5 max-w-xs mx-auto">
          {MODES.map(m => (
            <button
              key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl text-[10px] font-semibold transition-all ${
                mode === m.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="text-lg mb-0.5">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Inputs */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-white">
              {mode === 'fd' ? 'FD Details' : 'RD Details'}
            </h2>

            {mode === 'fd' ? (
              <RangeSlider
                label="Principal Amount" value={principal}
                min={10000} max={10000000} step={10000}
                onChange={setPrincipal} display={fmtINR}
              />
            ) : (
              <RangeSlider
                label="Monthly Deposit" value={monthly}
                min={500} max={100000} step={500}
                onChange={setMonthly} display={fmtINR}
              />
            )}

            <RangeSlider
              label="Annual Interest Rate" value={rate}
              min={3} max={15} step={0.05}
              onChange={setRate}
              display={v => `${v.toFixed(2)}%`}
            />

            <RangeSlider
              label="Tenure" value={years}
              min={1} max={30} step={1}
              onChange={setYears}
              display={v => `${v} yr${v > 1 ? 's' : ''}`}
            />

            {/* Interest type — FD only */}
            {mode === 'fd' && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Interest Type</p>
                <div className="flex gap-2">
                  {[{ id: 'compound', label: 'Compound' }, { id: 'simple', label: 'Simple' }].map(t => (
                    <button
                      key={t.id} onClick={() => setInterestType(t.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        interestType === t.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Compounding frequency — compound FD only */}
            {mode === 'fd' && interestType === 'compound' && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Compounding Frequency</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FREQ_OPTS.map(f => (
                    <button
                      key={f.value} onClick={() => setFreq(f.value)}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                        freq === f.value ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TDS options */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-400">TDS Settings</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={panProvided}
                  onChange={e => setPanProvided(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-500"
                />
                <span className="text-xs text-gray-300">PAN provided (10% TDS)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={isSenior}
                  onChange={e => setIsSenior(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-blue-500"
                />
                <span className="text-xs text-gray-300">Senior citizen (threshold: {'₹'}50,000/yr)</span>
              </label>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Quick presets</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(([lbl, fn]) => (
                  <button key={lbl} onClick={fn}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors">
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: gainLabel,        value: fmtINR(gainValue),         color: 'text-gray-200'  },
                { label: 'Total Interest', value: fmtINR(result.interest),   color: 'text-cyan-300'  },
                { label: 'Maturity Value', value: fmtINR(result.maturity),   color: 'text-blue-300'  },
                { label: tds.applicable ? `TDS @ ${tds.rate}%` : 'TDS',
                  value: tds.applicable ? fmtINR(tds.amount) : 'Not applicable',
                  color: tds.applicable ? 'text-red-400' : 'text-emerald-400' },
              ].map(c => (
                <div key={c.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-500 leading-tight mb-1">{c.label}</p>
                  <p className={`text-xs sm:text-sm font-bold leading-tight ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Post-TDS maturity callout */}
            {tds.applicable && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-gray-400">Maturity after TDS deduction</p>
                <p className="text-base font-bold text-blue-300">{fmtINR(result.maturity - tds.amount)}</p>
              </div>
            )}

            {/* Donut chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs font-medium text-gray-400 mb-2">Principal vs Interest</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={44} outerRadius={64}
                        paddingAngle={2} dataKey="value">
                        {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<DonutTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 shrink-0 pr-2">
                  {donutData.map(d => (
                    <div key={d.name}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                        <span className="text-[10px] text-gray-400">{d.name}</span>
                      </div>
                      <p className="text-xs font-bold text-white pl-4">{fmtINR(d.value)}</p>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/50 shrink-0" />
                      <span className="text-[10px] text-gray-400">Maturity</span>
                    </div>
                    <p className="text-xs font-bold text-white pl-4">{fmtINR(result.maturity)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bar chart — year-by-year ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">
            Year-by-Year Growth &nbsp;·&nbsp; {years} Year{years > 1 ? 's' : ''} at {rate.toFixed(2)}%
          </h2>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={Math.max(8, 200 / barData.length)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={48} />
                <Tooltip content={<BarTip />} />
                <Bar dataKey={barPrincipalKey} stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Interest" stackId="a" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-3">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="w-3 h-2 rounded-sm bg-indigo-500" />{barPrincipalKey}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="w-3 h-2 rounded-sm bg-cyan-400" />Interest
            </span>
          </div>
        </div>

        {/* ── Bank comparison table ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Bank FD Rate Comparison</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Based on {years} yr{years > 1 ? 's' : ''} tenure &nbsp;&middot;&nbsp; {mode === 'fd' ? fmtINR(principal) : `${fmtINR(monthly)}/mo`} &nbsp;&middot;&nbsp; Quarterly compounding &nbsp;&middot;&nbsp; Indicative rates only
              </p>
            </div>
          </div>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-xs min-w-[440px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left pb-2.5 text-gray-400 font-medium">Bank</th>
                  <th className="text-right pb-2.5 text-gray-400 font-medium">Rate</th>
                  <th className="text-right pb-2.5 text-gray-400 font-medium">Interest Earned</th>
                  <th className="text-right pb-2.5 text-gray-400 font-medium">Maturity</th>
                  <th className="text-center pb-2.5 text-gray-400 font-medium">Senior +</th>
                </tr>
              </thead>
              <tbody>
                {bankRows.map((bank, i) => {
                  const isBest = bank.maturity === bestMaturity
                  return (
                    <tr key={bank.name} className={`border-b border-white/5 ${isBest ? 'bg-blue-500/10' : i % 2 === 0 ? 'bg-white/[0.015]' : ''}`}>
                      <td className={`py-2.5 font-semibold flex items-center gap-2 ${isBest ? 'text-blue-300' : 'text-gray-200'}`}>
                        <span>{bank.logo}</span>
                        {bank.name}
                        {isBest && <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full ml-1">Best</span>}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">{bank.appliedRate.toFixed(2)}%</td>
                      <td className="py-2.5 text-right text-cyan-400">{fmtINR(bank.interest)}</td>
                      <td className={`py-2.5 text-right font-bold ${isBest ? 'text-blue-300' : 'text-white'}`}>{fmtINR(bank.maturity)}</td>
                      <td className="py-2.5 text-center text-gray-400 text-[10px]">{bank.senior}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">
            * Rates are indicative and may vary. Check respective bank websites for current rates before investing.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4">
          <p className="text-xs text-yellow-300/80 text-center leading-relaxed">
            <span className="font-semibold">Disclaimer:</span> Returns shown are illustrative based on assumed constant rates.
            Bank FD rates are subject to change without notice. TDS rules may vary based on your tax status.
            Consult a SEBI-registered financial advisor or your bank before making investment decisions.
          </p>
        </div>

      </div>
    </div>
  )
}

// ── SEO content ───────────────────────────────────────────────────────────────

const STEPS = [
  'Choose FD or RD mode at the top. Fixed Deposit calculates returns on a one-time lump-sum investment; Recurring Deposit calculates returns on fixed monthly instalments — ideal for building a corpus through disciplined savings.',
  'Enter your principal amount (FD) or monthly deposit (RD), then set the annual interest rate and investment tenure using the sliders. Tenures range from 1 to 30 years. Use the quick presets for common scenarios like ₹1 lakh for 1 year.',
  'For Fixed Deposits, select Simple or Compound interest. Most bank FDs compound quarterly. Simple interest is used for non-cumulative FDs that pay out interest periodically rather than reinvesting it.',
  'Configure TDS settings to see your net payout. Check "PAN provided" to apply the standard 10% TDS rate, or leave it unchecked for the 20% rate that applies when no PAN is on record. Check "Senior Citizen" to raise the TDS-exempt threshold from ₹40,000 to ₹50,000 per year.',
  'Review the summary cards, donut chart, year-by-year bar chart, and bank comparison table. The table shows indicative rates from SBI, HDFC, ICICI, Axis, Kotak and Post Office so you can immediately see where your deposit grows the most.',
]

const FAQS = [
  {
    q: 'How is FD maturity calculated?',
    a: 'For compound interest FDs (most bank FDs), Maturity = P × (1 + r/n)^(n×t) where P=principal, r=annual rate, n=compounding frequency, t=tenure in years. Post Office FDs typically use quarterly compounding.',
  },
  {
    q: 'What is TDS on FD interest?',
    a: 'Banks deduct TDS at 10% (with PAN) or 20% (without PAN) if your annual FD interest exceeds ₹40,000 (₹50,000 for senior citizens). TDS is deducted on accrued interest, not just at maturity.',
  },
  {
    q: 'Is FD interest taxable in India?',
    a: 'Yes. FD interest is added to your total income and taxed as per your income tax slab. TDS deducted by the bank is an advance tax, not the final tax. If your slab is higher than 10%, you owe additional tax at filing.',
  },
  {
    q: 'Which is better — Simple or Compound Interest FD?',
    a: 'Compound interest FDs always yield more over the same period. For example, ₹1 lakh at 7% for 3 years gives ₹21,000 (simple) vs ₹22,504 (quarterly compound). Choose compound unless you need periodic interest payouts.',
  },
  {
    q: 'What is an RD and how is it different from FD?',
    a: 'A Recurring Deposit (RD) requires fixed monthly deposits instead of a one-time lump sum. RD is ideal if you want to build a corpus through disciplined monthly savings rather than deploying a large amount at once.',
  },
  {
    q: 'Which bank offers the best FD rate?',
    a: 'Rates vary by tenure. Kotak and small finance banks typically offer the highest rates for 1-2 year tenures, while Post Office offers 7.5% for 5 years. Senior citizens get an additional 0.25%–0.50% across most banks.',
  },
]

const ABOUT = [
  'Your bank is offering 7% on a 5-year FD. Your colleague says their bank gives 7.25%. A family member has heard the Post Office is the safest. You\'ve been meaning to compare all of them, calculate the exact TDS impact, and figure out whether to go compound or simple — but haven\'t found a single tool that handles all of it cleanly. The AWE-OS FD Calculator does exactly this: enter your amount, set the tenure, and instantly see maturity values, TDS impact, and a ranked comparison across SBI, HDFC, ICICI, Axis Bank, Kotak Bank, and Post Office.',
  'India\'s fixed deposit market looks simple but has meaningful complexity beneath the surface. Most bank FDs use quarterly compound interest — meaning the interest earned in Q1 itself earns interest from Q2 onwards. Over a 5-year tenure, the difference between quarterly compounding and simple interest on a ₹5 lakh deposit at 7% is over ₹17,000. The calculator lets you toggle between compound and simple modes to see the exact rupee difference for your specific deposit, so you understand what "compounding" actually means in your hands rather than just as a formula.',
  'TDS is where most FD investors get surprised. Banks are legally required to deduct TDS at 10% (or 20% if you haven\'t provided PAN) once your annual interest from a single bank exceeds ₹40,000 — or ₹50,000 for senior citizens. TDS is deducted even if your total income is below the taxable threshold, meaning you\'d need to file ITR 1 to claim a refund. The calculator shows whether TDS applies to your specific deposit, how much it will be, and your net maturity amount after deduction, so there are no cash-flow surprises at maturity.',
  'The bank comparison table is based on publicly available indicative rates for the most common tenures. Kotak Bank and several small finance banks typically offer the highest rates for 1-2 year FDs; the Post Office Time Deposit provides a government-backed 7.5% for 5-year deposits, making it one of the safest fixed-return instruments available. Senior citizens receive an additional 0.25%–0.50% at most private banks. All rates shown are indicative — bank rates change frequently, so treat this comparison as a directional guide and verify current rates on the bank\'s website or at your nearest branch before committing funds.',
]

// ── Page export ───────────────────────────────────────────────────────────────

export default function FDCalculator() {
  return (
    <ToolPageShell
      slug="fd-calculator"
      name="FD Calculator"
      description="Calculate Fixed Deposit and Recurring Deposit returns, TDS on interest, and compare rates across SBI, HDFC, ICICI, Axis, Kotak and Post Office."
      icon="🏦"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Bank rates shown are indicative and change frequently — confirm the current rate with your bank before investing."}
    >
      <FDTool />
    </ToolPageShell>
  )
}
