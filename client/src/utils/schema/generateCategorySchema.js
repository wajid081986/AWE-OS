export function generateCategorySchema({ name, description, tools, siteUrl }) {
  const base = siteUrl || 'https://www.awe-os.com'
  return {
    '@context':     'https://schema.org',
    '@type':        'ItemList',
    name,
    description,
    numberOfItems:  tools.length,
    itemListElement: tools.map((t, i) => ({
      '@type':     'ListItem',
      position:    i + 1,
      name:        t.name,
      url:         `${base}/tools/${t.slug}`,
      description: t.description,
    })),
  }
}
