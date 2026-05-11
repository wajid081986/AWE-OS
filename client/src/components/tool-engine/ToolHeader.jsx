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
    <div className={`flex items-start gap-4 mb-6 ${className}`}>
      <span className="text-5xl shrink-0 leading-none" aria-hidden>
        {icon || '🛠️'}
      </span>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
        {description && (
          <p className="text-gray-500 mt-1 text-sm leading-relaxed">{description}</p>
        )}
        <ToolBadge isPremium={isPremium} isNew={isNew} isAI={isAI} />
      </div>
    </div>
  )
}
