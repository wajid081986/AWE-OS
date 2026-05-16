function fmt(n, country) {
  if (country === 'india') return '₹' + Math.round(n).toLocaleString('en-IN')
  return '$' + Math.round(n).toLocaleString('en-US')
}

export default function TaxBreakdownTable({ result }) {
  const { data, country } = result

  if (!data.slabs?.length) return null

  const maxTax = Math.max(...data.slabs.map((s) => s.tax), 1)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">
          {country === 'india' ? 'Slab-wise Tax Breakdown' : 'Bracket-wise Tax Breakdown'}
        </h3>
        {data.totalSlabTax > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {country === 'india'
              ? `Taxable income: ${fmt(data.taxableIncome, country)} (after ₹50,000 standard deduction)`
              : `Taxable income: ${fmt(data.taxableIncome, country)} (after standard deduction)`}
          </p>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {/* Header */}
        <div className="grid grid-cols-12 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
          <div className="col-span-4">
            {country === 'india' ? 'Slab' : 'Bracket'}
          </div>
          <div className="col-span-2 text-right">Rate</div>
          <div className="col-span-3 text-right">Income in {country === 'india' ? 'Slab' : 'Bracket'}</div>
          <div className="col-span-3 text-right">Tax</div>
        </div>

        {/* Rows */}
        {data.slabs.map((slab, i) => {
          const pct = maxTax > 0 ? (slab.tax / maxTax) * 100 : 0
          const barColor =
            slab.rate === 0   ? 'bg-gray-200'
            : slab.rate <= 5  ? 'bg-green-400'
            : slab.rate <= 10 ? 'bg-teal-400'
            : slab.rate <= 15 ? 'bg-yellow-400'
            : slab.rate <= 20 ? 'bg-orange-400'
            : 'bg-red-400'

          return (
            <div key={i} className="px-5 py-3">
              <div className="grid grid-cols-12 items-center mb-1.5">
                <div className="col-span-4 text-xs text-gray-700 font-medium truncate pr-2">
                  {slab.label}
                </div>
                <div className="col-span-2 text-right">
                  <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded ${
                    slab.rate === 0   ? 'bg-gray-100 text-gray-500'
                    : slab.rate <= 10 ? 'bg-green-100 text-green-700'
                    : slab.rate <= 20 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {slab.rate}%
                  </span>
                </div>
                <div className="col-span-3 text-right text-xs text-gray-600">
                  {fmt(slab.inSlab, country)}
                </div>
                <div className="col-span-3 text-right text-xs font-semibold text-gray-800">
                  {fmt(slab.tax, country)}
                </div>
              </div>
              {/* Progress bar */}
              {slab.tax > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer totals */}
      <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 space-y-1.5">
        {country === 'india' && data.rebate > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Rebate u/s 87A</span>
            <span className="text-green-600 font-semibold">− {fmt(data.rebate, country)}</span>
          </div>
        )}
        {country === 'india' && data.surcharge > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Surcharge</span>
            <span className="text-gray-700 font-semibold">+ {fmt(data.surcharge, country)}</span>
          </div>
        )}
        {country === 'india' && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Health & Education Cess (4%)</span>
            <span className="text-gray-700 font-semibold">+ {fmt(data.cess, country)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
          <span>Total Tax Payable</span>
          <span className="text-red-600">{fmt(data.totalTax, country)}</span>
        </div>
      </div>
    </div>
  )
}
