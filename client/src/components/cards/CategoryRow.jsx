import { Link } from 'react-router-dom'

export default function CategoryRow({ name, count, description, to, linkLabel, className = '' }) {
  return (
    <div
      className={`bg-card border-[1.5px] border-line rounded-m grid grid-cols-1 md:grid-cols-[170px_1fr_auto] gap-3 md:gap-[length:var(--catrow-gap)] items-start py-[length:var(--catrow-padding-y)] px-[length:var(--catrow-padding-x)] ${className}`}
    >
      <div>
        <span className="font-display font-bold text-[length:var(--text-catrow-name)] text-ink">{name}</span>
        <span className="block mt-1.5 font-mono text-[length:var(--text-catrow-count)] font-bold text-marigold-text-strong">
          {count} TOOLS
        </span>
      </div>
      <p className="text-[length:var(--text-md)] text-ink-soft [&_a]:font-semibold">{description}</p>
      <Link to={to} className="whitespace-nowrap font-semibold text-[length:var(--text-md)] self-center text-cobalt">
        {linkLabel}
      </Link>
    </div>
  )
}
