const SIZES = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
}

const COLORS = {
  blue:   'border-blue-600 border-t-transparent',
  white:  'border-white border-t-transparent',
  gray:   'border-gray-400 border-t-transparent',
  indigo: 'border-indigo-500 border-t-transparent',
}

export default function LoadingSpinner({
  size = 'md',
  color = 'blue',
  label,
  center = false,
  className = '',
}) {
  const spinner = (
    <div
      className={`${SIZES[size] || SIZES.md} ${COLORS[color] || COLORS.blue} rounded-full animate-spin shrink-0 ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    />
  )

  if (!label && !center) return spinner

  return (
    <div className={`flex items-center gap-2 ${center ? 'justify-center' : ''}`}>
      {spinner}
      {label && <span className="text-gray-500 text-sm">{label}</span>}
    </div>
  )
}
