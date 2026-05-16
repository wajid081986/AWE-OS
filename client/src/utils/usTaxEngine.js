/**
 * US Federal Income Tax Engine — 2024
 * Single & Married Filing Jointly with standard deduction.
 */

const SINGLE_BRACKETS = [
  { min: 0,       max: 11600,   rate: 0.10 },
  { min: 11600,   max: 47150,   rate: 0.12 },
  { min: 47150,   max: 100525,  rate: 0.22 },
  { min: 100525,  max: 191950,  rate: 0.24 },
  { min: 191950,  max: 243725,  rate: 0.32 },
  { min: 243725,  max: 609350,  rate: 0.35 },
  { min: 609350,  max: Infinity, rate: 0.37 },
]

const MARRIED_BRACKETS = [
  { min: 0,       max: 23200,   rate: 0.10 },
  { min: 23200,   max: 94300,   rate: 0.12 },
  { min: 94300,   max: 201050,  rate: 0.22 },
  { min: 201050,  max: 383900,  rate: 0.24 },
  { min: 383900,  max: 487450,  rate: 0.32 },
  { min: 487450,  max: 731200,  rate: 0.35 },
  { min: 731200,  max: Infinity, rate: 0.37 },
]

const STANDARD_DEDUCTION = {
  single:  14600,
  married: 29200,
}

function bracketLabel(min, max) {
  const fmt = (n) => `$${n.toLocaleString('en-US')}`
  return max === Infinity ? `${fmt(min)}+` : `${fmt(min)} – ${fmt(max)}`
}

function computeBracketTax(taxableIncome, brackets) {
  let total = 0
  const details = []
  for (const b of brackets) {
    if (taxableIncome <= b.min) break
    const inBracket = Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max) - b.min
    const tax = inBracket * b.rate
    details.push({
      label:    bracketLabel(b.min, b.max),
      rate:     b.rate * 100,
      inSlab:   inBracket,
      tax,
    })
    total += tax
  }
  return { total, details: details.filter(d => d.inSlab > 0) }
}

/**
 * @param {{ grossIncome: number, filingStatus: 'single'|'married' }}
 */
export function calculateUSTax({ grossIncome, filingStatus = 'single' }) {
  const deduction     = STANDARD_DEDUCTION[filingStatus] ?? 14600
  const taxableIncome = Math.max(0, grossIncome - deduction)
  const brackets      = filingStatus === 'married' ? MARRIED_BRACKETS : SINGLE_BRACKETS

  const { total: totalSlabTax, details: slabDetails } = computeBracketTax(taxableIncome, brackets)

  const totalTax   = Math.round(totalSlabTax)
  const takeHome   = Math.round(grossIncome - totalTax)
  const effectiveRate = grossIncome > 0
    ? parseFloat(((totalTax / grossIncome) * 100).toFixed(2))
    : 0
  const monthlyTDS = Math.round(totalTax / 12)

  return {
    grossIncome,
    taxableIncome,
    slabs:         slabDetails,
    totalSlabTax:  Math.round(totalSlabTax),
    surcharge:     0,
    cess:          0,
    rebate:        0,
    totalTax,
    effectiveRate,
    monthlyTDS,
    takeHome,
  }
}
