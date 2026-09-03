import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'
import { TOOL_ABOUT } from '../../data/toolPageContent'

// ── CBDT Cost Inflation Index (CII) — official published values, base FY 2001-02 = 100 ──
// Source: CBDT notifications under Section 48, Explanation (v). Used only for the
// Real Estate "old method" reference comparison — the applicable LTCG rate since
// Budget 2024 is 12.5% without indexation regardless of this table.
const CII_TABLE = {
  '2001-02': 100, '2002-03': 105, '2003-04': 109, '2004-05': 113, '2005-06': 117,
  '2006-07': 122, '2007-08': 129, '2008-09': 137, '2009-10': 148, '2010-11': 167,
  '2011-12': 184, '2012-13': 200, '2013-14': 220, '2014-15': 240, '2015-16': 254,
  '2016-17': 264, '2017-18': 272, '2018-19': 280, '2019-20': 289, '2020-21': 301,
  '2021-22': 317, '2022-23': 331, '2023-24': 348, '2024-25': 363,
}
const CII_YEARS = Object.keys(CII_TABLE).sort()
const CII_EARLIEST = CII_YEARS[0]
const CII_LATEST   = CII_YEARS[CII_YEARS.length - 1]

function getFY(dateObj) {
  const y = dateObj.getFullYear()
  const m = dateObj.getMonth() // 0-indexed; April = 3
  const fyStart = m >= 3 ? y : y - 1
  return `${fyStart}-${String((fyStart + 1) % 100).padStart(2, '0')}`
}

function ciiFor(fy) {
  if (CII_TABLE[fy] != null) return { value: CII_TABLE[fy], clamped: false }
  if (fy < CII_EARLIEST) return { value: CII_TABLE[CII_EARLIEST], clamped: true }
  return { value: CII_TABLE[CII_LATEST], clamped: true }
}

function monthsBetween(buy, sell) {
  let months = (sell.getFullYear() - buy.getFullYear()) * 12 + (sell.getMonth() - buy.getMonth())
  if (sell.getDate() < buy.getDate()) months--
  return Math.max(0, months)
}

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.round(n * 100) / 100)
}

