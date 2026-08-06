import { useState } from 'react'
import StrategyTab from './StrategyTab'
import CreateTab   from './CreateTab'
import GrowTab      from './GrowTab'

const TABS = [
  { id: 'strategy', label: '🎯 Strategy' },
  { id: 'create',   label: '✨ Create'   },
  { id: 'grow',     label: '📈 Grow'     },
]

export default function GrowthOS() {
  const [tab, setTab] = useState('strategy')

  // Strategy tab's output (goal, tool, keywords/competitors/calendar) lives
  // here so Create can pre-fill from a calendar entry ("Write This →").
  const [strategyState, setStrategyState] = useState(null)
  const [createPrefill, setCreatePrefill] = useState(null)

  function sendToCreate(prefill) {
    setCreatePrefill(prefill)
    setTab('create')
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 min-h-0">

      {/* ── Header ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>⭐</span> Growth OS
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Strategy → Content → Distribution, in one place. Reuses Blog Assistant, Content Engine, and Auto Campaign under the hood.
            </p>
          </div>
        </div>

        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                tab === t.id
                  ? 'text-indigo-400 border-indigo-500 bg-gray-900'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto p-5">
        {tab === 'strategy' && (
          <StrategyTab
            strategyState={strategyState}
            onStrategyChange={setStrategyState}
            onWriteThis={sendToCreate}
          />
        )}
        {tab === 'create' && (
          <CreateTab prefill={createPrefill} onPrefillConsumed={() => setCreatePrefill(null)} />
        )}
        {tab === 'grow' && <GrowTab />}
      </div>
    </div>
  )
}
