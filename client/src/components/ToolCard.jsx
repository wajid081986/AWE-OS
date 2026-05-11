import { Link } from 'react-router-dom'

const CATEGORY_COLORS = {
  ai_tools:    'bg-blue-50 text-blue-700',
  converters:  'bg-purple-50 text-purple-700',
  calculators: 'bg-green-50 text-green-700',
  products:    'bg-orange-50 text-orange-700',
  default:     'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS = {
  ai_tools:    'AI Tool',
  converters:  'Converter',
  calculators: 'Calculator',
  products:    'Product',
}

function fmtCount(n) {
  if (!n) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export default function ToolCard({ tool }) {
  const { name, slug, description, icon, category, usageCount, isNew, isFeatured } = tool
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.default
  const label      = CATEGORY_LABELS[category]  || category

  return (
    <Link
      to={`/tools/${slug}`}
      className="group h-full bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0 leading-none mt-0.5" aria-hidden="true">{icon || '🛠️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-gray-900 font-semibold text-sm leading-tight group-hover:text-blue-700 transition-colors">{name}</h3>
            {isNew && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">New</span>
            )}
            {isFeatured && !isNew && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium" aria-hidden="true">⭐</span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${colorClass}`}>{label}</span>
        {usageCount && (
          <span className="text-xs text-gray-400 shrink-0">{fmtCount(usageCount)} uses</span>
        )}
        <span className="ml-auto text-xs text-blue-600 group-hover:text-blue-700 font-medium whitespace-nowrap shrink-0">
          Use Free →
        </span>
      </div>
    </Link>
  )
}
