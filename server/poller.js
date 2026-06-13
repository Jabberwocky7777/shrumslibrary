const path = require('path')
const fs = require('fs')
const db = require('./db')
const { getHistory, addUrl, deleteJob, deleteHistoryJob } = require('./sabnzbd')
const { validateEpub } = require('./validator')
const { sanitiseEpubEncoding } = require('./sanitiser')
const { importBook } = require('./importer')
const { sendToKindle } = require('./mailer')
const { getConfig } = require('./config')

const DOWNLOADS_ROOT = process.env.DOWNLOADS_PATH || '/downloads'

let isPolling = false

async function poll() {
  if (isPolling) return
  isPolling = true

  try {
    const slots = await getHistory(100)
    for (const slot of slots) {
      // Process both Completed and Failed — SABnzbd marks jobs as Failed when
      // post-processing trips up on nested archives or extra files, but the
      // epub is still in the _FAILED_ directory and may be perfectly valid
      if (slot.status !== 'Completed' && slot.status !== 'Failed') continue
      await processCompletedJob(slot)
    }
  } catch (err) {
    console.error('[poller] Error during poll:', err.message)
  } finally {
    isPolling = false
  }
}

async function processCompletedJob(slot) {
  const release = db.prepare(`
    SELECT r.*, b.title, b.author, b.year, b.id as book_id
    FROM releases r
    JOIN books b ON b.id = r.book_id
    WHERE r.sabnzbd_job_id = ? AND r.status = 'downloading'
  `).get(slot.nzo_id)

  if (!release) return

  // Mark release as validating
  db.prepare(`UPDATE releases SET status = 'validating' WHERE id = ?`).run(release.id)
  db.prepare(`UPDATE books SET status = 'validating', updated_at = datetime('now') WHERE id = ?`).run(release.book_id)

  // slot.storage is SABnzbd's absolute path on its own filesystem — not ours.
  // We mount the category's complete folder at DOWNLOADS_ROOT, so map to the
  // basename only (the job's folder name relative to our mount point).
  const epubPath = findEpubInDir(resolveDownloadPath(slot))

  if (!epubPath) {
    await failRelease(release, 'Downloaded file not found in expected location')
    return
  }

  const validation = validateEpub(epubPath)

  // Store validation result
  db.prepare(`
    INSERT INTO validation_results
      (release_id, epub_structure_valid, drm_detected, encoding_issues,
       file_size_mb, over_size_limit, error_detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    release.id,
    validation.valid ? 1 : 0,
    validation.drm ? 1 : 0,
    validation.encodingWarning ? 1 : 0,
    validation.fileSizeMb || 0,
    validation.flaggedSize ? 1 : 0,
    validation.errors.join('; ') || null
  )

  // Handle failures
  if (!validation.valid) {
    let flagStatus, flagReason
    if (validation.drm) {
      flagStatus = 'flagged_drm'
      flagReason = 'DRM detected — file locked'
    } else if (validation.flaggedSize) {
      flagStatus = 'flagged_size'
      flagReason = validation.errors[0]
    } else {
      flagStatus = 'flagged_corrupt'
      flagReason = validation.errors[0] || 'Invalid epub structure'
    }

    // Job is already in SABnzbd history (not active queue) at this point — use history delete
    await deleteHistoryJob(release.sabnzbd_job_id).catch(() => {})
    db.prepare(`
      UPDATE releases SET status = ?, flag_reason = ?, validated_at = datetime('now') WHERE id = ?
    `).run(flagStatus, flagReason, release.id)

    await tryNextRelease(release.book_id)
    return
  }

  // Run encoding sanitiser if needed (non-blocking — book still imports)
  if (validation.encodingWarning) {
    try {
      sanitiseEpubEncoding(epubPath)
    } catch (err) {
      console.error('[poller] Sanitiser error:', err.message)
    }
  }

  // Import
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(release.book_id)
    await importBook(epubPath, book)

    db.prepare(`
      UPDATE releases SET status = 'passed', validated_at = datetime('now') WHERE id = ?
    `).run(release.id)
    db.prepare(`
      UPDATE books SET current_release_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(release.id, release.book_id)

    // Clean up the downloaded files from SABnzbd history + disk
    await deleteHistoryJob(slot.nzo_id).catch(() => {})

    // Auto-send to Kindle if a default address exists
    const defaultKindle = db.prepare(`SELECT * FROM kindle_addresses WHERE is_default = 1`).get()
    if (defaultKindle) {
      const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(release.book_id)
      sendToKindle(updatedBook, defaultKindle)
    }
  } catch (err) {
    console.error('[poller] Import error:', err.message)
    await failRelease(release, `Import failed: ${err.message}`)
  }
}

