import { useEffect, useRef, useState } from 'react'
import AdBanner from '../AdBanner'
import AdPlaceholder from './AdPlaceholder'

/**
 * Viewport-triggered ad slot.
 *
 * Renders a CLS-safe placeholder until the element is within 200px
 * of the viewport, then mounts the real AdBanner (or AdSense unit).
 *
 * Benefits:
 *  - Below-fold ads don't fire until visible → saves bandwidth + improves LCP
 *  - Placeholder reserves exact ad dimensions → zero CLS
 *  - AdSense viewability metrics improve → better eCPM
 *
 * Note: AdSense policy requires ad units to be visible when requested.
 * The 200px rootMargin ensures the slot is about to become visible
 * before the request fires — compliant with AdSense best practices.
 */
export default function LazyAdSlot({ size = 'leaderboard', className = '', eager = false }) {
  const [mounted, setMounted] = useState(eager)
  const ref = useRef(null)

  useEffect(() => {
    if (eager || mounted) return
    if (!('IntersectionObserver' in window)) {
      setMounted(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [eager, mounted])

  return (
    <div ref={ref}>
      {mounted
        ? <AdBanner size={size} className={className} />
        : <AdPlaceholder size={size} className={className} />
      }
    </div>
  )
}
