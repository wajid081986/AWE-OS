import { useState } from 'react'

/**
 * DisabledToolButton
 * Renders a visually disabled toolbar button with a hover tooltip.
 * No alert() — no popup. Just a clean tooltip explaining the status.
 *
 * Usage:
 *   <DisabledToolButton icon="📝" label="Edit Text"
 *     tooltip="Direct PDF text editing coming soon. Use Text Box tool instead." />
 */
export default function DisabledToolButton({ icon, label, tooltip, comingSoonLabel = 'Coming Soon' }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        disabled
        aria-disabled="true"
        aria-label={`${label} — ${tooltip}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="flex flex-col items-center justify-center gap-0.5 rounded-xl min-w-[52px] px-2 py-1.5
                   opacity-40 cursor-not-allowed select-none flex-shrink-0
                   border border-transparent text-gray-400"
      >
        <span className="leading-none text-lg">{icon}</span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap">{label}</span>
        <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide leading-none mt-0.5">
          {comingSoonLabel}
        </span>
      </button>

      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999]
                     w-56 bg-gray-950 text-white text-xs rounded-xl
                     px-3 py-2.5 shadow-2xl border border-gray-700
                     pointer-events-none"
        >
          <p className="text-gray-300 leading-relaxed">{tooltip}</p>
          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2
                          border-4 border-transparent border-t-gray-950" />
        </div>
      )}
    </div>
  )
}
