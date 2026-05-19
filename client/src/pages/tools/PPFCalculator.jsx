import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

// ── Formatting ────────────────────────────────────────────────────────────────

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

// Interest on opening balance; deposit added each year
function buildPPFData(deposit, rate) {
  const r = rate / 100
  let balance = 0
  const rows = []
  for (let y = 1; y <= 15; y++) {
    const opening  = balance
    const interest = opening * r
    balance        = opening * (1 + r) + deposit
    rows.push({
      year:       y,
      yearLabel:  `Y${y}`,
      opening:    Math.round(opening),
      deposit:    Math.round(deposit),
      interest:   Math.round(interest),
      closing:    Math.round(balance),
      cumDeposit: Math.round(deposit * y),
      cumInterest: Math.round(balance - deposit * y),
    })
  }
  return rows
}

function buildExtensionMilestones(balance15, deposit, rate) {
  const r = rate / 100
  let balWith = balance15
  let balNo   = balance15
  const withDep = []
  const noDep   = []
  for (let y = 16; y <= 30; y++) {
    balWith = balWith * (1 + r) + deposit
    balNo   = balNo   * (1 + r)
    if (y === 20 || y === 25 || y === 30) {
      withDep.push({ year: y, balance: Math.round(balWith) })
      noDep.push({   year: y, balance: Math.round(balNo) })
    }
  }
  return { withDep, noDep }
}

function buildExtensionChart(balance15, deposit, rate) {
  const r = rate / 100
  let balWith = balance15
  let balNo   = balance15
  const rows = [{ yearLabel: 'Y15', withDep: Math.round(balance15), noDep: Math.round(balance15) }]
  for (let y = 16; y <= 30; y++) {
    balWith = balWith * (1 + r) + deposit
    balNo   = balNo   * (1 + r)
    rows.push({ yearLabel: `Y${y}`, withDep: Math.round(balWith), noDep: Math.round(balNo) })
  }
  return rows
}

// Max withdrawal = 50% × min(balance at end of Year 4, balance at end of preceding year)
function calcWithdrawal(yearlyData, yearsCompleted, existingBalance) {
  if (yearsCompleted < 6) {
    return { eligible: false, maxAmount: 0, bal4: 0, prevYearBal: 0, yearsLeft: 6 - yearsCompleted }
  }
  const bal4        = yearlyData[3]?.closing ?? 0
  const prevYearBal = existingBalance > 0
    ? existingBalance
    : (yearlyData[yearsCompleted - 1]?.closing ?? 0)
  const maxAmount   = Math.round(0.5 * Math.min(bal4, prevYearBal))
  return { eligible: true, maxAmount, bal4, prevYearBal, yearsLeft: 0 }
}

// ── Static data ───────────────────────────────────────────────────────────────

const PPF_RATE = 7.1

const TAX_SLABS = [
  { value: 5,  label: '5%'  },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
  { value: 30, label: '30%' },
]

const MODES = [
  { id: 'calculator', label: 'Calculator', icon: '🧮' },
  { id: 'extension',  label: 'Extension',  icon: '📅' },
  { id: 'withdrawal', label: 'Withdrawal', icon: '💸' },
]

const EXTENSION_RULES = [
  'Extension must be requested within 1 year of maturity (i.e., by April 30 of the 16th year).',
  'Extensions are in 5-year blocks; you can extend any number of times.',
  'With-deposit extension: contribute ₹500–₹1.5L/year; 80C deduction continues; withdrawals up to 60% of balance at start of extension period allowed.',
  'Without-deposit extension: no fresh deposits allowed; balance earns tax-free interest; one withdrawal of any amount allowed per year.',
  'If no extension is chosen, PPF earns interest until you close it; you can make one withdrawal per year from the maturity date.',
]

