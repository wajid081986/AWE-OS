import { Link } from 'react-router-dom'
import { Container } from '../../../components/primitives'

// Condensed from the pre-Batch-17 4-step "how it works" + privacy-promise
// copy (owner-approved) into 3 pillars, per owner ruling during Batch 17
// planning — same claims, no new content. See
// docs/batches/batch-17-homepage-teal-redesign-plan.md §0 item 3.
const PILLARS = [
  {
    title: 'Zero uploads, ever',
    body: "Every tool runs entirely in your browser using WebAssembly and modern browser APIs. There's no upload step — it simply doesn't exist. Close the tab and every trace of your file is gone.",
    Icon: (props) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <rect x="4" y="11" width="16" height="9" rx="1.5" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
  },
  {
    title: 'Built for India',
    body: "Generic calculators don't know CGST vs IGST, old vs new tax regimes, PPF's 15-year lock-in, or TDS on FD interest. Ours do — because that's what our users actually need to calculate.",
    Icon: (props) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Tested, not just shipped',
    body: 'Every tool is manually tested on Chrome, Firefox, Edge, and Safari before release — and re-tested after every update.',
    Icon: (props) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="m9 12 2 2 4-4" />
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      </svg>
    ),
  },
]

export default function PrivacyPromise() {
  return (
    <section id="privacy" className="bg-[color:var(--surface-dark)] py-[length:var(--space-8)] max-[560px]:py-[length:var(--space-section-mobile)]">
      <Container>
        <div className="max-w-[length:var(--section-head-max-width)] mb-10">
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt-accent mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-cobalt-accent" aria-hidden="true" />
            Why AWE-OS is different
          </span>
          <h2 className="ds-h2 text-white">
            Most &quot;free&quot; tool sites upload your files. We architected AWE-OS so we can&apos;t.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PILLARS.map(({ title, body, Icon }) => (
            <div key={title}>
              <div
                className="grid place-items-center rounded-m bg-[color:var(--trust-icon-bg)] text-cobalt-accent mb-4"
                style={{ width: 'var(--toolcard-icon-size)', height: 'var(--toolcard-icon-size)' }}
              >
                <Icon />
              </div>
              <h3 className="font-body font-medium text-sm text-white mb-1.5">{title}</h3>
              <p className="text-xs leading-normal text-[color:var(--text-muted-slate)]">{body}</p>
            </div>
          ))}
        </div>

        <p className="text-center mt-10">
          <Link to="/privacy-policy" className="text-sm font-semibold text-cobalt-accent hover:underline">
            Read our full privacy policy →
          </Link>
        </p>
      </Container>
    </section>
  )
}
