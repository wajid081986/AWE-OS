import { useCallback, useRef, useState } from 'react'

const CONSENT_KEY = 'awe-pdf-editor-ai-consent'
const API_BASE = '/api/pdf-ai'

function hasConsent() {
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === 'true'
  } catch {
    return false
  }
}

function grantConsent() {
  try {
    window.sessionStorage.setItem(CONSENT_KEY, 'true')
  } catch {
    // Storage unavailable — the modal just re-asks next action this session.
  }
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

/**
 * Summarize/Translate/Extract Tables — the only PdfEditorV2 features that
 * send anything to a server (extracted text only, never the file itself).
 * Gated behind AiConsentModal, asked once per browser tab session
 * (sessionStorage, not localStorage — a new tab re-asks). See
 * docs/batches/batch-36-plan.md's Phase 3 decisions.
 */
export function useAiTools() {
  const [showConsent, setShowConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const consentResolverRef = useRef(null)

  const ensureConsent = useCallback(() => {
    if (hasConsent()) return Promise.resolve(true)
    return new Promise((resolve) => {
      consentResolverRef.current = resolve
      setShowConsent(true)
    })
  }, [])

  const onAcceptConsent = useCallback(() => {
    grantConsent()
    setShowConsent(false)
    consentResolverRef.current?.(true)
    consentResolverRef.current = null
  }, [])

  const onCancelConsent = useCallback(() => {
    setShowConsent(false)
    consentResolverRef.current?.(false)
    consentResolverRef.current = null
  }, [])

  // Returns the action's result, or null if the user declined consent.
  const runWithConsent = useCallback(async (fn) => {
    const granted = await ensureConsent()
    if (!granted) return null
    setLoading(true)
    try {
      return await fn()
    } finally {
      setLoading(false)
    }
  }, [ensureConsent])

  const summarize = useCallback((text) => runWithConsent(async () => {
    const data = await postJson('/summarize', { text })
    return data.result
  }), [runWithConsent])

  const translate = useCallback((text, targetLang) => runWithConsent(async () => {
    const data = await postJson('/translate', { text, targetLang })
    return data.result
  }), [runWithConsent])

  const extractTables = useCallback((text) => runWithConsent(async () => {
    const data = await postJson('/extract-tables', { text })
    return data.result
  }), [runWithConsent])

  return { showConsent, loading, onAcceptConsent, onCancelConsent, summarize, translate, extractTables }
}
