export default function Badge({ icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[length:var(--text-badge)] font-semibold py-[length:var(--badge-padding-y)] px-[length:var(--badge-padding-x)] rounded-full bg-card border border-line text-ink-soft ${className}`}
    >
      {icon && <b className="text-mint">{icon}</b>}
      {children}
    </span>
  )
}
