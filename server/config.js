const db = require('./db')

const MASKED = '••••••'

const SECRET_KEYS = new Set([
  'prowlarr_api_key',
  'sabnzbd_api_key',
  'smtp_pass',
  'admin_password',
  'session_secret',
])

function getConfig(key) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key)
  return row ? row.value : null
}

function setConfig(key, value) {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value)
}

function getAllConfig(masked = true) {
  const rows = db.prepare('SELECT key, value FROM config').all()
  const result = {}
  for (const { key, value } of rows) {
    if (masked && SECRET_KEYS.has(key)) {
      result[key] = value ? MASKED : ''
    } else {
      result[key] = value
    }
  }
  return result
}

// Returns true if the value being saved is the masked placeholder
function isMasked(value) {
  return value === MASKED
}

module.exports = { getConfig, setConfig, getAllConfig, isMasked, MASKED, SECRET_KEYS }
