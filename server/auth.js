const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const bcrypt = require('bcryptjs')
const { getConfig } = require('./config')
const db = require('./db')
const path = require('path')

const DB_PATH = process.env.DB_PATH || '/data/shrums.db'
const DB_DIR = path.dirname(DB_PATH)
const DB_FILE = path.basename(DB_PATH)

// ── Private IP range detection ─────────────────────────────────────────────────

function isPrivateIP(rawIp) {
  if (!rawIp) return false
  // Strip IPv6-mapped IPv4 prefix (::ffff:192.168.1.1 → 192.168.1.1)
  const ip = rawIp.replace(/^::ffff:/, '')
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false

  // 10.0.0.0/8
  if (parts[0] === 10) return true
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true

  return false
}

function isLocalRequest(req) {
  // If X-Forwarded-For is present, the request came through a proxy — treat as public
  if (req.headers['x-forwarded-for']) return false
  return isPrivateIP(req.socket.remoteAddress)
}

// ── Session middleware factory ─────────────────────────────────────────────────

function createSessionMiddleware() {
  const secret = getConfig('session_secret') || 'fallback-secret-change-me'

  return session({
    store: new SQLiteStore({
      db: DB_FILE,
      dir: DB_DIR,
      table: 'sessions',
    }),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // NPM handles TLS termination; the connection to Express is plain http
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

function isAuthenticated(req) {
  if (isLocalRequest(req)) return true
  return !!req.session && !!req.session.userId
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next()
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return res.redirect('/login')
}

async function loginUser(req, username, password) {
  const storedUsername = getConfig('admin_username') || 'admin'
  const storedHash = getConfig('admin_password') || ''

  if (username !== storedUsername) return false
  const valid = await bcrypt.compare(password, storedHash)
  if (!valid) return false

  req.session.userId = storedUsername
  return true
}

function logoutUser(req) {
  return new Promise((resolve) => req.session.destroy(resolve))
}

function usingDefaultCredentials() {
  const username = getConfig('admin_username')
  const hash = getConfig('admin_password')
  if (username !== 'admin') return false
  // Check if hash matches "shrumslibrary"
  return bcrypt.compareSync('shrumslibrary', hash || '')
}

module.exports = {
  createSessionMiddleware,
  isLocalRequest,
  isAuthenticated,
  requireAuth,
  loginUser,
  logoutUser,
  usingDefaultCredentials,
}
