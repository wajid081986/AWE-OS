import { useEffect, useRef, memo } from 'react'

/**
 * Invisible sentinel element that calls onIntersect() when it enters the viewport.
 * Place at the bottom of an infinite-scroll list.
 *
 * @param {function} onIntersect - Called when the sentinel becomes visible
 * @param {boolean}  loading     - If true, spinner is shown and intersection is suppressed
 */
const InfiniteScrollSentinel = memo(function InfiniteScrollSentinel({ onIntersect, loading }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loading) onIntersect() },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onIntersect, loading])

  return (
    <div ref={ref} className="h-10 flex items-center justify-center mt-4" aria-hidden="true">
      {loading && (
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
})

export default InfiniteScrollSentinel
