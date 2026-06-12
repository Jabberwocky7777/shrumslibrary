const router = require('express').Router()
const { loginUser, logoutUser, isLocalRequest, isAuthenticated, usingDefaultCredentials } = require('../auth')

router.get('/status', (req, res) => {
  res.json({
    authenticated: isAuthenticated(req),
    isLocal: isLocalRequest(req),
  })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const ok = await loginUser(req, username, password)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  res.json({ ok: true })
})

router.post('/logout', async (req, res) => {
  await logoutUser(req)
  res.json({ ok: true })
})

module.exports = router
