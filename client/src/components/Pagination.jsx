export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i)
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>

      {pages[0] > 1 && (
        <>
          <button
            onClick={() => onPage(1)}
            aria-label="Page 1"
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >1</button>
          {pages[0] > 2 && <span className="px-2 text-gray-400" aria-hidden="true">…</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
            p === page
              ? 'bg-blue-600 border-blue-600 text-white font-medium'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-gray-400" aria-hidden="true">…</span>}
          <button
            onClick={() => onPage(totalPages)}
            aria-label={`Page ${totalPages}`}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </nav>
  )
}
