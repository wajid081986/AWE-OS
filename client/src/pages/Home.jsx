import { Helmet } from 'react-helmet-async'
import { TOOL_REGISTRY } from '../data/toolRegistry'
import { SITE_URL } from '../utils/canonicalUrl'
import { Hero, Stats, PopularTools, Categories, PrivacyPromise } from '../modules/home/sections'

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AWE-OS',
  url: SITE_URL,
  description: 'Free online tools — PDF, calculators, converters, AI tools. No signup required.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/tools?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AWE-OS',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
}

export default function Home() {
  const totalTools = ALL_TOOLS.length
  const title = 'AWE-OS — Free Online Tools for PDF, India Tax & Finance'
  const description = `${totalTools}+ free browser tools — PDF, Indian tax & finance calculators, converters. Files never uploaded, most need no signup. Everything runs on your device.`

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title"       content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url"         content={SITE_URL} />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
      </Helmet>

      <Hero />
      <Stats />
      <PopularTools />
      <Categories />
      <PrivacyPromise />
    </>
  )
}
