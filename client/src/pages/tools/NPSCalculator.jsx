import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'
import { TOOL_ABOUT } from '../../data/toolPageContent'
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtINR(n) {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const DONUT_COLORS = ['#3b82f6', '#22d3ee']

// ── Calculation core ──────────────────────────────────────────────────────────

const RETIREMENT_AGE = 60

function calcNPS(monthly, currentAge, returnRate, annuityRate, annuityReturnRate) {
  const years = Math.max(1, RETIREMENT_AGE - currentAge)
  const r = returnRate / 100 / 12
  const n = years * 12
  const corpus = r === 0 ? monthly * n : monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r))
  const lumpSum = corpus * (1 - annuityRate / 100)
  const annuityPortion = corpus * (annuityRate / 100)
  const monthlyPension = (annuityPortion * (annuityReturnRate / 100)) / 12
  const totalInvested = monthly * 12 * years
  const wealthGained = corpus - totalInvested
  return { years, corpus, lumpSum, annuityPortion, monthlyPension, totalInvested, wealthGained }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RangeSlider({ label, value, min, max, step, onChange, display, note }) {
  const pct = ((value - min) / (max - min)) * 100
  const id = `nps-slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-gray-400">{label}</label>
        <span className="text-sm font-bold text-white">{display(value)}</span>
      </div>
      <input
        id={id}
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer appearance-none accent-blue-500"
        style={{ background: `linear-gradient(to right,#3b82f6 ${pct}%,rgba(255,255,255,0.1) ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{display(min)}</span>
        <span>{display(max)}</span>
      </div>
      {note && <p className="text-[10px] text-gray-500">{note}</p>}
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

// ── NPS tool UI ────────────────────────────────────────────────────────────────

function NPSTool() {
  const [currentAge, setCurrentAge]     = useState(30)
  const [monthly, setMonthly]           = useState(5000)
  const [returnRate, setReturnRate]     = useState(10)
  const [annuityRate, setAnnuityRate]   = useState(40)
  const [annuityReturn, setAnnuityReturn] = useState(6)

  const result = useMemo(
    () => calcNPS(monthly, currentAge, returnRate, annuityRate, annuityReturn),
    [monthly, currentAge, returnRate, annuityRate, annuityReturn]
  )

  const donutData = [
    { name: 'Lump Sum (tax-free)', value: Math.max(0, result.lumpSum), fill: DONUT_COLORS[0] },
    { name: 'Annuity Portion',     value: Math.max(0, result.annuityPortion), fill: DONUT_COLORS[1] },
  ]

  const summaryCards = [
    { label: 'Total Corpus at 60',  value: fmtINR(result.corpus),       color: 'text-blue-300' },
    { label: 'Lump Sum Withdrawal', value: fmtINR(result.lumpSum),      color: 'text-cyan-300' },
    { label: 'Monthly Pension',     value: fmtINR(result.monthlyPension), color: 'text-emerald-300' },
    { label: 'Total Invested',      value: fmtINR(result.totalInvested), color: 'text-gray-200' },
    { label: 'Wealth Gained',       value: fmtINR(result.wealthGained), color: 'text-indigo-300' },
  ]

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['🧓 Retirement Corpus', '📊 Lump Sum vs Annuity', '💰 Monthly Pension', '🔢 Lakhs & Crores'].map(f => (
            <span key={f} className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full">{f}</span>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Inputs */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-white">NPS Details</h2>

            <RangeSlider
              label="Current Age" value={currentAge}
              min={18} max={60} step={1}
              onChange={setCurrentAge} display={v => `${v} yrs`}
              note={`Retirement Age: ${RETIREMENT_AGE} (fixed, per PFRDA rules) · Investment period: ${result.years} yr${result.years > 1 ? 's' : ''}`}
            />

            <div className="space-y-1.5">
              <label htmlFor="nps-monthly" className="block text-xs font-medium text-gray-400">Monthly Contribution (₹)</label>
              <input
                id="nps-monthly" type="number" min="500" step="500" value={monthly}
                onChange={e => setMonthly(Math.max(0, Number(e.target.value)))}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <RangeSlider
              label="Expected Return Rate" value={returnRate}
              min={8} max={14} step={0.5}
              onChange={setReturnRate}
              display={v => `${v.toFixed(1)}%`}
            />

            <RangeSlider
              label="Annuity Rate" value={annuityRate}
              min={40} max={100} step={5}
              onChange={setAnnuityRate}
              display={v => `${v}%`}
              note="PFRDA minimum: 40% of corpus must go into the annuity"
            />

            <RangeSlider
              label="Annuity Return Rate" value={annuityReturn}
              min={5} max={9} step={0.25}
              onChange={setAnnuityReturn}
              display={v => `${v.toFixed(2)}%`}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {summaryCards.map(c => (
                <div key={c.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-500 leading-tight mb-1">{c.label}</p>
                  <p className={`text-xs sm:text-sm font-bold leading-tight ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Donut chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs font-medium text-gray-400 mb-2">Lump Sum vs Annuity Split</p>
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
                      <span className="text-[10px] text-gray-400">Total Corpus</span>
                    </div>
                    <p className="text-xs font-bold text-white pl-4">{fmtINR(result.corpus)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
              {[
                'Minimum 40% must be used for annuity (PFRDA rule).',
                '60% lump sum withdrawal is tax-free.',
                'Returns are estimated, actual may vary.',
              ].map(note => (
                <p key={note} className="text-[11px] text-gray-400 flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">•</span>
                  {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Static page content ────────────────────────────────────────────────────────

const STEPS = [
  "Set your Current Age using the slider (18–60). Retirement age is fixed at 60 per PFRDA rules — the tool shows your investment period (retirement age minus current age) automatically.",
  "Enter your Monthly Contribution — the amount you invest in your NPS Tier-I account each month. This can be changed at any time; the calculator recomputes your projected corpus instantly.",
  "Adjust the Expected Return Rate slider (8–14%) based on your NPS fund's equity/debt/government-securities allocation — equity-heavy allocations historically trend toward the higher end, government-securities-heavy allocations toward the lower end.",
  "Set the Annuity Rate (minimum 40% per PFRDA rule) and the Annuity Return Rate (5–9%, the rate insurers currently offer on NPS annuity plans) to see how your corpus splits between a tax-free lump sum and a monthly pension.",
  "Review the 5 summary cards — Total Corpus, Lump Sum Withdrawal, Monthly Pension, Total Invested, and Wealth Gained — plus the donut chart showing exactly how your retirement corpus divides between lump sum and annuity.",
]

const FAQS = [
  {
    q: 'What percentage of my NPS corpus can I withdraw as a lump sum at retirement?',
    a: 'Under current PFRDA rules, you can withdraw up to 60% of your accumulated NPS corpus as a lump sum at retirement (age 60), and this 60% withdrawal is entirely tax-free. The remaining minimum 40% must compulsorily be used to purchase an annuity plan from a PFRDA-empanelled insurance company, which then pays you a monthly pension for life.',
  },
  {
    q: 'Is the monthly pension from my NPS annuity taxable?',
    a: 'Yes. Unlike the 60% lump-sum withdrawal (which is tax-free), the monthly annuity/pension income you receive from your NPS annuity plan is fully taxable in the year of receipt, added to your other income and taxed at your applicable income tax slab rate.',
  },
  {
    q: 'Can I choose to put more than 40% of my corpus into the annuity?',
    a: 'Yes. 40% is only the PFRDA-mandated minimum — you can voluntarily allocate a higher percentage (up to 100%) toward the annuity if you want a larger guaranteed monthly pension instead of a larger tax-free lump sum. This calculator lets you set the annuity rate anywhere from 40% to 100% to model both scenarios.',
  },
  {
    q: 'How accurate are the expected return and annuity return assumptions in this calculator?',
    a: 'Both are estimates you control via the sliders, not guaranteed figures. NPS returns depend on your chosen fund manager and asset allocation (equity, corporate bonds, government securities) and fluctuate with market conditions over your entire investment period. Annuity rates are set by the insurance company you choose at retirement and change over time based on prevailing interest rates. Use the sliders to model conservative and optimistic scenarios rather than relying on a single number.',
  },
  {
    q: 'What is the difference between NPS Tier-I and Tier-II accounts?',
    a: 'This calculator models a Tier-I account — the primary retirement account with tax benefits under Section 80CCD, mandatory annuitization of the minimum 40% at retirement, and restricted withdrawal before age 60. Tier-II is a voluntary, savings-account-like add-on to Tier-I with no lock-in and no compulsory annuitization, but with no tax benefits either. Tier-II corpus is not subject to the lump-sum/annuity split this calculator computes.',
  },
]

const ABOUT = TOOL_ABOUT['nps-calculator']

export default function NPSCalculator() {
  return (
    <ToolPageShell
      slug="nps-calculator"
      name="NPS Calculator"
      description="Calculate your National Pension System (NPS) retirement corpus, tax-free lump sum, and monthly pension based on your contribution and expected returns."
      icon="🧓"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Expected return, annuity rate, and annuity return rate are user-adjustable estimates, not guarantees — actual NPS fund performance and insurer annuity rates at retirement will differ from any single projection."}
    >
      <NPSTool />
    </ToolPageShell>
  )
}
