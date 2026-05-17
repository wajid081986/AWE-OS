import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
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

function sipFV(monthly, years, annualRate) {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return monthly * n
  return monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r))
}

function calcSIP(monthly, years, rate) {
  const corpus   = sipFV(monthly, years, rate)
  const invested = monthly * years * 12
  return { corpus: Math.round(corpus), invested: Math.round(invested), returns: Math.round(corpus - invested) }
}

function calcLumpsum(principal, years, rate) {
  const corpus = principal * Math.pow(1 + rate / 100, years)
  return { corpus: Math.round(corpus), invested: principal, returns: Math.round(corpus - principal) }
}

function calcGoal(target, years, rate) {
  const r = rate / 100 / 12
  const n = years * 12
  const monthly = r === 0 ? target / n : (target * r) / ((Math.pow(1 + r, n) - 1) * (1 + r))
  const invested = monthly * n
  return {
    monthly:  Math.round(monthly),
    corpus:   target,
    invested: Math.round(invested),
    returns:  Math.round(target - invested),
  }
}

function buildAreaData(sipAmt, lumpAmt, years, rate, isLumpsum) {
  const r = rate / 100 / 12
  return Array.from({ length: years + 1 }, (_, y) => {
    const n = y * 12
    let corpus, invested
    if (isLumpsum) {
      corpus   = lumpAmt * Math.pow(1 + rate / 100, y)
      invested = lumpAmt
    } else {
      corpus   = r === 0 ? sipAmt * n : sipAmt * (((Math.pow(1 + r, n) - 1) / r) * (1 + r))
      invested = sipAmt * n
    }
    return {
      year:     y === 0 ? 'Now' : `Y${y}`,
      Invested: Math.round(Math.max(0, invested)),
      Returns:  Math.round(Math.max(0, corpus - invested)),
    }
  })
}

// ── Static data ───────────────────────────────────────────────────────────────

const COMPARE_RATES = [8, 12, 15, 18]

const FUNDS = [
  {
    name: 'Mirae Asset Large Cap Fund', cat: 'Large Cap',
    ret1y: 18.4, ret3y: 14.2, ret5y: 16.8, risk: 'Moderate',
    groww:   'https://groww.in/mutual-funds/mirae-asset-large-cap-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/mirae-asset-large-cap-fund-direct-growth',
  },
  {
    name: 'Axis Bluechip Fund', cat: 'Large Cap',
    ret1y: 16.2, ret3y: 12.8, ret5y: 15.4, risk: 'Moderate',
    groww:   'https://groww.in/mutual-funds/axis-bluechip-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/axis-bluechip-fund-direct-growth',
  },
  {
    name: 'Parag Parikh Flexi Cap Fund', cat: 'Flexi Cap',
    ret1y: 22.1, ret3y: 18.6, ret5y: 21.3, risk: 'Moderate',
    groww:   'https://groww.in/mutual-funds/parag-parikh-flexi-cap-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/parag-parikh-flexi-cap-fund-direct-growth',
  },
  {
    name: 'Axis Midcap Fund', cat: 'Mid Cap',
    ret1y: 24.8, ret3y: 20.1, ret5y: 22.6, risk: 'High',
    groww:   'https://groww.in/mutual-funds/axis-midcap-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/axis-midcap-fund-direct-growth',
  },
  {
    name: 'Kotak Emerging Equity Fund', cat: 'Mid Cap',
    ret1y: 26.3, ret3y: 21.4, ret5y: 23.8, risk: 'High',
    groww:   'https://groww.in/mutual-funds/kotak-emerging-equity-scheme-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/kotak-emerging-equity-fund-direct-growth',
  },
  {
    name: 'SBI Small Cap Fund', cat: 'Small Cap',
    ret1y: 28.9, ret3y: 22.3, ret5y: 26.1, risk: 'Very High',
    groww:   'https://groww.in/mutual-funds/sbi-small-cap-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/sbi-small-cap-fund-direct-growth',
  },
  {
    name: 'Axis Long Term Equity (ELSS)', cat: 'ELSS',
    ret1y: 17.6, ret3y: 14.9, ret5y: 17.2, risk: 'Moderate',
    groww:   'https://groww.in/mutual-funds/axis-long-term-equity-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/axis-long-term-equity-fund-direct-growth',
  },
  {
    name: 'UTI Nifty 50 Index Fund', cat: 'Index',
    ret1y: 15.8, ret3y: 13.1, ret5y: 15.7, risk: 'Moderate',
    groww:   'https://groww.in/mutual-funds/uti-nifty-index-fund-direct-plan-growth',
    zerodha: 'https://coin.zerodha.com/funds/uti-nifty-index-fund-direct-growth',
  },
]

