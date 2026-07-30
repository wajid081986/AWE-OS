import { useCallback } from 'react'

// Matches are found within a single pdf.js text item's own string only — the
// same granularity the Text tool's click-to-edit path already relies on
// (usePdfDoc.js's getTextItems). A search term split across two adjacent
// items (e.g. a hyphenated line wrap) won't be found; documented in
// docs/backlog.md rather than attempting cross-item stitching.
export function useFindReplace(pdfDoc) {
  const findMatches = useCallback(async (searchTerm) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []
    const matches = []
    for (let page = 1; page <= pdfDoc.pageCount; page++) {
      // eslint-disable-next-line no-await-in-loop -- pages are cached after
      // the first read (usePdfDoc.js), so this is cheap on repeat searches
      const items = await pdfDoc.getTextItems(page)
      for (const item of items) {
        if (item.str.toLowerCase().includes(term)) matches.push({ page, item })
      }
    }
    return matches
  }, [pdfDoc])

  return { findMatches }
}
