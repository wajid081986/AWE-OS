import { Link } from 'react-router-dom'

export default function ToolCTA({
  title = 'Want more tools?',
  description = 'Create a free account to save your work, access history, and unlock 100+ AI tools.',
  ctaLabel = 'Create Free Account',
  ctaTo = '/login',
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
      <p className="text-sm font-semibold text-blue-900 mb-1">{title}</p>
      <p className="text-xs text-blue-700 mb-3">{description}</p>
      <Link
        to={ctaTo}
        className="inline-block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
