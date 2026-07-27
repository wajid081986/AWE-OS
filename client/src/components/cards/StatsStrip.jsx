import { Container } from '../primitives'

export default function StatsStrip({ stats = [], className = '' }) {
  return (
    <div className={`bg-card py-[length:var(--statsstrip-padding-y)] ${className}`}>
      <Container className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 md:divide-x divide-[color:var(--stat-divider)]">
        {stats.map(({ value, suffix, label }) => (
          <div key={label} className="px-0 md:px-6 first:pl-0 py-3 md:py-0">
            <span className="block font-mono text-[length:var(--text-stat-value)] font-medium text-cobalt">
              {value}
              {suffix && <em className="not-italic text-cobalt">{suffix}</em>}
            </span>
            <span className="text-[length:var(--text-stat-label)] text-[color:var(--text-muted-slate)]">{label}</span>
          </div>
        ))}
      </Container>
    </div>
  )
}
