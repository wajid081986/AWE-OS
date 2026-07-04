import { useEffect }  from 'react'
import { Helmet }     from 'react-helmet-async'
import {
  getToolBySlug,
  getCategoryMeta,
  getRelatedTools,
  getApplicationCategory,
} from '../../data/toolRegistry'
import { SITE_URL, getToolCanonical } from '../../utils/canonicalUrl'
import {
  generateToolSchema,
  generateHowToSchema,
  generateBreadcrumbSchema,
} from '../../utils/schema'
import ToolContainer  from './ToolContainer'
import ToolHero       from './ToolHero'
import ToolHeader     from './ToolHeader'
import ToolContent    from './ToolContent'
import ToolSidebar    from './ToolSidebar'
import ToolFooter     from './ToolFooter'
import AdContainer    from './AdContainer'
import { useTrackToolView } from '../../hooks/useTrackToolView'

export default function ToolLayout({
  tool,          // registry tool object (preferred)
  slug,          // alternative: resolve by slug string
  steps,         // string[] → HowTo schema + section
  faqs,          // { q, a }[] → FAQPage schema + accordion
  about,         // string[] → About section
  sidebarExtra,  // optional extra slot in sidebar
  children,      // tool UI (goes in main content area)
}) {
  const toolMeta     = tool || (slug ? getToolBySlug(slug) : null)
  const resolvedSlug = toolMeta?.slug || slug || ''
  const catMeta      = toolMeta ? getCategoryMeta(toolMeta.category) : null
  const relatedTools = toolMeta ? getRelatedTools(toolMeta, 5) : []

  const toolName = toolMeta?.name        || ''
  const toolDesc = toolMeta?.description || ''
  const toolIcon = toolMeta?.icon        || '🛠️'

  const pageUrl     = getToolCanonical(resolvedSlug)
  const seoTitle    = toolMeta?.seo?.title       || `${toolName} — Free Online Tool | AWE-OS`
  const seoDesc     = toolMeta?.seo?.description || `Free online ${toolName}. ${toolDesc} No sign-up required, works instantly in your browser.`
  const appCategory = getApplicationCategory(toolMeta)

  useTrackToolView(resolvedSlug)

  const breadcrumbItems = [
    { name: 'Home',  url: SITE_URL },
    { name: 'Tools', url: `${SITE_URL}/tools` },
    ...(catMeta ? [{ name: catMeta.name, url: `${SITE_URL}/tools/${catMeta.slug}` }] : []),
    { name: toolName, url: pageUrl },
  ]

  const schemas = [
    generateToolSchema({
      name:                toolName,
      description:         toolDesc,
      url:                 pageUrl,
      applicationCategory: appCategory,
      keywords:            toolMeta?.tags,
    }),
    generateHowToSchema(toolName, steps),
    generateBreadcrumbSchema(breadcrumbItems),
  ].filter(Boolean)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [resolvedSlug])

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description"        content={seoDesc} />
        <link rel="canonical"           href={pageUrl} />
        <meta property="og:title"       content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url"         content={pageUrl} />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {schemas.map((s, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
        ))}
      </Helmet>

      <ToolContainer>

        {/* Breadcrumb — Home / Tools / [Category] / Tool */}
        <ToolHero tool={toolMeta} catMeta={catMeta} />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* ── Main content column ─────────────────────────── */}
          <ToolContent>

            {/* Icon + name + description + badge */}
            <ToolHeader
              icon={toolIcon}
              name={toolName}
              description={toolDesc}
              isPremium={toolMeta?.isPremium}
              isNew={toolMeta?.isNew}
              isAI={toolMeta?.category === 'ai'}
            />

            {/* Ad above the tool interface */}
            <AdContainer slot="top-banner" />

            {/* Tool interface — provided by the page component */}
            <section className="mb-10" aria-label={`${toolName} tool`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Use {toolName}
              </h2>
              {children}
            </section>

            {/* How-to steps, about text, FAQs */}
            <ToolFooter steps={steps} about={about} faqs={faqs} name={toolName} />

          </ToolContent>

          {/* ── Sticky sidebar ──────────────────────────────── */}
          <ToolSidebar
            tool={toolMeta}
            catMeta={catMeta}
            relatedTools={relatedTools}
            pageUrl={pageUrl}
          >
            {sidebarExtra}
          </ToolSidebar>

        </div>
      </ToolContainer>
    </>
  )
}
