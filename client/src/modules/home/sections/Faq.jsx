import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Container } from '../../../components/primitives'
import { generateFAQSchema } from '../../../utils/schema/generateFAQSchema'

// Reference HTML's 8 FAQ questions, adapted per the approved decision:
// answers pointing at routes that don't exist yet (/corrections-policy,
// /request-tool, /ai-content-policy) keep their sentence but drop the
// dead <a>; /privacy is pointed at the real /privacy-policy route.
// `aText` is the plain-text answer for the FAQPage schema (schema.org's
// Answer.text wants plain text, not JSX) — kept in sync with `a` by hand.
const FAQS = [
  {
    q: 'Are AWE-OS tools really free? What\'s the catch?',
    aText: 'Most tools are completely free with no usage limits, no watermarks, and no signup. The site is supported by advertising, and a small number of advanced features (like AI-assisted tools) may require an account because they use paid AI services behind the scenes. Core PDF, calculator, and converter tools will stay free.',
    a: (
      <>Most tools are completely free with no usage limits, no watermarks, and no signup. The site is supported by advertising, and a small number of advanced features (like AI-assisted tools) may require an account because they use paid AI services behind the scenes. Core PDF, calculator, and converter tools will stay free.</>
    ),
  },
  {
    q: 'Do my files get uploaded to your servers?',
    aText: 'No. Our file tools (PDF, image, CSV) process everything inside your browser using WebAssembly and browser file APIs. Your file never leaves your device — you can verify this yourself by watching the Network tab in your browser\'s developer tools while using any tool. See our privacy policy for full details.',
    a: (
      <>No. Our file tools (PDF, image, CSV) process everything inside your browser using WebAssembly and browser file APIs. Your file never leaves your device — you can verify this yourself by watching the Network tab in your browser's developer tools while using any tool. See our <Link to="/privacy-policy" className="font-semibold">privacy policy</Link> for full details.</>
    ),
  },
  {
    q: 'Do the tools work offline?',
    aText: 'Many do. Once a browser-based tool has loaded, the processing needs no internet connection. Tools that fetch live data — like the currency converter — or that use AI need a connection to work.',
    a: (
      <>Many do. Once a browser-based tool has loaded, the processing needs no internet connection. Tools that fetch live data — like the currency converter — or that use AI need a connection to work.</>
    ),
  },
  {
    q: 'Are the Indian tax and investment calculators up to date?',
    aText: 'Yes. Tax slabs, GST rates, PPF interest rates, and similar figures are reviewed at every Union Budget and whenever rates change, and each calculator shows the financial year it applies to. If you spot an error, we correct it and log the correction on the affected page.',
    a: (
      <>Yes. Tax slabs, GST rates, PPF interest rates, and similar figures are reviewed at every Union Budget and whenever rates change, and each calculator shows the financial year it applies to. If you spot an error, we correct it and log the correction on the affected page.</>
    ),
  },
  {
    q: 'Is there a file size limit?',
    aText: 'Because processing happens on your device, the practical limit is your device\'s memory rather than an arbitrary server cap. Most modern laptops handle PDFs of several hundred MB comfortably — larger than most server-based free tools allow.',
    a: (
      <>Because processing happens on your device, the practical limit is your device's memory rather than an arbitrary server cap. Most modern laptops handle PDFs of several hundred MB comfortably — larger than most server-based free tools allow.</>
    ),
  },
  {
    q: 'Who builds and maintains AWE-OS?',
    aText: 'AWE-OS is built by a small independent team. Every tool is designed, tested, and maintained in-house, and every guide on the blog is written or reviewed by the team — you can read more on our About page, including how we test tools and how the site is funded.',
    a: (
      <>AWE-OS is built by a small independent team. Every tool is designed, tested, and maintained in-house, and every guide on the blog is written or reviewed by the team — you can read more on our <Link to="/about" className="font-semibold">About page</Link>, including how we test tools and how the site is funded.</>
    ),
  },
  {
    q: 'Can I request a new tool?',
    aText: 'Yes — and requests genuinely shape the roadmap. Several current tools, including the GST invoice generator, started as user requests. Contact us and we\'ll reply with whether and when it\'s planned.',
    a: (
      <>Yes — and requests genuinely shape the roadmap. Several current tools, including the GST invoice generator, started as user requests. <Link to="/contact" className="font-semibold">Contact us</Link> and we'll reply with whether and when it's planned.</>
    ),
  },
  {
    q: 'How is my data handled by the AI tools?',
    aText: 'AI tools (Resume Builder, Content Writer) are the exception to fully-local processing: your input text is sent to an AI provider to generate results, then discarded. We never use your content to train models, and we disclose exactly what\'s sent in each tool.',
    a: (
      <>AI tools (Resume Builder, Content Writer) are the exception to fully-local processing: your input text is sent to an AI provider to generate results, then discarded. We never use your content to train models, and we disclose exactly what's sent in each tool.</>
    ),
  },
]

export default function Faq() {
  const schema = generateFAQSchema(FAQS.map(({ q, aText }) => ({ q, a: aText })))

  return (
    <section className="pb-[length:var(--space-8)] max-[560px]:pb-[length:var(--space-section-mobile)]">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <Container>
        <div className="max-w-[length:var(--section-head-max-width)] mb-10">
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            Common questions
          </span>
          <h2 className="ds-h2 text-ink">Frequently asked questions</h2>
        </div>

        <div className="max-w-[length:var(--faq-max-width)]">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="bg-card border-[1.5px] border-line rounded-callout px-[length:var(--faq-padding-x)] mb-2.5 open:border-cobalt"
            >
              <summary
                className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold py-[length:var(--faq-summary-padding-y)] [&::-webkit-details-marker]:hidden after:content-['+'] after:font-mono after:text-cobalt after:text-[length:var(--text-faq-marker)] after:flex-none open:after:content-['–']"
              >
                {q}
              </summary>
              <p className="text-[length:var(--text-md)] text-ink-soft pb-[length:var(--faq-answer-padding-bottom)]">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
