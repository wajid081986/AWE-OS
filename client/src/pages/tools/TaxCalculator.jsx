import { useState } from 'react'
import ToolPageShell   from './ToolPageShell'
import TaxForm         from '../../components/tools/tax/TaxForm'
import TaxSummaryCards from '../../components/tools/tax/TaxSummaryCards'
import TaxDonutChart   from '../../components/tools/tax/TaxDonutChart'
import TaxBreakdownTable from '../../components/tools/tax/TaxBreakdownTable'
import RegimeComparison  from '../../components/tools/tax/RegimeComparison'
import { calculateIndiaTax } from '../../utils/indiaTaxEngine'
import { calculateUSTax }    from '../../utils/usTaxEngine'

// ── Core tool ─────────────────────────────────────────────────────────────────
function TaxTool() {
  const [country,      setCountry]      = useState('india')
  const [income,       setIncome]       = useState('')
  const [ageGroup,     setAgeGroup]     = useState('below60')
  const [regime,       setRegime]       = useState('new')
  const [filingStatus, setFilingStatus] = useState('single')
  const [result,       setResult]       = useState(null)

  const calculate = () => {
    const gross = parseFloat(String(income).replace(/,/g, ''))
    if (!gross || gross <= 0) return

    if (country === 'india') {
      const data = calculateIndiaTax({ grossIncome: gross, regime, ageGroup })
      setResult({ country: 'india', regime, ageGroup, data })
    } else {
      const data = calculateUSTax({ grossIncome: gross, filingStatus })
      setResult({ country: 'us', filingStatus, data })
    }
  }

  const reset = () => {
    setIncome('')
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${result ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
        {/* ── Left: form ── */}
        <TaxForm
          country={country}           setCountry={setCountry}
          income={income}             setIncome={setIncome}
          ageGroup={ageGroup}         setAgeGroup={setAgeGroup}
          regime={regime}             setRegime={setRegime}
          filingStatus={filingStatus} setFilingStatus={setFilingStatus}
          onCalculate={calculate}
          onReset={reset}
        />

        {/* ── Right: results ── */}
        {result && (
          <div className="space-y-4">
            <TaxSummaryCards result={result} />
            <TaxDonutChart   result={result} />
          </div>
        )}
      </div>

      {/* ── Full-width: breakdown + comparison ── */}
      {result && (
        <>
          <TaxBreakdownTable result={result} />
          {result.country === 'india' && (
            <RegimeComparison
              grossIncome={result.data.grossIncome}
              ageGroup={result.ageGroup}
              selectedRegime={result.regime}
            />
          )}
        </>
      )}
    </div>
  )
}

// ── SEO content ───────────────────────────────────────────────────────────────
const ABOUT = [
  'Tax planning is one of the most impactful financial decisions you can make every year, yet most people either overpay through ignorance or underpay due to guesswork. The AWE-OS Tax Calculator gives you an instant, accurate breakdown of your income tax liability for India (Old and New Regime, FY 2024-25) and the United States (2024 Federal Tax), completely free and with no sign-up required.',
  'For Indian taxpayers, the tool applies the correct slab rates for both regimes, accounts for the ₹50,000 standard deduction, adjusts basic exemption limits for senior citizens (₹3 lakh) and super senior citizens (₹5 lakh under old regime), calculates surcharge on high incomes, adds the 4% Health & Education Cess, and applies the Rebate u/s 87A for eligible income levels. The Old vs New Regime comparison is computed simultaneously so you can see exactly which option saves you more money.',
  'For US filers, the tool calculates 2024 federal income tax using the latest IRS brackets for Single and Married Filing Jointly statuses, after applying the standard deduction. The bracket-by-bracket breakdown shows precisely how much tax is owed at each marginal rate, so you understand your effective rate versus your marginal rate. All calculations run entirely in your browser — no data leaves your device.',
]

const STEPS = [
  'Select your country — India 🇮🇳 for Indian income tax or USA 🇺🇸 for US federal tax. The form will update to show the relevant options for each tax system.',
  'Enter your annual gross income in the input field. For India, enter the total annual CTC or income before any deductions. For the US, enter your gross annual income.',
  'India users: choose your Tax Regime (New or Old) and your Age Group (Below 60, Senior 60–80, or Super Senior 80+). US users: choose your Filing Status (Single or Married Filing Jointly).',
  'Click "Calculate Tax" to instantly see your Total Tax Payable, Effective Rate, Monthly TDS estimate, and Take-Home Income in four summary cards alongside an animated donut chart.',
  'Scroll down to review the full slab-wise or bracket-wise tax breakdown with progress bars showing your tax exposure at each rate. India users also see a side-by-side Old vs New Regime comparison highlighting which option saves more money.',
]

const FAQS = [
  {
    q: 'Which is better — the Old Regime or New Regime for FY 2024-25?',
    a: 'It depends on your deductions. The New Regime offers lower slab rates but fewer deductions. If your total deductions (80C, HRA, home loan interest, medical insurance, etc.) are significant — typically above ₹2–3 lakh — the Old Regime may save more. Our tool computes both and highlights the winner instantly based on your income.',
  },
  {
    q: 'Does this calculator include all deductions like 80C, HRA, and home loan interest?',
    a: 'This tool calculates tax on gross income with only the standard deduction of ₹50,000 applied (available in both regimes from FY 2024-25). Deductions like Section 80C (₹1.5L), HRA, 80D (medical insurance), and home loan interest reduce your taxable income further in the Old Regime. Enter your income after manual deductions if you want to account for those.',
  },
  {
    q: 'What is Rebate u/s 87A?',
    a: 'Under Section 87A, individuals with taxable income up to ₹5 lakh (Old Regime) or ₹7 lakh (New Regime) get a full rebate on tax — meaning their effective tax liability becomes zero. For example, a person earning ₹7 lakh under the New Regime (taxable income ₹6.5L after standard deduction) pays zero income tax due to this rebate.',
  },
  {
    q: 'What is surcharge and when does it apply?',
    a: 'Surcharge is an additional levy on income tax for high earners. It applies when gross income exceeds ₹50 lakh: 10% surcharge for ₹50L–1Cr, 15% for ₹1Cr–2Cr, 25% for ₹2Cr–5Cr, and 37% for above ₹5Cr. The 4% Health & Education Cess is then applied on the total of tax plus surcharge.',
  },
  {
    q: 'What is the difference between marginal tax rate and effective tax rate?',
    a: 'Your marginal tax rate is the rate applied to the last rupee or dollar of your income — the top bracket you fall into (e.g., 30% in India or 22% in the US). Your effective tax rate is the average across all income — total tax divided by gross income. Effective rates are always lower than marginal rates because lower slabs of income are taxed at lower rates.',
  },
  {
    q: 'Does this tool calculate state tax for the US?',
    a: 'No — this tool calculates 2024 US federal income tax only, based on the IRS tax brackets and the standard deduction. State income tax, Social Security tax (6.2%), and Medicare tax (1.45%) are not included. To get your total effective tax burden, add your applicable state tax rate and FICA contributions separately.',
  },
]

// ── Default export ─────────────────────────────────────────────────────────────
export default function TaxCalculator() {
  return (
    <ToolPageShell
      slug="tax-calculator"
      name="Tax Calculator"
      description="Calculate your income tax instantly for India (Old/New Regime, FY 2024-25) and USA (2024 Federal). Get slab-wise breakdown, effective rate, and TDS estimate."
      icon="📊"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <TaxTool />
    </ToolPageShell>
  )
}
