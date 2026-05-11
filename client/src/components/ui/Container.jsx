const SIZES = {
  sm:   'max-w-2xl',
  md:   'max-w-4xl',
  lg:   'max-w-5xl',
  xl:   'max-w-7xl',
  full: 'w-full',
}

export default function Container({
  size = 'xl',
  className = '',
  children,
  ...props
}) {
  return (
    <div
      className={`${SIZES[size] || SIZES.xl} mx-auto px-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
