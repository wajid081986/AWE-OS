import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

const PRESET_TIPS = [5, 10, 15, 20, 25]

const STEPS = [
  "Enter the bill amount in the 'Bill Total' field. This is the pre-tip subtotal shown on your restaurant receipt, service invoice, or any bill where you want to add a gratuity. Use the amount before any previously applied service charge — many Indian restaurants already add a 10% service charge, which you should account for separately before calculating an additional tip.",
  "Select a tip percentage from the preset buttons (5%, 10%, 15%, 20%, 25%) or type a custom percentage in the Custom Tip field. In India, tipping is culturally optional but appreciated — 5–10% is typical at casual dining and taxi services; 15–20% reflects exceptional service at fine dining restaurants, luxury hotels, or for private guides and personal chefs.",
  "Enter the number of people splitting the bill in the 'Split Between' field. The default is 1 (no split). For group meals, enter the total number of diners including yourself. The tool calculates the equal share per person for both the tip amount and the total bill. Unequal splits (where different people pay different amounts) require manual adjustment after you copy the result.",
  "Review the three output values: Tip Amount (the gratuity you're adding), Total Bill (original amount plus tip), and Per Person (each person's equal share of the total). All values update instantly as you change any input — no need to press a calculate button. The effective tip percentage is also shown if a custom amount differs from the original percentage.",
  "For restaurant visits in India, note that many establishments automatically include a 5% or 10% 'service charge' on the bill, which goes to the restaurant as revenue — not to the serving staff. A separate cash tip handed directly to your server ensures the gratuity reaches the individual. This tool helps you decide the additional tip amount on top of any automatic service charges already included in the bill total.",
]

const FAQS = [
  {
    q: 'Is tipping mandatory in India?',
    a: "Tipping is entirely voluntary in India — there is no legal or cultural obligation to leave a gratuity. However, it is a recognised way to reward good service, particularly in restaurants, hotels, taxi services, and for tour guides. Standard practices: ₹20–₹50 for a delivery person, 5–10% at casual restaurants, 10–15% at sit-down restaurants with table service, and 15–20% for excellent service at fine dining. Hotel staff such as bellhops and room service expect ₹50–₹200 per interaction. Many restaurants already add a 5–10% 'service charge' to the bill automatically — check before adding more on top of that.",
  },
  {
    q: 'What is the difference between a service charge and a tip?',
    a: "A service charge is a mandatory or semi-mandatory fee added to the bill by the restaurant or establishment before payment — it appears as a line item on your receipt and is collected by the restaurant as general revenue. A tip is a voluntary gratuity you add on top of the bill, typically passed directly to your server or the service staff. In India, the Central Consumer Protection Authority (CCPA) issued guidelines in 2022 stating that hotels and restaurants cannot force consumers to pay service charges and must clearly disclose them on menus. You have the right to request removal of a service charge before tipping additionally.",
  },
  {
    q: 'How is the per-person split calculated?',
    a: "The per-person amount is calculated by dividing the total bill (original amount plus tip) equally among the number of people entered in the split field. For example: a ₹2,000 bill with a 10% tip becomes ₹2,200 total; split four ways, each person pays ₹550. The tool divides the tip-inclusive total, not just the tip — so each person pays their share of both the food and the gratuity. If some members of your group consumed more expensive items, you'll need to manually adjust individual contributions outside this tool, which handles equal-split scenarios only.",
  },
  {
    q: 'Should I tip on the pre-tax or post-tax amount?',
    a: "In most contexts, tipping on the pre-tax subtotal is the standard practice, though both approaches are acceptable. In India, restaurant bills are subject to GST (usually 5% for standalone restaurants or 18% for restaurants inside hotels and air-conditioned restaurants above a threshold). If your receipt clearly shows the food subtotal before GST, enter that as the bill amount for a tip on the pre-tax value. If you see only the GST-inclusive total and are tipping on that amount, the tip will be marginally higher — the difference is small and either approach is socially appropriate.",
  },
  {
    q: 'Can I tip using UPI or card, or should I carry cash?',
    a: "Cash tips are strongly preferred in India because they go directly to the individual serving you, whereas card or UPI tips processed through the restaurant's POS system may be pooled or processed through the establishment before reaching staff. If you pay by card and want to tip electronically, you can ask whether the restaurant allows you to add a tip to the transaction — many do not have this functionality set up. For delivery app orders (Swiggy, Zomato), both platforms offer an in-app tip option at checkout that goes to the delivery person. For restaurant service staff and hotel personnel, having small denomination notes (₹50–₹200) available ensures the tip reaches them directly.",
  },
  {
    q: 'When should I tip 20% or more?',
    a: "A 20–25% tip communicates that service was exceptional and memorable — genuinely above and beyond the standard. Situations that typically warrant this: a server who went out of their way to accommodate dietary restrictions or allergies in detail, a bartender who crafted personalised cocktails over an extended visit, a private tour guide who added significant unplanned value, or a hotel concierge who solved a complicated travel problem on short notice. At fine dining restaurants with attentive tableside service throughout a multi-course meal, 18–20% is considered a strong standard tip rather than an exception. For average service at casual dining, 5–10% adequately acknowledges the effort.",
  },
]

