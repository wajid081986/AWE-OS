const SIZES = {
  default: 'max-w-content',
  narrow: 'max-w-content-narrow',
}

export default function Container({ size = 'default', className = '', children, ...props }) {
  return (
    <div className={`mx-auto px-[length:var(--space-5)] ${SIZES[size] || SIZES.default} ${className}`} {...props}>
      {children}
    </div>
  )
}
