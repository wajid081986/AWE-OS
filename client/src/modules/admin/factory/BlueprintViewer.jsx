import { memo, useState, useCallback } from 'react'

// ── Expandable folder group ───────────────────────────────────────────────────

function FolderGroup({ icon, label, files, color }) {
  const [open, setOpen] = useState(true)
  if (!files?.length) return null
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 w-full text-left py-0.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <span className="text-[9px] text-gray-600 w-2.5">{open ? '▼' : '▶'}</span>
        <span>{icon}</span>
        <span className="font-medium">{label}</span>
        <span className="text-gray-600 ml-auto text-[10px]">{files.length}</span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700/60 pl-3">
          {files.map((f, i) => (
            <p key={i} className={`text-xs font-mono py-0.5 ${color}`}>
              {typeof f === 'string' ? f : f.name || String(f)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── File tree ────────────────────────────────────────────────────────────────

const FileTree = memo(function FileTree({ architecture, filePath }) {
  const { mainFile, components = [], utilities = [], hooks = [] } = architecture || {}
  const main = mainFile || filePath

  if (!main && !components.length && !utilities.length && !hooks.length) {
    return <p className="text-xs text-gray-500 italic">No file structure provided</p>
  }

  return (
    <div className="bg-gray-900/70 rounded-lg border border-gray-700/50 p-3 font-mono space-y-2">
      {main && (
        <div className="flex items-center gap-1.5 text-xs">
          <span>📄</span>
          <span className="text-blue-300 font-medium">{main.split('/').pop()}</span>
          <span className="text-gray-600 text-[9px] hidden sm:block truncate">{main}</span>
        </div>
      )}
      <FolderGroup icon="🧩" label="components" files={components} color="text-purple-300" />
      <FolderGroup icon="⚙️" label="utilities"  files={utilities}  color="text-yellow-300" />
      <FolderGroup icon="🪝" label="hooks"      files={hooks}      color="text-green-300"  />
    </div>
  )
})

// ── Build steps timeline ──────────────────────────────────────────────────────

const BuildTimeline = memo(function BuildTimeline({ steps = [] }) {
  if (!steps.length) return null
  const total = steps.reduce((s, st) => s + (st.minutes || 0), 0)
  const totalHours = Math.round((total / 60) * 10) / 10

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const pct = total > 0 ? Math.round(((step.minutes || 0) / total) * 100) : 0
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-indigo-400">{step.step}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-white font-medium truncate pr-2">{step.task}</p>
                <span className="text-[10px] text-gray-500 shrink-0">{step.minutes}m</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500/70 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
        <span className="text-[10px] text-gray-600">{steps.length} steps</span>
        <span className="text-xs font-semibold text-white">Total: ~{totalHours}h</span>
      </div>
    </div>
  )
})

// ── Fields table ──────────────────────────────────────────────────────────────

const FieldsTable = memo(function FieldsTable({ inputFields = [], outputFields = [] }) {
  if (!inputFields.length && !outputFields.length) return null
  return (
    <div className="space-y-4">
      {inputFields.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
            Input Fields ({inputFields.length})
          </p>
          <div className="rounded-lg border border-gray-700/60 overflow-hidden">
            {inputFields.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20 transition-colors">
                <span className="font-mono text-indigo-300 w-28 shrink-0 truncate">{f.name}</span>
                <span className="text-[10px] bg-gray-700/80 text-gray-400 px-1.5 py-0.5 rounded shrink-0">{f.type}</span>
                <span className="text-gray-400 flex-1 truncate">{f.label}</span>
                {f.required && <span className="text-red-400 text-[10px] shrink-0 font-medium">required</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {outputFields.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">
            Output Fields ({outputFields.length})
          </p>
          <div className="rounded-lg border border-gray-700/60 overflow-hidden">
            {outputFields.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20 transition-colors">
                <span className="font-mono text-green-300 w-28 shrink-0 truncate">{f.name}</span>
                <span className="text-gray-400 flex-1 truncate">{f.label}</span>
                {f.format && <span className="text-[10px] text-gray-500 shrink-0">{f.format}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

export default memo(function BlueprintViewer({ blueprint, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [blueprint])

  if (!blueprint) return null

  const {
    componentName, filePath, estimatedHours, complexity,
    architecture, coreAlgorithm, inputFields = [], outputFields = [],
    libraries = [], buildSteps = [], monetizationStrategy,
    affiliateOpportunities = [], toolRegistryEntry = {},
  } = blueprint

  const totalMinutes = buildSteps.reduce((s, st) => s + (st.minutes || 0), 0)
  const totalHours   = totalMinutes > 0 ? Math.round((totalMinutes / 60) * 10) / 10 : estimatedHours

  return (
    <div className="bg-gray-800 border border-indigo-500/30 rounded-xl overflow-hidden mt-4">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-indigo-900/20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg shrink-0">📐</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {componentName || 'Implementation Blueprint'}
            </h3>
            {filePath && (
              <p className="text-[10px] text-gray-500 font-mono truncate">{filePath}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {totalHours && (
            <span className="text-xs text-gray-400">⏱ ~{totalHours}h</span>
          )}
          {complexity && (
            <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full capitalize">
              {complexity}
            </span>
          )}
          <button
            onClick={handleCopyJson}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              copied
                ? 'bg-green-600/20 text-green-400 border border-green-500/40'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {copied ? '✓ Copied' : '{ } JSON'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* Core algorithm */}
        {coreAlgorithm && (
          <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-3">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-medium mb-1">Core Algorithm</p>
            <p className="text-xs text-gray-300 leading-relaxed">{coreAlgorithm}</p>
          </div>
        )}

        {/* File tree + Build timeline side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">File Structure</p>
            <FileTree architecture={architecture} filePath={filePath} />
            {libraries.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-gray-500 mb-1.5">Libraries</p>
                <div className="flex flex-wrap gap-1">
                  {libraries.map((lib, i) => (
                    <span key={i} className="text-[11px] bg-blue-900/30 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded font-mono">
                      {lib}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Build Timeline</p>
            <BuildTimeline steps={buildSteps} />
          </div>
        </div>

        {/* Fields table */}
        {(inputFields.length > 0 || outputFields.length > 0) && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-3">Fields</p>
            <FieldsTable inputFields={inputFields} outputFields={outputFields} />
          </div>
        )}

        {/* Monetization */}
        {(monetizationStrategy || affiliateOpportunities.length > 0) && (
          <div className="bg-green-950/30 border border-green-700/30 rounded-lg p-3">
            <p className="text-[10px] text-green-400 uppercase tracking-wider font-medium mb-1">Monetization Strategy</p>
            {monetizationStrategy && (
              <p className="text-xs text-gray-300 leading-relaxed">{monetizationStrategy}</p>
            )}
            {affiliateOpportunities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {affiliateOpportunities.map((opp, i) => (
                  <span key={i} className="text-[10px] bg-green-900/40 text-green-300 border border-green-700/30 px-2 py-0.5 rounded">
                    {opp}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Registry entry */}
        {toolRegistryEntry?.slug && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Tool Registry Entry</p>
            <div className="bg-gray-900/70 rounded-lg border border-gray-700/50 p-3">
              <pre className="text-[10px] text-green-300 font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(toolRegistryEntry, null, 2)}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  )
})
