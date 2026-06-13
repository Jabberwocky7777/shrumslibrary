const router = require('express').Router()
const db = require('../db')
const { sendToKindle } = require('../mailer')
const { sanitiseEpubEncoding } = require('../sanitiser')
const { deleteJob, deleteHistoryJob } = require('../sabnzbd')

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

router.delete('/:id', async (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
  if (!book) return res.status(404).json({ error: 'Book not found' })

  // Cancel any active queue item (still downloading)
  const queued = db.prepare(`
    SELECT sabnzbd_job_id FROM releases
    WHERE book_id = ? AND status = 'downloading' AND sabnzbd_job_id IS NOT NULL
  `).get(book.id)
  if (queued) await deleteJob(queued.sabnzbd_job_id).catch(() => {})

  // Clean up any already-completed/failed history entry (validating or stalled)
  const inHistory = db.prepare(`
    SELECT sabnzbd_job_id FROM releases
    WHERE book_id = ? AND status = 'validating' AND sabnzbd_job_id IS NOT NULL
  `).get(book.id)
  if (inHistory) await deleteHistoryJob(inHistory.sabnzbd_job_id).catch(() => {})

  // Delete child records then the book
  const releaseIds = db.prepare('SELECT id FROM releases WHERE book_id = ?').all(book.id).map(r => r.id)
  if (releaseIds.length > 0) {
    const ph = releaseIds.map(() => '?').join(',')
    db.prepare(`DELETE FROM validation_results WHERE release_id IN (${ph})`).run(...releaseIds)
  }
  db.prepare('DELETE FROM releases WHERE book_id = ?').run(book.id)
  db.prepare('DELETE FROM books WHERE id = ?').run(book.id)

  res.json({ ok: true })
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
