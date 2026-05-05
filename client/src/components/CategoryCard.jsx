import { Link } from 'react-router-dom'

export default function CategoryCard({ icon, title, description, count, to, accent = 'blue' }) {
  const accents = {
    blue:   'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    green:  'bg-green-50 text-green-600 group-hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
  }
  const iconBg = accents[accent] || accents.blue

  return (
    <Link
      to={to}
      className="group bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-gray-900 font-semibold text-base">{title}</h3>
          {count != null && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}+</span>
          )}
        </div>
        <p className="text-gray-500 text-sm mt-1 leading-snug">{description}</p>
      </div>
      <span className="text-blue-600 text-sm font-medium group-hover:gap-2 transition-all mt-auto">
        Explore →
      </span>
    </Link>
  )
}
