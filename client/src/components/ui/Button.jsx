const BASE = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  secondary: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-gray-300',
  ghost:     'hover:bg-gray-100 text-gray-600 focus:ring-gray-300',
  danger:    'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
  outline:   'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-sm rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden
        />
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
