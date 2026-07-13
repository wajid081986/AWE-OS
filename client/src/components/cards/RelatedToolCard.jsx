import { Link } from 'react-router-dom'

export default function RelatedToolCard({ to, title, description, className = '' }) {
  return (
    <Link
      to={to}
      className={`block bg-card border-[1.5px] border-line rounded-callout p-[length:var(--relcard-padding)] text-ink transition-[border-color,transform] duration-micro ease-ds-ease hover:border-cobalt hover:-translate-y-[2px] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <h3 className="font-body text-[length:var(--text-md)] mb-1">{title}</h3>
      <p className="text-[length:var(--text-relcard-desc)]">{description}</p>
    </Link>
  )
}
