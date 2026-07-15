import { Link } from 'react-router-dom'
import { Container } from './primitives'

const COLS = [
  {
    title: 'Tools',
    links: [
      { label: 'PDF Tools',   to: '/tools#pdf' },
      { label: 'Calculators', to: '/tools#calculators' },
      { label: 'Converters',  to: '/tools#converters' },
      { label: 'AI Tools',    to: '/tools#ai' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Guides & Blog', to: '/blog' },
      { label: 'About Us',      to: '/about' },
      { label: 'Contact',       to: '/contact' },
    ],
  },
  {
    title: 'Legal & Trust',
    links: [
      { label: 'Privacy Policy',         to: '/privacy-policy' },
      { label: 'Terms of Use',           to: '/terms' },
      { label: 'Disclaimer',             to: '/disclaimer' },
      { label: 'Editorial Policy',       to: '/editorial-policy' },
      { label: 'Tool Testing Policy',    to: '/tool-testing-policy' },
      { label: 'AI Content Policy',      to: '/ai-content-policy' },
      { label: 'Corrections Policy',     to: '/corrections-policy' },
      { label: 'Advertising Policy',     to: '/advertising-policy' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-ink text-[color:var(--footer-text)] text-[length:var(--text-footer-body)]">
      <Container className="pt-[length:var(--footer-padding-top)] pb-[length:var(--footer-padding-bottom)]">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-x-8 gap-y-8 md:gap-[length:var(--footer-grid-gap)] mb-[length:var(--footer-grid-gap)]">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-3.5 font-display font-extrabold text-xl text-card">
              <span
                className="w-7 h-7 rounded-s grid place-items-center bg-gradient-to-br from-cobalt to-cobalt-deep text-card text-sm font-bold shrink-0"
                aria-hidden="true"
              >
                A
              </span>
              AWE-OS
            </Link>
            <p className="max-w-[26rem] mb-5">
              Free, privacy-first browser tools for PDFs, Indian finance, and everyday productivity. Your files are processed on your device and never uploaded.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {[
                { href: 'https://twitter.com', icon: '𝕏', label: 'Twitter' },
                { href: 'https://linkedin.com', icon: 'in', label: 'LinkedIn' },
                { href: 'https://github.com',   icon: '⌥', label: 'GitHub'   },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 bg-cobalt-deep rounded-s flex items-center justify-center text-xs text-[color:var(--footer-text)] hover:text-card hover:bg-cobalt transition-colors"
                >
                  <span aria-hidden="true">{icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-mono text-[length:var(--text-footer-h4)] tracking-[length:var(--tracking-footer-h4)] uppercase text-card mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-[color:var(--footer-text)] hover:text-card transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-[length:var(--space-5)] border-t border-[color:var(--footer-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[length:var(--text-footer-bottom)] text-[color:var(--footer-text-dim)]">
          <p>© {new Date().getFullYear()} AWE-OS. All rights reserved.</p>
          <p className="font-mono text-[length:var(--text-footer-mono)]">Files uploaded to our servers since launch: 0</p>
        </div>
      </Container>
    </footer>
  )
}
