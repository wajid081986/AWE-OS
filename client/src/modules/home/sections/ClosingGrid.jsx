import { Link } from 'react-router-dom'
import { TOOL_REGISTRY } from '../../../data/toolRegistry'
import { Container, Button } from '../../../components/primitives'

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')

// Reference HTML's policy grid had 8 links; trimmed to the 5 real routes
// that exist today (5 missing policy routes deferred to Batch 8, see
// docs/backlog.md).
const POLICY_LINKS = [
  { to: '/about', label: 'About & team' },
  { to: '/privacy-policy', label: 'Privacy policy' },
  { to: '/terms', label: 'Terms of use' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/contact', label: 'Contact us' },
]

export default function ClosingGrid() {
  const totalTools = ALL_TOOLS.length

  return (
    <section className="bg-card border-t border-b border-line py-[length:var(--space-8)] max-[560px]:py-[length:var(--space-section-mobile)]">
      <Container className="grid grid-cols-1 md:grid-cols-[1.1fr_.9fr] gap-10 md:gap-14">
        <div>
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            About AWE-OS
          </span>
          <h2 className="ds-h2 text-ink mb-4">
            Built by a small team that got tired of "free" tools with catches
          </h2>
          <p className="font-body text-[length:var(--text-body)] text-ink-soft mb-4">
            AWE-OS started with a simple frustration: every free PDF site wanted an upload, an email, or a subscription for the third file. Every EMI calculator was built for US mortgages. We believed everyday utilities should be genuinely free, genuinely private, and built for how people in India actually work.
          </p>
          <p className="font-body text-[length:var(--text-body)] text-ink-soft mb-4">
            Today AWE-OS offers {totalTools} tools used by students, freelancers, and small businesses. We publish who we are, how tools are tested, how content is written and corrected, and how the site earns money — because a tool you trust with your documents should have nothing to hide.
          </p>
          <Button variant="primary" as={Link} to="/about" className="mt-1.5">Read our full story →</Button>
        </div>

        <div>
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            Transparency &amp; policies
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {POLICY_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2.5 py-[length:var(--policy-link-padding-y)] px-4 border-[1.5px] border-line rounded-s font-medium text-[length:var(--text-tab)] text-ink bg-paper hover:border-cobalt hover:no-underline"
              >
                <span className="text-marigold font-bold" aria-hidden="true">→</span>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="font-body text-[length:var(--text-step-footnote)] text-ink-soft mt-4">
            Found a bug or a wrong figure? Email us and we'll fix it — corrections are logged publicly on the affected page.
          </p>
        </div>
      </Container>
    </section>
  )
}
