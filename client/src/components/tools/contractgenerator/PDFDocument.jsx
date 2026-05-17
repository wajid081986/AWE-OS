import { usePDFGeneration } from '../../../hooks/usePDFGeneration'

export default function PDFDocument({ contractData, formData, disabled }) {
  const { generate, status, error } = usePDFGeneration()

  const isGenerating = status === 'generating'
  const isDone       = status === 'done'

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || isGenerating}
        onClick={() => generate(contractData, formData)}
        className={`
          w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3
          transition-all duration-200
          ${disabled || isGenerating
            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
            : isDone
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01]'
          }
        `}
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating PDF…
          </>
        ) : isDone ? (
          <><span>✅</span> PDF Downloaded!</>
        ) : (
          <><span>📥</span> Download Contract PDF</>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      <p className="text-xs text-gray-500 text-center">
        Professional A4 PDF • All pages numbered • Signature blocks included
      </p>
    </div>
  )
}
