import { useState } from 'react'
import RedditGrowth from './RedditGrowth'
import QuoraGrowth from './QuoraGrowth'
import PinterestGrowth from './PinterestGrowth'

const PLATFORMS = [
  { id: 'reddit',    label: '🔴 Reddit',    color: 'orange' },
  { id: 'quora',     label: '🔵 Quora',     color: 'red'    },
  { id: 'pinterest', label: '🟡 Pinterest', color: 'pink'   },
]

export default function TrafficGrowth() {
  const [platform, setPlatform] = useState('reddit')

  const tabCls = (p) => {
    const active = platform === p.id
    const map = { orange: 'bg-orange-900/40 text-orange-300 border-orange-700', red: 'bg-red-900/40 text-red-300 border-red-700', pink: 'bg-pink-900/40 text-pink-300 border-pink-700' }
    return active
      ? `border ${map[p.color]} font-semibold`
      : 'text-gray-400 hover:text-white border border-transparent'
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">🚀 Traffic Growth</h1>
            <p className="text-sm text-gray-400">White-hat community promotion for AWE-OS</p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2">
            <span className="text-yellow-400 text-sm">⚡</span>
            <span className="text-yellow-300 text-xs font-medium">Always provide genuine value first — no spam</span>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`px-5 py-2.5 rounded-xl text-sm transition-all ${tabCls(p)}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Platform content */}
        {platform === 'reddit'    && <RedditGrowth />}
        {platform === 'quora'     && <QuoraGrowth />}
        {platform === 'pinterest' && <PinterestGrowth />}

      </div>
    </div>
  )
}
