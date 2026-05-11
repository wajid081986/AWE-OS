import LoadingSpinner from '../ui/LoadingSpinner'

// Used inside AI/async tool output areas during processing.
// Receives optional context-aware title and description from the caller.
export default function ToolLoadingState({
  title = 'Processing…',
  description,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" color="blue" center />
        <p className="text-gray-500 text-sm mt-4">{title}</p>
        {description && (
          <p className="text-gray-300 text-xs mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}
