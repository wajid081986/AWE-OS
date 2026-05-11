const VARIANTS = {
  free:       'bg-green-50 text-green-700 border border-green-200',
  new:        'bg-green-100 text-green-700',
  premium:    'bg-amber-50 text-amber-700 border border-amber-200',
  ai:         'bg-purple-50 text-purple-700 border border-purple-200',
  comingSoon: 'bg-gray-100 text-gray-500',
  success:    'bg-green-100 text-green-800',
  warning:    'bg-yellow-100 text-yellow-700',
  info:       'bg-blue-50 text-blue-700 border border-blue-100',
  default:    'bg-gray-100 text-gray-600',
}

const SIZES = {
  sm: 'text-xs px-2 py-0.5 rounded-full',
  md: 'text-xs px-2.5 py-1 rounded-full',
}

export default function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center font-medium ${VARIANTS[variant] || VARIANTS.default} ${SIZES[size] || SIZES.sm} ${className}`}
    >
      {children}
    </span>
  )
}
