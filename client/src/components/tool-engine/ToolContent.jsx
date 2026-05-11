export default function ToolContent({ children, className = '' }) {
  return (
    <main className={`flex-1 min-w-0 ${className}`}>
      {children}
    </main>
  )
}
