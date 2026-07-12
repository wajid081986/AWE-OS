export default function Chip({ icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[length:var(--text-caption)] font-medium py-[length:var(--chip-padding-y)] px-[length:var(--chip-padding-x)] rounded-full bg-card border border-line text-ink-soft ${className}`}
    >
      {icon && <strong className="text-mint font-bold">{icon}</strong>}
      {children}
    </span>
  )
}
