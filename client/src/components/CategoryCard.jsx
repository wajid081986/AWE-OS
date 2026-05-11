import { Link } from 'react-router-dom'

export default function CategoryCard({ icon, title, description, count, to, accent = 'blue' }) {
  const accents = {
    blue:   'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    green:  'bg-green-50 text-green-600 group-hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    red:    'bg-red-50 text-red-600 group-hover:bg-red-100',
  }
  const iconBg = accents[accent] || accents.blue

  return (
    <Link
      to={to}
      aria-label={`${title} — ${description}`}
      className="group h-full bg-white border border-gray-200 rounded-xl p-5 sm:p-6 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all hover:-translate-y-0.5"
    >
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl transition-colors shrink-0 ${iconBg}`} aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-gray-900 font-semibold text-sm sm:text-base">{title}</h3>
          {count != null && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}+</span>
          )}
        </div>
        <p className="text-gray-500 text-xs sm:text-sm mt-1 leading-snug">{description}</p>
      </div>
      <span className="text-blue-600 text-sm font-medium mt-auto" aria-hidden="true">
        Explore →
      </span>
    </Link>
  )
}
