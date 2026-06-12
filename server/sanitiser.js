const AdmZip = require('adm-zip')

// Windows-1252 0x80–0x9F → UTF-8 replacement strings
// Indices are offset by 0x80 (index 0 = byte 0x80, index 31 = byte 0x9F)
const WIN1252_MAP = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’',
  0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
}

function replaceWin1252(buf) {
  const chunks = []
  let start = 0

  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b >= 0x80 && b <= 0x9f && WIN1252_MAP[b]) {
      if (i > start) chunks.push(buf.slice(start, i))
      chunks.push(Buffer.from(WIN1252_MAP[b], 'utf8'))
      start = i + 1
    }
  }

  if (start === 0) return null // no changes
  if (start < buf.length) chunks.push(buf.slice(start))
  return Buffer.concat(chunks)
}

function sanitiseEpubEncoding(epubPath) {
  const zip = new AdmZip(epubPath)
  const entries = zip.getEntries()
  let filesChanged = 0

  for (const entry of entries) {
    if (!entry.entryName.endsWith('.html') && !entry.entryName.endsWith('.xhtml')) continue

    const original = entry.getData()
    const replaced = replaceWin1252(original)

    if (replaced) {
      zip.updateFile(entry.entryName, replaced)
      filesChanged++
    }
  }

  if (filesChanged > 0) {
    zip.writeZip(epubPath)
  }

  return { fixed: filesChanged > 0, filesChanged }
}

module.exports = { sanitiseEpubEncoding }
