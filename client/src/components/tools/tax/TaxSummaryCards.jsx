function fmt(n, country) {
  if (country === 'india') {
    return '₹' + Math.round(n).toLocaleString('en-IN')
  }
  return '$' + Math.round(n).toLocaleString('en-US')
}

export default function TaxSummaryCards({ result }) {
  const { data, country } = result

  const cards = [
    {
      label:   'Total Tax Payable',
      value:   fmt(data.totalTax, country),
      sub:     data.rebate > 0 ? `Rebate applied: ${fmt(data.rebate, country)}` : null,
      accent:  'red',
      icon:    '🧾',
    },
    {
      label:   'Effective Tax Rate',
      value:   `${data.effectiveRate}%`,
      sub:     `on gross income`,
      accent:  'orange',
      icon:    '📉',
    },
    {
      label:   'Monthly TDS',
      value:   fmt(data.monthlyTDS, country),
      sub:     'per month',
      accent:  'yellow',
      icon:    '📅',
    },
    {
      label:   'Take-Home Income',
      value:   fmt(data.takeHome, country),
      sub:     'annual net',
      accent:  'green',
      icon:    '💰',
    },
  ]

  const accentClasses = {
    red:    'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green:  'bg-green-50 border-green-200 text-green-700',
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`border rounded-xl p-4 ${accentClasses[card.accent]}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base" aria-hidden>{card.icon}</span>
            <p className="text-xs font-medium opacity-80">{card.label}</p>
          </div>
          <p className="text-xl font-bold">{card.value}</p>
          {card.sub && (
            <p className="text-xs opacity-70 mt-0.5">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}
