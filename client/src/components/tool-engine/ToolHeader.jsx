import ToolBadge from './ToolBadge'

export default function ToolHeader({
  icon,
  name,
  description,
  isPremium = false,
  isNew = false,
  isAI = false,
  className = '',
}) {
  return (
    <div className={`flex items-start gap-3 sm:gap-4 mb-6 ${className}`}>
      <span className="text-4xl sm:text-5xl shrink-0 leading-none mt-0.5" aria-hidden="true">
        {icon || '🛠️'}
      </span>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
        {description && (
          <p className="text-gray-500 mt-1 text-sm leading-relaxed">{description}</p>
        )}
        <ToolBadge isPremium={isPremium} isNew={isNew} isAI={isAI} />
      </div>
    </div>
  )
}
