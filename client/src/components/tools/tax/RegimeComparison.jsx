import { calculateIndiaTax } from '../../../utils/indiaTaxEngine'

function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export default function RegimeComparison({ grossIncome, ageGroup, selectedRegime }) {
  const newResult = calculateIndiaTax({ grossIncome, regime: 'new', ageGroup })
  const oldResult = calculateIndiaTax({ grossIncome, regime: 'old', ageGroup })

  const newIsBetter = newResult.totalTax <= oldResult.totalTax
  const savings     = Math.abs(oldResult.totalTax - newResult.totalTax)
  const betterLabel = newIsBetter ? 'New Regime' : 'Old Regime'
  const betterKey   = newIsBetter ? 'new' : 'old'

  const cols = [
    { key: 'new', label: 'New Regime', result: newResult },
    { key: 'old', label: 'Old Regime', result: oldResult },
  ]

  const rows = [
    { label: 'Gross Income',     getValue: (r) => fmt(r.grossIncome)   },
    { label: 'Taxable Income',   getValue: (r) => fmt(r.taxableIncome)  },
    { label: 'Total Tax',        getValue: (r) => fmt(r.totalTax),       bold: true },
    { label: 'Effective Rate',   getValue: (r) => `${r.effectiveRate}%`  },
    { label: 'Monthly TDS',      getValue: (r) => fmt(r.monthlyTDS)      },
    { label: 'Take-Home',        getValue: (r) => fmt(r.takeHome),        bold: true },
  ]

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Old vs New Regime Comparison</h3>
        {savings > 0 ? (
          <p className="text-xs text-gray-600 mt-1">
            <span className="font-semibold text-blue-700">{betterLabel}</span> saves you{' '}
            <span className="font-bold text-green-700">{fmt(savings)}</span> annually
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">Both regimes result in equal tax</p>
        )}
      </div>

      {/* Comparison grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-1/3">
                Parameter
              </th>
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={`text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide ${
                    col.key === betterKey
                      ? 'text-green-700 bg-green-50'
                      : 'text-gray-400'
                  }`}
                >
                  {col.label}
                  {col.key === betterKey && savings > 0 && (
                    <span className="ml-1.5 text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-bold">
                      BETTER
                    </span>
                  )}
                  {col.key === selectedRegime && col.key !== betterKey && (
                    <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      SELECTED
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-xs text-gray-500">{row.label}</td>
                {cols.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3 text-right text-xs ${
                      row.bold ? 'font-bold text-gray-900' : 'text-gray-700'
                    } ${col.key === betterKey ? 'bg-green-50' : ''}`}
                  >
                    {row.getValue(col.result)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      {savings > 0 && (
        <div className={`px-5 py-3 border-t border-gray-200 ${
          betterKey === 'new' ? 'bg-blue-50' : 'bg-amber-50'
        }`}>
          <p className={`text-xs font-medium ${
            betterKey === 'new' ? 'text-blue-800' : 'text-amber-800'
          }`}>
            💡 Recommendation: Switch to{' '}
            <strong>{betterLabel}</strong> to save{' '}
            <strong>{fmt(savings)}/year</strong>{' '}
            ({fmt(Math.round(savings / 12))}/month).
          </p>
          {betterKey === 'old' && (
            <p className="text-xs text-amber-700 mt-1">
              Old regime is beneficial when total deductions (80C, HRA, etc.) exceed the standard deduction.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
