import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

const STEPS = [
  "Enter the original price of the item in the 'Original Price' field. This is the listed MRP (Maximum Retail Price) or the price before any discount is applied. For Indian products, MRP is the legally mandated maximum printed on packaging — discounts are calculated off this value. Enter only the numeric amount without currency symbols or commas.",
  "Enter the discount percentage in the 'Discount' field. Retail discounts in India commonly appear as round numbers (10%, 20%, 30%, 50%) for seasonal sales, or as specific percentages like 12.5% or 28% during GST clearance sales. For e-commerce platforms like Flipkart or Amazon India, the discount percentage is listed prominently on the product page — use that exact figure for accurate results.",
  "The results update instantly as you type: Final Price shows what you actually pay, You Save shows the absolute rupee amount saved, and Savings % confirms the discount percentage as a fraction of the original. If you entered a percentage, the savings percentage will match it exactly. The formula used is: Final Price = Original Price × (1 − Discount% / 100).",
  "Use the reverse calculation feature if you know the final price and the original price and want to find what discount percentage was applied. Enter both amounts in the respective fields and the tool computes the exact discount percentage. This is useful for verifying advertised discounts or checking whether a listed 'sale price' actually reflects the stated percentage reduction.",
  "Click 'Copy Result' to copy the full price breakdown to your clipboard as formatted text — useful for sharing with someone else, pasting into a shopping comparison spreadsheet, or saving for later reference. The copied text includes original price, discount percentage, savings amount, and final price in a clean format.",
]

const FAQS = [
  {
    q: 'How is the discounted price calculated?',
    a: "The formula is straightforward: Final Price = Original Price × (1 − Discount Percentage ÷ 100). For example, a ₹2,000 item at 25% discount: 2000 × (1 − 0.25) = 2000 × 0.75 = ₹1,500. The savings amount is Original Price minus Final Price: ₹2,000 − ₹1,500 = ₹500. The savings percentage equals the discount percentage entered — 25% in this case. All three figures (final price, savings amount, savings percentage) are displayed together so you can verify the calculation and understand the full impact of the discount at a glance.",
  },
  {
    q: 'What is MRP and why does it matter for discount calculations?',
    a: "MRP (Maximum Retail Price) is the maximum price at which a product can legally be sold to the end consumer in India, as mandated by the Legal Metrology Act, 2009 and the Packaged Commodities Rules. It includes all applicable taxes. A retailer may sell below MRP (offering a discount) but not above it. When a product's price label shows MRP ₹1,199 and a retailer sells it for ₹899, the discount is approximately 25%. Using MRP as the original price in this calculator gives you the actual savings relative to the legally permitted maximum — which is the standard reference point for all Indian retail discount claims.",
  },
  {
    q: 'How do I calculate the discount percentage if I only know the original and final prices?',
    a: "Use the formula: Discount % = ((Original Price − Final Price) ÷ Original Price) × 100. For example, if an item with MRP ₹3,500 is sold at ₹2,450: (3500 − 2450) ÷ 3500 × 100 = 1050 ÷ 3500 × 100 = 30%. So the effective discount is 30%. This is useful for verifying that a seller's advertised discount percentage matches the actual price reduction. This calculator supports both directions: enter the discount percentage to find the final price, or enter both prices to confirm the discount percentage.",
  },
  {
    q: 'Does the discount apply before or after GST?',
    a: "This depends on how the seller prices the product. For most consumer goods in India, the MRP already includes GST — so a discount off MRP is a post-tax reduction. In B2B transactions or when a seller quotes ex-GST prices, the discount is often applied to the base price before adding GST. If your bill shows a base price, a discount, and then GST applied on the discounted base, use this calculator for the discount step and use the GST Calculator tool separately for the tax calculation. Always check whether the price shown is inclusive or exclusive of GST before computing the effective savings.",
  },
  {
    q: 'What are typical discount levels for Indian e-commerce sales?',
    a: "Discount levels in Indian e-commerce vary significantly by category and sale event. Everyday electronics discounts typically run 5–15% off MRP. During major sale events — Flipkart Big Billion Days, Amazon Great Indian Festival, Myntra EORS, and Meesho Mega Sales — discounts of 40–80% are common on apparel, electronics accessories, and home goods. However, some platforms have been criticised by consumer groups and CCPA for inflating MRPs before applying apparent discounts. Comparing the final price against the actual market price from multiple platforms gives a more reliable sense of true value than relying on the stated discount percentage alone.",
  },
  {
    q: 'Can I use this calculator for stacked discounts (discount on a discount)?',
    a: "Stacked or cascading discounts require two separate calculations. For example, a product at MRP ₹1,000 with a 20% sale discount and then an additional 10% coupon: first apply the 20% — ₹1,000 × 0.80 = ₹800. Then apply the 10% coupon to ₹800 — ₹800 × 0.90 = ₹720. The final price is ₹720, which is a total saving of ₹280 (28%), not 30%. A 20% discount followed by a 10% coupon is not equivalent to a flat 30% discount — sequential discounts compound and always result in less savings than if the percentages were simply added together. Run this calculator twice, using the output of the first calculation as the input for the second.",
  },
]

