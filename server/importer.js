const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')
const db = require('./db')

const LIBRARY_ROOT = process.env.LIBRARY_PATH || '/library'
const ILLEGAL_CHARS = /[/\\:*?"<>|]/g

function sanitiseName(name) {
  return (name || 'Unknown').replace(ILLEGAL_CHARS, '').trim()
}

// Read title/author/year from epub OPF metadata as a fallback for missing DB fields
function readEpubMeta(epubPath) {
  try {
    const zip = new AdmZip(epubPath)
    const container = zip.getEntry('META-INF/container.xml')
    if (!container) return {}
    const containerXml = container.getData().toString('utf8')
    const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/i)
    if (!opfMatch) return {}
    const opfEntry = zip.getEntry(opfMatch[1])
    if (!opfEntry) return {}
    const opf = opfEntry.getData().toString('utf8')
    return {
      title:  opf.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i)?.[1]?.trim()  || null,
      author: opf.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i)?.[1]?.trim() || null,
      year:   opf.match(/<dc:date[^>]*>(\d{4})/i)?.[1] || null,
    }
  } catch {
    return {}
  }
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
  // Fill in missing title/author from the epub's own OPF metadata
  const epubMeta = readEpubMeta(sourcePath)
  const mergedBook = {
    ...book,
    title:  book.title  || epubMeta.title  || 'Unknown Title',
    author: book.author || epubMeta.author || 'Unknown Author',
    year:   book.year   || epubMeta.year   || null,
  }

  const destPath = resolveCollision(buildDestPath(mergedBook))
  const destDir = path.dirname(destPath)

  fs.mkdirSync(destDir, { recursive: true })

  // Use read+write instead of copyFileSync — copyFileSync uses copy_file_range
  // which fails with EPERM across different ZFS datasets on TrueNAS.
  const content = fs.readFileSync(sourcePath)
  fs.writeFileSync(destPath, content)

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
