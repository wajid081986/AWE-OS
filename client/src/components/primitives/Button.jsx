const BASE = 'inline-flex items-center justify-center gap-2 font-body font-semibold text-[.95rem] rounded-s transition-[background-color,border-color,transform,box-shadow] duration-micro ease-ds-ease focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS = {
  primary: 'bg-cobalt text-white shadow-button hover:bg-cobalt-deep hover:-translate-y-px',
  ghost: 'bg-transparent text-ink border-[1.5px] border-line hover:border-ink-soft',
}

const SIZES = {
  default: 'py-[length:var(--btn-padding-y)] px-[length:var(--btn-padding-x)]',
  compact: 'py-[length:var(--btn-padding-y-compact)] px-[length:var(--btn-padding-x-compact)]',
}

export default function Button({
  variant = 'primary',
  size = 'default',
  as: As = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <As
      className={`${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.default} ${className}`}
      {...props}
    >
      {children}
    </As>
  )
}
