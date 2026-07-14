import { Link } from 'react-router-dom'
import { TOOL_REGISTRY, CATEGORY_META } from '../../../data/toolRegistry'
import { CategoryRow } from '../../../components/cards'
import { Container } from '../../../components/primitives'

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')
const CATEGORY_ORDER = Object.keys(CATEGORY_META)

// Reference HTML's .cat-desc prose, copied near-verbatim — all linked tools
// verified to exist. AI category's original /ai-content-policy link (route
// doesn't exist yet) reworded to plain text per approved decision.
const DESCRIPTIONS = {
  pdf: (
    <>Merge, split, compress, rotate, watermark, protect, and convert PDFs to and from Word, Excel, PowerPoint, and images. Because processing happens on your device, even confidential documents — contracts, Aadhaar copies, salary slips — never leave your computer. Start with <Link to="/tools/merge-pdf">Merge PDF</Link> or <Link to="/tools/pdf-editor">PDF Editor</Link>.</>
  ),
  calculators: (
    <>Financial calculators built specifically for India: <Link to="/tools/sip-calculator">SIP</Link>, <Link to="/tools/ppf-calculator">PPF</Link>, <Link to="/tools/fd-calculator">FD with bank-wise rates</Link>, income tax with old/new regime comparison, GST, and loan EMI — plus everyday tools like BMI, age, percentage, and GPA calculators.</>
  ),
  converters: (
    <>Convert units, currencies, number bases, and CSV to JSON. Generate QR codes and strong passwords, compress images, pick colors, count words, and format JSON — the small utilities developers, students, and creators reach for daily.</>
  ),
  productivity: (
    <>Generate GST-compliant invoices with CGST/SGST/IGST breakdown and professional contracts — NDAs, service agreements, employment letters — with GST and TDS compliance checks. Made for Indian freelancers and small businesses.</>
  ),
  ai: (
    <>An <Link to="/tools/resume-builder">AI Resume Builder</Link> that produces ATS-friendly resumes and an <Link to="/tools/ai-content-writer">AI Content Writer</Link> for blog posts and ad copy. We're deliberately growing this category slowly — every AI tool is reviewed carefully before launch.</>
  ),
}

const LINK_LABELS = {
  pdf: 'View PDF tools',
  calculators: 'View calculators',
  converters: 'View converters',
  productivity: 'View productivity',
  ai: 'View AI tools',
}

export default function Categories() {
  return (
    <section className="pb-[length:var(--space-8)] max-[560px]:pb-[length:var(--space-section-mobile)]">
      <Container>
        <div className="max-w-[length:var(--section-head-max-width)] mb-10">
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            Five categories
          </span>
          <h2 className="ds-h2 text-ink mb-3">Everything is organized around real jobs, not features</h2>
          <p className="font-body text-[length:var(--text-body)] text-ink-soft">
            Each category solves a specific everyday problem — from shrinking a PDF for a visa application to figuring out whether the new tax regime saves you money.
          </p>
        </div>

        <div className="grid gap-3.5">
          {CATEGORY_ORDER.map(key => {
            const meta = CATEGORY_META[key]
            const count = ALL_TOOLS.filter(t => t.category === key).length
            return (
              <CategoryRow
                key={key}
                name={meta.name}
                count={count}
                description={DESCRIPTIONS[key]}
                to={`/tools/${key}`}
                linkLabel={`${LINK_LABELS[key]} →`}
              />
            )
          })}
        </div>
      </Container>
    </section>
  )
}
