export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  variant = 'dashed',
  className = '',
}) {
  return (
    <div
      className={`flex items-center justify-center py-16 ${
        variant === 'dashed' ? 'border-2 border-dashed border-gray-200 rounded-xl' : ''
      } ${className}`}
    >
      <div className="text-center">
        <p className="text-3xl mb-3" aria-hidden>{icon}</p>
        {title && (
          <p className="text-gray-600 font-medium text-sm mb-1">{title}</p>
        )}
        {description && (
          <p className="text-gray-400 text-xs">{description}</p>
        )}
        {action && (
          typeof action === 'object' && 'label' in action ? (
            <button
              onClick={action.onClick}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {action.label}
            </button>
          ) : (
            <div className="mt-4">{action}</div>
          )
        )}
      </div>
    </div>
  )
}
