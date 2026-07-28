import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Breadcrumb, Container } from '../primitives'
import { getCanonicalUrl, SITE_URL } from '../../utils/canonicalUrl'
import { generateWebsiteSchema, generateOrganizationSchema, generateBreadcrumbSchema } from '../../utils/schema'

const EMAIL_RE = /([\w.+-]+@[\w-]+\.[\w.-]+)/g

const WEBSITE_SCHEMA = generateWebsiteSchema()
const ORG_SCHEMA = generateOrganizationSchema()

// Renders any support@awe-os.com etc. found in verbatim body text as a
// clickable mailto: link — a presentation transform, not a text edit.
function linkifyEmails(text) {
  return text.split(EMAIL_RE).map((part, i) =>
    i % 2 === 1
      ? <a key={i} href={`mailto:${part}`} className="text-cobalt hover:underline">{part}</a>
      : part
  )
}

/**
 * PolicyLayout — shared chrome for all 8 policy pages (Batch 8).
 * Content is owner-approved verbatim text passed in as `sections`; this
 * component only supplies breadcrumb, heading, last-updated line, SEO
 * head tags, and typography — it never composes or alters wording.
 */
export default function PolicyLayout({ title, metaDescription, lastUpdated, sections, canonicalPath }) {
  const canonicalUrl = getCanonicalUrl(canonicalPath)
  const pageTitle = `${title} — AWE-OS | Free Online Tools`
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: title, url: canonicalUrl },
  ])

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description"         content={metaDescription} />
        <link rel="canonical"            href={canonicalUrl} />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content={pageTitle} />
        <meta property="og:description"  content={metaDescription} />
        <meta property="og:url"          content={canonicalUrl} />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://www.awe-os.com/og-image.png" />
        <meta property="og:image:type"   content="image/png" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content={pageTitle} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image"       content="https://www.awe-os.com/og-image.png" />
        <meta name="twitter:image:alt"   content={pageTitle} />
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <Container size="narrow" className="py-[length:var(--space-8)] max-[560px]:py-[length:var(--space-section-mobile)]">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: title }]} className="mb-6" />

        <h1 className="ds-h1 text-ink mb-2">{title}</h1>
        <p className="ds-mono-eyebrow text-[length:var(--text-eyebrow)] text-ink-soft mb-10">
          Last updated: {lastUpdated}
        </p>

        <div className="space-y-9">
          {sections.map(({ heading, paragraphs }) => (
            <section key={heading}>
              <h2 className="ds-h3 text-ink mb-3">{heading}</h2>
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className="font-body text-[length:var(--text-body)] leading-[var(--leading-body)] text-ink-soft"
                  >
                    {linkifyEmails(p)}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 pt-8 border-t border-line font-body text-[length:var(--text-small)] text-ink-soft">
          Questions about this policy? Email us at{' '}
          <a href="mailto:support@awe-os.com" className="text-cobalt hover:underline">support@awe-os.com</a>
          {' '}or use our <Link to="/contact" className="text-cobalt hover:underline">contact form</Link>.
        </p>
      </Container>
    </>
  )
}
