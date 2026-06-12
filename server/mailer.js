const nodemailer = require('nodemailer')
const path = require('path')
const { getConfig } = require('./config')
const db = require('./db')

const RETRY_DELAYS = [30, 120, 300] // seconds

function createTransport() {
  return nodemailer.createTransport({
    host: getConfig('smtp_host'),
    port: parseInt(getConfig('smtp_port') || '587', 10),
    secure: parseInt(getConfig('smtp_port') || '587', 10) === 465,
    auth: {
      user: getConfig('smtp_user'),
      pass: getConfig('smtp_pass'),
    },
  })
}

async function doSend(book, kindleEmail) {
  const transport = createTransport()
  const from = getConfig('smtp_from') || getConfig('smtp_user')
  const filename = path.basename(book.file_path)

  await transport.sendMail({
    from,
    to: kindleEmail,
    subject: '',
    text: '',
    attachments: [
      {
        filename,
        path: book.file_path,
      },
    ],
  })
}

function logAttempt(bookId, kindleAddressId, attemptNumber, error, smtpResponse) {
  db.prepare(`
    INSERT INTO sends_log (book_id, kindle_address_id, attempt_number, smtp_response, error_message, attempted_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(
    bookId,
    kindleAddressId,
    attemptNumber,
    smtpResponse || null,
    error ? error.message : null
  )
}

function attemptSend(book, kindleAddress, attempt) {
  doSend(book, kindleAddress.email)
    .then(() => {
      logAttempt(book.id, kindleAddress.id, attempt + 1, null, 'OK')
      db.prepare(`
        UPDATE books
        SET status = 'sent', kindle_sent_at = datetime('now'),
            kindle_address_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(kindleAddress.id, book.id)
    })
    .catch((err) => {
      logAttempt(book.id, kindleAddress.id, attempt + 1, err, null)

      if (attempt < RETRY_DELAYS.length - 1) {
        setTimeout(
          () => attemptSend(book, kindleAddress, attempt + 1),
          RETRY_DELAYS[attempt + 1] * 1000
        )
      } else {
        db.prepare(`
          UPDATE books SET status = 'failed', updated_at = datetime('now') WHERE id = ?
        `).run(book.id)
      }
    })
}

function sendToKindle(book, kindleAddress) {
  attemptSend(book, kindleAddress, 0)
}

async function sendTestEmail(toEmail) {
  const transport = createTransport()
  const from = getConfig('smtp_from') || getConfig('smtp_user')
  await transport.sendMail({
    from,
    to: toEmail,
    subject: 'ShrumsLibrary — SMTP test',
    text: 'SMTP connection is working correctly.',
  })
}

module.exports = { sendToKindle, sendTestEmail }
