import { memo } from 'react'

const Section = memo(function Section({ title, icon, children }) {
  return (
    <div className="bg-gray-700/40 rounded-lg border border-gray-600/40 p-4">
      <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
        <span>{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  )
})

const Tag = memo(function Tag({ text, color = 'bg-gray-700 text-gray-300' }) {
  return (
    <span className={`inline-block text-[11px] px-2 py-0.5 rounded font-mono ${color}`}>
      {text}
    </span>
  )
})

const EndpointRow = memo(function EndpointRow({ endpoint }) {
  const methodColor = {
    GET:    'text-green-400 bg-green-900/30',
    POST:   'text-blue-400  bg-blue-900/30',
    PUT:    'text-yellow-400 bg-yellow-900/30',
    PATCH:  'text-yellow-400 bg-yellow-900/30',
    DELETE: 'text-red-400   bg-red-900/30',
  }[endpoint.method] || 'text-gray-400 bg-gray-700'

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <span className={`shrink-0 font-bold text-[10px] px-1.5 py-0.5 rounded font-mono ${methodColor}`}>
        {endpoint.method}
      </span>
      <span className="text-gray-300 font-mono">{endpoint.path}</span>
      <span className="text-gray-500 ml-auto whitespace-nowrap">{endpoint.purpose}</span>
    </div>
  )
})

export default memo(function BlueprintViewer({ blueprint, onClose }) {
  if (!blueprint) return null

  const fe   = blueprint.frontendStructure   || {}
  const be   = blueprint.backendStructure    || {}
  const db   = blueprint.databaseRequirements || {}
  const phases = blueprint.phases || []
  const security = blueprint.securityConsiderations || []

  return (
    <div className="bg-gray-800 border border-indigo-500/30 rounded-xl overflow-hidden mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-indigo-900/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">📐</span>
          <h3 className="text-sm font-semibold text-white">Implementation Blueprint</h3>
          {blueprint._fallback && (
            <span className="text-[10px] bg-yellow-900/50 text-yellow-400 border border-yellow-700/40 px-2 py-0.5 rounded-full">fallback</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">~{blueprint.estimatedBuildTimeHours}h build</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xs transition-colors"
          >
            Close ✕
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* MVP scope */}
        {blueprint.mvpScope && (
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-medium mb-1">MVP Scope</p>
            <p className="text-sm text-white">{blueprint.mvpScope}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Frontend */}
          <Section title="Frontend Structure" icon="🎨">
            <div className="space-y-2 text-xs">
              {fe.uiPattern && <p className="text-gray-400">Pattern: <span className="text-white font-mono">{fe.uiPattern}</span></p>}
              {fe.stateManagement && <p className="text-gray-400">State: <span className="text-white">{fe.stateManagement}</span></p>}
              {fe.pages?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Pages</p>
                  <div className="space-y-0.5">
                    {fe.pages.map((p, i) => <p key={i} className="text-gray-300 font-mono text-[11px]">• {p}</p>)}
                  </div>
                </div>
              )}
              {fe.components?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Components</p>
                  <div className="flex flex-wrap gap-1">
                    {fe.components.map((c, i) => <Tag key={i} text={c} color="bg-blue-900/30 text-blue-300" />)}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Backend */}
          <Section title="Backend Structure" icon="⚙️">
            <div className="space-y-2 text-xs">
              {be.aiIntegration && be.aiIntegration !== 'none' && (
                <p className="text-gray-400">AI: <span className="text-white">{be.aiIntegration}</span></p>
              )}
              {be.endpoints?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Endpoints</p>
                  <div className="space-y-0.5">
                    {be.endpoints.map((ep, i) => <EndpointRow key={i} endpoint={ep} />)}
                  </div>
                </div>
              )}
              {be.middleware?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Middleware</p>
                  <div className="flex flex-wrap gap-1">
                    {be.middleware.map((m, i) => <Tag key={i} text={m} color="bg-yellow-900/30 text-yellow-300" />)}
                  </div>
                </div>
              )}
              {be.aiPromptStrategy && (
                <p className="text-gray-400 text-[11px] mt-1">{be.aiPromptStrategy}</p>
              )}
            </div>
          </Section>

          {/* Database */}
          <Section title="Database Requirements" icon="🗄️">
            <div className="space-y-2 text-xs">
              <p className="text-gray-400">New tables: <span className={db.newTablesNeeded ? 'text-yellow-400' : 'text-green-400'}>{db.newTablesNeeded ? 'Yes' : 'No (uses existing)'}</span></p>
              {db.caching && <p className="text-gray-400">Caching: <span className="text-white">{db.caching}</span></p>}
              {db.tables?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Tables</p>
                  {db.tables.map((t, i) => (
                    <p key={i} className="text-gray-300 font-mono text-[11px]">• {typeof t === 'string' ? t : `${t.name} — ${t.purpose}`}</p>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Security */}
          <Section title="Security Considerations" icon="🔒">
            <ul className="space-y-1">
              {security.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Build phases */}
        {phases.length > 0 && (
          <Section title="Build Phases" icon="🗓️">
            <div className="space-y-3">
              {phases.map((phase, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-400">{phase.phase}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-white">{phase.name}</p>
                      <span className="text-[10px] text-gray-500">~{phase.hours}h</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(phase.tasks || []).map((t, j) => (
                        <span key={j} className="text-[10px] bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Est. Lines', value: blueprint.estimatedLinesOfCode?.toLocaleString() || '—' },
            { label: 'Build Hours', value: `~${blueprint.estimatedBuildTimeHours || '—'}h` },
            { label: 'Test Strategy', value: blueprint.testingStrategy?.split(' ').slice(0, 3).join(' ') + '…' || 'Unit + Integration' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-700/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-gray-500 mb-1">{label}</p>
              <p className="text-xs text-white font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
