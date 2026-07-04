import { useCallback } from 'react'

const GA4_EVENT_MAP = {
  tool_viewed:      'tool_viewed',
  tool_used:        'tool_used',
  resume_generated: 'resume_generated',
  payment_success:  'purchase',
  user_signup:      'sign_up',
  tool_shared:      'share',
  feature_clicked:  'select_content',
  download:         'file_download',
  upload:           'file_upload',
  search:           'search',
  cta_click:        'click',
  tool_error:       'exception',
}

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
    const ga4Event = GA4_EVENT_MAP[eventName]
    if (ga4Event) {
      window.gtag?.('event', ga4Event, properties)
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
