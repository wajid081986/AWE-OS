export const SITE_URL = 'https://www.awe-os.com'

export function getCanonicalUrl(path) {
  return SITE_URL + path
}

export function getToolCanonical(slug) {
  return `${SITE_URL}/tools/${slug}`
}

export function getCategoryCanonical(slug) {
  return `${SITE_URL}/tools/${slug}`
}
