export function generateToolSchema({ name, description, url, applicationCategory, keywords }) {
  const schema = {
    '@context':          'https://schema.org',
    '@type':             'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: applicationCategory || 'WebApplication',
    operatingSystem:     'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'AWE-OS', url: 'https://www.awe-os.com' },
  }
  if (keywords?.length) schema.keywords = Array.isArray(keywords) ? keywords.join(', ') : keywords
  return schema
}
