const router = require('express').Router()
const db = require('../db')

router.get('/', (req, res) => {
  const addresses = db.prepare('SELECT * FROM kindle_addresses ORDER BY is_default DESC, label ASC').all()
  res.json(addresses)
})

router.post('/', (req, res) => {
  const { label, email, is_default } = req.body || {}
  if (!label || !email) return res.status(400).json({ error: 'label and email are required' })

  if (is_default) {
    db.prepare('UPDATE kindle_addresses SET is_default = 0').run()
  }

  const info = db.prepare(`
    INSERT INTO kindle_addresses (label, email, is_default, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(label, email, is_default ? 1 : 0)

  const address = db.prepare('SELECT * FROM kindle_addresses WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(address)
})

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM kindle_addresses WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Address not found' })

  const { label, email, is_default } = req.body || {}

  if (is_default) {
    db.prepare('UPDATE kindle_addresses SET is_default = 0').run()
  }

  db.prepare(`
    UPDATE kindle_addresses SET label = ?, email = ?, is_default = ? WHERE id = ?
  `).run(
    label ?? existing.label,
    email ?? existing.email,
    is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
    req.params.id
  )

  const updated = db.prepare('SELECT * FROM kindle_addresses WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM kindle_addresses WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Address not found' })

  db.prepare('DELETE FROM kindle_addresses WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
