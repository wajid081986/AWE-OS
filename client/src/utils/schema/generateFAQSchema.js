export function generateFAQSchema(faqs) {
  if (!faqs?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type':        'Question',
      name:            q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}
