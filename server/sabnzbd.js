const { getConfig } = require('./config')

function getBase() {
  const url = (getConfig('sabnzbd_url') || '').replace(/\/$/, '')
  const apiKey = getConfig('sabnzbd_api_key') || ''
  return { url, apiKey }
}

async function addUrl(nzbUrl, nzbTitle) {
  const { url, apiKey } = getBase()
  if (!url || !apiKey) throw new Error('SABnzbd URL and API key are not configured')

  const params = new URLSearchParams({
    mode: 'addurl',
    output: 'json',
    apikey: apiKey,
    name: nzbUrl,
    cat: 'books',
    nzbname: nzbTitle || '',
  })

  const response = await fetch(`${url}/api?${params}`)
  if (!response.ok) throw new Error(`SABnzbd returned ${response.status}`)

  const data = await response.json()
  if (!data.status) throw new Error(data.error || 'SABnzbd rejected the NZB')

  // SABnzbd returns an array of job IDs
  const jobId = Array.isArray(data.nzo_ids) ? data.nzo_ids[0] : null
  return jobId
}

async function getHistory(limit = 50) {
  const { url, apiKey } = getBase()
  if (!url || !apiKey) return []

  const params = new URLSearchParams({
    mode: 'history',
    output: 'json',
    apikey: apiKey,
    limit: String(limit),
  })

  const response = await fetch(`${url}/api?${params}`)
  if (!response.ok) throw new Error(`SABnzbd returned ${response.status}`)

  const data = await response.json()
  return data.history?.slots || []
}

async function deleteJob(jobId) {
  const { url, apiKey } = getBase()
  if (!url || !apiKey) return

  const params = new URLSearchParams({
    mode: 'queue',
    name: 'delete',
    output: 'json',
    apikey: apiKey,
    value: jobId,
    del_files: '1',
  })

  await fetch(`${url}/api?${params}`)
}

async function testConnection() {
  const { url, apiKey } = getBase()
  if (!url || !apiKey) throw new Error('SABnzbd URL and API key are not configured')

  const params = new URLSearchParams({
    mode: 'version',
    output: 'json',
    apikey: apiKey,
  })

  const response = await fetch(`${url}/api?${params}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = await response.json()
  if (!data.version) throw new Error('Unexpected response from SABnzbd')
  return data.version
}

module.exports = { addUrl, getHistory, deleteJob, testConnection }
