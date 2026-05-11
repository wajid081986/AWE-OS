const SIZES = {
  sm: { heading: 'text-base font-semibold', sub: 'text-xs' },
  md: { heading: 'text-xl font-semibold',   sub: 'text-sm' },
  lg: { heading: 'text-2xl font-bold',       sub: 'text-sm' },
}

export default function SectionTitle({
  as: As = 'h2',
  title,
  subtitle,
  size = 'md',
  divider = false,
  className = '',
}) {
  const { heading, sub } = SIZES[size] || SIZES.md

  return (
    <div className={`mb-4 ${className}`}>
      <div className={divider ? 'flex items-center gap-3' : ''}>
        <As className={`${heading} text-gray-900`}>{title}</As>
        {divider && <div className="flex-1 h-px bg-gray-200" />}
      </div>
      {subtitle && (
        <p className={`${sub} text-gray-500 mt-1`}>{subtitle}</p>
      )}
    </div>
  )
}
