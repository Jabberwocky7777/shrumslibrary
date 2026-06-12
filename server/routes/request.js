const router = require('express').Router()
const { addUrl } = require('../sabnzbd')
const { getConfig } = require('../config')
const db = require('../db')

// POST /api/request — create book record and grab highest-scored release
router.post('/', async (req, res) => {
  const { title, author, year, isbn, cover_url, nzb_title, release_group, file_size_mb, score, nzb_url, allResults } = req.body || {}

  if (!nzb_url) return res.status(400).json({ error: 'nzb_url is required' })

  // Create book record
  const bookInfo = db.prepare(`
    INSERT INTO books (title, author, year, isbn, cover_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'requested', datetime('now'), datetime('now'))
  `).run(title || nzb_title || 'Unknown', author || null, year || null, isbn || null, cover_url || null)

  const bookId = bookInfo.lastInsertRowid

  // Store all results as pending releases
  const insertRelease = db.prepare(`
    INSERT INTO releases (book_id, nzb_title, release_group, file_size_mb, score, nzb_url, status, attempt_number)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)
  `)

  if (Array.isArray(allResults) && allResults.length > 0) {
    for (const r of allResults) {
      insertRelease.run(bookId, r.nzb_title, r.release_group, r.file_size_mb, r.score, r.nzb_url)
    }
  } else {
    insertRelease.run(bookId, nzb_title, release_group, file_size_mb, score, nzb_url)
  }

  // Auto-grab: pick the highest scoring pending release
  const autoGrab = getConfig('auto_grab') !== 'false'
  const topRelease = db.prepare(`
    SELECT * FROM releases WHERE book_id = ? AND status = 'pending' ORDER BY score DESC LIMIT 1
  `).get(bookId)

  if (autoGrab && topRelease) {
    try {
      const jobId = await addUrl(topRelease.nzb_url, topRelease.nzb_title)
      db.prepare(`
        UPDATE releases SET status = 'downloading', sabnzbd_job_id = ?, grabbed_at = datetime('now') WHERE id = ?
      `).run(jobId, topRelease.id)
      db.prepare(`
        UPDATE books SET status = 'downloading', current_release_id = ?, updated_at = datetime('now') WHERE id = ?
      `).run(topRelease.id, bookId)
    } catch (err) {
      console.error('[request] SABnzbd error:', err.message)
      db.prepare(`UPDATE books SET status = 'needs_attention', updated_at = datetime('now') WHERE id = ?`).run(bookId)
    }
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)
  res.json(book)
})

module.exports = router
