export default function ToolContainer({ children, className = '' }) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-8 ${className}`}>
      {children}
    </div>
  )
}