const ABOUT = [
  'The Discount Calculator computes the final price, savings amount, and effective discount percentage for any combination of original price and discount rate. Enter an MRP and a percentage off, and the tool immediately shows the three figures most useful at the point of purchase: how much you actually pay, how much you save in absolute rupees, and confirmation that the percentage reduction is as advertised.',
  'The tool works in both directions. Forward calculation — from original price and discount percentage to final price — is the standard use case during shopping or comparing deals. Reverse calculation — from original and final price to discount percentage — lets you verify advertised discounts independently. Retailers and e-commerce platforms sometimes exaggerate discounts by inflating the "original" price, and knowing the exact percentage helps you identify genuine savings from manufactured ones.',
  'In the Indian retail context, MRP is the legally mandated maximum price inclusive of all taxes, set under the Legal Metrology Act. Every discount offered in Indian retail is computed against MRP, whether in-store or online. During major sale events — Flipkart\'s Big Billion Days, Amazon Great Indian Festival, Myntra EORS — discount claims can be substantial but vary in authenticity. This calculator gives you a quick sanity-check against any price reduction claim.',
  'No data is sent to any server. All calculations run locally in your browser using standard arithmetic, updating instantly as you type. There are no usage limits and no account required. The copy feature outputs a formatted price breakdown for easy reference when comparing multiple discounted items or sharing a deal with someone else.',
]

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function DiscountTool() {
  const [original, setOriginal] = useState('')
  const [discount, setDiscount] = useState('')
  const [copied, setCopied]     = useState(false)

  const orig = parseFloat(original) || 0
  const disc = parseFloat(discount) || 0
  const valid = orig > 0 && disc >= 0 && disc <= 100

  const savings  = valid ? orig * (disc / 100) : 0
  const final    = valid ? orig - savings : 0
  const savingsPct = disc

  const summary = valid
    ? `Discount Calculation\nOriginal Price: ₹${fmt(orig)}\nDiscount: ${disc}%\nYou Save: ₹${fmt(savings)}\nFinal Price: ₹${fmt(final)}`
    : ''

  const copy = async () => {
    if (!valid) return
    await navigator.clipboard.writeText(summary)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="discount-original" className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
          <input id="discount-original" type="number" min="0" step="0.01" value={original}
            onChange={e => setOriginal(e.target.value)} placeholder="e.g. 2000"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="discount-pct" className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
          <input id="discount-pct" type="number" min="0" max="100" step="0.5" value={discount}
            onChange={e => setDiscount(e.target.value)} placeholder="e.g. 25"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {valid && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Savings highlight */}
          <div className="bg-green-50 border-b border-green-100 p-4 text-center">
            <p className="text-xs text-green-700 font-medium mb-0.5">You Save</p>
            <p className="text-3xl font-bold text-green-700">₹{fmt(savings)}</p>
            <p className="text-xs text-green-600 mt-0.5">{savingsPct}% off MRP</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Original Price', value: `₹${fmt(orig)}`, strike: true },
              { label: 'Final Price', value: `₹${fmt(final)}`, accent: true },
            ].map(({ label, value, strike, accent }) => (
              <div key={label} className="flex justify-between items-center">
                <span className={`text-sm ${accent ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
                <span className={`font-mono text-sm font-semibold ${accent ? 'text-blue-700 text-lg' : 'text-gray-400 line-through'}`}>{value}</span>
              </div>
            ))}
            <button onClick={copy}
              className={`w-full mt-2 py-2.5 border rounded-lg text-sm font-semibold transition-colors ${copied ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {copied ? '✅ Copied!' : 'Copy Result'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DiscountCalculator() {
  return (
    <ToolPageShell
      slug="discount-calculator"
      name="Discount Calculator"
      description="Find the final price, savings amount, and discount percentage for any sale price."
      icon="🏷️"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation={"Calculates the math only — it cannot verify whether a store's \"original price\" was genuine."}
    >
      <DiscountTool />
    </ToolPageShell>
  )
}
