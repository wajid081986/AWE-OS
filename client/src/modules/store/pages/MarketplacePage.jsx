import { useState } from 'react'
import StorePage from './StorePage'
import ProductsStorePage from '../../products/pages/ProductsStorePage'

const TABS = [
  { id: 'tools',    icon: '🛠️', label: 'AI Tools' },
  { id: 'products', icon: '📦', label: 'Digital Products' },
  { id: 'calc',     icon: '🧮', label: 'Calculators' },
]

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('tools')

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
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <p className="text-5xl mb-5">🧮</p>
          <h3 className="text-xl font-bold text-white mb-2">Free Calculators Coming Soon</h3>
          <p className="text-gray-400 text-sm max-w-xs">
            EMI, GST, SIP and 50+ calculators for instant results.
          </p>
        </div>
      )}

    </div>
  )
}
