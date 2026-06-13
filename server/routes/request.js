const router = require('express').Router()
const { addUrl } = require('../sabnzbd')
const { searchProwlarr } = require('../prowlarr')
const { getConfig } = require('../config')
const db = require('../db')

router.post('/', async (req, res) => {
  const { title, author, year, isbn, cover_url, series, nzb_title, release_group, file_size_mb, score, nzb_url, allResults } = req.body || {}

  const bookTitle = (title || nzb_title || '').trim() || 'Unknown'

  // Dedup — don't allow the same title to be queued twice while active
  const existing = db.prepare(`
    SELECT id FROM books
    WHERE LOWER(title) = LOWER(?)
    AND status IN ('requested', 'downloading', 'validating')
  `).get(bookTitle)
  if (existing) {
    return res.status(409).json({ error: 'Already in queue', bookId: existing.id })
  }

  // Auto-search mode: no specific release and no pre-fetched results → search now
  let releases = Array.isArray(allResults) && allResults.length > 0 ? allResults : null
  if (!nzb_url && !releases) {
    try {
      releases = await searchProwlarr(bookTitle, author, series)
    } catch (err) {
      return res.status(502).json({ error: `Search failed: ${err.message}` })
    }
    if (!releases || releases.length === 0) {
      return res.status(404).json({ error: 'No releases found for this title' })
    }
  }

  // Create book record
  const bookInfo = db.prepare(`
    INSERT INTO books (title, author, year, isbn, cover_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'requested', datetime('now'), datetime('now'))
  `).run(bookTitle, author || null, year || null, isbn || null, cover_url || null)

  const bookId = bookInfo.lastInsertRowid

  // Store all results as pending releases (enables retry pipeline)
  const insertRelease = db.prepare(`
    INSERT INTO releases (book_id, nzb_title, release_group, file_size_mb, score, nzb_url, status, attempt_number)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)
  `)

  if (releases) {
    for (const r of releases) {
      insertRelease.run(bookId, r.nzb_title, r.release_group, r.file_size_mb, r.score, r.nzb_url)
    }
  } else {
    insertRelease.run(bookId, nzb_title, release_group, file_size_mb, score, nzb_url)
  }

  // Auto-grab: send the highest-scored pending release to SABnzbd
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

  res.json(db.prepare('SELECT * FROM books WHERE id = ?').get(bookId))
})

module.exports = router
