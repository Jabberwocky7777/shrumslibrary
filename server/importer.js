const fs = require('fs')
const path = require('path')
const db = require('./db')

const LIBRARY_ROOT = process.env.LIBRARY_PATH || '/library'
const ILLEGAL_CHARS = /[/\\:*?"<>|]/g

function sanitiseName(name) {
  return (name || 'Unknown').replace(ILLEGAL_CHARS, '').trim()
}

function buildDestPath(book) {
  const author = sanitiseName(book.author || 'Unknown Author')
  const title = sanitiseName(book.title || 'Unknown Title')
  const year = book.year ? ` (${sanitiseName(book.year)})` : ''

  const dirName = `${title}${year}`
  const fileName = `${author} - ${title}.epub`

  return path.join(LIBRARY_ROOT, author, dirName, fileName)
}

function resolveCollision(destPath) {
  if (!fs.existsSync(destPath)) return destPath

  const dir = path.dirname(destPath)
  const ext = path.extname(destPath)
  const base = path.basename(destPath, ext)

  for (let i = 2; i <= 99; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`)
    if (!fs.existsSync(candidate)) return candidate
  }

  throw new Error('Too many duplicate files in library — could not resolve collision')
}

async function importBook(sourcePath, book) {
  const destPath = resolveCollision(buildDestPath(book))
  const destDir = path.dirname(destPath)

  fs.mkdirSync(destDir, { recursive: true })
  fs.copyFileSync(sourcePath, destPath)

  // Verify copy integrity by comparing sizes
  const srcStat = fs.statSync(sourcePath)
  const dstStat = fs.statSync(destPath)
  if (srcStat.size !== dstStat.size) {
    fs.unlinkSync(destPath)
    throw new Error(`Copy integrity check failed: size mismatch (${srcStat.size} vs ${dstStat.size})`)
  }

  db.prepare(`
    UPDATE books
    SET file_path = ?, status = 'imported', updated_at = datetime('now')
    WHERE id = ?
  `).run(destPath, book.id)

  return destPath
}

module.exports = { importBook }
