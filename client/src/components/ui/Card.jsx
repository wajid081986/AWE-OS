const VARIANTS = {
  default:  'bg-white border border-gray-200 rounded-xl',
  elevated: 'bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow',
  flat:     'bg-gray-50 rounded-xl',
  outlined: 'bg-white border-2 border-gray-200 rounded-xl',
}

const PADDINGS = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export default function Card({
  variant = 'default',
  padding = 'md',
  as: As = 'div',
  className = '',
  children,
  ...props
}) {
  return (
    <As
      className={`${VARIANTS[variant] || VARIANTS.default} ${PADDINGS[padding] ?? PADDINGS.md} ${className}`}
      {...props}
    >
      {children}
    </As>
  )
}