function holdingLabel(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`
  return `${y} year${y !== 1 ? 's' : ''} ${m} month${m !== 1 ? 's' : ''}`
}

const ASSET_TYPES = [
  { id: 'equity',     label: 'Equity / Stocks' },
  { id: 'debt',       label: 'Debt Mutual Funds' },
  { id: 'realestate', label: 'Real Estate' },
  { id: 'gold',       label: 'Gold / Other' },
]

// ── Result block for a fixed-rate LTCG/STCG asset (equity, real estate, gold) ──
function computeFixedRateResult({ totalCost, totalSell, buyDate, sellDate, ltThresholdMonths, exemption = 0 }) {
  const months = monthsBetween(buyDate, sellDate)
  const isLongTerm = months > ltThresholdMonths
  const gain = totalSell - totalCost
  const taxableGain = isLongTerm ? Math.max(0, gain - exemption) : Math.max(0, gain)
  const ltcgRate = 0.125
  const stcgRate = 0.20 // flat rate applies only to equity; real estate/gold STCG is at slab (handled by caller)
  return { months, isLongTerm, gain, taxableGain, ltcgRate, stcgRate }
}

function InputField({ id, label, value, onChange, type = 'number', placeholder, min = '0', step = '0.01' }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={id} type={type} value={value} min={type === 'number' ? min : undefined}
        step={type === 'number' ? step : undefined}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function ResultRow({ label, value, accent }) {
  return (
    <div className={`flex justify-between items-center py-2 ${accent ? 'border-t border-gray-200 mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${accent ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`font-mono text-sm ${accent ? 'font-bold text-blue-700 text-base' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

// ── Equity ────────────────────────────────────────────────────────────────────
function EquityForm() {
  const [buyPrice, setBuyPrice]   = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [qty, setQty]             = useState('')
  const [buyDate, setBuyDate]     = useState('')
  const [sellDate, setSellDate]   = useState('')

  const result = useMemo(() => {
    const bp = parseFloat(buyPrice), sp = parseFloat(sellPrice), q = parseFloat(qty)
    if (!bp || !sp || !q || !buyDate || !sellDate) return null
    const buy = new Date(buyDate), sell = new Date(sellDate)
    if (sell < buy) return null
    const totalCost = bp * q, totalSell = sp * q
    const r = computeFixedRateResult({ totalCost, totalSell, buyDate: buy, sellDate: sell, ltThresholdMonths: 12, exemption: 125000 })
    const tax = r.gain <= 0 ? 0 : (r.isLongTerm ? r.taxableGain * r.ltcgRate : r.gain * r.stcgRate)
    const netProfit = r.gain - tax
    const effectiveRate = r.gain > 0 ? (tax / r.gain) * 100 : 0
    return { ...r, tax, netProfit, effectiveRate }
  }, [buyPrice, sellPrice, qty, buyDate, sellDate])

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-eq-buy" label="Buy Price (₹/share)" value={buyPrice} onChange={setBuyPrice} placeholder="e.g. 1200" />
        <InputField id="cg-eq-sell" label="Sell Price (₹/share)" value={sellPrice} onChange={setSellPrice} placeholder="e.g. 1800" />
      </div>
      <InputField id="cg-eq-qty" label="Quantity" value={qty} onChange={setQty} step="1" placeholder="e.g. 100" />
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-eq-buydate" label="Buy Date" type="date" value={buyDate} onChange={setBuyDate} />
        <InputField id="cg-eq-selldate" label="Sell Date" type="date" value={sellDate} onChange={setSellDate} />
      </div>
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-1">
          <ResultRow label="Holding Period" value={holdingLabel(result.months)} />
          <ResultRow label="Classification" value={result.isLongTerm ? 'LTCG (>12 months)' : 'STCG (≤12 months)'} />
          <ResultRow label={result.isLongTerm ? 'Taxable Gain (after ₹1.25L exemption)' : 'Taxable Gain'} value={`₹${fmt(result.taxableGain)}`} />
          <ResultRow label={`Tax Amount (${result.isLongTerm ? '12.5% LTCG' : '20% STCG'})`} value={`₹${fmt(result.tax)}`} />
          <ResultRow label="Effective Tax Rate" value={`${result.effectiveRate.toFixed(2)}%`} />
          <ResultRow label="Net Profit After Tax" value={`₹${fmt(result.netProfit)}`} accent />
        </div>
      )}
    </>
  )
}

// ── Debt Mutual Funds ─────────────────────────────────────────────────────────
function DebtForm() {
  const [buyNav, setBuyNav]   = useState('')
  const [sellNav, setSellNav] = useState('')
  const [units, setUnits]     = useState('')
  const [buyDate, setBuyDate] = useState('')
  const [sellDate, setSellDate] = useState('')

  const result = useMemo(() => {
    const bn = parseFloat(buyNav), sn = parseFloat(sellNav), u = parseFloat(units)
    if (!bn || !sn || !u || !buyDate || !sellDate) return null
    const buy = new Date(buyDate), sell = new Date(sellDate)
    if (sell < buy) return null
    const totalCost = bn * u, totalSell = sn * u
    const gain = totalSell - totalCost
    const months = monthsBetween(buy, sell)
    return { months, gain, taxableGain: Math.max(0, gain) }
  }, [buyNav, sellNav, units, buyDate, sellDate])

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-debt-buynav" label="Buy NAV (₹)" value={buyNav} onChange={setBuyNav} placeholder="e.g. 42.50" />
        <InputField id="cg-debt-sellnav" label="Sell NAV (₹)" value={sellNav} onChange={setSellNav} placeholder="e.g. 46.80" />
      </div>
      <InputField id="cg-debt-units" label="Units" value={units} onChange={setUnits} placeholder="e.g. 1000" />
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-debt-buydate" label="Buy Date" type="date" value={buyDate} onChange={setBuyDate} />
        <InputField id="cg-debt-selldate" label="Sell Date" type="date" value={sellDate} onChange={setSellDate} />
      </div>
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-1">
          <ResultRow label="Holding Period" value={holdingLabel(result.months)} />
          <ResultRow label="Classification" value="Taxed at slab rate (no LTCG/STCG distinction)" />
          <ResultRow label="Taxable Gain" value={`₹${fmt(result.taxableGain)}`} accent />
          <ResultRow label="Tax Amount" value="Depends on your income tax slab" />
          <p className="text-xs text-gray-400 pt-1">
            For debt mutual fund units acquired on or after 1 April 2023, all gains are taxed at your income tax slab
            rate with no indexation benefit and no separate long-term rate — regardless of holding period.
          </p>
        </div>
      )}
    </>
  )
}

