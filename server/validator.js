const AdmZip = require('adm-zip')
const path = require('path')

const SIZE_LIMIT_MB = 45

function validateEpub(filePath) {
  const result = {
    valid: false,
    drm: false,
    encodingWarning: false,
    flaggedSize: false,
    errors: [],
  }

  let zip
  try {
    zip = new AdmZip(filePath)
  } catch {
    result.errors.push('Invalid epub structure — could not open file as zip')
    return result
  }

  // 1. Structure check — META-INF/container.xml
  if (!zip.getEntry('META-INF/container.xml')) {
    result.errors.push('Invalid epub structure — missing META-INF/container.xml')
    return result
  }

  // 2. At least one .opf file
  const opfEntries = zip.getEntries().filter((e) => e.entryName.endsWith('.opf'))
  if (opfEntries.length === 0) {
    result.errors.push('Invalid epub structure — no .opf file found')
    return result
  }

  // 3. DRM check
  if (zip.getEntry('META-INF/encryption.xml')) {
    result.drm = true
    result.errors.push('DRM detected — file locked')
    return result
  }

  // 4. Size check (uncompressed bytes)
  let totalBytes = 0
  for (const entry of zip.getEntries()) {
    totalBytes += entry.header.size
  }
  const sizeMb = totalBytes / (1024 * 1024)

  if (sizeMb > SIZE_LIMIT_MB) {
    result.flaggedSize = true
    result.errors.push(`File too large for Kindle email (${sizeMb.toFixed(1)} MB, limit ${SIZE_LIMIT_MB} MB)`)
    return result
  }

  // 5. Encoding check — scan .html/.xhtml for Windows-1252 bytes in UTF-8 files
  const textEntries = zip.getEntries().filter(
    (e) => e.entryName.endsWith('.html') || e.entryName.endsWith('.xhtml')
  )

  for (const entry of textEntries) {
    const buf = entry.getData()
    if (hasWin1252Bytes(buf)) {
      result.encodingWarning = true
      break
    }
  }

  result.valid = true
  result.fileSizeMb = sizeMb
  return result
}

function hasWin1252Bytes(buf) {
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    if (b >= 0x80 && b <= 0x9f) return true
  }
  return false
}

module.exports = { validateEpub }
