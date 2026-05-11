import { Link } from 'react-router-dom'

// Renders the breadcrumb navigation above the two-column layout.
// Kept separate from ToolHeader so callers can inject content between them.
export default function ToolHero({ tool, catMeta, className = '' }) {
  const toolName = tool?.name || ''

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap ${className}`}
    >
      <Link to="/"      className="hover:text-gray-700 transition-colors">Home</Link>
      <span aria-hidden>/</span>
      <Link to="/tools" className="hover:text-gray-700 transition-colors">Tools</Link>
      {catMeta && (
        <>
          <span aria-hidden>/</span>
          <Link to={`/tools/${catMeta.slug}`} className="hover:text-gray-700 transition-colors">
            {catMeta.name}
          </Link>
        </>
      )}
      <span aria-hidden>/</span>
      <span className="text-gray-800 font-medium">{toolName}</span>
    </nav>
  )
}
