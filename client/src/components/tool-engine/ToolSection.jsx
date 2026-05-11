export default function ToolSection({
  title,
  as: As = 'section',
  ariaLabel,
  id,
  className = '',
  children,
}) {
  return (
    <As
      className={`mb-10 ${className}`}
      aria-label={ariaLabel || title || undefined}
      id={id}
    >
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      )}
      {children}
    </As>
  )
}
