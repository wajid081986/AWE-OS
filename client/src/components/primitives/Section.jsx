export default function Section({ as: As = 'section', className = '', children, ...props }) {
  return (
    <As
      className={`py-[length:var(--space-8)] max-[560px]:py-[length:var(--space-section-mobile)] ${className}`}
      {...props}
    >
      {children}
    </As>
  )
}
