import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#ef4444', '#22c55e']

function formatCurrency(value, country) {
  if (country === 'india') return '₹' + Math.round(value).toLocaleString('en-IN')
  return '$' + Math.round(value).toLocaleString('en-US')
}

function CustomTooltip({ active, payload, country }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-semibold text-gray-800">{payload[0].name}</p>
      <p className="text-gray-600">{formatCurrency(payload[0].value, country)}</p>
      <p className="text-gray-400 text-xs">
        {((payload[0].value / (payload[0].payload.total)) * 100).toFixed(1)}% of income
      </p>
    </div>
  )
}

export default function TaxDonutChart({ result }) {
  const { data, country } = result
  const total = data.grossIncome

  const chartData = [
    { name: 'Tax',       value: data.totalTax,  total },
    { name: 'Take-Home', value: data.takeHome,   total },
  ]

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Income Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={600}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip country={country} />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-around mt-2 text-center">
        <div>
          <p className="text-xs text-gray-400">Tax</p>
          <p className="text-sm font-bold text-red-600">
            {formatCurrency(data.totalTax, country)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Take-Home</p>
          <p className="text-sm font-bold text-green-600">
            {formatCurrency(data.takeHome, country)}
          </p>
        </div>
      </div>
    </div>
  )
}
