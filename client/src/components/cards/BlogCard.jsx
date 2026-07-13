import { Link } from 'react-router-dom'

export default function BlogCard({
  to, category, updatedDate, title, excerpt, authorInitials, authorName, readTime, className = '',
}) {
  return (
    <Link
      to={to}
      className={`block bg-card border-[1.5px] border-line rounded-m overflow-hidden transition-[transform,box-shadow,border-color] duration-micro ease-ds-ease hover:-translate-y-[3px] hover:shadow-card-hover hover:border-cobalt motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <div
        className="h-[length:var(--blogcard-band-height)] bg-gradient-to-r from-cobalt to-marigold"
        aria-hidden="true"
      />
      <div className="p-[length:var(--blogcard-padding)]">
        <div className="flex gap-2.5 font-mono text-[length:var(--text-blogcard-meta)] tracking-[length:var(--tracking-blogcard-meta)] uppercase text-ink-soft mb-2.5">
          <span>{category}</span>
          <span aria-hidden="true">·</span>
          <span>{updatedDate}</span>
        </div>
        <h3 className="font-body font-bold text-[length:var(--text-blogcard-title)] text-ink mb-2">{title}</h3>
        <p className="text-[length:var(--text-blogcard-excerpt)] text-ink-soft">{excerpt}</p>
        <div className="flex items-center gap-2.5 mt-4 pt-3.5 border-t border-line">
          <span
            className="w-[length:var(--blogcard-avatar-size)] h-[length:var(--blogcard-avatar-size)] rounded-full bg-cobalt-tint text-cobalt grid place-items-center text-xs font-bold shrink-0"
            aria-hidden="true"
          >
            {authorInitials}
          </span>
          <span className="text-[length:var(--text-blogcard-author)] text-ink-soft">
            <b className="text-ink font-semibold">{authorName}</b> · {readTime}
          </span>
        </div>
      </div>
    </Link>
  )
}
