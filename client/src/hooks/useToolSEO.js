import {
  getToolBySlug,
  getCategoryMeta,
  getApplicationCategory,
} from '../data/toolRegistry'
import { SITE_URL, getToolCanonical } from '../utils/canonicalUrl'
import {
  generateToolSchema,
  generateHowToSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from '../utils/schema'

export function useToolSEO(toolOrSlug, { steps, faqs } = {}) {
  const toolMeta = typeof toolOrSlug === 'string'
    ? getToolBySlug(toolOrSlug)
    : toolOrSlug

  const catMeta      = toolMeta ? getCategoryMeta(toolMeta.category) : null
  const appCategory  = getApplicationCategory(toolMeta)
  const pageUrl      = getToolCanonical(toolMeta?.slug || '')

  const name        = toolMeta?.name        || ''
  const description = toolMeta?.description || ''
  const title       = toolMeta?.seo?.title       || `${name} — Free Online Tool | AWE-OS`
  const desc        = toolMeta?.seo?.description || `Free online ${name}. ${description} No sign-up required, works instantly in your browser.`

  const breadcrumbItems = [
    { name: 'Home',  url: SITE_URL },
    { name: 'Tools', url: `${SITE_URL}/tools` },
    ...(catMeta ? [{ name: catMeta.name, url: `${SITE_URL}/tools/${catMeta.slug}` }] : []),
    { name, url: pageUrl },
  ]

  const schemas = [
    generateToolSchema({
      name,
      description,
      url:                 pageUrl,
      applicationCategory: appCategory,
      keywords:            toolMeta?.tags,
    }),
    generateHowToSchema(name, steps),
    generateFAQSchema(faqs),
    generateBreadcrumbSchema(breadcrumbItems),
  ].filter(Boolean)

  return {
    title,
    description:        desc,
    canonical:          pageUrl,
    robots:             'index, follow',
    ogTitle:            title,
    ogDescription:      desc,
    ogUrl:              pageUrl,
    ogType:             'website',
    twitterCard:        'summary',
    twitterTitle:       title,
    twitterDescription: desc,
    schemas,
    toolMeta,
    catMeta,
    pageUrl,
  }
}
