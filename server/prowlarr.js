const { getConfig } = require('./config')

// ── Known release groups ───────────────────────────────────────────────────────

const GOOD_GROUPS = new Set([
  'TLFeBOOK', 'BOOKFIEND', 'caffeine', 'LitRes',
])

const BAD_GROUPS = new Set([
  'PDF-EMPIRE', 'PDFPIRATE', 'ePUBMator', 'Calibre',
])

// ── Scoring ────────────────────────────────────────────────────────────────────

function scoreRelease(release) {
  let score = 100
  const title = (release.title || '').toUpperCase()
  const group = (release.releaseGroup || extractGroup(release.title) || '').toUpperCase()
  const sizeMb = release.size ? release.size / (1024 * 1024) : 0

  // Bonuses
  if (GOOD_GROUPS.has(group)) score += 30
  if (title.includes('RETAIL')) score += 20
  if (title.includes('EPUB')) score += 15
  if (sizeMb >= 1 && sizeMb <= 15) score += 10

  // Penalties
  const origGroup = release.releaseGroup || extractGroup(release.title) || ''
  if (BAD_GROUPS.has(origGroup.toUpperCase())) score -= 50
  if (title.includes('PDF') && !title.includes('EPUB')) score -= 40
  if (title.includes('PDF-RIP')) score -= 50
  if (sizeMb > 20) score -= 20
  if (sizeMb > 0 && sizeMb < 0.1) score -= 30
  if (!origGroup) score -= 10

  return score
}

function extractGroup(title) {
  if (!title) return ''
  // Common NZB title patterns: "Book Title (YEAR) [GROUP]" or "Author-Title-GROUP"
  const bracketMatch = title.match(/\[([A-Za-z0-9_-]+)\]\s*$/)
  if (bracketMatch) return bracketMatch[1]
  const dashMatch = title.match(/-([A-Za-z0-9]+)$/)
  if (dashMatch) return dashMatch[1]
  return ''
}

// ── Prowlarr client ────────────────────────────────────────────────────────────

async function searchProwlarr(query, author) {
  const url = getConfig('prowlarr_url')
  const apiKey = getConfig('prowlarr_api_key')

  if (!url || !apiKey) {
    throw new Error('Prowlarr URL and API key are required')
  }

  const searchQuery = [query, author].filter(Boolean).join(' ')
  const params = new URLSearchParams({
    apikey: apiKey,
    query: searchQuery,
    categories: '7020,7030',
    type: 'search',
  })

  const response = await fetch(`${url.replace(/\/$/, '')}/api/v1/search?${params}`)
  if (!response.ok) {
    throw new Error(`Prowlarr returned ${response.status}: ${response.statusText}`)
  }

  const results = await response.json()

  return results
    .map((r) => ({
      nzb_title: r.title,
      release_group: r.releaseGroup || extractGroup(r.title),
      file_size_mb: r.size ? r.size / (1024 * 1024) : 0,
      score: scoreRelease(r),
      nzb_url: r.downloadUrl || r.link,
      indexer: r.indexer,
    }))
    .sort((a, b) => b.score - a.score)
}

async function testConnection() {
  const url = getConfig('prowlarr_url')
  const apiKey = getConfig('prowlarr_api_key')
  if (!url || !apiKey) throw new Error('Prowlarr URL and API key are not configured')

  const response = await fetch(
    `${url.replace(/\/$/, '')}/api/v1/indexer?apikey=${apiKey}`
  )
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return true
}

module.exports = { searchProwlarr, testConnection, scoreRelease }