const ABOUT = [
  'The Tip Calculator helps you quickly determine how much to tip at restaurants, hotels, and service businesses, with the option to split the result equally among multiple people. Enter the bill total, choose a tip percentage, and the tool immediately shows the tip amount, the total bill including the tip, and each person\'s equal share — all updating live as you adjust the inputs.',
  'Preset tip buttons (5%, 10%, 15%, 20%, 25%) cover the full range from a modest acknowledgment to a strong reward for excellent service. A custom tip percentage field accommodates any amount outside these presets — useful for splitting the difference between two percentages, rounding to a convenient total, or matching a tip convention specific to a venue or cultural context. All three output values update simultaneously with no separate calculate step.',
  'Splitting bills accurately is a common friction point at group meals. The per-person calculation divides the complete tip-inclusive total equally, showing each participant\'s fair share alongside the shared tip amount. This covers the majority of group dining scenarios where everyone contributes equally. For meals where individual orders vary significantly, the total bill and tip amount figures provide the inputs needed to allocate costs manually.',
  'Tipping customs vary significantly by service type, establishment, and individual preference. In India, tipping is discretionary — not socially mandatory — but it\'s a meaningful way to directly reward service staff whose base wages may be modest. The calculator works equally well for working out taxi gratuities, hotel staff tips, spa service tips, and any other context where you want to confirm a percentage-based gratuity quickly before paying.',
]

function TipTool() {
  const [bill, setBill]       = useState('')
  const [tipPct, setTipPct]   = useState(10)
  const [custom, setCustom]   = useState('')
  const [people, setPeople]   = useState(1)
  const [useCustom, setUseCustom] = useState(false)

  const effectivePct = useCustom ? (parseFloat(custom) || 0) : tipPct
  const billAmt      = parseFloat(bill) || 0
  const tipAmt       = billAmt * (effectivePct / 100)
  const total        = billAmt + tipAmt
  const perPerson    = people > 0 ? total / people : total

  const fmt = n => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const selectPreset = (pct) => { setTipPct(pct); setUseCustom(false) }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="tip-bill" className="block text-sm font-medium text-gray-700 mb-1">Bill Total (₹)</label>
          <input
            id="tip-bill"
            type="number" min="0" step="0.01"
            value={bill} onChange={e => setBill(e.target.value)}
            placeholder="e.g. 1500"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tip Percentage</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_TIPS.map(p => (
              <button key={p} onClick={() => selectPreset(p)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${!useCustom && tipPct === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {p}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="100" step="0.5"
              value={custom} placeholder="Custom %"
              aria-label="Custom tip percentage"
              onChange={e => { setCustom(e.target.value); setUseCustom(true) }}
              onFocus={() => setUseCustom(true)}
              className={`w-32 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${useCustom ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'}`}
            />
            <span className="text-sm text-gray-500">custom tip %</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Split Between</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setPeople(p => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-lg">−</button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{people}</span>
            <button onClick={() => setPeople(p => p + 1)}
              className="w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-lg">+</button>
            <span className="text-sm text-gray-500">{people === 1 ? 'person' : 'people'}</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Results</p>
        {[
          { label: `Tip (${effectivePct}%)`, value: `₹${fmt(tipAmt)}` },
          { label: 'Total Bill', value: `₹${fmt(total)}` },
          ...(people > 1 ? [{ label: `Per Person (÷${people})`, value: `₹${fmt(perPerson)}`, accent: true }] : []),
        ].map(({ label, value, accent }) => (
          <div key={label} className={`flex justify-between items-center py-2 ${accent ? 'border-t border-gray-200 pt-3' : ''}`}>
            <span className={`text-sm ${accent ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{label}</span>
            <span className={`font-mono text-sm font-semibold ${accent ? 'text-blue-700 text-base' : 'text-gray-800'}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TipCalculator() {
  return (
    <ToolPageShell
      slug="tip-calculator"
      name="Tip Calculator"
      description="Calculate tip amount and split the bill equally among any number of people."
      icon="💰"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Splits bills equally only — it cannot handle per-person itemized splits."}
    >
      <TipTool />
    </ToolPageShell>
  )
}
