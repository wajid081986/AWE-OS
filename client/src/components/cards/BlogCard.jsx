import { Link } from 'react-router-dom'

export default function BlogCard({
  to, category, updatedDate, title, excerpt, authorInitials, authorName, readTime, className = '',
}) {
  return (
    <Link
      to={to}
      className={`block bg-card border-[1.5px] border-line rounded-m overflow-hidden transition-[transform,box-shadow,border-color] duration-micro ease-ds-ease hover:-translate-y-[3px] hover:shadow-card-hover hover:border-cobalt motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <div className="bg-gradient-to-br from-cobalt-tint to-[color:var(--blogcard-header-end)] border-b border-cobalt-border py-3 px-[length:var(--blogcard-padding)]">
        <div className="flex gap-2.5 font-mono text-[length:var(--text-blogcard-meta)] tracking-[length:var(--tracking-blogcard-meta)] mb-0">
          <span className="uppercase text-cobalt">{category}</span>
          <span aria-hidden="true" className="text-ink-soft">·</span>
          <span className="normal-case tracking-normal text-ink-soft">{updatedDate}</span>
        </div>
      </div>
      <div className="p-[length:var(--blogcard-padding)]">
        <h3 className="font-body font-medium text-[length:var(--text-blogcard-title)] text-ink mb-2">{title}</h3>
        <p className="text-[length:var(--text-blogcard-excerpt)] text-ink-soft">{excerpt}</p>
        <div className="flex items-center justify-between gap-2.5 mt-4 pt-3.5 border-t border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-[length:var(--blogcard-avatar-size)] h-[length:var(--blogcard-avatar-size)] rounded-full bg-cobalt-tint text-cobalt grid place-items-center text-xs font-bold shrink-0"
              aria-hidden="true"
            >
              {authorInitials}
            </span>
            <span className="text-[length:var(--text-blogcard-author)] text-[color:var(--text-muted-slate)] truncate">
              <b className="text-ink font-semibold">{authorName}</b> · {readTime}
            </span>
          </div>
          <span className="text-xs font-semibold text-cobalt shrink-0" aria-hidden="true">Read →</span>
        </div>
      </div>
    </Link>
  )
}