const RISK_STYLE = {
  'Low':       'bg-green-500/20  text-green-300',
  'Moderate':  'bg-yellow-500/20 text-yellow-300',
  'High':      'bg-orange-500/20 text-orange-300',
  'Very High': 'bg-red-500/20    text-red-300',
}

const DONUT_COLORS = ['#6366f1', '#22d3ee']

const MODES = [
  { id: 'sip',     label: 'SIP',        icon: '📅' },
  { id: 'lumpsum', label: 'Lumpsum',    icon: '💰' },
  { id: 'goal',    label: 'Goal-Based', icon: '🎯' },
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
        className="w-full h-1.5 rounded-full cursor-pointer appearance-none accent-indigo-500"
        style={{
          background: `linear-gradient(to right,#6366f1 ${pct}%,rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{display(min)}</span>
        <span>{display(max)}</span>
      </div>
    </div>
  )
}

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.dataKey}: {fmtINR(p.value)}
        </p>
      ))}
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

// ── Main export ───────────────────────────────────────────────────────────────

export default function SIPCalculator() {
  const [mode,     setMode]     = useState('sip')
  const [monthly,  setMonthly]  = useState(10000)
  const [lumpsum,  setLumpsum]  = useState(500000)
  const [target,   setTarget]   = useState(10000000)
  const [duration, setDuration] = useState(10)
  const [rate,     setRate]     = useState(12)

  const result = useMemo(() => {
    if (mode === 'sip')     return calcSIP(monthly, duration, rate)
    if (mode === 'lumpsum') return calcLumpsum(lumpsum, duration, rate)
    return calcGoal(target, duration, rate)
  }, [mode, monthly, lumpsum, target, duration, rate])

  const sipAmt    = mode === 'goal' ? result.monthly : monthly
  const isLumpsum = mode === 'lumpsum'

  const areaData = useMemo(
    () => buildAreaData(sipAmt, lumpsum, duration, rate, isLumpsum),
    [sipAmt, lumpsum, duration, rate, isLumpsum]
  )

  const donutData = [
    { name: 'Invested', value: result.invested, fill: DONUT_COLORS[0] },
    { name: 'Returns',  value: Math.max(0, result.returns), fill: DONUT_COLORS[1] },
  ]

  const comparison = useMemo(() => COMPARE_RATES.map(r => {
    if (mode === 'goal') {
      const g = calcGoal(target, duration, r)
      return { rate: r, monthly: g.monthly, invested: g.invested, corpus: target, returns: g.returns }
    }
    const res = mode === 'lumpsum' ? calcLumpsum(lumpsum, duration, r) : calcSIP(monthly, duration, r)
    return { rate: r, ...res }
  }), [mode, monthly, lumpsum, target, duration])

  const summaryCards = mode === 'goal'
    ? [
        { label: 'Monthly SIP Needed', value: fmtINR(result.monthly), color: 'text-indigo-300' },
        { label: 'Total Invested',     value: fmtINR(result.invested), color: 'text-gray-200'   },
        { label: 'Est. Returns',       value: fmtINR(result.returns),  color: 'text-cyan-300'   },
      ]
    : [
        { label: 'Total Invested', value: fmtINR(result.invested), color: 'text-gray-200'   },
        { label: 'Est. Returns',   value: fmtINR(result.returns),  color: 'text-cyan-300'   },
        { label: 'Total Corpus',   value: fmtINR(result.corpus),   color: 'text-indigo-300' },
      ]

  const SEO_TITLE = 'SIP Calculator — Free SIP & Mutual Fund Return Calculator India | AWE-OS'
  const SEO_DESC  = 'Calculate SIP returns, lumpsum growth and goal-based SIP for Indian mutual funds. Compare 8% 12% 15% 18% returns with interactive charts. Free online SIP calculator.'
  const SEO_URL   = 'https://www.awe-os.com/tools/sip-calculator'

  return (
    <>
      <Helmet>
        <title>{SEO_TITLE}</title>
        <meta name="description"        content={SEO_DESC} />
        <meta name="keywords"           content="sip calculator, sip return calculator india, mutual fund calculator, lumpsum calculator, goal sip calculator, monthly sip calculator" />
        <link rel="canonical"           href={SEO_URL} />
        <meta property="og:title"       content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESC} />
        <meta property="og:url"         content={SEO_URL} />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"       content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'WebApplication',
          name: 'SIP Calculator', url: SEO_URL,
          applicationCategory: 'FinanceApplication',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">

        {/* Breadcrumb */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-xs text-gray-400">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <span>/</span>
            <a href="/tools/calculators" className="hover:text-white transition-colors">Calculators</a>
            <span>/</span>
            <span className="text-gray-300">SIP Calculator</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

          {/* Hero */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs text-indigo-300 font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Indian Mutual Fund Calculator
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">SIP Calculator</h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Calculate SIP &amp; lumpsum returns, plan your goals, and discover top mutual funds — all in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['📅 SIP / Lumpsum / Goal', '📊 Visual Charts', '🔢 Lakhs & Crores', '📋 Rate Comparison'].map(f => (
                <span key={f} className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-1.5 max-w-sm mx-auto">
            {MODES.map(m => (
              <button
                key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl text-[10px] font-semibold transition-all ${
                  mode === m.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-lg mb-0.5">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Main grid: Inputs | Results ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Inputs */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-semibold text-white">
                {mode === 'sip' ? 'SIP Details' : mode === 'lumpsum' ? 'Lumpsum Details' : 'Goal Details'}
              </h2>

              {mode === 'sip' && (
                <RangeSlider
                  label="Monthly Investment" value={monthly}
                  min={500} max={200000} step={500}
                  onChange={setMonthly} display={fmtINR}
                />
              )}
              {mode === 'lumpsum' && (
                <RangeSlider
                  label="Lumpsum Amount" value={lumpsum}
                  min={10000} max={10000000} step={10000}
                  onChange={setLumpsum} display={fmtINR}
                />
              )}
              {mode === 'goal' && (
                <RangeSlider
                  label="Target Corpus" value={target}
                  min={500000} max={100000000} step={500000}
                  onChange={setTarget} display={fmtINR}
                />
              )}

              <RangeSlider
                label="Investment Duration" value={duration}
                min={1} max={40} step={1}
                onChange={setDuration}
                display={v => `${v} yr${v > 1 ? 's' : ''}`}
              />

              <RangeSlider
                label="Expected Return (p.a.)" value={rate}
                min={6} max={30} step={0.5}
                onChange={setRate}
                display={v => `${v}%`}
              />

              {/* Presets */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Quick presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {mode === 'sip' && [
                    ['5K · 5yr',   () => { setMonthly(5000);  setDuration(5)  }],
                    ['10K · 10yr', () => { setMonthly(10000); setDuration(10) }],
                    ['25K · 20yr', () => { setMonthly(25000); setDuration(20) }],
                  ].map(([lbl, fn]) => (
                    <button key={lbl} onClick={fn}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                      {lbl}
                    </button>
                  ))}
                  {mode === 'lumpsum' && [
                    ['1L · 5yr',   () => { setLumpsum(100000);  setDuration(5)  }],
                    ['5L · 10yr',  () => { setLumpsum(500000);  setDuration(10) }],
                    ['25L · 20yr', () => { setLumpsum(2500000); setDuration(20) }],
                  ].map(([lbl, fn]) => (
                    <button key={lbl} onClick={fn}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-colors">
                      {lbl}
                    </button>
                  ))}
                  {mode === 'goal' && [
                    ['50L in 10yr', () => { setTarget(5000000);  setDuration(10) }],
                    ['1Cr in 15yr', () => { setTarget(10000000); setDuration(15) }],
                    ['5Cr in 25yr', () => { setTarget(50000000); setDuration(25) }],
                  ].map(([lbl, fn]) => (
                    <button key={lbl} onClick={fn}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors">
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3 space-y-4">

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {summaryCards.map(c => (
                  <div key={c.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-gray-500 leading-tight mb-1">{c.label}</p>
                    <p className={`text-sm font-bold leading-tight ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Donut chart + legend */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-xs font-medium text-gray-400 mb-2">Invested vs Returns</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData} cx="50%" cy="50%"
                          innerRadius={50} outerRadius={72}
                          paddingAngle={2} dataKey="value"
                        >
                          {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<DonutTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4 shrink-0">
                    {donutData.map(d => (
                      <div key={d.name}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                          <span className="text-[10px] text-gray-400">{d.name}</span>
                        </div>
                        <p className="text-xs font-bold text-white pl-4">{fmtINR(d.value)}</p>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-white/60 shrink-0" />
                        <span className="text-[10px] text-gray-400">Total</span>
                      </div>
                      <p className="text-xs font-bold text-white pl-4">{fmtINR(result.corpus)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Area chart ── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4">
              Corpus Growth Over {duration} Year{duration > 1 ? 's' : ''}
            </h2>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gRet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="year" tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false} tickLine={false} interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false}
                    tickLine={false} tickFormatter={fmtAxis} width={48}
                  />
                  <Tooltip content={<AreaTip />} />
                  <Area type="monotone" dataKey="Invested" stroke="#6366f1" strokeWidth={2} fill="url(#gInv)" />
                  <Area type="monotone" dataKey="Returns"  stroke="#22d3ee" strokeWidth={2} fill="url(#gRet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-3">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-3 h-0.5 rounded bg-indigo-500" />Invested
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-3 h-0.5 rounded bg-cyan-400" />Returns
              </span>
            </div>
          </div>

          {/* ── Comparison table ── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4">
              Return Comparison &nbsp;·&nbsp; {duration} Year{duration > 1 ? 's' : ''}
              {mode !== 'goal' && (
                <span className="text-gray-400 font-normal text-xs ml-1">
                  at {mode === 'sip' ? `${fmtINR(monthly)}/mo` : `${fmtINR(lumpsum)} lumpsum`}
                </span>
              )}
            </h2>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left pb-2.5 text-gray-400 font-medium">Rate</th>
                    {mode === 'goal' ? (
                      <>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Monthly SIP Needed</th>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Total Invested</th>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Target Corpus</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Invested</th>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Returns</th>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Total Corpus</th>
                        <th className="text-right pb-2.5 text-gray-400 font-medium">Gain</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => {
                    const active = row.rate === rate
                    const gainPct = row.invested > 0 ? ((row.corpus / row.invested - 1) * 100).toFixed(0) : 0
                    return (
                      <tr
                        key={row.rate}
                        className={`border-b border-white/5 ${active ? 'bg-indigo-500/10' : i % 2 === 0 ? 'bg-white/[0.015]' : ''}`}
                      >
                        <td className={`py-2.5 font-bold ${active ? 'text-indigo-300' : 'text-gray-300'}`}>
                          {row.rate}%
                          {active && (
                            <span className="ml-1.5 text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full">
                              selected
                            </span>
                          )}
                        </td>
                        {mode === 'goal' ? (
                          <>
                            <td className="py-2.5 text-right font-semibold text-indigo-300">{fmtINR(row.monthly)}</td>
                            <td className="py-2.5 text-right text-gray-400">{fmtINR(row.invested)}</td>
                            <td className="py-2.5 text-right font-semibold text-white">{fmtINR(row.corpus)}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 text-right text-gray-400">{fmtINR(row.invested)}</td>
                            <td className="py-2.5 text-right text-cyan-400">{fmtINR(row.returns)}</td>
                            <td className="py-2.5 text-right font-semibold text-white">{fmtINR(row.corpus)}</td>
                            <td className="py-2.5 text-right text-emerald-400">{gainPct}%</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Top mutual funds ── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Top Mutual Funds to Start SIP</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Historical returns only &mdash; past performance is not indicative of future results
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href="https://groww.in/mutual-funds"
                  target="_blank" rel="nofollow sponsored noopener noreferrer"
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500/20 transition-colors font-semibold"
                >
                  Invest via Groww &#8599;
                </a>
                <a
                  href="https://coin.zerodha.com"
                  target="_blank" rel="nofollow sponsored noopener noreferrer"
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors font-semibold"
                >
                  Zerodha Coin &#8599;
                </a>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left pb-2.5 text-gray-400 font-medium">Fund</th>
                    <th className="text-center pb-2.5 text-gray-400 font-medium">Type</th>
                    <th className="text-right pb-2.5 text-gray-400 font-medium">1Y</th>
                    <th className="text-right pb-2.5 text-gray-400 font-medium">3Y</th>
                    <th className="text-right pb-2.5 text-gray-400 font-medium">5Y</th>
                    <th className="text-center pb-2.5 text-gray-400 font-medium">Risk</th>
                    <th className="text-center pb-2.5 text-gray-400 font-medium">Invest</th>
                  </tr>
                </thead>
                <tbody>
                  {FUNDS.map((f, i) => (
                    <tr key={f.name} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.015]' : ''}`}>
                      <td className="py-2.5 text-gray-200 font-medium max-w-[180px]">
                        <span className="block truncate">{f.name}</span>
                      </td>
                      <td className="py-2.5 text-center text-gray-400 whitespace-nowrap">{f.cat}</td>
                      <td className="py-2.5 text-right text-emerald-400 font-semibold">{f.ret1y}%</td>
                      <td className="py-2.5 text-right text-emerald-400 font-semibold">{f.ret3y}%</td>
                      <td className="py-2.5 text-right text-emerald-400 font-semibold">{f.ret5y}%</td>
                      <td className="py-2.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap ${RISK_STYLE[f.risk] || ''}`}>
                          {f.risk}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex justify-center gap-1">
                          <a href={f.groww}   target="_blank" rel="nofollow sponsored noopener noreferrer"
                            className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors whitespace-nowrap">
                            Groww
                          </a>
                          <a href={f.zerodha} target="_blank" rel="nofollow sponsored noopener noreferrer"
                            className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors whitespace-nowrap">
                            Zerodha
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4">
            <p className="text-xs text-yellow-300/80 text-center leading-relaxed">
              <span className="font-semibold">Disclaimer:</span> Returns shown are illustrative and based on assumed constant
              rates of return. Mutual fund investments are subject to market risks. Read all scheme-related documents carefully
              before investing. This calculator does not constitute financial advice &mdash; consult a SEBI-registered investment advisor.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
