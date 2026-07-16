import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'

// Static rates relative to INR (1 unit of currency = X INR)
// These are approximate mid-market rates as of mid-2025
const RATES_TO_INR = {
  INR: 1,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  JPY: 0.55,
  AED: 22.73,
  SGD: 61.8,
  CAD: 61.2,
  AUD: 54.5,
  CHF: 93.5,
  CNY: 11.5,
  SAR: 22.27,
  MYR: 17.8,
  THB: 2.32,
  ZAR: 4.5,
}

const CURRENCY_NAMES = {
  INR: 'Indian Rupee', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
  JPY: 'Japanese Yen', AED: 'UAE Dirham', SGD: 'Singapore Dollar',
  CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan', SAR: 'Saudi Riyal', MYR: 'Malaysian Ringgit',
  THB: 'Thai Baht', ZAR: 'South African Rand',
}

const CURRENCIES = Object.keys(RATES_TO_INR)

const STEPS = [
  "Select the currency you are converting from in the first dropdown. Indian Rupee (INR) is the default source currency — useful for calculating how much a foreign purchase costs in rupees when travelling or shopping internationally. The tool covers 15 commonly used currencies including major international pairs (USD, EUR, GBP) and regional currencies important for Indians (AED, SGD, MYR, SAR, THB).",
  "Select the target currency from the second dropdown. For travel planning, select the currency of your destination country. For international transfers via services like Western Union, Wise, or bank remittances, use the destination country's currency. The swap button between the two dropdowns reverses the direction instantly — no need to manually reset both fields.",
  "Enter the amount you want to convert in the input field. The converted result appears immediately without any button press. For large amounts like international wire transfers or property purchases, note that the displayed rate is an approximate mid-market rate — the actual rate your bank or money transfer service applies will include a spread or service fee that is typically 1–4% above the mid-market rate.",
  "Review the exchange rate shown below the result. The rate is expressed as '1 [FROM] = X [TO]' and its reciprocal. This rate is fixed in the tool and may differ from the current live rate by a few percentage points — check XE.com or Google for the real-time rate before executing any actual financial transaction. This tool is accurate enough for budgeting and quick estimates.",
  "Use the swap button (⇄) to instantly reverse the conversion direction. If you wanted to know how many rupees you get for 500 USD, and now want to know how many USD you get for ₹50,000, click swap once and re-enter the amount. The tool recalculates with the reversed currency pair immediately.",
]

const FAQS = [
  {
    q: 'Why do the rates in this tool differ from my bank or Forex?',
    a: "This tool uses static approximate mid-market rates — the midpoint between the buy and sell rates on foreign exchange markets. Banks, forex bureaus, and money transfer operators apply a spread above this rate (their margin), plus fees. A bank converting USD to INR may give a rate 2–4% worse than the mid-market rate. Money transfer services like Wise and Remitly are typically closer to mid-market with a flat fee, while airport forex counters and traditional money changers often have the worst rates. For actual transactions, always check the live rate and compare across providers — never execute large transfers based on an approximate tool.",
  },
  {
    q: 'How often are the exchange rates in this tool updated?',
    a: "The exchange rates in this tool are static reference rates built into the page at the time of the last update — they do not update in real time. Currency markets move continuously, 24 hours a day on weekdays, and rates fluctuate based on central bank policy, inflation data, trade news, and global events. The INR/USD rate, for example, can move 0.5–1.5% in a single trading session during volatile periods. This tool is suitable for ballpark estimates, travel budgeting, and comparative calculations. For live rates, use Google (search 'USD to INR'), XE.com, or your bank's mobile app before any actual currency exchange.",
  },
  {
    q: 'What is the best way to convert INR to foreign currency as an Indian traveller?',
    a: "The most cost-effective options in order: (1) Use a zero-forex-fee international debit or credit card at the destination (cards like Niyo Global, HDFC Regalia, Axis Bank Vistara charge close to mid-market rates with no or low markup). (2) Buy forex from a RBI-authorised money changer like BookMyForex.com or Thomas Cook India, which offer better rates than banks and deliver to your home. (3) Use a multi-currency forex card loaded at a competitive rate before travel. Avoid: airport counters (worst rates), dynamic currency conversion at foreign ATMs or payment terminals (always choose to pay in local currency, not INR), and carrying large amounts of cash.",
  },
  {
    q: 'What is the TCS (Tax Collected at Source) on foreign currency conversions in India?',
    a: "Under India's Income Tax Act, banks and authorised dealers collect TCS on foreign remittances and international credit card spends above specified thresholds. As of the 2023 Finance Act amendments: outward remittances under the Liberalised Remittance Scheme (LRS) above ₹7 lakh per financial year attract 20% TCS (reduced to 5% for education and medical purposes). International credit card spends above ₹7 lakh are also subject to TCS. The TCS is credited to your Form 26AS and can be claimed as a tax credit in your Income Tax Return — it is not an additional tax if your income tax liability equals or exceeds the TCS amount.",
  },
  {
    q: 'What is the Liberalised Remittance Scheme (LRS) and how does it affect currency conversion?',
    a: "The Liberalised Remittance Scheme allows Indian residents to remit up to USD 250,000 per financial year for any permissible current or capital account transaction without RBI approval. This covers foreign travel, international education, overseas investments, and foreign property purchases. Remittances require completing Form A2 with your bank or authorised dealer, and your PAN must be linked to your bank account. Amounts above USD 250,000 require RBI approval on a case-by-case basis. The scheme does not apply to prohibited transactions like gambling, lottery, or buying financial products not permitted under FEMA.",
  },
  {
    q: 'Why is the AED (UAE Dirham) relevant for Indian users?',
    a: "The UAE is the largest destination for the Indian diaspora — approximately 3.5 million Non-Resident Indians (NRIs) live in the UAE, and the UAE is the top source of inward remittances to India. The AED-INR exchange rate is therefore one of the most frequently checked currency pairs by Indian users — for remittances from workers and professionals in Dubai and Abu Dhabi, for travel planning, for business dealings with UAE partners, and for NRIs comparing the rupee value of their AED savings. The dirham is pegged to the USD at approximately 3.67 AED per USD, making it a stable currency relative to the rupee.",
  },
]