// ── Real Estate ───────────────────────────────────────────────────────────────
function RealEstateForm() {
  const [buyPrice, setBuyPrice]   = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [stampDuty, setStampDuty] = useState('')
  const [buyDate, setBuyDate]     = useState('')
  const [sellDate, setSellDate]   = useState('')

  const result = useMemo(() => {
    const bp = parseFloat(buyPrice), sp = parseFloat(sellPrice), sd = parseFloat(stampDuty) || 0
    if (!bp || !sp || !buyDate || !sellDate) return null
    const buy = new Date(buyDate), sell = new Date(sellDate)
    if (sell < buy) return null
    const totalCost = bp + sd
    const months = monthsBetween(buy, sell)
    const isLongTerm = months > 24
    const gain = sp - totalCost
    const taxableGainNew = Math.max(0, gain)
    const taxNew = isLongTerm && gain > 0 ? gain * 0.125 : 0

    let indexed = null
    if (isLongTerm) {
      const buyFY = getFY(buy), sellFY = getFY(sell)
      const ciiBuy = ciiFor(buyFY), ciiSell = ciiFor(sellFY)
      const indexedCost = totalCost * (ciiSell.value / ciiBuy.value)
      const indexedGain = sp - indexedCost
      const indexedTax = indexedGain > 0 ? indexedGain * 0.20 : 0
      indexed = { buyFY, sellFY, ciiBuy, ciiSell, indexedCost, indexedGain, indexedTax }
    }

    return { months, isLongTerm, gain, taxableGainNew, taxNew, indexed }
  }, [buyPrice, sellPrice, stampDuty, buyDate, sellDate])

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-re-buy" label="Buy Price (₹)" value={buyPrice} onChange={setBuyPrice} placeholder="e.g. 5000000" />
        <InputField id="cg-re-sell" label="Sell Price (₹)" value={sellPrice} onChange={setSellPrice} placeholder="e.g. 8500000" />
      </div>
      <InputField id="cg-re-stamp" label="Stamp Duty & Registration (₹)" value={stampDuty} onChange={setStampDuty} placeholder="e.g. 350000" />
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-re-buydate" label="Buy Date" type="date" value={buyDate} onChange={setBuyDate} />
        <InputField id="cg-re-selldate" label="Sell Date" type="date" value={sellDate} onChange={setSellDate} />
      </div>
      {result && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-1">
            <ResultRow label="Holding Period" value={holdingLabel(result.months)} />
            <ResultRow label="Classification" value={result.isLongTerm ? 'LTCG (>24 months)' : 'STCG (≤24 months)'} />
            <ResultRow label="Taxable Gain (new method)" value={`₹${fmt(result.taxableGainNew)}`} />
            <ResultRow
              label={result.isLongTerm ? 'Tax Amount (12.5% LTCG, no indexation)' : 'Tax Amount'}
              value={result.isLongTerm ? `₹${fmt(result.taxNew)}` : 'Depends on your income tax slab'}
            />
            {result.isLongTerm && (
              <>
                <ResultRow label="Effective Tax Rate" value={`${result.gain > 0 ? ((result.taxNew / result.gain) * 100).toFixed(2) : '0.00'}%`} />
                <ResultRow label="Net Profit After Tax" value={`₹${fmt(result.gain - result.taxNew)}`} accent />
              </>
            )}
          </div>

          {result.indexed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-1">
              <p className="text-xs font-semibold text-amber-800 mb-2">
                Indexed Cost — old method, reference only (Budget 2024 replaced this with the 12.5% flat rate above)
              </p>
              <ResultRow label={`Purchase FY ${result.indexed.buyFY} CII${result.indexed.ciiBuy.clamped ? ' (clamped)' : ''}`} value={result.indexed.ciiBuy.value} />
              <ResultRow label={`Sale FY ${result.indexed.sellFY} CII${result.indexed.ciiSell.clamped ? ' (clamped)' : ''}`} value={result.indexed.ciiSell.value} />
              <ResultRow label="Indexed Cost" value={`₹${fmt(result.indexed.indexedCost)}`} />
              <ResultRow label="Indexed LTCG" value={`₹${fmt(Math.max(0, result.indexed.indexedGain))}`} />
              <ResultRow label="Indexed Tax (20%, old rate)" value={`₹${fmt(result.indexed.indexedTax)}`} />
              {(result.indexed.ciiBuy.clamped || result.indexed.ciiSell.clamped) && (
                <p className="text-[11px] text-amber-700 pt-1">
                  One of your dates falls outside the published CII range ({CII_EARLIEST} to {CII_LATEST}) — the nearest
                  published year's index was used for this reference figure.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Gold ──────────────────────────────────────────────────────────────────────
function GoldForm() {
  const [buyPrice, setBuyPrice]   = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [weight, setWeight]       = useState('')
  const [buyDate, setBuyDate]     = useState('')
  const [sellDate, setSellDate]   = useState('')

  const result = useMemo(() => {
    const bp = parseFloat(buyPrice), sp = parseFloat(sellPrice), w = parseFloat(weight)
    if (!bp || !sp || !w || !buyDate || !sellDate) return null
    const buy = new Date(buyDate), sell = new Date(sellDate)
    if (sell < buy) return null
    const totalCost = bp * w, totalSell = sp * w
    const months = monthsBetween(buy, sell)
    const isLongTerm = months > 24
    const gain = totalSell - totalCost
    const taxableGain = Math.max(0, gain)
    const tax = isLongTerm && gain > 0 ? gain * 0.125 : 0
    const effectiveRate = isLongTerm && gain > 0 ? (tax / gain) * 100 : 0
    return { months, isLongTerm, gain, taxableGain, tax, effectiveRate }
  }, [buyPrice, sellPrice, weight, buyDate, sellDate])

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-gold-buy" label="Buy Price (₹/gram)" value={buyPrice} onChange={setBuyPrice} placeholder="e.g. 6200" />
        <InputField id="cg-gold-sell" label="Sell Price (₹/gram)" value={sellPrice} onChange={setSellPrice} placeholder="e.g. 7400" />
      </div>
      <InputField id="cg-gold-weight" label="Weight (grams)" value={weight} onChange={setWeight} placeholder="e.g. 20" />
      <div className="grid grid-cols-2 gap-3">
        <InputField id="cg-gold-buydate" label="Buy Date" type="date" value={buyDate} onChange={setBuyDate} />
        <InputField id="cg-gold-selldate" label="Sell Date" type="date" value={sellDate} onChange={setSellDate} />
      </div>
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-1">
          <ResultRow label="Holding Period" value={holdingLabel(result.months)} />
          <ResultRow label="Classification" value={result.isLongTerm ? 'LTCG (>24 months)' : 'STCG (≤24 months)'} />
          <ResultRow label="Taxable Gain" value={`₹${fmt(result.taxableGain)}`} />
          <ResultRow
            label={result.isLongTerm ? 'Tax Amount (12.5% LTCG)' : 'Tax Amount'}
            value={result.isLongTerm ? `₹${fmt(result.tax)}` : 'Depends on your income tax slab'}
          />
          {result.isLongTerm && (
            <>
              <ResultRow label="Effective Tax Rate" value={`${result.effectiveRate.toFixed(2)}%`} />
              <ResultRow label="Net Profit After Tax" value={`₹${fmt(result.gain - result.tax)}`} accent />
            </>
          )}
        </div>
      )}
    </>
  )
}

function CapitalGainsTool() {
  const [assetType, setAssetType] = useState('equity')

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl overflow-hidden border border-gray-200">
        {ASSET_TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => setAssetType(t.id)}
            className={`py-2.5 px-1 text-xs sm:text-sm font-semibold transition-colors ${assetType === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        {assetType === 'equity' && <EquityForm />}
        {assetType === 'debt' && <DebtForm />}
        {assetType === 'realestate' && <RealEstateForm />}
        {assetType === 'gold' && <GoldForm />}
      </div>
    </div>
  )
}

// ── Static page content ────────────────────────────────────────────────────────

const STEPS = [
  "Select your Asset Type — Equity/Stocks/Equity Mutual Funds, Debt Mutual Funds/Bonds, Real Estate/Property, or Gold/Other Assets. Each asset type has a different holding-period threshold and tax rate under Indian capital gains rules.",
  "Enter the buy and sell details for your asset — price and quantity for equity and gold, NAV and units for debt funds, or total price plus stamp duty/registration for real estate — along with the exact Buy Date and Sell Date.",
  "The tool automatically computes your Holding Period from the two dates and classifies the gain as Short-Term (STCG) or Long-Term (LTCG) based on the threshold for that asset type: 12 months for equity, 24 months for real estate and gold, and no distinction for debt funds (taxed at slab regardless of holding period).",
  "Review the Taxable Gain, Tax Amount (where a fixed LTCG/STCG rate applies), Effective Tax Rate, and Net Profit After Tax. For Real Estate held long-term, an additional reference block shows the pre-Budget-2024 indexed-cost method using the real CBDT Cost Inflation Index, purely for comparison against the current 12.5% no-indexation rate.",
  "Read the prominent disclaimer below the results — capital gains rules change with each Union Budget, and this calculator reflects Finance Act 2024 rates only. Always confirm with a Chartered Accountant before filing or making a sale decision based on these figures.",
]

const FAQS = [
  {
    q: 'What are the current LTCG and STCG rates for equity shares and equity mutual funds?',
    a: 'Under the Finance Act 2024 (effective for transfers on or after 23 July 2024), Short-Term Capital Gains (STCG) on equity shares and equity mutual funds held for 12 months or less are taxed at a flat 20%. Long-Term Capital Gains (LTCG) on equity held for more than 12 months are taxed at 12.5%, but only on the gain amount exceeding ₹1.25 lakh in a financial year — the first ₹1.25 lakh of LTCG from equity is exempt.',
  },
  {
    q: 'Why doesn’t the Real Estate LTCG calculation use indexation anymore?',
    a: 'Budget 2024 removed the indexation benefit for real estate (and most other non-equity long-term assets) transferred on or after 23 July 2024, replacing the earlier 20%-with-indexation regime with a flat 12.5% rate without indexation. This calculator applies the new 12.5% rate as the actual applicable tax, and shows the old indexed-cost calculation only as a side-by-side historical reference so you can see how the rule change affects your specific numbers.',
  },
  {
    q: 'How is the Cost Inflation Index (CII) used in the reference calculation?',
    a: 'The CII, published annually by the CBDT with base year 2001-02 = 100, scales up your original purchase cost to account for inflation between the year of purchase and the year of sale: Indexed Cost = Purchase Cost × (CII of sale year ÷ CII of purchase year). This calculator uses the actual published CII values (2001-02 through 2024-25) for the reference figure only — the applicable tax under current law does not use indexation for assets sold after 23 July 2024.',
  },
  {
    q: 'Why are Debt Mutual Funds always taxed at my income tax slab rate?',
    a: 'For debt mutual fund units acquired on or after 1 April 2023, the Finance Act 2023 removed the concept of long-term capital gains treatment entirely — regardless of how long you hold the units, the entire gain is added to your income and taxed at your applicable income tax slab rate, with no indexation benefit. This is why the calculator does not show a separate STCG/LTCG split or a fixed tax rate for debt funds.',
  },
  {
    q: 'Does this calculator account for exemptions like Section 54 or Section 54EC on property sale?',
    a: 'No. This calculator computes the capital gains tax on the transaction itself only. It does not model reinvestment-based exemptions such as Section 54 (buying another residential house), Section 54EC (investing in specified capital gains bonds within 6 months), or Section 54F. If you plan to claim any of these exemptions, calculate your gain here first, then apply the relevant exemption separately or consult a CA — these exemptions can substantially reduce your actual tax liability.',
  },
]

// about.howToUse/about.faqs dropped — STEPS/FAQS above are the single rendered source for those sections
const { howToUse: _aboutHowToUse, faqs: _aboutFaqs, ...ABOUT } = TOOL_ABOUT['capital-gains-calculator']

export default function CapitalGainsCalculator() {
  return (
    <ToolPageShell
      slug="capital-gains-calculator"
      ymyl
      name="Capital Gains Calculator"
      description="Calculate capital gains tax on equity, debt mutual funds, real estate, and gold — FY 2025-26 rates per the Finance Act 2024, with STCG/LTCG classification and effective tax rate."
      icon="📈"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Tax laws change frequently. This calculator reflects Finance Act 2024 rates. Consult a CA for your specific situation."}
    >
      <CapitalGainsTool />
    </ToolPageShell>
  )
}
