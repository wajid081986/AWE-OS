import { useCallback } from 'react'

const UMAMI_EVENT_TYPES = new Set([
  'tool_viewed',
])

const SERVER_EVENT_TYPES = new Set([
  'tool_viewed',
  'tool_used',
  'resume_generated',
  'payment_success',
  'user_signup',
  'tool_shared',
  'feature_clicked',
  'blog_viewed',
])

const API_BASE = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'

export function useAnalytics() {
  const trackEvent = useCallback((eventName, properties = {}) => {
    if (UMAMI_EVENT_TYPES.has(eventName)) {
      window.umami?.track(eventName, properties)
    }

    if (SERVER_EVENT_TYPES.has(eventName)) {
      const { tool_id, ...rest } = properties
      fetch(`${API_BASE}/api/events/track`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tool_id, event_type: eventName, metadata: rest }),
      }).catch(() => {})
    }
  }, [])

  return { trackEvent }
}
