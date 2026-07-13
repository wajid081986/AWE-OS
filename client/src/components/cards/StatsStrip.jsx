import { Container } from '../primitives'

export default function StatsStrip({ stats = [], className = '' }) {
  return (
    <div className={`bg-ink text-card py-[length:var(--statsstrip-padding-y)] ${className}`}>
      <Container className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map(({ value, suffix, label }) => (
          <div key={label}>
            <span className="block font-mono text-[length:var(--text-stat-value)] font-bold text-card">
              {value}
              {suffix && <em className="not-italic text-marigold">{suffix}</em>}
            </span>
            <span className="text-[length:var(--text-stat-label)] text-[color:var(--statsstrip-text-dim)]">{label}</span>
          </div>
        ))}
      </Container>
    </div>
  )
}
