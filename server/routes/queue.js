const router = require('express').Router()
const db = require('../db')

const QUEUE_STATUSES = ['requested', 'downloading', 'validating', 'needs_attention']

router.get('/', (req, res) => {
  const placeholders = QUEUE_STATUSES.map(() => '?').join(',')
  const books = db.prepare(`
    SELECT * FROM books WHERE status IN (${placeholders}) ORDER BY updated_at DESC
  `).all(...QUEUE_STATUSES)

  const result = books.map(book => ({
    ...book,
    releases: db.prepare(`SELECT * FROM releases WHERE book_id = ? ORDER BY score DESC`).all(book.id),
  }))

  res.json(result)
})

module.exports = router
