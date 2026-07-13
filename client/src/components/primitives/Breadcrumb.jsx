import { Link } from 'react-router-dom'

export default function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={`font-body text-[length:var(--text-breadcrumb)] text-ink-soft ${className}`}>
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center">
          {i > 0 && <span className="mx-[7px] text-line" aria-hidden="true">/</span>}
          {item.href ? (
            <Link to={item.href} className="text-ink-soft hover:text-ink">{item.label}</Link>
          ) : (
            <strong className="text-ink font-semibold">{item.label}</strong>
          )}
        </span>
      ))}
    </nav>
  )
}