const WITHDRAWAL_RULES = [
  { icon: '📅', text: 'Allowed from the 7th financial year (after 6 completed years). Form C must be submitted at the branch.' },
  { icon: '💰', text: 'Maximum = 50% of balance at end of Year 4 OR end of the preceding year — whichever is lower.' },
  { icon: '🔢', text: 'Only ONE partial withdrawal is allowed per financial year.' },
  { icon: '⚡', text: 'No TDS on PPF withdrawals. Amount withdrawn is completely tax-free.' },
  { icon: '🔒', text: 'Premature full closure: allowed after 5 years for medical/education reasons with 1% interest penalty.' },
  { icon: '📋', text: 'Loans against PPF are available from the 3rd to 6th year (before withdrawal eligibility begins).' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function RangeSlider({ label, value, min, max, step, onChange, display, hint }) {
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
        className="w-full h-1.5 rounded-full cursor-pointer appearance-none accent-emerald-500"
        style={{ background: `linear-gradient(to right,#10b981 ${pct}%,rgba(255,255,255,0.1) ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{display(min)}</span>
        <span>{display(max)}</span>
      </div>
      {hint && <p className="text-[10px] text-gray-500">{hint}</p>}
    </div>
  )
}

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.dataKey}: {fmtINR(p.value)}
        </p>
      ))}
      <p className="text-xs text-white font-bold mt-1 pt-1 border-t border-white/10">
        Balance: {fmtINR(total)}
      </p>
    </div>
  )
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{label}</p>
      <p className="text-xs font-semibold text-emerald-400">Interest Earned: {fmtINR(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

function ExtTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.dataKey === 'withDep' ? 'With deposits' : 'Without deposits'}: {fmtINR(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── PPF tool UI ───────────────────────────────────────────────────────────────

function PPFTool() {
  const [mode,           setMode]           = useState('calculator')
  const [yearlyDeposit,  setYearlyDeposit]  = useState(150000)
  const [existingBal,    setExistingBal]    = useState('')
  const [yearsCompleted, setYearsCompleted] = useState(0)
  const [taxSlab,        setTaxSlab]        = useState(30)
  const [showAllRows,    setShowAllRows]    = useState(false)

  const existingBalance = Number(existingBal) || 0

  const yearlyData = useMemo(
    () => buildPPFData(yearlyDeposit, PPF_RATE),
    [yearlyDeposit]
  )

  const maturityAmount = yearlyData[14]?.closing ?? 0
  const totalDeposited = yearlyDeposit * 15
  const totalInterest  = maturityAmount - totalDeposited
  const annualTaxSaved = Math.min(yearlyDeposit, 150000) * taxSlab / 100
  const totalTaxSaved  = annualTaxSaved * 15
  const effectiveGain  = totalInterest + totalTaxSaved

  const areaData = yearlyData.map(r => ({
    yearLabel:  r.yearLabel,
    'Deposits': r.cumDeposit,
    'Interest': r.cumInterest,
  }))

  const barData = yearlyData.map(r => ({
    yearLabel: r.yearLabel,
    Interest:  r.interest,
  }))

  const { withDep: extWith, noDep: extNo } = useMemo(
    () => buildExtensionMilestones(maturityAmount, yearlyDeposit, PPF_RATE),
    [maturityAmount, yearlyDeposit]
  )

  const extChartData = useMemo(
    () => buildExtensionChart(maturityAmount, yearlyDeposit, PPF_RATE),
    [maturityAmount, yearlyDeposit]
  )

  const withdrawal = useMemo(
    () => calcWithdrawal(yearlyData, yearsCompleted, existingBalance),
    [yearlyData, yearsCompleted, existingBalance]
  )

  const tableRows = showAllRows ? yearlyData : yearlyData.slice(0, 7)

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['🔒 15-Year Lock-in', '🌿 EEE Tax-Free', '💰 80C Deduction', '📊 Extension Planner', '💸 Withdrawal Calc'].map(f => (
            <span key={f} className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full">{f}</span>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-1.5 max-w-sm mx-auto">
          {MODES.map(m => (
            <button
              key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl text-[10px] font-semibold transition-all ${
                mode === m.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="text-lg mb-0.5">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* ══════════════ CALCULATOR TAB ══════════════ */}
        {mode === 'calculator' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* ── Input panel ── */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-semibold text-white">PPF Details</h2>

                <RangeSlider
                  label="Yearly Investment (₹)"
                  value={yearlyDeposit} min={500} max={150000} step={500}
                  onChange={setYearlyDeposit} display={fmtINR}
                  hint="Max limit: ₹1,50,000 per year (Section 80C)"
                />

                {/* Interest Rate — readonly info badge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">PPF Interest Rate</span>
                    <span className="text-sm font-bold text-emerald-400">{PPF_RATE}% p.a.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                      Rate is set by the Government of India each quarter. Currently <strong>7.1% p.a.</strong>, compounded annually. Deposits before 5th April maximise interest.
                    </p>
                  </div>
                </div>

                {/* Existing Balance */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">
                    Existing PPF Balance (₹)
                    <span className="ml-1 text-gray-600 font-normal">— optional</span>
                  </label>
                  <input
                    type="number" min={0} value={existingBal}
                    onChange={e => setExistingBal(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                  />
                  <p className="text-[10px] text-gray-500">Used for withdrawal eligibility. Leave blank for a fresh account.</p>
                </div>

                {/* Years Completed */}
                <RangeSlider
                  label="Years Already Completed"
                  value={yearsCompleted} min={0} max={14} step={1}
                  onChange={setYearsCompleted}
                  display={v => v === 0 ? 'Fresh account' : `${v} yr${v !== 1 ? 's' : ''}`}
                  hint={yearsCompleted === 0 ? 'Starting a new PPF account' : `${15 - yearsCompleted} year${15 - yearsCompleted !== 1 ? 's' : ''} remaining to maturity`}
                />

                {/* Tax Slab */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Your Income Tax Slab</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TAX_SLABS.map(s => (
                      <button
                        key={s.value} onClick={() => setTaxSlab(s.value)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          taxSlab === s.value
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500">Used to calculate your annual 80C tax saving</p>
                </div>
              </div>

              {/* ── Results panel ── */}
              <div className="lg:col-span-3 space-y-4">

                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
                    <p className="text-xs text-emerald-300/70 mb-1">Maturity Amount (Year 15)</p>
                    <p className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">{fmtINR(maturityAmount)}</p>
                    <p className="text-[10px] text-emerald-300/50 mt-1.5">Fully tax-free on withdrawal · EEE status</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-400 mb-1">Total Invested</p>
                    <p className="text-xl font-bold text-blue-400">{fmtINR(totalDeposited)}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{fmtINR(yearlyDeposit)}/yr × 15 yrs</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-400 mb-1">Total Interest</p>
                    <p className="text-xl font-bold text-green-400">{fmtINR(totalInterest)}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Tax-free interest earned</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-400 mb-1">Tax Saved (80C)</p>
                    <p className="text-xl font-bold text-yellow-400">{fmtINR(totalTaxSaved)}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{fmtINR(annualTaxSaved)}/yr @ {taxSlab}% slab</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-400 mb-1">Effective Gain</p>
                    <p className="text-xl font-bold text-purple-400">{fmtINR(effectiveGain)}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Interest + total tax savings</p>
                  </div>
                </div>

                {/* Stacked Area Chart — 15-year growth */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white">15-Year Growth</h3>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Deposits
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Interest
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-3 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dashed border-yellow-400" /> Year 7: Withdrawal eligible</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 border-t border-dashed border-emerald-400" /> Year 15: Maturity</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={areaData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ppfGDeposit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="ppfGInterest" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.55} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="yearLabel" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip content={<AreaTip />} />
                      <ReferenceLine
                        x="Y7" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: 'Withdrawal ↑', position: 'insideTopRight', fontSize: 9, fill: '#f59e0b', fontWeight: 600 }}
                      />
                      <ReferenceLine
                        x="Y15" stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: '↑ Maturity', position: 'insideTopLeft', fontSize: 9, fill: '#10b981', fontWeight: 600 }}
                      />
                      <Area type="monotone" dataKey="Deposits" stackId="1" stroke="#3b82f6" strokeWidth={2} fill="url(#ppfGDeposit)" />
                      <Area type="monotone" dataKey="Interest" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#ppfGInterest)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart — Yearly Interest */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Yearly Interest Earned</h3>
                  <ResponsiveContainer width="100%" height={175}>
                    <BarChart data={barData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ppfGBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#10b981" stopOpacity={1}   />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="yearLabel" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip content={<BarTip />} />
                      <Bar dataKey="Interest" fill="url(#ppfGBar)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Year-by-Year Breakdown Table ── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Year-by-Year Breakdown</h3>
                <span className="text-[10px] text-gray-500">Interest rate: {PPF_RATE}% p.a. · Compounded annually</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="text-left px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Year</th>
                      <th className="text-right px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Opening Balance</th>
                      <th className="text-right px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Deposit</th>
                      <th className="text-right px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Interest @ {PPF_RATE}%</th>
                      <th className="text-right px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(row => {
                      const isPast      = row.year <= yearsCompleted
                      const isMaturity  = row.year === 15
                      const isWithdraw  = row.year === 7
                      return (
                        <tr
                          key={row.year}
                          className={`border-b border-white/5 transition-colors ${
                            isMaturity ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                              : isPast  ? 'opacity-50 hover:opacity-70'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <td className="px-5 py-3 font-medium text-gray-300 whitespace-nowrap">
                            <span className="flex items-center gap-2 flex-wrap">
                              Year {row.year}
                              {isWithdraw && (
                                <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">Withdrawal ✓</span>
                              )}
                              {isMaturity && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">Maturity 🎯</span>
                              )}
                              {isPast && !isMaturity && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">Completed</span>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-400">{fmtINR(row.opening)}</td>
                          <td className="px-5 py-3 text-right text-blue-400 font-medium">+{fmtINR(row.deposit)}</td>
                          <td className="px-5 py-3 text-right text-green-400 font-medium">+{fmtINR(row.interest)}</td>
                          <td className={`px-5 py-3 text-right font-bold ${isMaturity ? 'text-emerald-400' : 'text-white'}`}>
                            {fmtINR(row.closing)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white/[0.04] border-t border-white/10">
                      <td className="px-5 py-3 font-bold text-gray-300 text-xs">15-Year Total</td>
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3 text-right font-bold text-blue-400">{fmtINR(totalDeposited)}</td>
                      <td className="px-5 py-3 text-right font-bold text-green-400">{fmtINR(totalInterest)}</td>
                      <td className="px-5 py-3 text-right font-black text-emerald-400">{fmtINR(maturityAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button
                onClick={() => setShowAllRows(v => !v)}
                className="w-full py-3 text-xs text-gray-400 hover:text-white border-t border-white/10 transition-colors"
              >
                {showAllRows ? 'Show less ↑' : `Show all 15 years ↓ (${15 - tableRows.length} more rows)`}
              </button>
            </div>
          </>
        )}

        {/* ══════════════ EXTENSION TAB ══════════════ */}
        {mode === 'extension' && (
          <div className="space-y-5">

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-blue-300 mb-2">PPF Extension — 5-Year Blocks</h3>
              <p className="text-xs text-blue-300/70 leading-relaxed">
                After the 15-year maturity, your PPF account can be extended in blocks of 5 years — any number of times.
                Choose <strong className="text-blue-200">with deposits</strong> to continue your 80C deduction and grow the corpus faster,
                or <strong className="text-blue-200">without deposits</strong> to let the existing balance compound tax-free until you need it.
              </p>
            </div>

            {/* Extension milestone cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { year: 20, label: '+5 Years', sub: 'Year 20' },
                { year: 25, label: '+10 Years', sub: 'Year 25' },
                { year: 30, label: '+15 Years', sub: 'Year 30' },
              ].map(({ year, label, sub }) => {
                const wd = extWith.find(r => r.year === year)
                const nd = extNo.find(r => r.year === year)
                const extraWith = (wd?.balance ?? 0) - maturityAmount
                return (
                  <div key={year} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-white">{label} Extension</p>
                      <p className="text-[10px] text-gray-500">{sub} of PPF account</p>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">With fresh deposits</p>
                        <p className="text-xl font-black text-emerald-400">{fmtINR(wd?.balance ?? 0)}</p>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">Without deposits</p>
                        <p className="text-xl font-bold text-blue-400">{fmtINR(nd?.balance ?? 0)}</p>
                      </div>
                      <div className="bg-emerald-500/10 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-emerald-300/70">Extra vs maturity (with deposits)</p>
                        <p className="text-sm font-bold text-emerald-300">+{fmtINR(extraWith)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Extension chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Extension Growth (Year 15–30)</h3>
                <div className="flex items-center gap-4 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-emerald-500 inline-block" /> With deposits</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-blue-400 inline-block" /> Without deposits</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={extChartData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="ppfGExtWith" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ppfGExtNo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="yearLabel" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<ExtTip />} />
                  <Area type="monotone" dataKey="withDep" stroke="#10b981" strokeWidth={2} fill="url(#ppfGExtWith)" />
                  <Area type="monotone" dataKey="noDep"   stroke="#3b82f6" strokeWidth={2} fill="url(#ppfGExtNo)" strokeDasharray="5 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Extension rules */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Extension Rules</h3>
              <ul className="space-y-2.5">
                {EXTENSION_RULES.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ══════════════ WITHDRAWAL TAB ══════════════ */}
        {mode === 'withdrawal' && (
          <div className="space-y-5">

            {/* Eligibility banner */}
            <div className={`rounded-2xl p-5 border ${
              withdrawal.eligible
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{withdrawal.eligible ? '✅' : '⏳'}</span>
                <div>
                  <h3 className={`text-sm font-bold mb-1 ${withdrawal.eligible ? 'text-emerald-300' : 'text-yellow-300'}`}>
                    {withdrawal.eligible ? 'Partial Withdrawal Eligible' : 'Not Yet Eligible for Withdrawal'}
                  </h3>
                  <p className={`text-xs leading-relaxed ${withdrawal.eligible ? 'text-emerald-300/70' : 'text-yellow-300/70'}`}>
                    {withdrawal.eligible
                      ? `You have completed ${yearsCompleted} year${yearsCompleted !== 1 ? 's' : ''} and can make a partial withdrawal during the current financial year.`
                      : `Partial withdrawals are allowed from the 7th financial year (after 6 completed years). You need ${withdrawal.yearsLeft} more year${withdrawal.yearsLeft !== 1 ? 's' : ''} to become eligible. Consider a loan against PPF in the meantime.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Withdrawal amount breakdown */}
            {withdrawal.eligible && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 mb-1">Balance at End of Year 4</p>
                  <p className="text-xl font-bold text-blue-400">{fmtINR(withdrawal.bal4)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">Reference point per PPF rules</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-[10px] text-gray-500 mb-1">
                    {existingBalance > 0 ? 'Your Current Balance' : `Balance at End of Year ${yearsCompleted}`}
                  </p>
                  <p className="text-xl font-bold text-blue-400">{fmtINR(withdrawal.prevYearBal)}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {existingBalance > 0 ? 'Entered above' : 'From projection'}
                  </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
                  <p className="text-[10px] text-emerald-300/70 mb-1">Maximum Withdrawal Amount</p>
                  <p className="text-2xl font-black text-emerald-400">{fmtINR(withdrawal.maxAmount)}</p>
                  <p className="text-[10px] text-emerald-300/50 mt-1">50% × min(Year 4, preceding year)</p>
                </div>
              </div>
            )}

            {/* Withdrawal rules */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Partial Withdrawal Rules</h3>
              <ul className="space-y-3">
                {WITHDRAWAL_RULES.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                    <span className="flex-shrink-0 text-base leading-none">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Loan info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Loans Against PPF (Year 3–6)</h3>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                Before withdrawal eligibility kicks in, you can take a loan against your PPF balance from the 3rd financial year up to the 6th year.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: '📅', label: 'Eligible Period', value: 'From Year 3 to Year 6' },
                  { icon: '💰', label: 'Max Loan',        value: '25% of balance at end of 2 preceding years' },
                  { icon: '📊', label: 'Loan Interest',   value: '2% above PPF rate (currently ~9.1% p.a.)' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2 text-xs">
                    <span className="flex-shrink-0">{icon}</span>
                    <div>
                      <p className="font-semibold text-gray-300">{label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── SEO content ───────────────────────────────────────────────────────────────

const STEPS = [
  'Use the Calculator tab (default) to project your 15-year PPF maturity amount. Set your yearly investment amount using the slider — the government cap is ₹1.5 lakh per year. Select your income tax slab to calculate your annual 80C tax saving.',
  'If you already have a PPF account, enter your current balance and the number of years completed. The calculator will show your remaining lock-in period and factor your current balance into the withdrawal eligibility check.',
  'Switch to the Extension tab to model what happens after your PPF matures at year 15. Compare your projected corpus at years 20, 25, and 30 under two scenarios: extending with fresh deposits (80C benefit continues) versus extending without deposits (balance compounds tax-free).',
  'Switch to the Withdrawal tab to check if you are currently eligible for a partial withdrawal. Set the years completed slider and optionally enter your current balance. The tool calculates the maximum amount you can withdraw based on the PPF formula: 50% of the lower of your Year 4 balance or your preceding year balance.',
  'Review the year-by-year breakdown table and the 15-year area chart. The chart highlights Year 7 (first withdrawal eligibility) and Year 15 (maturity) with reference lines so you can see exactly when each milestone occurs relative to your growing corpus.',
]

const FAQS = [
  {
    q: 'What is PPF and who can open an account?',
    a: 'Public Provident Fund (PPF) is a government-backed long-term savings scheme in India. Any resident Indian individual can open a PPF account at an authorised bank or post office. HUFs and NRIs are not eligible. An individual can hold only one PPF account (excluding a minor\'s account held as guardian).',
  },
  {
    q: 'How is PPF interest calculated?',
    a: 'PPF interest is calculated on the minimum balance between the 5th and last day of each month and credited to the account at the end of each financial year (March 31). To maximise interest earned, deposit before the 5th of April each year so that the deposit earns interest for the entire year.',
  },
  {
    q: 'What is the lock-in period for PPF?',
    a: 'PPF has a mandatory 15-year lock-in from the financial year of the first deposit. The account matures at the end of the 15th financial year. Premature closure is allowed after 5 years only for specified reasons (medical treatment, higher education of account holder or dependent) with a 1% interest penalty.',
  },
  {
    q: 'When can I make partial withdrawals from PPF?',
    a: 'Partial withdrawals are allowed from the 7th financial year onwards (after completing 6 years). You can make one withdrawal per year. The maximum you can withdraw is 50% of the balance at the end of the 4th year or the end of the year preceding the withdrawal year — whichever is lower.',
  },
  {
    q: 'What are the tax benefits of PPF (EEE status)?',
    a: 'PPF enjoys EEE (Exempt-Exempt-Exempt) status: (1) Deposits qualify for deduction under Section 80C up to ₹1.5 lakh per year, (2) Interest earned is completely tax-free, and (3) The maturity amount is fully exempt from income tax. This makes it one of the most tax-efficient investments in India.',
  },
  {
    q: 'What are the deposit limits for PPF?',
    a: 'Minimum deposit is ₹500 and maximum is ₹1,50,000 per financial year. Deposits can be made as a lump sum or in up to 12 instalments per year. If you fail to deposit the minimum ₹500 in a year, the account becomes discontinued and must be revived by paying ₹50 penalty per missed year plus the minimum deposit.',
  },
  {
    q: 'Can I extend my PPF account after 15 years?',
    a: 'Yes. After maturity, PPF can be extended in blocks of 5 years any number of times. Extension must be opted within 1 year of maturity. You can choose to extend with fresh deposits (continue 80C benefit) or without (account earns interest on existing balance without fresh deposits). In the without-deposit extension, you can make one withdrawal per year of any amount.',
  },
]

const ABOUT = [
  'You\'ve been putting ₹1.5 lakh into your PPF account every April for several years. But when your company announced a restructuring, you realised you had no clear picture of how much was actually in there, whether you could take out some funds right now, or what the actual benefit of continuing after the 15-year lock-in would be. The AWE-OS PPF Calculator addresses all three questions across three dedicated tabs — a main calculator for your full 15-year maturity projection, an extension planner that models post-maturity growth to year 30, and a withdrawal calculator that applies the exact PPF formula to tell you how much you can access right now.',
  'PPF is one of the few investment instruments in India that still enjoys full EEE (Exempt-Exempt-Exempt) tax status under both old and new tax regimes in its pure form. Deposits up to ₹1.5 lakh per year qualify for Section 80C deduction, all interest earned is completely tax-free, and the entire maturity amount is exempt from income tax. For an investor in the 30% slab making the maximum ₹1.5 lakh annual deposit, the tax savings alone are ₹45,000 per year — or ₹6.75 lakh over 15 years before counting any interest. The effective return on PPF at 7.1% is substantially better than 7.1% once this tax benefit is factored in, making it genuinely competitive with many higher-stated-return options that are fully taxable.',
  'One detail that costs many PPF investors real money is the timing of their deposit. PPF interest is calculated on the minimum balance between the 5th and last day of each month, and credited annually on March 31. A ₹1.5 lakh deposit made on April 4 earns interest for all 12 months of that financial year. The same deposit made on April 6 loses interest for the entire month of April — on ₹1.5 lakh at 7.1%, that\'s roughly ₹900 lost in a single year, and ₹13,000+ compounded over 15 years. The calculator uses annual deposits, reflecting the most common scenario, but the timing principle applies regardless of how you structure your instalments.',
  'One of the least understood aspects of PPF is what actually happens at year 15. Many account holders withdraw and close — but for those who don\'t need the funds immediately, this is often not the optimal choice. The account can be extended in 5-year blocks with no limit on the number of extensions. Extending with fresh deposits continues the 80C deduction on new contributions and compounds the entire corpus at the prevailing PPF rate, still tax-free. Extending without deposits lets the existing balance compound at the government rate with no fresh commitment and allows one full withdrawal per year of any amount. The Extension tab models both scenarios to year 30 in rupee terms, so you can see the actual financial difference between each path for your specific deposit amount.',
]

// ── Page export ───────────────────────────────────────────────────────────────

export default function PPFCalculator() {
  return (
    <ToolPageShell
      slug="ppf-calculator"
      name="PPF Calculator"
      description="Plan your Public Provident Fund journey — 15-year maturity amount, year-by-year growth, 80C tax savings, partial withdrawal eligibility and extension projections."
      icon="🏛️"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <PPFTool />
    </ToolPageShell>
  )
}
