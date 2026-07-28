import { Link } from 'react-router-dom'
import { Button } from './primitives'
import { useCookieConsent } from '../hooks/useCookieConsent'

export default function CookieConsentBanner() {
  const { consent, accept, reject } = useCookieConsent()

  if (consent) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-[var(--z-toast)] ds-banner-in"
    >
      <div className="max-w-content mx-auto p-[length:var(--space-4)] sm:p-[length:var(--space-5)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-[length:var(--space-3)] bg-card border border-line rounded-m shadow-float p-[length:var(--space-4)]">
          <p className="flex-1 font-body text-[length:var(--text-eyebrow)] text-ink-soft leading-relaxed">
            We use cookies for analytics to understand how visitors use AWE-OS. No personal data is sold.{' '}
            <Link to="/privacy-policy" className="text-cobalt hover:underline">Privacy Policy</Link>.
          </p>
          <div className="flex gap-[length:var(--space-2)] shrink-0">
            <Button variant="ghost" size="compact" onClick={reject}>Reject</Button>
            <Button variant="primary" size="compact" onClick={accept}>Accept</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
