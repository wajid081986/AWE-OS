export function generateWebsiteSchema({ siteUrl, siteName, searchUrlTemplate } = {}) {
  const url    = siteUrl || 'https://awe-os.com'
  const name   = siteName || 'AWE-OS'
  const search = searchUrlTemplate || `${url}/tools?q={search_term_string}`
  return {
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    name,
    url,
    potentialAction: {
      '@type':       'SearchAction',
      target:        { '@type': 'EntryPoint', urlTemplate: search },
      'query-input': 'required name=search_term_string',
    },
  }
}
