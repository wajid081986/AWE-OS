/**
 * India Income Tax Engine — FY 2024-25
 * Old Regime & New Regime with surcharge, cess, and rebate u/s 87A.
 */

const OLD_SLABS_DEFAULT = [
  { min: 0,        max: 250000,  rate: 0    },
  { min: 250000,   max: 500000,  rate: 0.05 },
  { min: 500000,   max: 1000000, rate: 0.20 },
  { min: 1000000,  max: Infinity, rate: 0.30 },
]

const OLD_SLABS_SENIOR = [
  { min: 0,        max: 300000,  rate: 0    },
  { min: 300000,   max: 500000,  rate: 0.05 },
  { min: 500000,   max: 1000000, rate: 0.20 },
  { min: 1000000,  max: Infinity, rate: 0.30 },
]

const OLD_SLABS_SUPER = [
  { min: 0,        max: 500000,  rate: 0    },
  { min: 500000,   max: 1000000, rate: 0.20 },
  { min: 1000000,  max: Infinity, rate: 0.30 },
]

const NEW_SLABS = [
  { min: 0,        max: 300000,  rate: 0    },
  { min: 300000,   max: 700000,  rate: 0.05 },
  { min: 700000,   max: 1000000, rate: 0.10 },
  { min: 1000000,  max: 1200000, rate: 0.15 },
  { min: 1200000,  max: 1500000, rate: 0.20 },
  { min: 1500000,  max: Infinity, rate: 0.30 },
]

function slabLabel(min, max) {
  const fmt = (n) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(0)}Cr`
    if (n >= 100000)   return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    return `₹${n.toLocaleString('en-IN')}`
  }
  return max === Infinity ? `${fmt(min)}+` : `${fmt(min)} – ${fmt(max)}`
}

function computeSlabTax(taxableIncome, slabs) {
  let total = 0
  const details = []
  for (const s of slabs) {
    if (taxableIncome <= s.min) break
    const inSlab = Math.min(taxableIncome, s.max === Infinity ? taxableIncome : s.max) - s.min
    const tax = inSlab * s.rate
    details.push({
      label:   slabLabel(s.min, s.max),
      rate:    s.rate * 100,
      inSlab,
      tax,
    })
    total += tax
  }
  return { total, details: details.filter(d => d.inSlab > 0) }
}

function surchargeRate(grossIncome) {
  if (grossIncome > 50000000)  return 0.37
  if (grossIncome > 20000000)  return 0.25
  if (grossIncome > 10000000)  return 0.15
  if (grossIncome > 5000000)   return 0.10
  return 0
}

/**
 * @param {{ grossIncome: number, regime: 'old'|'new', ageGroup: 'below60'|'senior'|'super' }}
 */
export function calculateIndiaTax({ grossIncome, regime, ageGroup = 'below60' }) {
  const STANDARD_DEDUCTION = 50000
  const afterSD = Math.max(0, grossIncome - STANDARD_DEDUCTION)

  let slabs
  if (regime === 'old') {
    slabs = ageGroup === 'super' ? OLD_SLABS_SUPER
          : ageGroup === 'senior' ? OLD_SLABS_SENIOR
          : OLD_SLABS_DEFAULT
  } else {
    slabs = NEW_SLABS
  }

  const taxableIncome = afterSD
  const { total: totalSlabTax, details: slabDetails } = computeSlabTax(taxableIncome, slabs)

  // Rebate u/s 87A — wipes out tax if within limit
  let rebate = 0
  if (regime === 'old' && taxableIncome <= 500000) rebate = totalSlabTax
  if (regime === 'new' && taxableIncome <= 700000) rebate = totalSlabTax

  const taxAfterRebate = Math.max(0, totalSlabTax - rebate)

  // Surcharge is on gross income
  const surcharge = Math.round(taxAfterRebate * surchargeRate(grossIncome))

  // Health & Education Cess: 4% on (tax + surcharge)
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04)

  const totalTax   = taxAfterRebate + surcharge + cess
  const takeHome   = grossIncome - totalTax
  const effectiveRate = grossIncome > 0 ? parseFloat(((totalTax / grossIncome) * 100).toFixed(2)) : 0
  const monthlyTDS = Math.round(totalTax / 12)

  return {
    grossIncome,
    taxableIncome,
    slabs:         slabDetails,
    totalSlabTax:  Math.round(totalSlabTax),
    surcharge,
    cess,
    rebate:        Math.round(rebate),
    totalTax:      Math.round(totalTax),
    effectiveRate,
    monthlyTDS,
    takeHome:      Math.round(takeHome),
  }
}
