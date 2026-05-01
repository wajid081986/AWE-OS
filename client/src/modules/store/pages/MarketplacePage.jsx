import { useState, useEffect } from 'react'
import StorePage from './StorePage'
import ProductsStorePage from '../../products/pages/ProductsStorePage'

const API = import.meta.env.VITE_API_URL || ''

const TABS = [
  { id: 'tools',    icon: '🛠️', label: 'AI Tools' },
  { id: 'products', icon: '📦', label: 'Digital Products' },
  { id: 'calc',     icon: '🧮', label: 'Calculators' },
]

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('tools')
  const [calculators, setCalculators] = useState([])

  useEffect(() => {
    fetch(`${API}/api/calculators`)
      .then(r => r.json())
      .then(data => setCalculators(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-900">

      {/* ── Header + Tabs ── */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 pt-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Marketplace</h1>
          <p className="text-gray-400 text-sm mb-5">
            Discover AI tools, digital products &amp; calculators
          </p>

          <div className="flex gap-1">
            {TABS.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                  activeTab === id
                    ? 'text-white border-blue-500 bg-blue-500/8'
                    : 'text-gray-400 hover:text-gray-200 border-transparent hover:border-gray-700'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'tools' && <StorePage />}

      {activeTab === 'products' && <ProductsStorePage />}

      {activeTab === 'calc' && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Free Calculators</h2>
              <p className="text-gray-400 text-sm mt-1">No login required — open any calculator instantly</p>
            </div>
            <a
              href="/calculators"
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              View all →
            </a>
          </div>

          {calculators.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No calculators available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {calculators.map(calc => (
                <a
                  key={calc.id}
                  href={`/calculators/${calc.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-indigo-500 transition-colors group block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
                      {calc.category}
                    </span>
                    <span className="text-xs text-green-400 font-medium">Free</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 group-hover:text-indigo-400 transition-colors">
                    {calc.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{calc.description}</p>
                  <span className="text-indigo-400 text-sm font-medium">Open Calculator →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
