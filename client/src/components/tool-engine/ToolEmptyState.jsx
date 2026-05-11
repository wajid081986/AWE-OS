// Placeholder rendered inside tool output areas before the user triggers any action.
export default function ToolEmptyState({
  icon = '⚡',
  title = 'Your result will appear here',
  description = 'Use the controls to get started',
  className = '',
}) {
  return (
    <div
      className={`flex items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-xl ${className}`}
    >
      <div className="text-center">
        <p className="text-3xl mb-2" aria-hidden>{icon}</p>
        <p className="text-gray-400 text-sm">{title}</p>
        {description && (
          <p className="text-gray-300 text-xs mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}