const ABOUT = [
  'The Currency Converter provides quick conversions between Indian Rupee and 14 major international currencies, covering the pairs most relevant to Indian users: US Dollar, Euro, British Pound, UAE Dirham, Singapore Dollar, Malaysian Ringgit, Saudi Riyal, and others. Enter an amount, choose source and target currencies, and the converted value appears instantly alongside the exchange rate.',
  'The rates used are static approximate mid-market reference rates. They are accurate enough for travel budgeting, understanding the INR equivalent of international purchases, comparing costs across currencies, and quick financial estimates. They are not suitable as the basis for actual currency exchange transactions — banks, money transfer operators, and forex bureaus apply spreads and fees that produce different effective rates for real transactions.',
  'For Indian users specifically, the most commonly consulted pairs are INR/USD (for US travel, Amazon imports, and dollar-denominated investments), INR/AED (for UAE remittances — the largest single corridor for Indian diaspora workers), INR/SGD (for Singapore travel and work), and INR/GBP (for UK travel and studies). The tool covers all these pairs plus additional currencies for broader international use.',
  'Currency values change continuously during trading hours, influenced by RBI monetary policy, US Federal Reserve decisions, inflation readings, and global events. For live rates before an actual currency transaction, always cross-check with Google, XE.com, or your bank. For large remittances, compare rates across Wise, Remitly, BookMyForex, and your bank to identify the best effective rate including all fees. All calculations in this tool run locally in your browser — no data is sent to any server.',
]

function fmt(n, currency) {
  if (!isFinite(n)) return '—'
  const opts = { minimumFractionDigits: 2, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }
  return new Intl.NumberFormat('en-IN', opts).format(n)
}

function CurrencyTool() {
  const [from, setFrom]     = useState('INR')
  const [to, setTo]         = useState('USD')
  const [amount, setAmount] = useState('')

  const swap = () => { setFrom(to); setTo(from) }

  const converted = useMemo(() => {
    const amt = parseFloat(amount)
    if (!amt || !isFinite(amt)) return null
    const inr = amt * RATES_TO_INR[from]
    return inr / RATES_TO_INR[to]
  }, [amount, from, to])

  const rate     = RATES_TO_INR[from] / RATES_TO_INR[to]
  const rateBack = 1 / rate

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        {/* From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <div className="flex gap-2">
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-36 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CURRENCIES.map(c => <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>)}
            </select>
            <input type="number" min="0" step="any" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Swap */}
        <div className="flex justify-center">
          <button onClick={swap}
            className="w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center text-lg transition-colors">
            ⇄
          </button>
        </div>

        {/* To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Converted To</label>
          <div className="flex gap-2">
            <select value={to} onChange={e => setTo(e.target.value)}
              className="w-36 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CURRENCIES.map(c => <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>)}
            </select>
            <div className="flex-1 px-3 py-2.5 border border-gray-200 bg-white rounded-lg text-sm text-gray-900 font-semibold min-h-[42px] flex items-center">
              {converted !== null
                ? <span className="text-blue-700">{fmt(converted, to)} {to}</span>
                : <span className="text-gray-400">Result</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Rate */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">1 {from}</span> = <span className="font-semibold text-blue-700">{fmt(rate, to)} {to}</span>
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">1 {to}</span> = <span className="font-semibold text-blue-700">{fmt(rateBack, from)} {from}</span>
        </p>
        <p className="text-xs text-orange-600 mt-2">
          ⚠ Approximate mid-market rates — for reference only. Check live rates before any actual transaction.
        </p>
      </div>
    </div>
  )
}

export default function CurrencyConverter() {
  return (
    <ToolPageShell
      slug="currency-converter"
      name="Currency Converter"
      description="Convert between INR and 14 major currencies with instant results and exchange rate display."
      icon="💱"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Rates are indicative market rates — banks and money changers add their own margin, so the amount you actually get will differ."}
    >
      <CurrencyTool />
    </ToolPageShell>
  )
}