async function failRelease(release, reason) {
  db.prepare(`
    UPDATE releases SET status = 'flagged_corrupt', flag_reason = ? WHERE id = ?
  `).run(reason, release.id)
  await tryNextRelease(release.book_id)
}

async function tryNextRelease(bookId) {
  const next = db.prepare(`
    SELECT * FROM releases
    WHERE book_id = ? AND status = 'pending'
    ORDER BY score DESC LIMIT 1
  `).get(bookId)

  if (!next) {
    db.prepare(`
      UPDATE books SET status = 'needs_attention', updated_at = datetime('now') WHERE id = ?
    `).run(bookId)
    return
  }

  try {
    const jobId = await addUrl(next.nzb_url, next.nzb_title)
    const attemptNum = (db.prepare(`SELECT MAX(attempt_number) as n FROM releases WHERE book_id = ?`).get(bookId)?.n || 0) + 1

    db.prepare(`
      UPDATE releases
      SET status = 'downloading', sabnzbd_job_id = ?, attempt_number = ?, grabbed_at = datetime('now')
      WHERE id = ?
    `).run(jobId, attemptNum, next.id)

    db.prepare(`
      UPDATE books SET status = 'downloading', current_release_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(next.id, bookId)
  } catch (err) {
    console.error('[poller] Could not grab next release:', err.message)
    db.prepare(`
      UPDATE books SET status = 'needs_attention', updated_at = datetime('now') WHERE id = ?
    `).run(bookId)
  }
}

// Map SABnzbd's storage path to our container mount. slot.storage is the
// absolute path on SABnzbd's filesystem; we only care about the basename
// (the job folder name) relative to DOWNLOADS_ROOT.
function resolveDownloadPath(slot) {
  const candidates = []
  if (slot.storage) candidates.push(path.join(DOWNLOADS_ROOT, path.basename(slot.storage)))
  if (slot.name)    candidates.push(path.join(DOWNLOADS_ROOT, slot.name))
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  // Last resort: scan root directly (epub in top-level of downloads)
  return DOWNLOADS_ROOT
}

// Recursively search for an epub up to maxDepth levels deep
function findEpubInDir(dir, depth = 0) {
  if (!dir || !fs.existsSync(dir)) return null

  const stat = fs.statSync(dir)
  if (stat.isFile()) return dir.toLowerCase().endsWith('.epub') ? dir : null
  if (!stat.isDirectory()) return null

  try {
    const entries = fs.readdirSync(dir)
    // Files first — prefer finding epub without recursing
    for (const entry of entries) {
      if (entry.toLowerCase().endsWith('.epub')) return path.join(dir, entry)
    }
    // Then recurse into subdirectories (up to 4 levels)
    if (depth < 4) {
      for (const entry of entries) {
        const full = path.join(dir, entry)
        if (fs.statSync(full).isDirectory()) {
          const found = findEpubInDir(full, depth + 1)
          if (found) return found
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function startPoller() {
  console.log('[poller] Starting SABnzbd history poll every 30s')
  setInterval(poll, 30000)
}

module.exports = { startPoller, poll }
