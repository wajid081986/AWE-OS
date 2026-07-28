import { useState, useEffect, useCallback } from 'react'

const CONSENT_KEY = 'awe_cookie_consent'
const UMAMI_SRC = 'https://cloud.umami.is/script.js'
const UMAMI_WEBSITE_ID = 'a2f17bdc-08eb-49a3-832b-79f611d9766d'

function loadUmami() {
  if (document.querySelector(`script[src="${UMAMI_SRC}"]`)) return
  const script = document.createElement('script')
  script.defer = true
  script.src = UMAMI_SRC
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID)
  document.head.appendChild(script)
}

export function useCookieConsent() {
  const [consent, setConsent] = useState(
    typeof window !== 'undefined' ? localStorage.getItem(CONSENT_KEY) : null
  )

  useEffect(() => {
    if (consent === 'accepted') loadUmami()
  }, [consent])

  const accept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setConsent('accepted')
  }, [])

  const reject = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    setConsent('rejected')
  }, [])

  return { consent, accept, reject }
}
