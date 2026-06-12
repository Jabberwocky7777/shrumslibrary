const router = require('express').Router()
const db = require('../db')
const { sendToKindle } = require('../mailer')
const { sanitiseEpubEncoding } = require('../sanitiser')

router.get('/', (req, res) => {
  const books = db.prepare(`SELECT * FROM books ORDER BY updated_at DESC`).all()
  res.json(books)
})

router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
  if (!book) return res.status(404).json({ error: 'Book not found' })

  const releases = db.prepare(`SELECT * FROM releases WHERE book_id = ? ORDER BY score DESC`).all(book.id)
  const releaseIds = releases.map(r => r.id)

  let validations = []
  if (releaseIds.length > 0) {
    const placeholders = releaseIds.map(() => '?').join(',')
    validations = db.prepare(`SELECT * FROM validation_results WHERE release_id IN (${placeholders})`).all(...releaseIds)
  }

  res.json({ ...book, releases, validations })
})

router.post('/:id/send', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
  if (!book) return res.status(404).json({ error: 'Book not found' })
  if (!book.file_path) return res.status(400).json({ error: 'Book has no file to send' })

  let kindle
  if (book.kindle_address_id) {
    kindle = db.prepare('SELECT * FROM kindle_addresses WHERE id = ?').get(book.kindle_address_id)
  }
  if (!kindle) {
    kindle = db.prepare('SELECT * FROM kindle_addresses WHERE is_default = 1').get()
  }
  if (!kindle) return res.status(400).json({ error: 'No Kindle address configured' })

  sendToKindle(book, kindle)
  res.json({ ok: true, kindleAddress: kindle.email })
})

router.post('/:id/send/:kindleId', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
  if (!book) return res.status(404).json({ error: 'Book not found' })
  if (!book.file_path) return res.status(400).json({ error: 'Book has no file to send' })

  const kindle = db.prepare('SELECT * FROM kindle_addresses WHERE id = ?').get(req.params.kindleId)
  if (!kindle) return res.status(404).json({ error: 'Kindle address not found' })

  sendToKindle(book, kindle)
  res.json({ ok: true, kindleAddress: kindle.email })
})

router.post('/:id/fix-encoding', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
  if (!book) return res.status(404).json({ error: 'Book not found' })
  if (!book.file_path) return res.status(400).json({ error: 'Book has no file' })

  try {
    const result = sanitiseEpubEncoding(book.file_path)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
