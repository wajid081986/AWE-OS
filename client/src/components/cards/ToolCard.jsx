import { Link } from 'react-router-dom'

const TAG_VARIANTS = {
  'no-upload':   'bg-mint-tint text-mint-text-strong',
  'india-ready': 'bg-marigold-tint text-marigold-text-strong',
  'ai-assisted': 'bg-cobalt-tint text-cobalt',
}

export default function ToolCard({ icon, name, description, to, tag, className = '' }) {
  const tagClass = tag ? (TAG_VARIANTS[tag.variant] || TAG_VARIANTS['no-upload']) : ''

  return (
    <Link
      to={to}
      className={`block bg-card border-[1.5px] border-line rounded-m p-5 transition-[transform,box-shadow,border-color] duration-micro ease-ds-ease hover:-translate-y-[3px] hover:shadow-card-hover hover:border-cobalt motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <div
        className="grid place-items-center rounded-s bg-cobalt-tint text-[length:var(--text-toolcard-icon)] mb-3.5"
        style={{ width: 'var(--toolcard-icon-size)', height: 'var(--toolcard-icon-size)' }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="font-body font-bold text-base text-ink mb-1.5">{name}</h3>
      <p className="text-[length:var(--text-toolcard-desc)] text-ink-soft leading-normal line-clamp-2">{description}</p>
      {tag && (
        <span
          className={`inline-block mt-3 font-mono text-[length:var(--text-toolcard-tag)] font-bold tracking-[length:var(--tracking-toolcard-tag)] uppercase py-1 px-2.5 rounded ${tagClass}`}
        >
          {tag.label}
        </span>
      )}
    </Link>
  )
}
