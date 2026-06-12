const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const { createSessionMiddleware, requireAuth, isAuthenticated, isLocalRequest } = require('./auth')
const { getConfig } = require('./config')
const { startPoller } = require('./poller')

const app = express()
const PORT = process.env.PORT || 3737
const PUBLIC_DIR = path.join(__dirname, 'public')

// ── Theme palettes ────────────────────────────────────────────────────────────

const THEMES = {
  'zinc-indigo': {
    '--bg': '#09090b',
    '--bg-deep': '#06060a',
    '--bg-raised': '#0c0c10',
    '--border': '#1e1e26',
    '--accent': '#818cf8',
    '--success': '#4ade80',
    '--warn': '#fb923c',
    '--error': '#f87171',
    '--text': '#e4e4e7',
    '--text-muted': '#52525b',
    '--text-dim': '#27272a',
  },
  'graphite-rose': {
    '--bg': '#111113',
    '--bg-deep': '#0d0d0f',
    '--bg-raised': '#141416',
    '--border': '#1e1e22',
    '--accent': '#fb7185',
    '--success': '#4ade80',
    '--warn': '#fbbf24',
    '--error': '#f87171',
    '--text': '#e8e8e8',
    '--text-muted': '#44444a',
    '--text-dim': '#2a2a2e',
  },
}

function getThemeStyle() {
  const key = getConfig('theme') || 'zinc-indigo'
  const palette = THEMES[key] || THEMES['zinc-indigo']
  const vars = Object.entries(palette).map(([k, v]) => `${k}:${v}`).join(';')
  return `<style>:root{${vars}}</style>`
}

function serveWithTheme(req, res) {
  const htmlPath = path.join(PUBLIC_DIR, 'index.html')
  if (!fs.existsSync(htmlPath)) {
    return res.status(503).send('Frontend not built. Run: cd client && npm run build')
  }
  const html = fs.readFileSync(htmlPath, 'utf8').replace('<!-- THEME_INJECT -->', getThemeStyle())
  res.setHeader('Content-Type', 'text/html')
  res.send(html)
}

// ── Security middleware ───────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   // Vite inlines scripts in dev builds
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  frameguard: { action: 'deny' },
}))

app.use(cors({ origin: false }))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ── Sessions ──────────────────────────────────────────────────────────────────

app.use(createSessionMiddleware())

// ── API Routes ────────────────────────────────────────────────────────────────

// Auth routes — no auth required
app.use('/api/auth', require('./routes/auth'))

// Health check — no auth required
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Protected API routes
app.use('/api/config',          requireAuth, require('./routes/config'))
app.use('/api/search',          requireAuth, require('./routes/search'))
app.use('/api/request',         requireAuth, require('./routes/request'))
app.use('/api/books',           requireAuth, require('./routes/books'))
app.use('/api/queue',           requireAuth, require('./routes/queue'))
app.use('/api/library',         requireAuth, require('./routes/library'))
app.use('/api/kindle-addresses',requireAuth, require('./routes/kindle'))
app.use('/api/test',            requireAuth, require('./routes/test'))

// ── Static frontend ───────────────────────────────────────────────────────────

// Serve static assets (JS, CSS, images) — NOT index.html (index: false)
app.use(express.static(PUBLIC_DIR, { index: false }))

// Login page — always accessible, no auth check
app.get('/login', serveWithTheme)

// All other page routes — auth guard then serve SPA
app.get('*', (req, res) => {
  if (!isAuthenticated(req)) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.redirect('/login')
  }
  serveWithTheme(req, res)
})

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ShrumsLibrary running on http://0.0.0.0:${PORT}`)
  startPoller()
})

module.exports = app
