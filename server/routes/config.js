const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { getAllConfig, getConfig, setConfig, isMasked, SECRET_KEYS } = require('../config')
const { usingDefaultCredentials } = require('../auth')

router.get('/', (req, res) => {
  const config = getAllConfig(true)
  config.usingDefaultCredentials = usingDefaultCredentials()
  res.json(config)
})

router.post('/', async (req, res) => {
  const updates = req.body || {}

  for (const [key, value] of Object.entries(updates)) {
    // Skip write if the client sent the masked placeholder back
    if (SECRET_KEYS.has(key) && isMasked(value)) continue
    // Handle password change specially — needs hashing
    if (key === 'admin_password') {
      if (!value) continue
      const hashed = await bcrypt.hash(value, 10)
      setConfig('admin_password', hashed)
      continue
    }
    setConfig(key, value)
  }

  res.json({ ok: true })
})

module.exports = router
