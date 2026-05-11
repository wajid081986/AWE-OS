import { useState, useEffect } from 'react'

/**
 * Defers rendering of children until after the next browser animation frame.
 * Use this for below-fold, non-critical sections (FAQs, sidebar content,
 * related tools) that should not compete with the initial tool UI paint.
 *
 * How it works:
 *   requestAnimationFrame fires after the browser has painted the current frame.
 *   Children render on the NEXT frame — keeping the critical path clear.
 *
 * Props:
 *   fallback  — content shown while deferred (default: null)
 *   delay     — optional extra ms after RAF (default: 0)
 *
 * Usage:
 *   <DeferredRender>
 *     <ToolFooter steps={steps} faqs={faqs} name={name} />
 *   </DeferredRender>
 */
export default function DeferredRender({ children, fallback = null, delay = 0 }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let timerId
    const rafId = requestAnimationFrame(() => {
      if (delay > 0) {
        timerId = setTimeout(() => setReady(true), delay)
      } else {
        setReady(true)
      }
    })
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timerId)
    }
  }, [delay])

  return ready ? children : fallback
}
