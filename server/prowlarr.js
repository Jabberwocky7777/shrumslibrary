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

function detectFormat(title) {
  const t = (title || '').toUpperCase()
  if (t.includes('EPUB')) return 'EPUB'
  if (t.includes('MOBI')) return 'MOBI'
  if (t.includes('AZW')) return 'AZW'
  if (t.includes('FB2')) return 'FB2'
  if (t.includes('PDF')) return 'PDF'
  return null
}

// ── Prowlarr client ────────────────────────────────────────────────────────────

// Parse "Dungeon Crawler Carl #2" → { base: "Dungeon Crawler Carl", num: "2" }
function parseSeries(seriesString) {
  if (!seriesString) return null
  const numMatch = seriesString.match(/(\d+(?:\.\d+)?)\s*$/)
  const num = numMatch ? numMatch[1] : null
  const base = seriesString
    .replace(/\s*[#,]\s*(?:book|vol\.?|volume|part)?\s*[\d.]+\s*$/i, '')
    .replace(/\s*\(\s*(?:book|vol\.?|volume|part)?\s*[\d.]+\s*\)\s*$/i, '')
    .trim()
  return base ? { base, num } : null
}

async function fetchFromProwlarr(searchQuery) {
  const url = getConfig('prowlarr_url')
  const apiKey = getConfig('prowlarr_api_key')
  if (!url || !apiKey) throw new Error('Prowlarr URL and API key are required')

  const params = new URLSearchParams({ apikey: apiKey, query: searchQuery, type: 'search' })
  params.append('categories', '7000')
  params.append('categories', '7020')
  params.append('categories', '7030')

  const response = await fetch(`${url.replace(/\/$/, '')}/api/v1/search?${params}`)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Prowlarr returned ${response.status}: ${body || response.statusText}`)
  }
  return response.json()
}

async function searchProwlarr(title, author, series) {
  // Build a set of queries to try — NZB releases often use the series name
  // rather than the individual book subtitle, so we try both approaches.
  const queries = []

  // 1. Primary: author + title (what the user sees on Open Library)
  queries.push([author, title].filter(Boolean).join(' '))

  // 2. Series-based: "{author} {series base} {number}" e.g. "Matt Dinniman Dungeon Crawler Carl 2"
  //    This is usually how indexers title ebook releases in a series.
  const parsed = parseSeries(series)
  if (parsed) {
    queries.push([author, parsed.base, parsed.num].filter(Boolean).join(' '))
    // 3. Series base alone (catches releases without author in the title)
    if (parsed.num) queries.push([parsed.base, parsed.num].filter(Boolean).join(' '))
  }

  // Run all queries, merge + deduplicate by download URL
  const seen = new Set()
  const merged = []
  let lastError

  for (const q of queries) {
    try {
      const raw = await fetchFromProwlarr(q)
      for (const r of raw) {
        const key = r.downloadUrl || r.link || r.guid
        if (key && seen.has(key)) continue
        if (key) seen.add(key)
        merged.push({
          nzb_title:     r.title,
          release_group: r.releaseGroup || extractGroup(r.title),
          file_size_mb:  r.size ? r.size / (1024 * 1024) : 0,
          score:         scoreRelease(r),
          nzb_url:       r.downloadUrl || r.link,
          indexer:       r.indexer,
          age_days:      typeof r.age === 'number' ? r.age : null,
          format:        detectFormat(r.title),
        })
      }
    } catch (err) {
      lastError = err
    }
  }

  if (merged.length === 0 && lastError) throw lastError

  return merged.sort((a, b) => b.score - a.score)
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
