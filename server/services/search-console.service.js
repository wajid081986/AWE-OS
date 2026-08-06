const { google } = require('googleapis')

const SITE_URL = 'sc-domain:awe-os.com'
const SCOPES   = ['https://www.googleapis.com/auth/webmasters.readonly']

let cachedClient = null

function getClient() {
  if (cachedClient) return cachedClient

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  let credentials
  try {
    credentials = JSON.parse(raw)
  } catch (err) {
    console.error('[search-console.service] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON')
    return null
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES })
  cachedClient = google.searchconsole({ version: 'v1', auth })
  return cachedClient
}

const getSearchAnalytics = async ({ startDate, endDate, dimensions = ['page', 'query'], rowLimit = 1000 }) => {
  const searchconsole = getClient()
  if (!searchconsole) return { configured: false, rows: [] }

  try {
    const { data } = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: { startDate, endDate, dimensions, rowLimit },
    })
    return { configured: true, rows: data.rows || [] }
  } catch (err) {
    console.error('[search-console.service] query failed:', err.message)
    return { configured: false, rows: [] }
  }
}

module.exports = { getSearchAnalytics }
