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
  }
  if (keywords?.length) schema.keywords = Array.isArray(keywords) ? keywords.join(', ') : keywords
  return schema
}
