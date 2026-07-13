const VARIANTS = {
  warning: {
    box: 'bg-marigold-tint [border:1.5px_solid_var(--marigold-border)] rounded-callout py-[length:var(--callout-padding-y)] px-[length:var(--callout-padding-x)]',
    text: 'text-[length:var(--text-callout)] text-marigold-text-strong',
  },
  success: {
    box: 'bg-mint-tint [border:1.5px_solid_var(--mint-border)] rounded-m py-[length:var(--callout-padding-y-success)] px-[length:var(--space-5)]',
    text: 'text-[length:var(--text-callout-success)] text-mint-text-strong',
  },
}

export default function Callout({ variant = 'warning', title, children, className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.warning

  return (
    <div className={`${v.box} ${className}`}>
      {title && (
        <h3 className={`flex items-center gap-2 mb-2 font-body font-semibold ${v.text}`}>{title}</h3>
      )}
      <p className={`m-0 font-body ${v.text}`}>{children}</p>
    </div>
  )
}
