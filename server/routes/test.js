const router = require('express').Router()
const { testConnection: testProwlarr } = require('../prowlarr')
const { testConnection: testSabnzbd } = require('../sabnzbd')
const { sendTestEmail } = require('../mailer')

router.post('/prowlarr', async (req, res) => {
  try {
    await testProwlarr()
    res.json({ ok: true, message: 'Connection successful' })
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message })
  }
})

router.post('/sabnzbd', async (req, res) => {
  try {
    const version = await testSabnzbd()
    res.json({ ok: true, message: `Connected — SABnzbd ${version}` })
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message })
  }
})

router.post('/kindle', async (req, res) => {
  const { to } = req.body || {}
  if (!to) return res.status(400).json({ error: 'to email address is required' })

  try {
    await sendTestEmail(to)
    res.json({ ok: true, message: `Test email sent to ${to}` })
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message })
  }
})

module.exports = router
