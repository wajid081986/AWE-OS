export function generateOrganizationSchema({ siteUrl, name, description } = {}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'Organization',
    name:          name || 'AWE-OS',
    url:           siteUrl || 'https://www.awe-os.com',
    description:   description || 'Free AI-powered online tools for everyone.',
    sameAs:        [],
  }
}
