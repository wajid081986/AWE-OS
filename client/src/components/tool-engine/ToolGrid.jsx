import { Link } from 'react-router-dom'

// compact=true → used in sidebar (vertical list with icon + name + desc)
// compact=false → used in category pages (card grid)
export default function ToolGrid({ tools = [], compact = false, className = '' }) {
  if (!tools.length) return null

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`}>
        {tools.map(tool => (
          <Link
            key={tool.slug}
            to={`/tools/${tool.slug}`}
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <span className="text-xl shrink-0" aria-hidden>{tool.icon || '🛠️'}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 truncate transition-colors">
                {tool.name}
              </p>
              {tool.description && (
                <p className="text-xs text-gray-400 truncate">{tool.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {tools.map(tool => (
        <Link
          key={tool.slug}
          to={`/tools/${tool.slug}`}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/40 transition-all group"
        >
          <span className="text-2xl shrink-0" aria-hidden>{tool.icon || '🛠️'}</span>
          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">
            {tool.name}
          </p>
        </Link>
      ))}
    </div>
  )
}
