export function generateBreadcrumbSchema(items) {
  return {
    '@context':      'https://schema.org',
    '@type':         'BreadcrumbList',
    itemListElement: items.map(({ name, url }, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name,
      item:      url,
    })),
  }
}
