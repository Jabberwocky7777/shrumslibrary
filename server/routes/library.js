const router = require('express').Router()
const db = require('../db')

const LIBRARY_STATUSES = ['imported', 'sent', 'failed']

router.get('/', (req, res) => {
  const placeholders = LIBRARY_STATUSES.map(() => '?').join(',')
  const books = db.prepare(`
    SELECT * FROM books WHERE status IN (${placeholders}) ORDER BY updated_at DESC
  `).all(...LIBRARY_STATUSES)

  const result = books.map(book => ({
    ...book,
    validation: db.prepare(`
      SELECT vr.* FROM validation_results vr
      JOIN releases r ON r.id = vr.release_id
      WHERE r.book_id = ?
      ORDER BY vr.created_at DESC LIMIT 1
    `).get(book.id),
  }))

  res.json(result)
})

module.exports = router
