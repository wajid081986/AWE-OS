export function validateSEOConfig(seoConfig) {
  const warnings = []
  const { title, description, canonical, ogTitle, ogDescription, twitterCard } = seoConfig || {}

  if (!title) {
    warnings.push('Missing title')
  } else if (title.length < 30) {
    warnings.push(`Title too short (${title.length} chars, min 30)`)
  } else if (title.length > 60) {
    warnings.push(`Title too long (${title.length} chars, max 60)`)
  }

  if (!description) {
    warnings.push('Missing meta description')
  } else if (description.length < 70) {
    warnings.push(`Description too short (${description.length} chars, min 70)`)
  } else if (description.length > 160) {
    warnings.push(`Description too long (${description.length} chars, max 160)`)
  }

  if (!canonical) {
    warnings.push('Missing canonical URL')
  } else if (!canonical.startsWith('https://')) {
    warnings.push('Canonical URL must start with https://')
  }

  if (!ogTitle)       warnings.push('Missing og:title')
  if (!ogDescription) warnings.push('Missing og:description')
  if (!twitterCard)   warnings.push('Missing twitter:card')

  return warnings
}
