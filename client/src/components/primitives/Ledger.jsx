export default function Ledger({ title, rows = [], className = '' }) {
  return (
    <div
      className={`[border:var(--border-ledger)] rounded-ledger py-[length:var(--space-4)] px-[length:var(--ledger-padding-x)] font-mono text-[length:var(--text-ledger)] text-ink-soft ${className}`}
    >
      {title && <p className="mb-1 text-ink-soft">{title}</p>}
      {rows.map(({ label, value, highlight }, i) => (
        <div
          key={label}
          className={`flex justify-between py-[5px] ${i > 0 ? '[border-top:1px_dotted_var(--line)]' : ''}`}
        >
          <span>{label}</span>
          <span className={`font-bold ${highlight ? 'text-mint-text-strong' : 'text-ink'}`}>{value}</span>
        </div>
      ))}
    </div>
  )
}
